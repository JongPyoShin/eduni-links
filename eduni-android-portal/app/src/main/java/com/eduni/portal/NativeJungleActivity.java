package com.eduni.portal;

import android.app.Activity;
import android.content.Context;
import android.content.pm.ActivityInfo;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.InputDevice;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;

public class NativeJungleActivity extends Activity {
    private Game game;

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        game = new Game(this);
        setContentView(game);
        hideSystemUi();
    }

    @Override protected void onResume() { super.onResume(); hideSystemUi(); game.resume(); }
    @Override protected void onPause() { game.pause(); super.onPause(); }
    @Override public void onWindowFocusChanged(boolean hasFocus) { super.onWindowFocusChanged(hasFocus); if (hasFocus) hideSystemUi(); }

    private void hideSystemUi() {
        View d = getWindow().getDecorView();
        d.setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
        if (android.os.Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController c = d.getWindowInsetsController();
            if (c != null) c.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
        }
    }

    @Override public boolean dispatchKeyEvent(KeyEvent e) { return game.handleKey(e) || super.dispatchKeyEvent(e); }
    @Override public boolean dispatchGenericMotionEvent(MotionEvent e) { return game.handleMotion(e) || super.dispatchGenericMotionEvent(e); }
    @Override public void onBackPressed() { if (!game.back()) finish(); }

    static class Game extends View {
        static final String SERVER = "http://100.75.214.95:8081";
        static final int FIELD = 0, QUIZ = 1, MISSION = 2, CLOSET = 3, PAUSE = 4;
        final Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        // EDUNI_NATIVE_JUNGLE_READABILITY_PATCH_V16
        float uiTextScale = 1.35f;

        // EDUNI_NATIVE_JUNGLE_SPRITE_ASSETS_PATCH_V11
        android.graphics.Bitmap eduniPlayerSprite, eduniBirdSprite, eduniStarSprite, eduniSparkleSprite;
        android.graphics.Bitmap[] eduniPlayerFrontSprites, eduniPlayerSideSprites, eduniPlayerBackSprites, eduniBirdTargetSprites;
        android.graphics.Bitmap[] waterfallKingfisherIdleSprites, waterfallKingfisherAttentionSprites;
        android.graphics.Bitmap waterfallKingfisherObserveSprite, waterfallKingfisherRewardSprite;
        android.graphics.Bitmap waterfallPerchSprite, waterfallFeatherCueSprite, waterfallPulseCueSprite;
        android.graphics.Bitmap[] playerMvpFrontIdle, playerMvpBackIdle, playerMvpLeftIdle, playerMvpRightIdle;
        android.graphics.Bitmap[] playerMvpFrontWalk, playerMvpBackWalk, playerMvpLeftWalk, playerMvpRightWalk;
        android.graphics.Bitmap campGroundSprite, campPathSprite, campRockSprite, campTreeSprite, campHutSprite;
        android.graphics.BitmapShader campGroundShader, campPathShader;
        final android.graphics.Matrix campShaderMatrix = new android.graphics.Matrix();
        boolean playerMvpSpritesLoaded = false;
        // EDUNI_NATIVE_JUNGLE_MOVE_MASK_PATCH_V26_3
        android.graphics.Bitmap[] eduniMoveMasksV26_3;
        boolean eduniMoveMaskLoadedV26_3 = false;
        boolean eduniTouchTargetActiveV26_4 = false;
        float eduniTouchTargetXV26_4 = .18f, eduniTouchTargetYV26_4 = .52f;
        boolean campTouchStickHeld = false;
        float eduniLastMoveXV26_6 = 0f, eduniLastMoveYV26_6 = 1f;

        android.media.ToneGenerator tone; // EDUNI_NATIVE_JUNGLE_SOUND_PATCH_V5
        final Handler main = new Handler(Looper.getMainLooper());
        final ArrayList<Dot> stars = new ArrayList<>();
        final ArrayList<Bird> birds = new ArrayList<>();
        final ArrayList<Spark> sparks = new ArrayList<>(); // EDUNI_NATIVE_JUNGLE_PARTICLES_PATCH_V6
        boolean running, left, right, up, down;
        float px = .18f, py = .52f, ax = 0, ay = 0;
        // JNG-001: keep Android events at the edge; the Canvas loop consumes intents and state.
        final InputActionMapper inputActions = new InputActionMapper();
        final PlayerLocomotionController locomotion = new PlayerLocomotionController();
        final PlayerSpriteMvpState playerMvpState = new PlayerSpriteMvpState();
        final PlayerSpriteMvpLayout playerMvpLayout = new PlayerSpriteMvpLayout();
        final AdventureCameraController adventureCamera = new AdventureCameraController();
        final EncounterDirector campEncounter = new EncounterDirector();
        final CampBirdInteractionRouter campBirdRouter = new CampBirdInteractionRouter();
        final QuizLoadPolicy<Quiz> remoteQuizCache = new QuizLoadPolicy<>();
        final QuizModalPolicy quizModalPolicy = new QuizModalPolicy();
        final EncounterDirector waterfallEncounter = new EncounterDirector();
        final AuthoredStageBirdRouter authoredBirdRouter = new AuthoredStageBirdRouter();
        final StageWorldData campWorld = StageWorldData.camp();
        final StageWorldData waterfallWorld = StageWorldData.waterfall();
        AdventureCameraController.Frame adventureFrame;
        long lastMovementUpdateMs = 0L;
        boolean playerMvpWalking = false;
        int mode = FIELD, select = 0, outfitIndex = 0, foundStars = 0, caughtBirds = 0, hearts = 3;
        // EDUNI_NATIVE_JUNGLE_START_REWARD_PATCH_V12
        boolean showStartScreen = true;

        // EDUNI_NATIVE_JUNGLE_STAGE_PROGRESS_PATCH_V14
        int stageIndex = 0;

        // EDUNI_NATIVE_JUNGLE_V17_TO_V20_QUALITY_PACK_V2
        boolean showStageSelect = false; boolean eduniStagePlayingV20_10 = false;
        int stageSelect = 0;
        int maxUnlockedStage = 0;
        boolean[] stageDone = new boolean[3];
        boolean stageProgressLoaded = false;
        boolean stageCompleteShown = false;
        // EDUNI_NATIVE_JUNGLE_STAGE_INPUT_GUARD_PATCH_V15_1
        int stageInputLock = 0;
        int stageCompleteLife = 0;
        final String[] stageNames = {"1단계 초록 정글", "2단계 반짝 숲길", "3단계 새들의 섬"};
        final String[] stageMissions = {"더 쉬운 첫 탐험: 새 2마리 · 별 3개", "중간 탐험: 새 3마리 · 별 4개", "마지막 탐험: 새 4마리 · 별 5개"};

        // EDUNI_NATIVE_JUNGLE_STAGE_DIFFICULTY_PATCH_V15
        final int[] stageBirdGoals = {2, 3, 4};
        final int[] stageStarGoals = {3, 4, 5};
        // EDUNI_NATIVE_JUNGLE_TUTORIAL_POLISH_PATCH_V13
        int guideLife = 0;
        int guideStep = 0;
        boolean guideShownOnce = false;

        int rewardLife = 0;
        int rewardColor = Color.rgb(34,197,94);
        String rewardTitle = "", rewardSub = "", rewardBadge = "";

        boolean starClearBonus = false, birdClearBonus = false; // EDUNI_NATIVE_JUNGLE_PARTICLES_PATCH_V6
        int clearLife = 0, clearColor = Color.rgb(34,197,94); String clearTitle = "", clearSub = ""; // EDUNI_NATIVE_JUNGLE_CLEAR_BANNER_PATCH_V6_3
        int feedbackColor = Color.TRANSPARENT, feedbackLife = 0; float feedbackAlpha = 0f; String feedbackText = ""; // EDUNI_NATIVE_JUNGLE_GAMEFEEL_PATCH_V4 // EDUNI_NATIVE_JUNGLE_COSTUME_PATCH_V2_2
        long lastNav = 0;
        String log = "Native 정글탐험 시작! 방향키 이동, A 잡기";
        Quiz quiz;
        final QuizExitController quizExit = new QuizExitController();
        volatile boolean remoteQuizPreloadInFlight = false;
        final DigitalMovementPolicy digitalMovement = new DigitalMovementPolicy();
        long digitalDpadDownAtMs = -1L;

        final Runnable tick = new Runnable() { @Override public void run() { update(); invalidate(); if (running) main.postDelayed(this, 16); } };

        Game(Context c) { super(c); setFocusable(true); setFocusableInTouchMode(true); reset(); }
        void resume() { running = true; requestFocus(); main.removeCallbacks(tick); main.post(tick); }
        void pause() { running = false; main.removeCallbacks(tick); }

        void reset() {
            eduniApplyStageSpawnV26_3(); foundStars = 0; caughtBirds = 0; hearts = 3; mode = FIELD; select = 0;
            stars.clear(); birds.clear(); sparks.clear(); starClearBonus=false; birdClearBonus=false;
            campEncounter.reset(); waterfallEncounter.reset(); locomotion.stop(); inputActions.reset(); campTouchStickHeld = false; eduniTouchTargetActiveV26_4 = false; lastMovementUpdateMs = 0L; digitalDpadDownAtMs = -1L;
            quiz = null; quizExit.reset();
            eduniPopulateStageObjectsV26_5();
            log = "새 근처에서 A를 눌러 문제를 풀어봐.";
        }


        // EDUNI_NATIVE_JUNGLE_ACTUAL_HANDLEKEY_FIX_V20_10
        boolean eduniWorldMapActiveV20_10() {
            return showStageSelect || (!eduniStagePlayingV20_10 && mode == FIELD && !showStartScreen && !stageCompleteShown);
        }

        void eduniOpenWorldMapV20_10() {
            eduniStagePlayingV20_10 = false;
            showStageSelect = true;
            mode = FIELD;
            try { eduniSelectPreferredStageV20_8(); } catch(Exception ignored) {}
            select = stageSelect;
            invalidate();
        }

        void eduniMoveWorldMapStageV20_10(int delta) {
            eduniStagePlayingV20_10 = false;
            showStageSelect = true;
            mode = FIELD;
            try { eduniMoveWorldMapStageV20_8(delta); }
            catch(Exception ignored) {
                stageSelect += delta;
                if(stageSelect < 0) stageSelect = stageNames.length - 1;
                if(stageSelect >= stageNames.length) stageSelect = 0;
                select = stageSelect;
                invalidate();
            }
        }


        // EDUNI_NATIVE_JUNGLE_INTRO_WORLDMAP_FLOW_FIX_V21_3
        void eduniStartSelectedStageFromWorldMapV21_3() {
            if(stageSelect < 0) stageSelect = 0;
            if(stageSelect >= stageNames.length) stageSelect = stageNames.length - 1;

            if(stageSelect > maxUnlockedStage) {
                log = "아직 잠긴 단계예요. 앞 단계를 먼저 완료해요!";
                mode = FIELD;
                showStageSelect = true;
                eduniStagePlayingV20_10 = false;
                invalidate();
                return;
            }

            eduniStagePlayingV20_10 = true;
            showStartScreen = false;
            showStageSelect = false;
            mode = FIELD;
            select = 0;

            startSelectedStage();

            try { reset(); } catch(Exception ignored) {}

            eduniStagePlayingV20_10 = true;
            showStartScreen = false;
            showStageSelect = false;
            mode = FIELD;
            select = 0;

            stageCompleteShown = false;
            stageCompleteLife = 0;
            rewardLife = 0;
            stageInputLock = 12;
            log = stageNames[stageIndex] + " 탐험 시작!";
            invalidate();
        }


        // EDUNI_NATIVE_JUNGLE_INTRO_A_TO_WORLDMAP_FIX_V21_4
        void eduniOpenWorldMapFromIntroV21_4() {
            showStartScreen = false;
            showStageSelect = true;
            eduniStagePlayingV20_10 = false;
            mode = FIELD;
            try { eduniSelectPreferredStageV20_8(); } catch(Exception ignored) {}
            select = stageSelect;
            log = "탐험할 단계를 골라보자!";
            invalidate();
        }


        // EDUNI_NATIVE_JUNGLE_V24_STICKER_REWARD
        void eduniGiveStageStickerV24(int idx) {
            try {
                if(idx < 0 || idx >= stageNames.length) return;

                android.content.SharedPreferences sp = getContext().getSharedPreferences("eduni_jungle_reward_v24", 0);
                String key = "stage_sticker_" + idx;
                if(sp.getBoolean(key, false)) return;

                sp.edit().putBoolean(key, true).apply();

                String badge = idx == 0 ? "🌱" : (idx == 1 ? "✨" : "🏆");
                String title = idx == 0 ? "새싹 탐험가" : (idx == 1 ? "반짝 숲길러" : "정글 마스터");
                showRewardScreen("스티커 획득!", title + " 스티커를 받았어!", badge, Color.rgb(245, 158, 11));
                postProgress("sticker_earned", stageNames[idx] + " / " + title);
            } catch(Exception ignored) {}
        }

        boolean handleKey(KeyEvent e) {
            boolean dn = e.getAction() == KeyEvent.ACTION_DOWN;
            InputActionMapper.Action mapped = inputActions.mapKeyCode(e.getKeyCode());
            if (mapped != InputActionMapper.Action.NONE) inputActions.useController();
            if (showStartScreen) {
                int k = e.getKeyCode();

                // 시작 안내 화면에서는 A/Enter/Space만 시작으로 허용한다.
                // X/Y/Start/방향키는 옷장·미션·월드맵 조작으로 새지 않게 전부 소비한다.
                if (!dn) return true;

                if (k == KeyEvent.KEYCODE_BUTTON_A
                        || k == KeyEvent.KEYCODE_ENTER
                        || k == KeyEvent.KEYCODE_SPACE
                        || k == KeyEvent.KEYCODE_DPAD_CENTER) {
                    eduniOpenWorldMapFromIntroV21_4();
                    return true;
                }

                if (k == KeyEvent.KEYCODE_BUTTON_B
                        || k == KeyEvent.KEYCODE_ESCAPE
                        || k == KeyEvent.KEYCODE_BACK) {
                    android.content.Context ctx = getContext();
                    if (ctx instanceof android.app.Activity) ((android.app.Activity)ctx).finish();
                    return true;
                }

                return true;
            }


            if (e.getRepeatCount() > 0 && isAction(e.getKeyCode())) return true;
            if (mapped == InputActionMapper.Action.NONE) return false;
            if (mode == QUIZ) {
                QuizModalPolicy.Decision decision = quizModalPolicy.decide(mapped, dn);
                if (decision == QuizModalPolicy.Decision.NAVIGATE) nav(mapped == InputActionMapper.Action.MOVE_LEFT ? -1 : mapped == InputActionMapper.Action.MOVE_RIGHT ? 1 : 0, mapped == InputActionMapper.Action.MOVE_UP ? -1 : mapped == InputActionMapper.Action.MOVE_DOWN ? 1 : 0);
                else if (decision == QuizModalPolicy.Decision.ANSWER) pressA();
                else if (decision == QuizModalPolicy.Decision.REQUEST_EXIT) requestQuizExit();
                return true;
            }
            if (inputActions.isMovement(mapped)) {
                if(eduniWorldMapActiveV20_10()) { if(dn) eduniMoveWorldMapStageV20_10((mapped == InputActionMapper.Action.MOVE_LEFT || mapped == InputActionMapper.Action.MOVE_UP) ? -1 : 1); return true; }
                if(dn) eduniTouchTargetActiveV26_4 = false;
                inputActions.setKey(mapped, dn);
                left = inputActions.moveX() < 0; right = inputActions.moveX() > 0; up = inputActions.moveY() < 0; down = inputActions.moveY() > 0;
                if (dn) {
                    digitalDpadDownAtMs = android.os.SystemClock.uptimeMillis();
                    locomotion.faceImmediately(mapped == InputActionMapper.Action.MOVE_LEFT ? -1f : mapped == InputActionMapper.Action.MOVE_RIGHT ? 1f : 0f, mapped == InputActionMapper.Action.MOVE_UP ? -1f : mapped == InputActionMapper.Action.MOVE_DOWN ? 1f : 0f);
                }
                if (!dn && !inputActions.hasKeyDpadIntent()) { digitalDpadDownAtMs = -1L; locomotion.stop(); }
                if (dn) nav((mapped == InputActionMapper.Action.MOVE_LEFT ? -1 : mapped == InputActionMapper.Action.MOVE_RIGHT ? 1 : 0), (mapped == InputActionMapper.Action.MOVE_UP ? -1 : mapped == InputActionMapper.Action.MOVE_DOWN ? 1 : 0));
                return true;
            }
            if (!dn) return true;
            if (mapped == InputActionMapper.Action.CONFIRM) { pressA(); return true; }
            if (mapped == InputActionMapper.Action.BACK) { if(eduniWorldMapActiveV20_10()){ android.content.Context ctx = getContext(); if(ctx instanceof android.app.Activity) ((android.app.Activity)ctx).finish(); return true; } if(mode == FIELD && !showStartScreen && !stageCompleteShown){ eduniOpenWorldMapV20_10(); return true; } back(); return true; }
            if (mapped == InputActionMapper.Action.MISSION) { if(eduniWorldMapActiveV20_10()){ showStageSelect = true; mode = FIELD; select = stageSelect; invalidate(); return true; } mode = MISSION; select = 0; return true; }
            if (mapped == InputActionMapper.Action.CLOSET) { if(eduniWorldMapActiveV20_10()){ showStageSelect = true; mode = FIELD; select = stageSelect; invalidate(); return true; } mode = CLOSET; select = 0; return true; }
            if (mapped == InputActionMapper.Action.PAUSE) { mode = mode == PAUSE ? FIELD : PAUSE; return true; }
            return false;
        }
        boolean isAction(int k) { return k == KeyEvent.KEYCODE_BUTTON_A || k == KeyEvent.KEYCODE_BUTTON_B || k == KeyEvent.KEYCODE_BUTTON_X || k == KeyEvent.KEYCODE_BUTTON_Y || k == KeyEvent.KEYCODE_BUTTON_START || k == KeyEvent.KEYCODE_ENTER || k == KeyEvent.KEYCODE_SPACE; }

        boolean handleMotion(MotionEvent e) {
            int s = e.getSource();
            boolean ctl = (s & InputDevice.SOURCE_JOYSTICK) == InputDevice.SOURCE_JOYSTICK || (s & InputDevice.SOURCE_GAMEPAD) == InputDevice.SOURCE_GAMEPAD || (s & InputDevice.SOURCE_DPAD) == InputDevice.SOURCE_DPAD;
            if (!ctl || e.getAction() != MotionEvent.ACTION_MOVE) return false;
            float hatX = e.getAxisValue(MotionEvent.AXIS_HAT_X), hatY = e.getAxisValue(MotionEvent.AXIS_HAT_Y);
            inputActions.setHat(hatX, hatY);
            ax = axis(e, MotionEvent.AXIS_X, MotionEvent.AXIS_RX, MotionEvent.AXIS_Z);
            ay = axis(e, MotionEvent.AXIS_Y, MotionEvent.AXIS_RY, MotionEvent.AXIS_RZ);
            inputActions.setAnalog(ax, ay);
            ax = inputActions.moveX(); ay = inputActions.moveY();
            if (mode == QUIZ) {
                if (Math.hypot(ax, ay) >= .25) nav(Math.abs(ax) > Math.abs(ay) ? (ax > 0 ? 1 : -1) : 0, Math.abs(ay) >= Math.abs(ax) ? (ay > 0 ? 1 : -1) : 0);
            } else if (mode != FIELD) {
                long now = System.currentTimeMillis();
                if (Math.hypot(ax, ay) < .25) lastNav = 0;
                else if (now - lastNav > 230) { lastNav = now; if (Math.abs(ax) > Math.abs(ay)) nav(ax > 0 ? 1 : -1, 0); else nav(0, ay > 0 ? 1 : -1); }
            }
            return true;
        }

        @Override public boolean onTouchEvent(MotionEvent e) {
            requestFocus();
            inputActions.useTouch();
            if(showStartScreen) {
                if(e.getAction() == MotionEvent.ACTION_UP) pressA();
                return true;
            }
            if(mode == QUIZ) {
                if(e.getAction() == MotionEvent.ACTION_UP && e.getX() > getWidth()*.75f && e.getY() < getHeight()*.32f) requestQuizExit();
                return true;
            }
            if(mode != FIELD || showStageSelect || stageCompleteShown) return true;

            int action = e.getActionMasked();
            if (action == MotionEvent.ACTION_CANCEL || action == MotionEvent.ACTION_OUTSIDE || (action == MotionEvent.ACTION_POINTER_UP && campTouchStickHeld)) {
                campTouchStickHeld = false;
                inputActions.releaseTouch();
                eduniTouchTargetActiveV26_4 = false;
                return true;
            }
            if(action == MotionEvent.ACTION_DOWN || action == MotionEvent.ACTION_MOVE || action == MotionEvent.ACTION_UP) {
                float stickX = getWidth() * .16f, stickY = getHeight() * .80f, stickRadius = Math.min(getWidth(), getHeight()) * .12f;
                float actionX = getWidth() * .86f, actionY = getHeight() * .80f;
                if (Math.hypot(e.getX() - actionX, e.getY() - actionY) < stickRadius) {
                    if (action == MotionEvent.ACTION_UP) pressA();
                    return true;
                }
                if (campTouchStickHeld || Math.hypot(e.getX() - stickX, e.getY() - stickY) < stickRadius * 1.35f) {
                    campTouchStickHeld = action != MotionEvent.ACTION_UP;
                    float dx = (e.getX() - stickX) / stickRadius, dy = (e.getY() - stickY) / stickRadius;
                    inputActions.setTouchVector(action == MotionEvent.ACTION_UP ? 0f : dx, action == MotionEvent.ACTION_UP ? 0f : dy);
                    eduniTouchTargetActiveV26_4 = false;
                    return true;
                }
                RectF r = eduniMapRectV26_4(getWidth(), getHeight());
                if(!r.contains(e.getX(), e.getY())) return true;
                float nx = clamp((e.getX() - r.left) / Math.max(1f, r.width()), 0f, 1f);
                float ny = clamp((e.getY() - r.top) / Math.max(1f, r.height()), 0f, 1f);
                float[] target = eduniNearestPathPointV26_5(nx, ny);
                if(target[2] < .20f) {
                    eduniTouchTargetXV26_4 = target[0];
                    eduniTouchTargetYV26_4 = target[1];
                    eduniTouchTargetActiveV26_4 = true;
                }
                return true;
            }
            return true;
        }
        float axis(MotionEvent e, int... axes) { for (int a: axes) { float v = e.getAxisValue(a); if (Math.abs(v) > .18f) return v; } return 0; }

        void nav(int dx, int dy) { if(showStageSelect){ eduniMoveWorldMapStageV20_8((dy != 0 ? dy : dx)); return; }  if(showStageSelect){ eduniMoveStageSelect((dy != 0 ? dy : dx)); return; }  if(showStageSelect){ stageSelect += (dy != 0 ? dy : dx); if(stageSelect < 0) stageSelect = stageNames.length-1; if(stageSelect >= stageNames.length) stageSelect = 0; invalidate(); return; }  if(stageCompleteShown && mode == FIELD) return;
            if (mode == FIELD || mode == PAUSE) return;
            int n = count(); if (n == 0) return;
            int next = select + (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : -1) : (dy > 0 ? 2 : -2));
            select = ((next % n) + n) % n;
        }
        int count() { if (mode == QUIZ && quiz != null) return quizExit.isConfirming() ? 2 : quiz.options.length; if (mode == MISSION) return 2; if (mode == CLOSET) return 4; return 0; }


        // EDUNI_NATIVE_JUNGLE_WORLDMAP_INPUT_FIX_V20_1
        boolean stageSelectMoveFromKey(int code, boolean dn) { if(eduniWorldMapConsumeKey(code, dn)) return true;  if(stageSelectMoveFromKey(code, dn)) return true;
            if(!showStageSelect) return false;
            if(!dn) return true;

            if(code == KeyEvent.KEYCODE_DPAD_UP || code == KeyEvent.KEYCODE_DPAD_LEFT) {
                stageSelect--;
                if(stageSelect < 0) stageSelect = stageNames.length - 1;
                mode = FIELD;
                select = stageSelect;
                invalidate();
                return true;
            }

            if(code == KeyEvent.KEYCODE_DPAD_DOWN || code == KeyEvent.KEYCODE_DPAD_RIGHT) {
                stageSelect++;
                if(stageSelect >= stageNames.length) stageSelect = 0;
                mode = FIELD;
                select = stageSelect;
                invalidate();
                return true;
            }

            if(code == KeyEvent.KEYCODE_BUTTON_A || code == KeyEvent.KEYCODE_ENTER || code == KeyEvent.KEYCODE_DPAD_CENTER) {
                eduniStartSelectedStageFromWorldMapV21_3();
                return true;
            }

            if(code == KeyEvent.KEYCODE_BUTTON_B || code == KeyEvent.KEYCODE_BACK || code == KeyEvent.KEYCODE_ESCAPE) {
                ((android.app.Activity)getContext()).finish();
                return true;
            }

            if(code == KeyEvent.KEYCODE_BUTTON_X || code == KeyEvent.KEYCODE_BUTTON_Y || code == KeyEvent.KEYCODE_BUTTON_START) {
                mode = FIELD;
                select = stageSelect;
                invalidate();
                return true;
            }

            return false;
        }


        // EDUNI_NATIVE_JUNGLE_WORLDMAP_WEBVIEW_HARD_FIX_V20_3
        long eduniWorldMapLastMoveMs = 0;

        int eduniPreferredStageSelect() {
            ensureStageProgressLoaded();
            int limit = maxUnlockedStage;
            if(limit < 0) limit = 0;
            if(limit >= stageNames.length) limit = stageNames.length - 1;

            for(int i=0;i<=limit && i<stageNames.length;i++) {
                if(i < stageDone.length && !stageDone[i]) return i;
            }
            return limit;
        }

        void eduniSelectPreferredStage() {
            stageSelect = eduniPreferredStageSelect();
            mode = FIELD;
            select = stageSelect;
        }

        void eduniMoveStageSelect(int delta) {
            ensureStageProgressLoaded();
            stageSelect += delta;
            if(stageSelect < 0) stageSelect = stageNames.length - 1;
            if(stageSelect >= stageNames.length) stageSelect = 0;
            mode = FIELD;
            select = stageSelect;
            invalidate();
        }

        boolean eduniWorldMapConsumeKey(int code, boolean down) {
            if(!showStageSelect) return false;

            // 월드맵에서는 키를 떼는 이벤트도 기존 필드 조작으로 새지 않게 소비
            if(!down) return true;

            mode = FIELD;
            select = stageSelect;

            if(code == android.view.KeyEvent.KEYCODE_DPAD_UP
                    || code == android.view.KeyEvent.KEYCODE_DPAD_LEFT) {
                eduniMoveStageSelect(-1);
                return true;
            }

            if(code == android.view.KeyEvent.KEYCODE_DPAD_DOWN
                    || code == android.view.KeyEvent.KEYCODE_DPAD_RIGHT) {
                eduniMoveStageSelect(1);
                return true;
            }

            if(code == android.view.KeyEvent.KEYCODE_BUTTON_A
                    || code == android.view.KeyEvent.KEYCODE_ENTER
                    || code == android.view.KeyEvent.KEYCODE_DPAD_CENTER) {
                eduniStartSelectedStageFromWorldMapV21_3();
                return true;
            }

            if(code == android.view.KeyEvent.KEYCODE_BUTTON_B
                    || code == android.view.KeyEvent.KEYCODE_BACK
                    || code == android.view.KeyEvent.KEYCODE_ESCAPE) {
                ((android.app.Activity)getContext()).finish();
                return true;
            }

            // 월드맵에서는 필드용 버튼 차단: 옷장/미션/일시정지/키보드 X/Y
            if(code == android.view.KeyEvent.KEYCODE_BUTTON_X
                    || code == android.view.KeyEvent.KEYCODE_BUTTON_Y
                    || code == android.view.KeyEvent.KEYCODE_BUTTON_START
                    || code == android.view.KeyEvent.KEYCODE_X
                    || code == android.view.KeyEvent.KEYCODE_Y
                    || code == android.view.KeyEvent.KEYCODE_MENU) {
                mode = FIELD;
                select = stageSelect;
                invalidate();
                return true;
            }

            return true;
        }

        @Override
        public boolean dispatchKeyEvent(android.view.KeyEvent event) {
            if(eduniWorldMapConsumeKey(event.getKeyCode(), event.getAction() == android.view.KeyEvent.ACTION_DOWN)) return true;
            return super.dispatchKeyEvent(event);
        }

        @Override
        public boolean onGenericMotionEvent(android.view.MotionEvent event) {
            if(showStageSelect && event.getAction() == android.view.MotionEvent.ACTION_MOVE) {
                float x = event.getAxisValue(android.view.MotionEvent.AXIS_HAT_X);
                float y = event.getAxisValue(android.view.MotionEvent.AXIS_HAT_Y);

                if(Math.abs(x) < .45f) x = event.getAxisValue(android.view.MotionEvent.AXIS_X);
                if(Math.abs(y) < .45f) y = event.getAxisValue(android.view.MotionEvent.AXIS_Y);

                long now = android.os.SystemClock.uptimeMillis();
                if(now - eduniWorldMapLastMoveMs > 220) {
                    if(x < -.55f || y < -.55f) {
                        eduniMoveStageSelect(-1);
                        eduniWorldMapLastMoveMs = now;
                        return true;
                    }
                    if(x > .55f || y > .55f) {
                        eduniMoveStageSelect(1);
                        eduniWorldMapLastMoveMs = now;
                        return true;
                    }
                }
                return true;
            }
            return super.onGenericMotionEvent(event);
        }


        // EDUNI_NATIVE_JUNGLE_WORLDMAP_NAV_BACK_FINAL_V20_8
        long eduniWorldMapMoveAtV20_8 = 0;

        int eduniPreferredStageV20_8() {
            ensureStageProgressLoaded();

            int limit = maxUnlockedStage;
            if(limit < 0) limit = 0;
            if(limit >= stageNames.length) limit = stageNames.length - 1;

            for(int i=0;i<=limit && i<stageNames.length;i++) {
                if(i < stageDone.length && !stageDone[i]) return i;
            }

            return limit;
        }

        void eduniSelectPreferredStageV20_8() {
            stageSelect = eduniPreferredStageV20_8();
            mode = FIELD;
            select = stageSelect;
        }

        void eduniMoveWorldMapStageV20_8(int delta) {
            ensureStageProgressLoaded();

            if(delta == 0) return;

            stageSelect += delta;
            if(stageSelect < 0) stageSelect = stageNames.length - 1;
            if(stageSelect >= stageNames.length) stageSelect = 0;

            mode = FIELD;
            select = stageSelect;
            invalidate();
        }

        boolean eduniWorldMapKeyV20_8(int code, boolean down) {
            if(!showStageSelect) return false;

            // 월드맵이 떠 있는 동안에는 key up도 필드 조작으로 새지 않게 소비한다.
            if(!down) return true;

            mode = FIELD;
            select = stageSelect;

            if(code == android.view.KeyEvent.KEYCODE_DPAD_UP
                    || code == android.view.KeyEvent.KEYCODE_DPAD_LEFT) {
                eduniMoveWorldMapStageV20_8(-1);
                return true;
            }

            if(code == android.view.KeyEvent.KEYCODE_DPAD_DOWN
                    || code == android.view.KeyEvent.KEYCODE_DPAD_RIGHT) {
                eduniMoveWorldMapStageV20_8(1);
                return true;
            }

            if(code == android.view.KeyEvent.KEYCODE_BUTTON_A
                    || code == android.view.KeyEvent.KEYCODE_DPAD_CENTER
                    || code == android.view.KeyEvent.KEYCODE_ENTER
                    || code == android.view.KeyEvent.KEYCODE_SPACE) {
                eduniStartSelectedStageFromWorldMapV21_3();
                return true;
            }

            if(code == android.view.KeyEvent.KEYCODE_BUTTON_B
                    || code == android.view.KeyEvent.KEYCODE_BACK
                    || code == android.view.KeyEvent.KEYCODE_ESCAPE) {
                android.content.Context ctx = getContext();
                if(ctx instanceof android.app.Activity) ((android.app.Activity)ctx).finish();
                return true;
            }

            // 월드맵에서는 필드용 버튼을 전부 차단한다.
            if(code == android.view.KeyEvent.KEYCODE_BUTTON_X
                    || code == android.view.KeyEvent.KEYCODE_BUTTON_Y
                    || code == android.view.KeyEvent.KEYCODE_BUTTON_START
                    || code == android.view.KeyEvent.KEYCODE_X
                    || code == android.view.KeyEvent.KEYCODE_Y
                    || code == android.view.KeyEvent.KEYCODE_MENU) {
                mode = FIELD;
                select = stageSelect;
                invalidate();
                return true;
            }

            return true;
        }

        void eduniUpdateWorldMapSelectionV20_8() {
            if(!showStageSelect) return;

            long now = android.os.SystemClock.uptimeMillis();
            if(now - eduniWorldMapMoveAtV20_8 < 220) return;

            int delta = 0;

            if(left || up) delta = -1;
            else if(right || down) delta = 1;
            else if(ax < -.55f || ay < -.55f) delta = -1;
            else if(ax > .55f || ay > .55f) delta = 1;

            if(delta != 0) {
                eduniMoveWorldMapStageV20_8(delta);
                eduniWorldMapMoveAtV20_8 = now;
            }
        }


        public boolean onKeyDown(int keyCode, android.view.KeyEvent event) {
            if(eduniWorldMapKeyV20_8(keyCode, true)) return true;
            return super.onKeyDown(keyCode, event);
        }

        public boolean onKeyUp(int keyCode, android.view.KeyEvent event) {
            if(eduniWorldMapKeyV20_8(keyCode, false)) return true;
            return super.onKeyUp(keyCode, event);
        }

        void pressA() { if(showStageSelect){ if(mode != FIELD){ mode = FIELD; select = stageSelect; invalidate(); return; } eduniStartSelectedStageFromWorldMapV21_3(); return; }  if(showStageSelect && mode == FIELD){ startSelectedStage(); return; }  if(stageCompleteShown){ if(isFinalStage()){ finishFinalStageAndReturn(); return; } advanceStage(); stageInputLock = 18; return; } if(stageInputLock > 0){ return; }  if(showStartScreen){ startGameFromIntro(); return; }
            if (mode == FIELD) { catchBird(); return; }
            if (mode == QUIZ) { if (quizExit.isConfirming()) { resolveQuizExit(select == 1); } else answerJng001(); return; }
            if (mode == MISSION) { if (select == 0) mode = FIELD; else reset(); return; }
            if (mode == CLOSET) { String[] a = {"기본 복장","탐험 모자","반짝 안경","별빛 망토"}; outfitIndex = select; spawnSparks(px,py,Color.rgb(56,189,248),16); gameFeel("착용 완료", Color.rgb(56,189,248), 25); log = a[outfitIndex] + " 착용!"; postProgress("outfit_changed","옷장 착용"); playSfx(4); mode = FIELD; invalidate(); return; }
            if (mode == PAUSE) mode = FIELD;
        }
        void requestQuizExit() {
            if (mode != QUIZ || quiz == null) return;
            quizExit.requestExit();
            select = 0; // Continue is deliberately the safe default.
            log = "문제를 그만둘까요?";
            invalidate();
        }
        void resolveQuizExit(boolean quit) {
            QuizExitController.Decision decision = quizExit.confirm(quit);
            if (decision == QuizExitController.Decision.CONTINUE) { log = "문제를 계속 풀어보자."; invalidate(); return; }
            if (decision != QuizExitController.Decision.QUIT) return;
            // Do not award, penalize, or complete an encounter merely by leaving its quiz.
            quiz = null;
            mode = FIELD;
            select = 0;
            if (stageIndex == 0 && campEncounter.state() == EncounterDirector.State.LEARNING) campEncounter.reset();
            if (stageIndex == 1 && waterfallEncounter.state() == EncounterDirector.State.LEARNING) waterfallEncounter.reset();
            log = "탐험으로 돌아왔어. 새에게 다시 다가가서 A를 눌러봐.";
            invalidate();
        }
        boolean back() {
            // EDUNI_NATIVE_JUNGLE_BACK_TO_PORTAL_PATCH_V3_1
            // Popup mode: close popup only.
            // Field mode: finish NativeJungleActivity and return to portal.
            if (mode == QUIZ) { requestQuizExit(); return true; }
            if (mode != FIELD) { // EDUNI_NATIVE_JUNGLE_BACK_TO_PORTAL_PATCH_V3_2
                mode = FIELD;
                log = "탐험으로 돌아왔어.";
                invalidate();
                return true;
            }

            Context ctx = getContext();
            if (ctx instanceof Activity) {
                ((Activity) ctx).finish();
                return true;
            }
            return false;
        }

        void catchBird() {
            Bird b = nearest();
            if (b == null) { log = "새에게 더 가까이 가서 A!"; return; }
            if (stageIndex == 1) {
                AuthoredStageBirdRouter.Route waterfallRoute = authoredBirdRouter.route(waterfallWorld, nearestBirdIndex(), !birds.isEmpty() && birds.get(0).caught);
                if (waterfallRoute == AuthoredStageBirdRouter.Route.AUTHORED) {
                    if (!waterfallEncounter.canInteract()) { log = waterfallWorld.birdDisplayName + "의 노랫소리를 따라 " + waterfallWorld.landmark + " 가까이 가보자."; return; }
                    waterfallEncounter.beginLearning();
                    quiz = authoredQuiz(b, waterfallWorld);
                    select = 0;
                    mode = QUIZ;
                    log = waterfallWorld.birdDisplayName + "를 다시 보고 골라보자.";
                    return;
                }
            }
            CampBirdInteractionRouter.Route route = campBirdRouter.route(stageIndex == 0, nearestBirdIndex(), !birds.isEmpty() && birds.get(0).caught);
            if (route == CampBirdInteractionRouter.Route.AUTHORED_CAMP_BIRD) {
                if (!campEncounter.canInteract()) { log = "파랑새의 노랫소리를 따라 등불 길 가까이 가보자."; return; }
                campEncounter.beginLearning();
                quiz = campQuiz(b);
                select = 0;
                mode = QUIZ;
                log = "파랑새를 다시 보고 색을 골라보자.";
                return;
            }
            Quiz q = remoteQuizCache.takeOr(localQuiz());
            q.bird = b;
            quiz = q;
            select = 0;
            mode = QUIZ;
            log = "방향키로 정답 선택, A 확인";
            preloadRemoteQuiz();
        }
        int nearestBirdIndex() { int best = -1; double bd = 99; for (int i=0;i<birds.size();i++) { Bird b = birds.get(i); if (!b.caught) { double d = Math.hypot(px-b.x, py-b.y); if (d < .09 && d < bd) { best = i; bd = d; } } } return best; }
        Bird nearest() { int index = nearestBirdIndex(); return index < 0 ? null : birds.get(index); }
        boolean isCampBird(Bird bird) { return stageIndex == 0 && bird != null && !birds.isEmpty() && bird == birds.get(0); }
        Quiz campQuiz(Bird bird) { Quiz q = new Quiz(campWorld.quizQuestion, campWorld.quizOptions, campWorld.quizAnswer); q.bird = bird; return q; }
        Quiz authoredQuiz(Bird bird, StageWorldData world) { Quiz q = new Quiz(world.quizQuestion, world.quizOptions, world.quizAnswer); q.bird = bird; return q; }
        void answerJng001() {
            if (stageIndex == 1 && waterfallEncounter.state() == EncounterDirector.State.LEARNING) { answerWaterfallBird(); return; }
            if (stageIndex != 0 || campEncounter.state() != EncounterDirector.State.LEARNING) { answer(); return; }
            boolean correct = quiz != null && quiz.options[select].equals(quiz.answer);
            campEncounter.answer(correct);
            postQuizAttemptDetailed(correct);
            if (!correct) {
                playSfx(4);
                gameFeel("파랑새의 색을 다시 살펴보자.", Color.rgb(56,189,248), 25);
                log = "괜찮아. 파랑새를 다시 보고 골라보자.";
                return;
            }
            quiz.bird.caught = true;
            caughtBirds++;
            postProgress("camp_bluebird_discovered", campWorld.birdId);
            spawnSparks(quiz.bird.x, quiz.bird.y, Color.rgb(34,197,94), 24);
            playSfx(2);
            gameFeel(campWorld.birdDisplayName + "을 도감에 담았어!", Color.rgb(34,197,94), 45);
            log = campWorld.birdDisplayName + "이 도감에 들어왔어.";
            try { getContext().getSharedPreferences("eduni_jungle_reward_v24", 0).edit().putBoolean(campWorld.collectionKey, true).apply(); } catch(Exception ignored) {}
            campEncounter.finishCelebration();
            showRewardScreen(campWorld.rewardTitle, campWorld.rewardDescription, campWorld.rewardBadge, Color.rgb(34,197,94));
            mode = FIELD;
            quiz = null;
        }

        void answerWaterfallBird() {
            boolean correct = quiz != null && quiz.options[select].equals(quiz.answer);
            waterfallEncounter.answer(correct);
            postQuizAttemptDetailed(correct);
            if (!correct) {
                playSfx(4);
                gameFeel(waterfallWorld.birdDisplayName + "를 다시 살펴보자.", Color.rgb(56,189,248), 25);
                log = "괜찮아. " + waterfallWorld.birdDisplayName + "를 다시 보고 골라보자.";
                return;
            }
            quiz.bird.caught = true;
            caughtBirds++;
            postProgress(waterfallWorld.id + "_bird_discovered", waterfallWorld.birdId);
            spawnSparks(quiz.bird.x, quiz.bird.y, Color.rgb(34,197,94), 24);
            playSfx(2);
            gameFeel(waterfallWorld.birdDisplayName + "을 도감에 담았어!", Color.rgb(34,197,94), 45);
            log = waterfallWorld.birdDisplayName + "이 도감에 들어왔어.";
            try { getContext().getSharedPreferences("eduni_jungle_reward_v24", 0).edit().putBoolean(waterfallWorld.collectionKey, true).apply(); } catch(Exception ignored) {}
            waterfallEncounter.finishCelebration();
            showRewardScreen(waterfallWorld.rewardTitle, waterfallWorld.rewardDescription, waterfallWorld.rewardBadge, Color.rgb(34,197,94));
            mode = FIELD;
            quiz = null;
        }


        void postProgress(String eventType,String detail) {
            new Thread(() -> {
                java.net.HttpURLConnection conn = null;
                try {
                    org.json.JSONObject payload = new org.json.JSONObject();
                    payload.put("event_type", eventType);
                    payload.put("detail", detail);
                    payload.put("client_ts", System.currentTimeMillis());
                    payload.put("screen", mode);
                    payload.put("stars", foundStars);
                    payload.put("birds", caughtBirds);
                    payload.put("hearts", hearts);
                    payload.put("player_x", px);
                    payload.put("player_y", py);
                    payload.put("app", "eduni-native-jungle");
                    payload.put("patch", "v7-progress");

                    java.net.URL url = new java.net.URL(SERVER + "/jungle/api/progress/event");
                    conn = (java.net.HttpURLConnection)url.openConnection();
                    conn.setConnectTimeout(1200);
                    conn.setReadTimeout(1200);
                    conn.setRequestMethod("POST");
                    conn.setDoOutput(true);
                    conn.setRequestProperty("Content-Type","application/json; charset=UTF-8");
                    byte[] body = payload.toString().getBytes("UTF-8");
                    conn.getOutputStream().write(body);
                    conn.getResponseCode();
                } catch (Exception ignored) {
                    // 서버가 꺼져 있어도 게임은 계속 진행.
                } finally {
                    if (conn != null) conn.disconnect();
                }
            }).start();
        }

        Quiz fetchQuiz() {
            HttpURLConnection c = null;
            try {
                c = (HttpURLConnection)new URL(SERVER + "/jungle/api/quiz/random").openConnection();
                c.setConnectTimeout(1200); c.setReadTimeout(1200); c.setRequestMethod("GET");
                if (c.getResponseCode() < 200 || c.getResponseCode() >= 300) return null;
                BufferedReader br = new BufferedReader(new InputStreamReader(c.getInputStream(), "UTF-8"));
                StringBuilder sb = new StringBuilder(); String line; while ((line = br.readLine()) != null) sb.append(line);
                JSONObject o = new JSONObject(sb.toString());
                String text = first(o.optString("question"), o.optString("text"), o.optString("prompt"));
                String ans = first(o.optString("answer"), o.optString("correct"), o.optString("correct_answer"));
                JSONArray arr = o.optJSONArray("options"); if (arr == null) arr = o.optJSONArray("choices");
                if (text.length() == 0 || ans.length() == 0 || arr == null || arr.length() < 2) return null;
                String[] opts = new String[Math.min(4, arr.length())]; for (int i=0;i<opts.length;i++) opts[i] = arr.optString(i);
                return new Quiz(text, opts, ans);
            } catch(Exception ex) { return null; } finally { if (c != null) c.disconnect(); }
        }
        void preloadRemoteQuiz() {
            if (remoteQuizPreloadInFlight || remoteQuizCache.hasCachedRemote()) return;
            remoteQuizPreloadInFlight = true;
            new Thread(() -> {
                Quiz remote = fetchQuiz();
                remoteQuizCache.cacheRemote(remote);
                remoteQuizPreloadInFlight = false;
            }).start();
        }
        String first(String... xs) { for (String x: xs) if (x != null && x.trim().length() > 0) return x.trim(); return ""; }
        Quiz localQuiz() { Quiz[] qs = { new Quiz("[수학] 7 + 5 = ?", new String[]{"10","11","12","13"}, "12"), new Quiz("[상식] 신호등에서 건너도 되는 색은?", new String[]{"빨간색","초록색","노란색","검은색"}, "초록색"), new Quiz("[영어] apple의 뜻은?", new String[]{"사과","바나나","포도","수박"}, "사과") }; return qs[(int)(System.currentTimeMillis()%qs.length)]; }
        void answer() { if (quiz == null) return; if (quiz.options[select].equals(quiz.answer)) { quiz.bird.caught = true; caughtBirds++; postQuizAttemptDetailed(true); postProgress("quiz_correct","정답"); spawnSparks(quiz.bird.x,quiz.bird.y,Color.rgb(34,197,94),24); playSfx(2); gameFeel("도감 등록!", Color.rgb(34,197,94), 45); log = quiz.bird.icon + " " + quiz.bird.name + " 도감 등록!"; mode = FIELD; quiz = null; } else { hearts = Math.max(1, hearts-1); postQuizAttemptDetailed(false); postProgress("quiz_wrong","오답"); spawnSparks(px,py,Color.rgb(248,113,113),10); playSfx(3); gameFeel("다시 도전!", Color.rgb(248,113,113), 55); log = "아쉬워. 다시 골라봐! 체력 " + hearts; } }


        void gameFeel(String text,int color,int buzzMs) {
            feedbackText = text;
            feedbackColor = color;
            feedbackLife = 55;
            feedbackAlpha = 1f;
            buzz(buzzMs);
            invalidate();
        }

        void tickEffects() {
            if (feedbackLife > 0) {
                feedbackLife--;
                feedbackAlpha = Math.max(0f, feedbackLife / 55f);
            }
        }

        void buzz(int ms) {
            try {
                android.os.Vibrator v = (android.os.Vibrator)getContext().getSystemService(android.content.Context.VIBRATOR_SERVICE);
                if (v == null) return;
                if (android.os.Build.VERSION.SDK_INT >= 26) {
                    v.vibrate(android.os.VibrationEffect.createOneShot(ms, android.os.VibrationEffect.DEFAULT_AMPLITUDE));
                } else {
                    v.vibrate(ms);
                }
            } catch (Exception ignored) {}
        }

        void drawFeedback(Canvas c,int w,int h) {
            if (feedbackLife <= 0 || feedbackText == null || feedbackText.length() == 0) return;

            int a = Math.max(0, Math.min(210, (int)(210 * feedbackAlpha)));
            int textA = Math.max(0, Math.min(255, (int)(255 * feedbackAlpha)));

            p.setStyle(Paint.Style.FILL);
            p.setColor(Color.argb(a, Color.red(feedbackColor), Color.green(feedbackColor), Color.blue(feedbackColor)));
            RectF r = new RectF(w * .37f, h * .11f, w * .63f, h * .20f);
            c.drawRoundRect(r, 28, 28, p);

            p.setColor(Color.argb(textA,255,255,255));
            uiText(26);
            p.setFakeBoldText(true);
            c.drawText(feedbackText, r.left + 32, r.centerY() + 9, p);
        }


        android.media.ToneGenerator getTone() {
            if (tone == null) {
                try {
                    tone = new android.media.ToneGenerator(android.media.AudioManager.STREAM_MUSIC, 70);
                } catch (Exception ignored) {}
            }
            return tone;
        }

        void playSfx(int kind) {
            try {
                android.media.ToneGenerator t = getTone();
                if (t == null) return;

                if (kind == 1) {
                    // star
                    t.startTone(android.media.ToneGenerator.TONE_PROP_ACK, 90);
                } else if (kind == 2) {
                    // correct / catch
                    t.startTone(android.media.ToneGenerator.TONE_PROP_BEEP2, 140);
                } else if (kind == 3) {
                    // wrong
                    t.startTone(android.media.ToneGenerator.TONE_PROP_NACK, 170);
                } else if (kind == 4) {
                    // menu / closet
                    t.startTone(android.media.ToneGenerator.TONE_PROP_PROMPT, 80);
                }
            } catch (Exception ignored) {}
        }


        void spawnSparks(float nx,float ny,int color,int count) {
            for (int i=0;i<count;i++) {
                double a = Math.random() * Math.PI * 2.0;
                float sp = .0028f + (float)Math.random() * .0065f;
                float vx = (float)Math.cos(a) * sp;
                float vy = (float)Math.sin(a) * sp - .003f;
                int life = 24 + (int)(Math.random() * 24);
                sparks.add(new Spark(nx,ny,vx,vy,life,color));
            }
        }

        void updateSparks() {
            for (int i=sparks.size()-1;i>=0;i--) {
                Spark s = sparks.get(i);
                s.x += s.vx;
                s.y += s.vy;
                s.vy += .00045f;
                s.life--;
                if (s.life <= 0) sparks.remove(i);
            }
        }

        void drawSparks(Canvas c,int w,int h) {
            if (sparks.isEmpty()) return;
            p.setStyle(Paint.Style.FILL);
            for (Spark s: sparks) {
                int alpha = Math.max(0, Math.min(255, s.life * 8));
                p.setColor(Color.argb(alpha, Color.red(s.color), Color.green(s.color), Color.blue(s.color)));
                float x = s.x * w;
                float y = s.y * h;
                float r = 4 + Math.max(0, s.life) * .10f;
                c.drawCircle(x,y,r,p);

                if (s.life % 3 == 0) {
                    uiText(16);
                    p.setFakeBoldText(true);
                    c.drawText("✦",x+5,y-5,p);
                }
            }
        }


        void showClearBanner(String title,String sub,int color) {
            clearTitle = title;
            clearSub = sub;
            clearColor = color;
            clearLife = 150;
            spawnSparks(.50f,.38f,color,56);
            playSfx(2);
            buzz(80);
            invalidate();
        }

        void tickClearBanner() {
            if (clearLife > 0) clearLife--;
        }

        void drawClearBanner(Canvas c,int w,int h) {
            if (clearLife <= 0) return;

            float a = Math.min(1f, clearLife / 40f);
            int bgA = Math.max(0, Math.min(190, (int)(190 * a)));
            int textA = Math.max(0, Math.min(255, (int)(255 * a)));

            p.setStyle(Paint.Style.FILL);
            p.setColor(Color.argb(bgA, 15, 23, 42));
            c.drawRect(0,0,w,h,p);

            RectF box = new RectF(w*.22f,h*.24f,w*.78f,h*.58f);
            p.setColor(Color.argb(Math.max(0, Math.min(245, (int)(245*a))), 255, 255, 255));
            c.drawRoundRect(box,36,36,p);

            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(8);
            p.setColor(Color.argb(textA, Color.red(clearColor), Color.green(clearColor), Color.blue(clearColor)));
            c.drawRoundRect(box,36,36,p);
            p.setStyle(Paint.Style.FILL);

            p.setColor(Color.argb(textA, Color.red(clearColor), Color.green(clearColor), Color.blue(clearColor)));
            uiText(44);
            p.setFakeBoldText(true);
            c.drawText(clearTitle, box.left + 46, box.top + 92, p);

            p.setColor(Color.argb(textA, 30, 41, 59));
            uiText(26);
            p.setFakeBoldText(false);
            c.drawText(clearSub, box.left + 50, box.top + 150, p);

            p.setColor(Color.argb(textA, 250, 204, 21));
            uiText(34);
            p.setFakeBoldText(true);
            c.drawText("★  ★  ★", box.right - 170, box.top + 92, p);
        }

        void checkClearBonus() {
            if (foundStars >= 5 && !starClearBonus) {
                starClearBonus = true;
                spawnSparks(.50f,.35f,Color.rgb(250,204,21),36);
                log = "별 미션 완료! 대단해!"; postProgress("stars_complete","별 5개 완료"); showClearBanner("별 미션 완료!", "별 5개를 모두 찾았어!", Color.rgb(250,204,21)); showRewardScreen("별 미션 완료!","반짝별 5개를 모두 찾았어!","⭐",Color.rgb(250,204,21));
                playSfx(2);
                buzz(45);
            }
            if (caughtBirds >= 4 && !birdClearBonus) {
                birdClearBonus = true;
                spawnSparks(.50f,.42f,Color.rgb(34,197,94),42);
                log = "새 도감 완성! 최고야!"; postProgress("birds_complete","새 도감 완성"); showClearBanner("새 도감 완성!", "새 4마리를 모두 등록했어!", Color.rgb(34,197,94)); showRewardScreen("새 도감 완성!","새 친구 4마리를 도감에 등록했어!","🐦",Color.rgb(34,197,94));
                playSfx(2);
                buzz(65);
            }
        }

        void update() { if(eduniWorldMapActiveV20_10()){ showStageSelect = true; eduniUpdateWorldMapSelectionV20_8(); invalidate(); return; }  if(stageInputLock > 0) stageInputLock--; tickRewardScreen(); tickGuideOverlay(); tickStageProgression(); updateSparks(); tickClearBanner(); checkClearBonus(); tickEffects();
            if (mode != FIELD) return;
            long now = android.os.SystemClock.uptimeMillis();
            float dt = lastMovementUpdateMs == 0L ? .016f : Math.min(.05f, (now - lastMovementUpdateMs) / 1000f);
            lastMovementUpdateMs = now;
            float x = inputActions.moveX(), y = inputActions.moveY(); double l = Math.hypot(x,y); if (l > 1) { x/=l; y/=l; }
            if(Math.hypot(x, y) < .01 && eduniTouchTargetActiveV26_4) {
                float tx = eduniTouchTargetXV26_4 - px;
                float ty = eduniTouchTargetYV26_4 - py;
                double tl = Math.hypot(tx, ty);
                if(tl < .012) {
                    eduniTouchTargetActiveV26_4 = false;
                } else {
                    x = (float)(tx / tl);
                    y = (float)(ty / tl);
                }
            }
            float digitalSpeedRatio = inputActions.hasKeyDpadIntent() && digitalDpadDownAtMs >= 0L
                    ? digitalMovement.speedRatioForHeldMs(now - digitalDpadDownAtMs) : 1f;
            PlayerLocomotionController.Step step = inputActions.hasDigitalDpadIntent()
                    ? locomotion.updateDigital(dt, x, y, digitalSpeedRatio) : locomotion.update(dt, x, y);
            eduniLastMoveXV26_6 = step.facingX;
            eduniLastMoveYV26_6 = step.facingY;
            playerMvpWalking = step.moving;
            eduniMoveWithMaskV26_3(step.dx, step.dy);
            if (stageIndex == 0 && !birds.isEmpty()) {
                EncounterDirector.State before = campEncounter.state();
                campEncounter.observeDistance((float)Math.hypot(px - campWorld.birdX, py - campWorld.birdY));
                if (before == EncounterDirector.State.EXPLORE && campEncounter.state() == EncounterDirector.State.NOTICE) {
                    playSfx(4);
                    log = campWorld.discoveryCue;
                }
            } else if (stageIndex == 1 && !birds.isEmpty()) {
                EncounterDirector.State before = waterfallEncounter.state();
                waterfallEncounter.observeDistance((float)Math.hypot(px - waterfallWorld.birdX, py - waterfallWorld.birdY));
                if (before == EncounterDirector.State.EXPLORE && waterfallEncounter.state() == EncounterDirector.State.NOTICE) {
                    playSfx(4);
                    log = waterfallWorld.discoveryCue;
                }
            }
            StageWorldData activeWorld = stageIndex == 1 ? waterfallWorld : campWorld;
            EncounterDirector activeEncounter = stageIndex == 1 ? waterfallEncounter : campEncounter;
            adventureFrame = adventureCamera.update(px, py, activeWorld, activeEncounter.state() == EncounterDirector.State.COMPLETE);
            for (Dot d: stars) if (!d.done && Math.hypot(px-d.x, py-d.y) < .055) { d.done = true; foundStars++; postProgress("star_found","별 획득"); spawnSparks(d.x,d.y,Color.rgb(250,204,21),18); /* EDUNI_NATIVE_JUNGLE_PARTICLES_PATCH_V6_2 */ log = "별을 찾았어! " + foundStars + "/5"; playSfx(1); gameFeel("별 +1", Color.rgb(250,204,21), 28); }
        }
        float clamp(float v, float a, float b) { return Math.max(a, Math.min(b, v)); }

        RectF eduniMapRectV26_4(int w, int h) {
            if(w <= 0 || h <= 0) return new RectF(0, 0, w, h);
            float aspect = 16f / 9f;
            if (stageIndex != 0) try {
                android.graphics.Bitmap b = eduniPickHardMapV26_2();
                if(b != null && !b.isRecycled() && b.getWidth() > 0 && b.getHeight() > 0) {
                    aspect = b.getWidth() / (float)b.getHeight();
                }
            } catch(Exception ignored) {}
            float dw = w;
            float dh = dw / aspect;
            if(dh > h) {
                dh = h;
                dw = dh * aspect;
            }
            float left = (w - dw) * .5f;
            float top = (h - dh) * .5f;
            return new RectF(left, top, left + dw, top + dh);
        }

        float eduniScreenXV26_4(float nx, int w, int h) {
            RectF r = eduniMapRectV26_4(w, h);
            return r.left + nx * r.width();
        }

        float eduniScreenYV26_4(float ny, int w, int h) {
            RectF r = eduniMapRectV26_4(w, h);
            return r.top + ny * r.height();
        }

        // EDUNI_NATIVE_JUNGLE_MOVE_MASK_PATCH_V26_3
        void eduniLoadMoveMaskV26_3() {
            if(eduniMoveMaskLoadedV26_3) return;
            eduniMoveMaskLoadedV26_3 = true;
            java.util.ArrayList<android.graphics.Bitmap> list = new java.util.ArrayList<>();
            int[] ids = new int[] {
                    getResources().getIdentifier("eduni_jungle_asset_mask_00", "drawable", getContext().getPackageName()),
                    getResources().getIdentifier("eduni_jungle_asset_mask_01", "drawable", getContext().getPackageName()),
                    getResources().getIdentifier("eduni_jungle_asset_mask_02", "drawable", getContext().getPackageName()),
                    getResources().getIdentifier("eduni_jungle_asset_mask_03", "drawable", getContext().getPackageName()),
                    getResources().getIdentifier("eduni_jungle_asset_mask_04", "drawable", getContext().getPackageName()),
                    getResources().getIdentifier("eduni_jungle_asset_mask_05", "drawable", getContext().getPackageName()),
                    getResources().getIdentifier("eduni_jungle_asset_mask_06", "drawable", getContext().getPackageName()),
                    getResources().getIdentifier("eduni_jungle_asset_mask_07", "drawable", getContext().getPackageName())
            };
            for(int id : ids) {
                if(id == 0) continue;
                try {
                    android.graphics.Bitmap b = android.graphics.BitmapFactory.decodeResource(getResources(), id);
                    if(b != null) list.add(b);
                } catch(Exception ignored) {}
            }
            eduniMoveMasksV26_3 = list.toArray(new android.graphics.Bitmap[0]);
        }

        android.graphics.Bitmap eduniPickMoveMaskV26_3() {
            eduniLoadMoveMaskV26_3();
            if(eduniMoveMasksV26_3 == null || eduniMoveMasksV26_3.length == 0) return null;
            try {
                int stage = stageIndex;
                if(stage < 0) stage = 0;
                return eduniMoveMasksV26_3[stage % eduniMoveMasksV26_3.length];
            } catch(Exception ignored) {}
            return eduniMoveMasksV26_3[0];
        }

        float eduniDistToSegmentV26_5(float px, float py, float ax, float ay, float bx, float by) {
            float vx = bx - ax, vy = by - ay;
            float wx = px - ax, wy = py - ay;
            float len2 = vx * vx + vy * vy;
            float t = len2 <= .0001f ? 0f : (wx * vx + wy * vy) / len2;
            t = clamp(t, 0f, 1f);
            float dx = px - (ax + vx * t);
            float dy = py - (ay + vy * t);
            return (float)Math.hypot(dx, dy);
        }

        void eduniNearestSegmentV26_5(float px, float py, float ax, float ay, float bx, float by, float[] best) {
            float vx = bx - ax, vy = by - ay;
            float wx = px - ax, wy = py - ay;
            float len2 = vx * vx + vy * vy;
            float t = len2 <= .0001f ? 0f : (wx * vx + wy * vy) / len2;
            t = clamp(t, 0f, 1f);
            float qx = ax + vx * t;
            float qy = ay + vy * t;
            float d = (float)Math.hypot(px - qx, py - qy);
            if(d < best[2]) {
                best[0] = qx;
                best[1] = qy;
                best[2] = d;
            }
        }

        float[] eduniNearestPathPointV26_5(float nx, float ny) {
            float[] best = new float[] { nx, ny, eduniCanStandV26_3(nx, ny) ? 0f : 999f };
            int s = stageIndex % 3;
            if(s == 0) {
                for (CampVisualGeometry.Segment segment : CampVisualGeometry.pathSegments()) {
                    eduniNearestSegmentV26_5(nx, ny, segment.ax, segment.ay, segment.bx, segment.by, best);
                }
            } else if(s == 1) {
                eduniNearestSegmentV26_5(nx,ny,.16f,.78f,.30f,.66f,best);
                eduniNearestSegmentV26_5(nx,ny,.30f,.66f,.22f,.42f,best);
                eduniNearestSegmentV26_5(nx,ny,.22f,.42f,.47f,.28f,best);
                eduniNearestSegmentV26_5(nx,ny,.47f,.28f,.68f,.38f,best);
                eduniNearestSegmentV26_5(nx,ny,.68f,.38f,.80f,.64f,best);
                eduniNearestSegmentV26_5(nx,ny,.42f,.62f,.80f,.64f,best);
            } else {
                eduniNearestSegmentV26_5(nx,ny,.12f,.62f,.34f,.44f,best);
                eduniNearestSegmentV26_5(nx,ny,.34f,.44f,.54f,.48f,best);
                eduniNearestSegmentV26_5(nx,ny,.54f,.48f,.75f,.30f,best);
                eduniNearestSegmentV26_5(nx,ny,.54f,.48f,.66f,.78f,best);
                eduniNearestSegmentV26_5(nx,ny,.26f,.78f,.66f,.78f,best);
            }
            best[0] = clamp(best[0], .06f, .94f);
            best[1] = clamp(best[1], .12f, .90f);
            return best;
        }

        boolean eduniStagePathContainsV26_5(float nx, float ny) {
            if(nx < .03f || nx > .97f || ny < .08f || ny > .94f) return false;
            int s = stageIndex % 3;
            float r = .070f;
            if(s == 0) {
                return CampVisualGeometry.contains(nx, ny);
            }
            if(s == 1) {
                return eduniDistToSegmentV26_5(nx,ny,.16f,.78f,.30f,.66f) < r
                        || eduniDistToSegmentV26_5(nx,ny,.30f,.66f,.22f,.42f) < r
                        || eduniDistToSegmentV26_5(nx,ny,.22f,.42f,.47f,.28f) < r
                        || eduniDistToSegmentV26_5(nx,ny,.47f,.28f,.68f,.38f) < r
                        || eduniDistToSegmentV26_5(nx,ny,.68f,.38f,.80f,.64f) < r
                        || eduniDistToSegmentV26_5(nx,ny,.42f,.62f,.80f,.64f) < r;
            }
            return eduniDistToSegmentV26_5(nx,ny,.12f,.62f,.34f,.44f) < r
                    || eduniDistToSegmentV26_5(nx,ny,.34f,.44f,.54f,.48f) < r
                    || eduniDistToSegmentV26_5(nx,ny,.54f,.48f,.75f,.30f) < r
                    || eduniDistToSegmentV26_5(nx,ny,.54f,.48f,.66f,.78f) < r
                    || eduniDistToSegmentV26_5(nx,ny,.26f,.78f,.66f,.78f) < r;
        }

        boolean eduniCanStandV26_3(float nx, float ny) {
            return eduniStagePathContainsV26_5(nx, ny);
        }

        void eduniMoveWithMaskV26_3(float dx, float dy) {
            float nx = clamp(px + dx, .06f, .94f);
            float ny = clamp(py + dy, .16f, .88f);
            if(eduniCanStandV26_3(nx, ny)) {
                px = nx;
                py = ny;
                return;
            }

            if(eduniCanStandV26_3(nx, py)) {
                px = nx;
                return;
            }

            if(eduniCanStandV26_3(px, ny)) {
                py = ny;
            }
        }

        void eduniApplyStageSpawnV26_3() {
            int i = stageIndex % 3;
            if(i == 0) { px = .48f; py = .88f; }
            else if(i == 1) { px = .16f; py = .78f; }
            else { px = .12f; py = .62f; }
        }

        void eduniPopulateStageObjectsV26_5() {
            int s = stageIndex % 3;
            if(s == 0) {
                stars.add(new Dot(.48f,.22f)); stars.add(new Dot(.18f,.30f)); stars.add(new Dot(.32f,.54f)); stars.add(new Dot(.64f,.54f)); stars.add(new Dot(.84f,.42f));
                birds.add(new Bird(campWorld.birdX,campWorld.birdY,campWorld.birdDisplayName,campWorld.birdIcon)); birds.add(new Bird(.14f,.42f,"초록새","🦜")); birds.add(new Bird(.47f,.66f,"노랑새","🐤")); birds.add(new Bird(.83f,.54f,"빨강새","🐦"));
            } else if(s == 1) {
                stars.add(new Dot(.24f,.42f)); stars.add(new Dot(.30f,.66f)); stars.add(new Dot(.48f,.28f)); stars.add(new Dot(.68f,.38f)); stars.add(new Dot(.78f,.64f));
                birds.add(new Bird(waterfallWorld.birdX,waterfallWorld.birdY,waterfallWorld.birdDisplayName,waterfallWorld.birdIcon));
                birds.add(new Bird(.22f,.72f,"파랑새","🐦")); birds.add(new Bird(.38f,.58f,"초록새","🦜")); birds.add(new Bird(.58f,.34f,"노랑새","🐤")); birds.add(new Bird(.72f,.52f,"빨강새","🐦"));
            } else {
                stars.add(new Dot(.34f,.44f)); stars.add(new Dot(.54f,.48f)); stars.add(new Dot(.74f,.30f)); stars.add(new Dot(.66f,.78f)); stars.add(new Dot(.30f,.78f));
                birds.add(new Bird(.24f,.52f,"파랑새","🐦")); birds.add(new Bird(.46f,.46f,"초록새","🦜")); birds.add(new Bird(.62f,.62f,"노랑새","🐤")); birds.add(new Bird(.70f,.34f,"빨강새","🐦"));
            }
        }

        @Override protected void onDraw(Canvas c) {
            int w = getWidth(), h = getHeight();
            p.setStyle(Paint.Style.FILL);
            p.setColor(Color.rgb(21,83,45));
            c.drawRect(0,0,w,h,p);

            /*
             * EDUNI_NATIVE_JUNGLE_MAP_DRAW_ORDER_FIX_PATCH_V26_2
             * drawJungleDecor/worldMap v25 were covering the uploaded bitmap map.
             * Keep decoration setup first, then draw the new bitmap map on top of it.
             */
            drawJungleDecor(c,w,h);
            drawEduniHardMapBackgroundV26_2(c,w,h); /* EDUNI_NATIVE_JUNGLE_MAP_DRAW_ORDER_FIX_PATCH_V26_2_CALL */

            drawStageAtmosphere(c,w,h);
            drawEduniSpriteAssets(c,w,h);
            drawJng001AdventureFraming(c,w,h);
            drawInteractionHint(c,w,h);
            drawSparks(c,w,h);
            hud(c,w,h);
            drawQuestChips(c,w,h);
            drawClearBanner(c,w,h);
            drawRewardScreen(c,w,h);
            drawFloatingControls(c,w,h);
            drawGuideOverlay(c,w,h);
            drawStageBadge(c,w,h);
            drawStageGoalPanel(c,w,h);
            drawStageCompleteOverlay(c,w,h);
            drawStageSelectScreen(c,w,h);
            drawStartScreen(c,w,h);

            if (mode == QUIZ) quiz(c,w,h);
            else if (mode == MISSION) mission(c,w,h);
            else if (mode == CLOSET) closet(c,w,h);
            else if (mode == PAUSE) panel(c,w,h,"일시정지");
        }


        // EDUNI_NATIVE_JUNGLE_ASSET_WIRING_PATCH_V25
        android.graphics.Bitmap eduniWorldMapBitmapV25 = null;
        boolean eduniWorldMapBitmapLoadedV25 = false;

        void drawEduniWorldMapBackgroundV25(Canvas c,int w,int h) {
            if(showStartScreen || showStageSelect) return;

            if(!eduniWorldMapBitmapLoadedV25) {
                eduniWorldMapBitmapLoadedV25 = true;
                try {
                    int id = getResources().getIdentifier("eduni_jungle_world_map", "drawable", getContext().getPackageName());
                    if(id != 0) eduniWorldMapBitmapV25 = android.graphics.BitmapFactory.decodeResource(getResources(), id);
                } catch(Exception ignored) {}
            }

            if(eduniWorldMapBitmapV25 == null) return;

            android.graphics.Rect src = new android.graphics.Rect(0, 0, eduniWorldMapBitmapV25.getWidth(), eduniWorldMapBitmapV25.getHeight());
            android.graphics.RectF dst = new android.graphics.RectF(40, 86, w - 40, h - 34);

            p.setStyle(Paint.Style.FILL);
            c.drawBitmap(eduniWorldMapBitmapV25, src, dst, p);

            p.setColor(Color.argb(38, 0, 0, 0));
            c.drawRoundRect(dst, 34, 34, p);
        }

        void drawJungleDecor(Canvas c,int w,int h) {
            // EDUNI_NATIVE_JUNGLE_VISUAL_POLISH_PATCH_V10
            long now = System.currentTimeMillis();

            p.setStyle(Paint.Style.FILL);
            p.setColor(Color.rgb(20,83,45));
            c.drawRect(0,0,w,h,p);

            p.setColor(Color.rgb(22,101,52));
            for(int i=0;i<8;i++){
                float x = (i*173 + (now/90)%120) % (w+160) - 80;
                float y = h*(.16f + (i%4)*.15f);
                c.drawCircle(x,y,62+(i%3)*18,p);
            }

            p.setColor(Color.rgb(34,197,94));
            c.drawRoundRect(new RectF(36,88,w-36,h-44),38,38,p);

            p.setColor(Color.rgb(187,247,208));
            android.graphics.Path path = new android.graphics.Path();
            path.moveTo(w*.02f,h*.70f);
            path.cubicTo(w*.25f,h*.56f,w*.34f,h*.82f,w*.52f,h*.60f);
            path.cubicTo(w*.70f,h*.38f,w*.86f,h*.53f,w*.98f,h*.34f);
            path.lineTo(w*.98f,h*.46f);
            path.cubicTo(w*.83f,h*.64f,w*.72f,h*.52f,w*.56f,h*.72f);
            path.cubicTo(w*.35f,h*.96f,w*.23f,h*.74f,w*.02f,h*.86f);
            path.close();
            c.drawPath(path,p);

            for(int i=0;i<18;i++){
                float x = ((i*97)%1000)/1000f*w;
                float y = (0.18f+((i*53)%650)/1000f)*h;
                if(i%3==0){
                    p.setColor(Color.rgb(21,128,61));
                    c.drawOval(new RectF(x-16,y-8,x+18,y+10),p);
                } else if(i%3==1){
                    p.setColor(Color.rgb(134,239,172));
                    c.drawCircle(x,y,8,p);
                } else {
                    p.setColor(Color.argb(135,255,255,255));
                    c.drawCircle(x,y,5,p);
                }
            }

            RectF sign = new RectF(w*.04f,h*.18f,w*.20f,h*.30f);
            p.setColor(Color.rgb(120,53,15));
            c.drawRoundRect(sign,16,16,p);
            p.setColor(Color.rgb(254,243,199));
            c.drawRoundRect(new RectF(sign.left+6,sign.top+6,sign.right-6,sign.bottom-6),12,12,p);
            p.setColor(Color.rgb(146,64,14));
            uiText(17);
            p.setFakeBoldText(true);
            c.drawText("오늘의 탐험",sign.left+20,sign.top+36,p);
            uiText(14);
            p.setFakeBoldText(false);
            c.drawText("새와 별을 찾아요",sign.left+18,sign.top+63,p);
        }

        void drawProgressBar(Canvas c,float x,float y,float w,float h,float ratio,int color,String label) {
            p.setStyle(Paint.Style.FILL);
            p.setColor(Color.argb(80,15,23,42));
            c.drawRoundRect(new RectF(x,y,x+w,y+h),h/2,h/2,p);
            p.setColor(color);
            c.drawRoundRect(new RectF(x,y,x+w*Math.max(0f,Math.min(1f,ratio)),y+h),h/2,h/2,p);
            p.setColor(Color.rgb(15,23,42));
            uiText(14);
            p.setFakeBoldText(true);
            c.drawText(label,x+8,y+h-6,p);
        }

        void drawInteractionHint(Canvas c,int w,int h) {
            if (mode != FIELD) return;
            if (stageIndex == 1 && nearestBirdIndex() == 0 && !birds.isEmpty() && !birds.get(0).caught) { drawWaterfallInteractionHint(c,w,h); return; }
            Bird b = nearest();
            if (b == null) return;
            if (stageIndex == 0 && isCampBird(b)) { drawJng001InteractionHint(c,w,h); return; }

            float x = px*w;
            float y = py*h - 72;
            float pulse = (float)(Math.sin(System.currentTimeMillis()/140.0)*4.0);

            RectF bubble = new RectF(x-82,y-34+pulse,x+82,y+12+pulse);
            p.setStyle(Paint.Style.FILL);
            p.setColor(Color.argb(230,255,255,255));
            c.drawRoundRect(bubble,22,22,p);
            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(4);
            p.setColor(Color.rgb(250,204,21));
            c.drawRoundRect(bubble,22,22,p);
            p.setStyle(Paint.Style.FILL);

            p.setColor(Color.rgb(15,23,42));
            uiText(18);
            p.setFakeBoldText(true);
            c.drawText("A  새 잡기",bubble.left+28,bubble.top+30,p);
        }

        void drawQuestChips(Canvas c,int w,int h) {
            if (stageIndex == 0 && !showStartScreen && !showStageSelect) { drawJng001Objective(c,w,h); return; }
            if (stageIndex == 1 && !showStartScreen && !showStageSelect) { drawWaterfallObjective(c,w,h); return; }
            float y = 84;
            RectF chip = new RectF(w-330,y,w-28,y+46);
            p.setStyle(Paint.Style.FILL);
            p.setColor(Color.argb(220,255,255,255));
            c.drawRoundRect(chip,22,22,p);
            p.setColor(Color.rgb(15,118,110));
            uiText(17);
            p.setFakeBoldText(true);
            c.drawText("미션  새 "+caughtBirds+"/"+targetBirds()+"   별 "+foundStars+"/"+targetStars(),chip.left+22,chip.top+30,p);
        }


        void drawJng001AdventureFraming(Canvas c,int w,int h) {
            if (stageIndex != 0 || showStartScreen || showStageSelect || adventureFrame == null) return;
            // Camp landmark and discovery read are rendered at their authored world coordinates.
        }

        void drawJng001InteractionHint(Canvas c,int w,int h) {
            if (mode != FIELD || !campEncounter.canInteract()) return;
            float x = eduniScreenXV26_4(px,w,h), y = eduniScreenYV26_4(py,w,h) - 72;
            RectF bubble = new RectF(x-116,y-34,x+116,y+12);
            p.setStyle(Paint.Style.FILL); p.setColor(Color.argb(230,255,255,255)); c.drawRoundRect(bubble,22,22,p);
            p.setStyle(Paint.Style.STROKE); p.setStrokeWidth(4); p.setColor(Color.rgb(250,204,21)); c.drawRoundRect(bubble,22,22,p);
            p.setStyle(Paint.Style.FILL); p.setColor(Color.rgb(15,23,42)); uiText(17); p.setFakeBoldText(true);
            c.drawText(inputActions.inputMode() == InputActionMapper.InputMode.TOUCH ? "A를 눌러 관찰하기" : "A  파랑새 관찰",bubble.left+20,bubble.top+29,p);
        }

        void drawWaterfallInteractionHint(Canvas c,int w,int h) {
            if (mode != FIELD || !waterfallEncounter.canInteract()) return;
            float x = eduniScreenXV26_4(px,w,h), y = eduniScreenYV26_4(py,w,h) - 72;
            RectF bubble = new RectF(x-116,y-34,x+116,y+12);
            p.setStyle(Paint.Style.FILL); p.setColor(Color.argb(230,255,255,255)); c.drawRoundRect(bubble,22,22,p);
            p.setStyle(Paint.Style.STROKE); p.setStrokeWidth(4); p.setColor(Color.rgb(250,204,21)); c.drawRoundRect(bubble,22,22,p);
            p.setStyle(Paint.Style.FILL); p.setColor(Color.rgb(15,23,42)); uiText(17); p.setFakeBoldText(true);
            c.drawText(inputActions.inputMode() == InputActionMapper.InputMode.TOUCH ? "A를 눌러 관찰하기" : "A  " + waterfallWorld.birdDisplayName + " 관찰",bubble.left+20,bubble.top+29,p);
        }

        void drawJng001Objective(Canvas c,int w,int h) {
            RectF chip = new RectF(w*.27f,24,w*.73f,72);
            p.setStyle(Paint.Style.FILL); p.setColor(Color.argb(225,255,255,255)); c.drawRoundRect(chip,24,24,p);
            p.setColor(Color.rgb(15,118,110)); uiText(16); p.setFakeBoldText(true);
            String text;
            text = campEncounter.state() == EncounterDirector.State.COMPLETE ? "목표 완료 — 캠프 등불로 돌아가자" : campWorld.objective;
            c.drawText(text,chip.left+18,chip.top+31,p);
        }

        void drawWaterfallObjective(Canvas c,int w,int h) {
            RectF chip = new RectF(w*.27f,24,w*.73f,72);
            p.setStyle(Paint.Style.FILL); p.setColor(Color.argb(225,255,255,255)); c.drawRoundRect(chip,24,24,p);
            p.setColor(Color.rgb(15,118,110)); uiText(16); p.setFakeBoldText(true);
            String text = waterfallEncounter.state() == EncounterDirector.State.COMPLETE ? "목표 완료 — " + waterfallWorld.landmark + "로 돌아가자" : waterfallWorld.objective;
            c.drawText(text,chip.left+18,chip.top+31,p);
        }

        void drawJng001Controls(Canvas c,int w,int h) {
            if (inputActions.inputMode() == InputActionMapper.InputMode.CONTROLLER) {
                RectF r = new RectF(24,86,420,150); p.setStyle(Paint.Style.FILL); p.setColor(Color.argb(185,15,23,42)); c.drawRoundRect(r,22,22,p);
                p.setColor(Color.WHITE); uiText(14); p.setFakeBoldText(true); c.drawText("A 관찰   B 돌아가기   X 미션   Y 옷장   Start 일시정지",r.left+14,r.top+32,p); return;
            }
            float radius = Math.min(w,h)*.12f, sx = w*.16f, sy = h*.80f, ax = w*.86f, ay = h*.80f;
            p.setStyle(Paint.Style.FILL); p.setColor(Color.argb(95,15,23,42)); c.drawCircle(sx,sy,radius,p);
            p.setStyle(Paint.Style.STROKE); p.setStrokeWidth(4); p.setColor(Color.argb(190,255,255,255)); c.drawCircle(sx,sy,radius,p);
            p.setStyle(Paint.Style.FILL); p.setColor(Color.WHITE); uiText(14); p.setFakeBoldText(true); c.drawText("이동",sx-21,sy+6,p);
            p.setColor(Color.rgb(14,165,233)); c.drawCircle(ax,ay,radius*.72f,p); p.setColor(Color.WHITE); uiText(22); c.drawText("A",ax-8,ay+8,p);
            uiText(11); c.drawText("관찰",ax-14,ay+radius*.72f+18,p);
        }

        void ensureEduniSprites() {
            if (playerMvpSpritesLoaded) return;
            playerMvpSpritesLoaded = true;
            android.content.res.Resources res = getResources();
            String pkg = getContext().getPackageName();
            int playerId = res.getIdentifier("eduni_jungle_player","drawable",pkg);
            int birdId = res.getIdentifier("eduni_jungle_bird","drawable",pkg);
            int starId = res.getIdentifier("eduni_jungle_star","drawable",pkg);
            int sparkleId = res.getIdentifier("eduni_jungle_sparkle","drawable",pkg);
            if(playerId != 0) eduniPlayerSprite = android.graphics.BitmapFactory.decodeResource(res, playerId);
            if(birdId != 0) eduniBirdSprite = android.graphics.BitmapFactory.decodeResource(res, birdId);
            if(starId != 0) eduniStarSprite = android.graphics.BitmapFactory.decodeResource(res, starId);
            if(sparkleId != 0) eduniSparkleSprite = android.graphics.BitmapFactory.decodeResource(res, sparkleId);
            eduniPlayerFrontSprites = eduniLoadSpriteSetV26_6("eduni_player_front_", 2);
            eduniPlayerSideSprites = eduniLoadSpriteSetV26_6("eduni_player_side_", 2);
            eduniPlayerBackSprites = eduniLoadSpriteSetV26_6("eduni_player_back_", 2);
            eduniBirdTargetSprites = eduniLoadSpriteSetV26_6("eduni_bird_target_", 24);
            playerMvpFrontIdle = eduniLoadNamedSpriteSet("player_front_idle_00_v01", 1);
            playerMvpBackIdle = eduniLoadNamedSpriteSet("player_back_idle_00_v01", 1);
            playerMvpLeftIdle = eduniLoadNamedSpriteSet("player_left_idle_00_v01", 1);
            playerMvpRightIdle = eduniLoadNamedSpriteSet("player_right_idle_00_v01", 1);
            playerMvpFrontWalk = eduniLoadNamedSpriteSet("player_front_walk_", 4);
            playerMvpBackWalk = eduniLoadNamedSpriteSet("player_back_walk_", 4);
            playerMvpLeftWalk = eduniLoadNamedSpriteSet("player_left_walk_", 4);
            playerMvpRightWalk = eduniLoadNamedSpriteSet("player_right_walk_", 4);
            waterfallKingfisherIdleSprites = waterfallLoadSpriteSet("waterfall_kingfisher_idle_", 2);
            waterfallKingfisherAttentionSprites = waterfallLoadSpriteSet("waterfall_kingfisher_attention_", 2);
            waterfallKingfisherObserveSprite = waterfallLoadSprite("waterfall_kingfisher_observe_00_v01");
            waterfallKingfisherRewardSprite = waterfallLoadSprite("waterfall_kingfisher_reward_00_v01");
            waterfallPerchSprite = waterfallLoadSprite("waterfall_perch_wet_branch_v01");
            waterfallFeatherCueSprite = waterfallLoadSprite("waterfall_perch_feather_spark_v01");
            waterfallPulseCueSprite = waterfallLoadSprite("waterfall_perch_pulse_ring_v01");
            campGroundSprite = waterfallLoadSprite("camp_ground_grass_v01");
            campPathSprite = waterfallLoadSprite("camp_path_trail_v01");
            campRockSprite = waterfallLoadSprite("camp_rock_moss_v01");
            campTreeSprite = waterfallLoadSprite("camp_foliage_tree_v01");
            campHutSprite = waterfallLoadSprite("camp_prop_learning_hut_v01");
            if (campGroundSprite != null) campGroundShader = new android.graphics.BitmapShader(campGroundSprite,
                    android.graphics.Shader.TileMode.REPEAT, android.graphics.Shader.TileMode.REPEAT);
            if (campPathSprite != null) campPathShader = new android.graphics.BitmapShader(campPathSprite,
                    android.graphics.Shader.TileMode.REPEAT, android.graphics.Shader.TileMode.REPEAT);
            if(eduniPlayerFrontSprites.length > 0) eduniPlayerSprite = eduniPlayerFrontSprites[0];
            if(eduniBirdTargetSprites.length > 0) eduniBirdSprite = eduniBirdTargetSprites[0];
        }

        android.graphics.Bitmap waterfallLoadSprite(String name) {
            int id = getResources().getIdentifier(name, "drawable", getContext().getPackageName());
            if (id == 0) return null;
            try { return android.graphics.BitmapFactory.decodeResource(getResources(), id); } catch(Exception ignored) { return null; }
        }

        android.graphics.Bitmap[] waterfallLoadSpriteSet(String prefix, int count) {
            android.graphics.Bitmap[] sprites = new android.graphics.Bitmap[count];
            for (int i = 0; i < count; i++) sprites[i] = waterfallLoadSprite(prefix + (i < 10 ? "0" : "") + i + "_v01");
            return sprites;
        }

        android.graphics.Bitmap[] eduniLoadSpriteSetV26_6(String prefix, int count) {
            java.util.ArrayList<android.graphics.Bitmap> list = new java.util.ArrayList<>();
            android.content.res.Resources res = getResources();
            String pkg = getContext().getPackageName();
            for(int i=0; i<count; i++) {
                String name = prefix + (i < 10 ? "0" + i : "" + i);
                int id = res.getIdentifier(name, "drawable", pkg);
                if(id == 0) continue;
                try {
                    android.graphics.Bitmap b = android.graphics.BitmapFactory.decodeResource(res, id);
                    if(b != null) list.add(b);
                } catch(Exception ignored) {}
            }
            return list.toArray(new android.graphics.Bitmap[0]);
        }

        android.graphics.Bitmap[] eduniLoadNamedSpriteSet(String prefix, int count) {
            java.util.ArrayList<android.graphics.Bitmap> list = new java.util.ArrayList<>();
            android.content.res.Resources res = getResources();
            String pkg = getContext().getPackageName();
            for (int i = 0; i < count; i++) {
                String name = count == 1 ? prefix : prefix + "0" + i + "_v01";
                int id = res.getIdentifier(name, "drawable", pkg);
                if (id == 0) continue;
                try {
                    android.graphics.Bitmap frame = android.graphics.BitmapFactory.decodeResource(res, id);
                    if (frame != null) list.add(frame);
                } catch (Exception ignored) {}
            }
            return list.toArray(new android.graphics.Bitmap[0]);
        }

        void drawEduniBitmapCentered(Canvas c, android.graphics.Bitmap bmp, float cx, float cy, float size) {
            if (bmp == null) return;
            float half = size / 2f;
            android.graphics.Paint bp = new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG | android.graphics.Paint.FILTER_BITMAP_FLAG | android.graphics.Paint.DITHER_FLAG);
            bp.setAlpha(255);
            c.drawBitmap(bmp, null, new RectF(cx-half, cy-half, cx+half, cy+half), bp);
        }

        void drawEduniBitmapCentered(Canvas c, android.graphics.Bitmap bmp, float cx, float cy, float size, boolean flipX) {
            if (bmp == null) return;
            float half = size / 2f;
            RectF dst = new RectF(cx-half, cy-half, cx+half, cy+half);
            android.graphics.Paint bp = new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG | android.graphics.Paint.FILTER_BITMAP_FLAG | android.graphics.Paint.DITHER_FLAG);
            bp.setAlpha(255);
            if(!flipX) {
                c.drawBitmap(bmp, null, dst, bp);
                return;
            }
            c.save();
            c.scale(-1f, 1f, cx, cy);
            c.drawBitmap(bmp, null, dst, bp);
            c.restore();
        }

        void drawEduniBitmapAtPivot(Canvas c, android.graphics.Bitmap bmp, float pivotX, float pivotY, float anchorX, float anchorY, float width) {
            if (bmp == null || bmp.getWidth() <= 0 || bmp.getHeight() <= 0) return;
            float scale = width / bmp.getWidth();
            RectF dst = new RectF(anchorX - pivotX * scale, anchorY - pivotY * scale,
                    anchorX + (bmp.getWidth() - pivotX) * scale, anchorY + (bmp.getHeight() - pivotY) * scale);
            android.graphics.Paint bp = new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG | android.graphics.Paint.FILTER_BITMAP_FLAG | android.graphics.Paint.DITHER_FLAG);
            c.drawBitmap(bmp, null, dst, bp);
        }

        android.graphics.Bitmap eduniPickBitmapV26_6(android.graphics.Bitmap[] set, int seed) {
            if(set == null || set.length == 0) return null;
            return set[Math.abs(seed) % set.length];
        }

        android.graphics.Bitmap eduniPickPlayerSpriteV26_6() {
            int frame = (int)((System.currentTimeMillis() / 180L) % 2L);
            if(Math.abs(eduniLastMoveYV26_6) >= Math.abs(eduniLastMoveXV26_6)) {
                if(eduniLastMoveYV26_6 < 0) return eduniPickBitmapV26_6(eduniPlayerBackSprites, frame);
                return eduniPickBitmapV26_6(eduniPlayerFrontSprites, frame);
            }
            return eduniPickBitmapV26_6(eduniPlayerSideSprites, frame);
        }

        android.graphics.Bitmap playerMvpFrame() {
            PlayerSpriteMvpState.Facing facing = playerMvpState.facingFor(eduniLastMoveXV26_6, eduniLastMoveYV26_6);
            int frame = playerMvpState.frameFor(playerMvpWalking, System.currentTimeMillis());
            android.graphics.Bitmap[] frames;
            if (facing == PlayerSpriteMvpState.Facing.BACK) frames = playerMvpWalking ? playerMvpBackWalk : playerMvpBackIdle;
            else if (facing == PlayerSpriteMvpState.Facing.LEFT) frames = playerMvpWalking ? playerMvpLeftWalk : playerMvpLeftIdle;
            else if (facing == PlayerSpriteMvpState.Facing.RIGHT) frames = playerMvpWalking ? playerMvpRightWalk : playerMvpRightIdle;
            else frames = playerMvpWalking ? playerMvpFrontWalk : playerMvpFrontIdle;
            return eduniPickBitmapV26_6(frames, frame);
        }

        void drawPlayerMvpAtFoot(Canvas c, android.graphics.Bitmap frame, float footX, float footY, float width) {
            if (frame == null) return;
            // Source contract: 192x256 frame, foot-center pivot (96,232).
            float height = playerMvpLayout.heightForWidth(width);
            float left = playerMvpLayout.leftForFoot(footX, width);
            float top = playerMvpLayout.topForFoot(footY, width);
            android.graphics.Paint bp = new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG | android.graphics.Paint.FILTER_BITMAP_FLAG | android.graphics.Paint.DITHER_FLAG);
            c.drawBitmap(frame, null, new RectF(left, top, left + width, top + height), bp);
        }

        void drawEduniSpriteAssets(Canvas c,int w,int h) {
            ensureEduniSprites();
            RectF mr = eduniMapRectV26_4(w,h);
            float unit = Math.min(mr.width(), mr.height());

            for (Dot s: stars) {
                if(s.done) continue;
                drawEduniBitmapCentered(c, eduniStarSprite, mr.left + s.x*mr.width(), mr.top + s.y*mr.height(), unit * .052f);
            }

            for (int bi = 0; bi < birds.size(); bi++) {
                Bird b = birds.get(bi);
                if (stageIndex == 1 && bi == 0 && (!b.caught || rewardLife > 0)) {
                    drawWaterfallKingfisher(c, mr, unit, b, b.caught);
                    continue;
                }
                if(b.caught) continue;
                float bob = (float)(Math.sin(System.currentTimeMillis()/180.0 + b.x*9.0)*4.0);
                android.graphics.Bitmap birdSprite = eduniPickBitmapV26_6(eduniBirdTargetSprites, stageIndex * 7 + bi);
                if(birdSprite == null) birdSprite = eduniBirdSprite;
                drawEduniBitmapCentered(c, birdSprite, mr.left + b.x*mr.width(), mr.top + b.y*mr.height() + bob, unit * .085f);
            }

            float x = mr.left + px*mr.width();
            float y = mr.top + py*mr.height();
            p.setStyle(Paint.Style.FILL);
            p.setColor(Color.argb(50,0,0,0));
            c.drawOval(new RectF(x-unit*.036f,y+unit*.038f,x+unit*.036f,y+unit*.053f),p);
            android.graphics.Bitmap playerSprite = playerMvpFrame();
            boolean usingPlayerMvp = playerSprite != null;
            if (playerSprite == null) playerSprite = eduniPickPlayerSpriteV26_6();
            if(playerSprite == null) playerSprite = eduniPlayerSprite;
            if (usingPlayerMvp) drawPlayerMvpAtFoot(c, playerSprite, x, y,
                    stageIndex == 0 ? CampVisualGeometry.DEFAULT_PLAYER_TARGET : Math.max(60f, Math.min(72f, unit * .057f)));
            else drawEduniBitmapCentered(c, playerSprite, x, y-unit*.012f, unit * .105f, eduniLastMoveXV26_6 < 0 && Math.abs(eduniLastMoveXV26_6) > Math.abs(eduniLastMoveYV26_6));
        }

        void drawWaterfallKingfisher(Canvas c, RectF map, float unit, Bird bird, boolean rewardVisible) {
            float birdX = map.left + bird.x * map.width();
            float birdY = map.top + bird.y * map.height();
            float perchScale = .75f;
            float perchAnchorX = birdX - (171f - 110f) * perchScale;
            float perchAnchorY = birdY - (18f - 135f) * perchScale;
            drawEduniBitmapAtPivot(c, waterfallPerchSprite, 110f, 135f, perchAnchorX, perchAnchorY, 220f * perchScale);

            EncounterDirector.State encounter = rewardVisible ? EncounterDirector.State.CELEBRATE : waterfallEncounter.state();
            WaterfallKingfisherVisualState.Frame frame = WaterfallKingfisherVisualState.forEncounter(encounter);
            if (frame == WaterfallKingfisherVisualState.Frame.ATTENTION) {
                float cueSize = Math.min(132f, Math.max(96f, unit * .14f));
                drawEduniBitmapCentered(c, waterfallPulseCueSprite, birdX, birdY + 3f, cueSize);
                drawEduniBitmapCentered(c, waterfallFeatherCueSprite, birdX + 18f, birdY - 22f, cueSize);
            }

            android.graphics.Bitmap sprite = waterfallKingfisherSprite(frame);
            if (sprite == null) {
                sprite = eduniPickBitmapV26_6(eduniBirdTargetSprites, 7);
                if (sprite == null) sprite = eduniBirdSprite;
            }
            drawEduniBitmapAtPivot(c, sprite, WaterfallKingfisherVisualState.SOURCE_PIVOT_X,
                    WaterfallKingfisherVisualState.SOURCE_PIVOT_Y, birdX, birdY,
                    128f * WaterfallKingfisherVisualState.RECOMMENDED_SCALE);
        }

        android.graphics.Bitmap waterfallKingfisherSprite(WaterfallKingfisherVisualState.Frame frame) {
            if (frame == WaterfallKingfisherVisualState.Frame.ATTENTION) {
                return eduniPickBitmapV26_6(waterfallKingfisherAttentionSprites, (int)(System.currentTimeMillis() / 260L));
            }
            if (frame == WaterfallKingfisherVisualState.Frame.OBSERVE) return waterfallKingfisherObserveSprite;
            if (frame == WaterfallKingfisherVisualState.Frame.REWARD) return waterfallKingfisherRewardSprite;
            return eduniPickBitmapV26_6(waterfallKingfisherIdleSprites, (int)(System.currentTimeMillis() / 360L));
        }


        void showRewardScreen(String title,String sub,String badge,int color) {
            rewardTitle = title;
            rewardSub = sub;
            rewardBadge = badge;
            rewardColor = color;
            rewardLife = 180;
        }

        void tickRewardScreen() {
            if (rewardLife > 0) rewardLife--;
        }


        void startGameFromIntro() {
            eduniOpenWorldMapFromIntroV21_4();
        }

        void tickGuideOverlay() {
            if (guideLife > 0) guideLife--;
            if (guideLife > 175) guideStep = 0;
            else if (guideLife > 90) guideStep = 1;
            else guideStep = 2;
        }

        void drawGuideOverlay(Canvas c,int w,int h) {
            if (showStartScreen) return;
            if (mode != FIELD) return;
            if (guideLife <= 0) return;

            float alphaRatio = Math.min(1f, guideLife / 60f);
            int alpha = (int)(225 * alphaRatio);

            p.setStyle(Paint.Style.FILL);
            p.setColor(Color.argb(alpha,255,255,255));

            RectF box = new RectF(w*.10f,h*.13f,w*.90f,h*.34f);
            c.drawRoundRect(box,30,30,p);

            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(6);
            p.setColor(Color.argb(alpha,14,165,233));
            c.drawRoundRect(box,30,30,p);
            p.setStyle(Paint.Style.FILL);

            p.setTextAlign(Paint.Align.CENTER);
            p.setFakeBoldText(true);

            String title;
            String body;
            String icon;

            if (guideStep == 0) {
                icon = "🕹️";
                title = "움직이기";
                body = "방향키나 스틱으로 정글을 걸어다녀요.";
            } else if (guideStep == 1) {
                icon = "🐦";
                title = "새 만나기";
                body = "새 가까이 가면 A 버튼으로 문제를 풀어요.";
            } else {
                icon = "⭐";
                title = "미션 완료";
                body = "새 4마리와 별 5개를 모으면 보상이 나와요.";
            }

            p.setColor(Color.argb(alpha,8,145,178));
            uiText(31);
            c.drawText(icon + " " + title,box.centerX(),box.top+50,p);

            p.setColor(Color.argb(alpha,51,65,85));
            uiText(21);
            p.setFakeBoldText(false);
            c.drawText(body,box.centerX(),box.top+92,p);

            p.setTextAlign(Paint.Align.LEFT);
        }

        void drawFloatingControls(Canvas c,int w,int h) {
            if (showStartScreen) return;
            if (mode != FIELD) return;
            if (stageIndex == 0) { drawJng001Controls(c,w,h); return; }

            RectF r = new RectF(24,86,340,150);
            p.setStyle(Paint.Style.FILL);
            p.setColor(Color.argb(185,15,23,42));
            c.drawRoundRect(r,22,22,p);

            p.setColor(Color.WHITE);
            uiText(15);
            p.setFakeBoldText(true);
            c.drawText("A 새 잡기   X 미션   Y 옷장",r.left+16,r.top+32,p);
        }



        int safeStageIndex() {
            if(stageIndex < 0) stageIndex = 0;
            if(stageIndex >= stageNames.length) stageIndex = stageNames.length - 1;
            return stageIndex;
        }

        int targetBirds() {
            int i = safeStageIndex();
            if(i >= stageBirdGoals.length) return 4;
            return stageBirdGoals[i];
        }

        int targetStars() {
            int i = safeStageIndex();
            if(i >= stageStarGoals.length) return 5;
            return stageStarGoals[i];
        }

        String currentDifficultyLabel() {
            int i = safeStageIndex();
            if(i == 0) return "쉬움";
            if(i == 1) return "보통";
            return "도전";
        }

        String currentStageTip() {
            int i = safeStageIndex();
            if(i == 0) return "처음에는 새 2마리와 별 3개만 모으면 돼요.";
            if(i == 1) return "조금 더 집중해서 새 3마리와 별 4개를 찾아요.";
            return "마지막 단계! 새 4마리와 별 5개를 모두 모아요.";
        }

        void drawStageAtmosphere(Canvas c,int w,int h) {
            if(showStartScreen) return;
            p.setStyle(Paint.Style.FILL);

            if(stageIndex == 1) {
                p.setColor(Color.argb(42,14,165,233));
                c.drawRect(0,0,w,h,p);
                p.setColor(Color.argb(120,255,255,255));
                for(int i=0;i<14;i++){
                    float x = ((i*151 + System.currentTimeMillis()/40)%1000)/1000f*w;
                    float y = (0.15f+((i*71)%700)/1000f)*h;
                    c.drawCircle(x,y,4+(i%3)*2,p);
                }
            } else if(stageIndex >= 2) {
                p.setColor(Color.argb(48,168,85,247));
                c.drawRect(0,0,w,h,p);
                p.setColor(Color.argb(90,250,204,21));
                for(int i=0;i<12;i++){
                    float x = ((i*181 + System.currentTimeMillis()/55)%1000)/1000f*w;
                    float y = (0.16f+((i*83)%680)/1000f)*h;
                    c.drawRoundRect(new RectF(x-5,y-5,x+5,y+5),3,3,p);
                }
            }
        }

        void drawStageGoalPanel(Canvas c,int w,int h) {
            if(showStartScreen) return;
            if(mode != FIELD) return;

            RectF r = new RectF(w-430,138,w-28,238);
            p.setStyle(Paint.Style.FILL);
            p.setColor(Color.argb(230,255,255,255));
            c.drawRoundRect(r,24,24,p);

            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(5);
            p.setColor(currentStageColor());
            c.drawRoundRect(r,24,24,p);
            p.setStyle(Paint.Style.FILL);

            p.setColor(Color.rgb(15,23,42));
            uiText(17);
            p.setFakeBoldText(true);
            c.drawText("난이도: " + currentDifficultyLabel(), r.left+18, r.top+28, p);

            p.setColor(Color.rgb(71,85,105));
            uiText(15);
            p.setFakeBoldText(false);
            c.drawText("목표  새 " + targetBirds() + "마리 · 별 " + targetStars() + "개", r.left+18, r.top+54, p);

            p.setColor(currentStageColor());
            uiText(14);
            c.drawText(currentStageTip(), r.left+18, r.top+76, p);
        }



        // EDUNI_NATIVE_JUNGLE_WORLDMAP_DEFAULT_CHALLENGE_FIX_V20_2
        int preferredStageSelect() {
            ensureStageProgressLoaded();
            int limit = maxUnlockedStage;
            if(limit < 0) limit = 0;
            if(limit >= stageNames.length) limit = stageNames.length - 1;

            for(int i=0;i<=limit && i<stageNames.length;i++) {
                if(i < stageDone.length && !stageDone[i]) return i;
            }

            return limit;
        }

        void selectPreferredChallengeStage() {
            stageSelect = preferredStageSelect();
            mode = FIELD;
            select = stageSelect;
        }

        void ensureStageProgressLoaded() {
            if(stageProgressLoaded) return;
            stageProgressLoaded = true;
            try {
                android.content.SharedPreferences sp = getContext().getSharedPreferences("eduni_jungle_progress", 0);
                maxUnlockedStage = sp.getInt("maxUnlockedStage", 0);
                int mask = sp.getInt("stageDoneMask", 0);
                for(int i=0;i<stageDone.length;i++) stageDone[i] = ((mask >> i) & 1) == 1;
                if(maxUnlockedStage < 0) maxUnlockedStage = 0;
                if(maxUnlockedStage >= stageNames.length) maxUnlockedStage = stageNames.length - 1;
            } catch(Exception ignored) {}
        }

        void saveStageProgress() {
            try {
                int mask = 0;
                for(int i=0;i<stageDone.length;i++) if(stageDone[i]) mask |= (1 << i);
                getContext().getSharedPreferences("eduni_jungle_progress", 0)
                        .edit()
                        .putInt("maxUnlockedStage", maxUnlockedStage)
                        .putInt("stageDoneMask", mask)
                        .apply();
            } catch(Exception ignored) {}
        }

        void markStageCompleted(int idx) {
            ensureStageProgressLoaded();
            if(idx >= 0 && idx < stageDone.length) stageDone[idx] = true;
            if(idx + 1 < stageNames.length) maxUnlockedStage = Math.max(maxUnlockedStage, idx + 1);
            saveStageProgress();
         eduniGiveStageStickerV24(idx); }

        void startSelectedStage() {
            ensureStageProgressLoaded();
            if(stageSelect > maxUnlockedStage) {
                log = "아직 잠겨 있어요. 앞 단계를 먼저 완료해요!";
                invalidate();
                return;
            }

            stageIndex = stageSelect;
            showStageSelect = false; eduniStagePlayingV20_10 = true;
            stageCompleteShown = false;
            stageCompleteLife = 0;
            rewardLife = 0;
            stageInputLock = 18;
            resetWorldForNextStage();
            guideLife = 180;
            guideStep = 0;
            log = currentStageName() + " 시작! " + currentStageMission();
            try { postStageProgress("stage_start"); } catch(Exception ignored) {}
            invalidate();
        }

        void drawStageSelectScreen(Canvas c,int w,int h) {
            /* EDUNI_NATIVE_JUNGLE_REFINED_LIST_WORLDMAP_PATCH_V24_2 */
            if(!showStageSelect || showStartScreen) return;

            p.setStyle(Paint.Style.FILL);
            p.setShader(new android.graphics.LinearGradient(
                    0, 0, 0, h,
                    Color.rgb(12, 47, 39),
                    Color.rgb(15, 74, 58),
                    android.graphics.Shader.TileMode.CLAMP));
            c.drawRect(0, 0, w, h, p);
            p.setShader(null);

            p.setColor(Color.argb(25, 255, 255, 255));
            c.drawCircle(w*.13f, h*.13f, w*.20f, p);
            p.setColor(Color.argb(20, 45, 212, 191));
            c.drawCircle(w*.90f, h*.82f, w*.28f, p);

            float panelL = w*.095f;
            float panelT = h*.090f;
            float panelR = w*.905f;
            float panelB = h*.915f;

            p.setColor(Color.argb(235, 248, 250, 252));
            c.drawRoundRect(panelL, panelT, panelR, panelB, 36, 36, p);

            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(Math.max(1.5f, w*.0018f));
            p.setColor(Color.argb(88, 255, 255, 255));
            c.drawRoundRect(panelL, panelT, panelR, panelB, 36, 36, p);
            p.setStyle(Paint.Style.FILL);

            p.setTextAlign(Paint.Align.LEFT);
            p.setColor(Color.rgb(15, 118, 110));
            p.setTextSize(Math.max(15f, h*.020f));
            c.drawText("WORLD MAP", panelL + w*.055f, panelT + h*.078f, p);

            p.setColor(Color.rgb(15, 23, 42));
            p.setTextSize(Math.max(30f, h*.043f));
            c.drawText("탐험 단계 선택", panelL + w*.055f, panelT + h*.138f, p);

            p.setColor(Color.rgb(100, 116, 139));
            p.setTextSize(Math.max(16f, h*.021f));
            c.drawText("방향키/스틱으로 이동하고 A 버튼으로 시작합니다.", panelL + w*.055f, panelT + h*.184f, p);

            int limit = maxUnlockedStage;
            if(limit < 0) limit = 0;
            if(limit >= stageNames.length) limit = stageNames.length - 1;

            int recommend = limit;
            for(int i=0; i<=limit && i<stageNames.length; i++) {
                if(i < stageDone.length && !stageDone[i]) {
                    recommend = i;
                    break;
                }
            }

            float listL = panelL + w*.050f;
            float listR = panelR - w*.050f;
            float rowH = h*.132f;
            float rowGap = h*.030f;
            float rowTop = panelT + h*.265f;

            for(int i=0; i<stageNames.length; i++) {
                boolean locked = i > maxUnlockedStage;
                boolean done = i < stageDone.length && stageDone[i];
                boolean selectedStage = i == stageSelect;
                boolean recommended = i == recommend && !locked && !done;

                float y = rowTop + i * (rowH + rowGap);

                if(selectedStage) {
                    p.setShader(new android.graphics.LinearGradient(
                            listL, y, listR, y + rowH,
                            Color.rgb(236, 253, 245),
                            Color.rgb(240, 253, 250),
                            android.graphics.Shader.TileMode.CLAMP));
                    c.drawRoundRect(listL, y, listR, y + rowH, 26, 26, p);
                    p.setShader(null);
                } else {
                    p.setColor(Color.WHITE);
                    c.drawRoundRect(listL, y, listR, y + rowH, 26, 26, p);
                }

                p.setStyle(Paint.Style.STROKE);
                p.setStrokeWidth(selectedStage ? 3.0f : 1.2f);
                p.setColor(selectedStage ? Color.rgb(20, 184, 166) : Color.rgb(226, 232, 240));
                c.drawRoundRect(listL, y, listR, y + rowH, 26, 26, p);
                p.setStyle(Paint.Style.FILL);

                p.setColor(locked ? Color.rgb(148, 163, 184) : Color.rgb(20, 184, 166));
                p.setTextSize(Math.max(17f, h*.022f));
                c.drawText("0" + (i+1), listL + w*.038f, y + rowH*.48f, p);

                p.setColor(locked ? Color.rgb(100, 116, 139) : Color.rgb(15, 23, 42));
                p.setTextSize(Math.max(21f, h*.028f));
                c.drawText(stageNames[i], listL + w*.120f, y + rowH*.40f, p);

                String desc;
                if(locked) desc = "앞 단계를 완료하면 열립니다.";
                else if(done) desc = "완료한 단계입니다. 다시 도전할 수 있어요.";
                else if(recommended) desc = "지금 이어서 도전할 추천 단계입니다.";
                else desc = "선택해서 바로 시작할 수 있습니다.";

                p.setColor(Color.rgb(100, 116, 139));
                p.setTextSize(Math.max(14f, h*.019f));
                c.drawText(desc, listL + w*.120f, y + rowH*.70f, p);

                String badge;
                if(locked) badge = "잠김";
                else if(done) badge = selectedStage ? "완료 · 다시 도전" : "완료";
                else if(recommended) badge = "다음 탐험";
                else badge = "도전 가능";

                float chipR = listR - w*.030f;
                float chipL = chipR - w*.155f;
                float chipT = y + rowH*.22f;
                float chipB = y + rowH*.50f;

                if(locked) p.setColor(Color.rgb(241, 245, 249));
                else if(done) p.setColor(Color.rgb(220, 252, 231));
                else if(recommended) p.setColor(Color.rgb(204, 251, 241));
                else p.setColor(Color.rgb(239, 246, 255));
                c.drawRoundRect(chipL, chipT, chipR, chipB, 18, 18, p);

                p.setTextAlign(Paint.Align.CENTER);
                p.setColor(locked ? Color.rgb(100, 116, 139) : Color.rgb(15, 118, 110));
                p.setTextSize(Math.max(12f, h*.016f));
                c.drawText(badge, (chipL+chipR)/2f, chipT + (chipB-chipT)*.66f, p);
                p.setTextAlign(Paint.Align.LEFT);

                if(selectedStage) {
                    p.setColor(Color.rgb(13, 148, 136));
                    p.setTextSize(Math.max(13f, h*.018f));
                    p.setTextAlign(Paint.Align.RIGHT);
                    c.drawText("A 시작", listR - w*.035f, y + rowH*.78f, p);
                    p.setTextAlign(Paint.Align.LEFT);
                }
            }

            p.setColor(Color.rgb(15, 23, 42));
            p.setTextAlign(Paint.Align.CENTER);
            p.setTextSize(Math.max(16f, h*.021f));
            c.drawText("A 시작   ·   B 포털   ·   X/Y 비활성", w*.50f, panelB - h*.040f, p);

            p.setTextAlign(Paint.Align.LEFT);
            p.setStyle(Paint.Style.FILL);
            p.setShader(null);
        }

        String eduniReflectString(Object obj, String... names) {
            if(obj == null) return "";
            for(String name: names) {
                try {
                    java.lang.reflect.Field f = obj.getClass().getDeclaredField(name);
                    f.setAccessible(true);
                    Object v = f.get(obj);
                    if(v != null) return String.valueOf(v);
                } catch(Exception ignored) {}
            }
            return "";
        }

        String eduniSelectedOptionText() {
            try {
                Object qz = quiz;
                java.lang.reflect.Field f = qz.getClass().getDeclaredField("options");
                f.setAccessible(true);
                Object arr = f.get(qz);
                int len = java.lang.reflect.Array.getLength(arr);
                if(select >= 0 && select < len) {
                    Object v = java.lang.reflect.Array.get(arr, select);
                    return String.valueOf(v);
                }
            } catch(Exception ignored) {}
            return String.valueOf(select);
        }

        void postQuizAttemptDetailed(boolean correct) {
            new Thread(() -> {
                java.net.HttpURLConnection conn = null;
                try {
                    Object qz = quiz;
                    org.json.JSONObject payload = new org.json.JSONObject();
                    payload.put("event_type","quiz_attempt");
                    payload.put("correct", correct);
                    payload.put("question", eduniReflectString(qz,"question","q","text","title"));
                    payload.put("answer", eduniReflectString(qz,"answer","correct","correctAnswer","a"));
                    payload.put("selected", eduniSelectedOptionText());
                    payload.put("selected_index", select);
                    payload.put("stage", stageIndex + 1);
                    payload.put("stage_name", currentStageName());
                    payload.put("stars", foundStars);
                    payload.put("birds", caughtBirds);
                    payload.put("hearts", hearts);
                    payload.put("client_ts", System.currentTimeMillis());

                    org.json.JSONObject event = new org.json.JSONObject();
                    event.put("event_type","quiz_attempt");
                    event.put("detail", correct ? "정답 문제 기록" : "오답 문제 기록");
                    event.put("quiz", payload);

                    java.net.URL url = new java.net.URL(SERVER + "/jungle/api/progress/event");
                    conn = (java.net.HttpURLConnection)url.openConnection();
                    conn.setConnectTimeout(1200);
                    conn.setReadTimeout(1200);
                    conn.setRequestMethod("POST");
                    conn.setDoOutput(true);
                    conn.setRequestProperty("Content-Type","application/json; charset=UTF-8");
                    conn.getOutputStream().write(event.toString().getBytes("UTF-8"));
                    conn.getResponseCode();
                } catch(Exception ignored) {
                } finally {
                    if(conn != null) conn.disconnect();
                }
            }).start();
        }

        String currentStageName() {
            if(stageIndex < 0) stageIndex = 0;
            if(stageIndex >= stageNames.length) stageIndex = stageNames.length - 1;
            return stageNames[stageIndex];
        }

        String currentStageMission() {
            if(stageIndex < 0) stageIndex = 0;
            if(stageIndex >= stageMissions.length) stageIndex = stageMissions.length - 1;
            return stageMissions[stageIndex];
        }

        int currentStageColor() {
            if(stageIndex == 0) return Color.rgb(34,197,94);
            if(stageIndex == 1) return Color.rgb(14,165,233);
            return Color.rgb(168,85,247);
        }

        void tickStageProgression() {
            if(stageCompleteLife > 0) stageCompleteLife--;

            if(!stageCompleteShown && foundStars >= targetStars() && caughtBirds >= targetBirds()) {
                stageCompleteShown = true;
                stageCompleteLife = 9999;
                log = currentStageName() + " 완료!";
                showRewardScreen("스테이지 완료!", currentStageName() + " 탐험 성공!", "🏆", currentStageColor());
                postStageProgress("stage_complete");
            }
        }

        void resetBooleanFlags(Object target) {
            if(target == null) return;
            try {
                java.lang.reflect.Field[] fields = target.getClass().getDeclaredFields();
                for(java.lang.reflect.Field f: fields) {
                    if(f.getType() == boolean.class) {
                        f.setAccessible(true);
                        f.setBoolean(target, false);
                    }
                }
            } catch(Exception ignored) {}
        }

        void resetWorldForNextStage() {
            foundStars = 0;
            caughtBirds = 0;
            hearts = 3; eduniApplyStageSpawnV26_3(); ax = 0; ay = 0;
            campEncounter.reset(); waterfallEncounter.reset(); adventureCamera.reset();
            locomotion.stop(); inputActions.reset(); campTouchStickHeld = false; eduniTouchTargetActiveV26_4 = false; digitalDpadDownAtMs = -1L;
            stars.clear(); birds.clear(); eduniPopulateStageObjectsV26_5();
            select = 0;
            mode = FIELD;

            try {
                for(Dot s: stars) resetBooleanFlags(s);
                for(Bird b: birds) resetBooleanFlags(b);
            } catch(Exception ignored) {}

            // 새/별이 리스트에서 제거되는 구조라면 위치만 리셋하지 못할 수 있습니다.
            // 그래도 카운터와 상태는 다음 단계 흐름으로 넘어갑니다.
            log = currentStageName() + " 시작! " + currentStageMission();
            invalidate();
        }


        // EDUNI_NATIVE_JUNGLE_FINAL_STAGE_FINISH_PATCH_V15_2
        boolean isFinalStage() {
            return stageIndex >= stageNames.length - 1;
        }

        void finishFinalStageAndReturn() {
            stageCompleteShown = false;
            stageCompleteLife = 0;
            markStageCompleted(stageIndex); log = "모든 정글 탐험 완료! 최고야!";
            try { postStageProgress("all_stages_complete"); } catch(Exception ignored) {}
            ((android.app.Activity)getContext()).finish(); /* EDUNI_NATIVE_JUNGLE_FINAL_STAGE_FINISH_FIX_PATCH_V15_3 */
        }


        void advanceStage() {
            markStageCompleted(stageIndex);
            if(stageIndex + 1 < stageNames.length) {
                maxUnlockedStage = Math.max(maxUnlockedStage, stageIndex + 1);
                stageSelect = stageIndex + 1;
            }
            saveStageProgress();

            stageCompleteShown = false;
            stageCompleteLife = 0;
            rewardLife = 0;
            showStageSelect = true; eduniSelectPreferredStageV20_8();
            mode = FIELD;
            select = 0;
            log = "다음 탐험을 골라보자!";
            invalidate();
        }


        void drawStageBadge(Canvas c,int w,int h) {
            if(showStartScreen) return;

            RectF badge = new RectF(w*.36f,84,w*.64f,132);
            p.setStyle(Paint.Style.FILL);
            p.setColor(Color.argb(225,255,255,255));
            c.drawRoundRect(badge,22,22,p);

            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(5);
            p.setColor(currentStageColor());
            c.drawRoundRect(badge,22,22,p);
            p.setStyle(Paint.Style.FILL);

            p.setTextAlign(Paint.Align.CENTER);
            p.setColor(Color.rgb(15,23,42));
            uiText(18);
            p.setFakeBoldText(true);
            c.drawText(currentStageName(),badge.centerX(),badge.top+31,p);
            p.setTextAlign(Paint.Align.LEFT);
        }

        void drawStageCompleteOverlay(Canvas c,int w,int h) {
            /* EDUNI_NATIVE_JUNGLE_V22_STAGE_COMPLETE_SCREEN */
            if(!stageCompleteShown) return;

            p.setStyle(Paint.Style.FILL);
            p.setColor(Color.argb(190, 15, 23, 42));
            c.drawRect(0, 0, w, h, p);

            p.setTextAlign(Paint.Align.CENTER);
            p.setColor(Color.rgb(254, 243, 199));
            c.drawRoundRect(w*.16f, h*.22f, w*.84f, h*.78f, 36, 36, p);

            p.setColor(Color.rgb(21, 101, 52));
            p.setTextSize(Math.max(33f, h*.048f));
            c.drawText("탐험 완료!", w*.50f, h*.335f, p);

            p.setColor(Color.rgb(55, 65, 81));
            p.setTextSize(Math.max(21f, h*.028f));
            String stageLabel = stageIndex >= 0 && stageIndex < stageNames.length ? stageNames[stageIndex] : "정글 탐험";
            c.drawText(stageLabel, w*.50f, h*.405f, p);

            p.setTextSize(Math.max(19f, h*.024f));
            c.drawText("별 " + foundStars + "개 · 새 " + caughtBirds + "마리", w*.50f, h*.475f, p);
            c.drawText("학습 기록과 보상이 저장됐어요", w*.50f, h*.525f, p);

            boolean finalStage = stageIndex >= stageNames.length - 1;
            p.setColor(Color.rgb(245, 158, 11));
            c.drawRoundRect(w*.27f, h*.615f, w*.73f, h*.695f, 30, 30, p);
            p.setColor(Color.WHITE);
            p.setTextSize(Math.max(21f, h*.028f));
            c.drawText(finalStage ? "A 포털로 돌아가기" : "A 월드맵으로", w*.50f, h*.666f, p);

            p.setTextAlign(Paint.Align.LEFT);
            p.setStyle(Paint.Style.FILL);
        }

        void postStageProgress(String eventType) {
            try {
                postProgress(eventType, currentStageName());
            } catch(Exception ignored) {}
        }

        void drawStartScreen(Canvas c,int w,int h) {
            /* EDUNI_NATIVE_JUNGLE_REFINED_LIST_DESIGN_PATCH_V24_2 */
            if(!showStartScreen) return;

            p.setStyle(Paint.Style.FILL);
            p.setShader(new android.graphics.LinearGradient(
                    0, 0, 0, h,
                    Color.rgb(12, 47, 39),
                    Color.rgb(15, 74, 58),
                    android.graphics.Shader.TileMode.CLAMP));
            c.drawRect(0, 0, w, h, p);
            p.setShader(null);

            p.setColor(Color.argb(28, 255, 255, 255));
            c.drawCircle(w*.18f, h*.15f, w*.20f, p);
            p.setColor(Color.argb(22, 94, 234, 212));
            c.drawCircle(w*.86f, h*.88f, w*.30f, p);

            float panelL = w*.105f;
            float panelT = h*.105f;
            float panelR = w*.895f;
            float panelB = h*.900f;

            p.setColor(Color.argb(232, 248, 250, 252));
            c.drawRoundRect(panelL, panelT, panelR, panelB, 36, 36, p);

            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(Math.max(1.5f, w*.0018f));
            p.setColor(Color.argb(90, 255, 255, 255));
            c.drawRoundRect(panelL, panelT, panelR, panelB, 36, 36, p);
            p.setStyle(Paint.Style.FILL);

            p.setTextAlign(Paint.Align.LEFT);
            p.setColor(Color.rgb(15, 118, 110));
            p.setTextSize(Math.max(15f, h*.020f));
            c.drawText("EDUNI JUNGLE", panelL + w*.055f, panelT + h*.085f, p);

            p.setColor(Color.rgb(15, 23, 42));
            p.setTextSize(Math.max(36f, h*.053f));
            c.drawText("정글 탐험", panelL + w*.055f, panelT + h*.155f, p);

            p.setColor(Color.rgb(100, 116, 139));
            p.setTextSize(Math.max(18f, h*.024f));
            c.drawText("단계를 선택하고, 문제를 풀며 보상을 모아요.", panelL + w*.055f, panelT + h*.205f, p);

            float listL = panelL + w*.050f;
            float listR = panelR - w*.050f;
            float rowH = h*.086f;
            float rowGap = h*.020f;
            float rowTop = panelT + h*.285f;

            String[] nums = {"01", "02", "03", "04"};
            String[] titles = {"월드맵", "탐험 시작", "문제 풀이", "스티커 보상"};
            String[] descs = {
                    "열린 단계와 다음 도전 단계를 확인해요",
                    "숲속에서 새와 별을 찾아 이동해요",
                    "새를 만나면 A 버튼으로 퀴즈를 풀어요",
                    "완료 기록과 칭호를 차곡차곡 모아요"
            };

            for(int i=0; i<4; i++) {
                float y = rowTop + i * (rowH + rowGap);

                p.setColor(Color.rgb(255, 255, 255));
                c.drawRoundRect(listL, y, listR, y + rowH, 22, 22, p);

                p.setStyle(Paint.Style.STROKE);
                p.setStrokeWidth(1.3f);
                p.setColor(Color.rgb(226, 232, 240));
                c.drawRoundRect(listL, y, listR, y + rowH, 22, 22, p);
                p.setStyle(Paint.Style.FILL);

                p.setColor(Color.rgb(20, 184, 166));
                p.setTextSize(Math.max(15f, h*.020f));
                c.drawText(nums[i], listL + w*.035f, y + rowH*.50f, p);

                p.setColor(Color.rgb(15, 23, 42));
                p.setTextSize(Math.max(18f, h*.024f));
                c.drawText(titles[i], listL + w*.115f, y + rowH*.42f, p);

                p.setColor(Color.rgb(100, 116, 139));
                p.setTextSize(Math.max(14f, h*.019f));
                c.drawText(descs[i], listL + w*.115f, y + rowH*.72f, p);
            }

            p.setTextAlign(Paint.Align.CENTER);
            p.setShader(new android.graphics.LinearGradient(
                    panelL, panelB - h*.105f, panelR, panelB - h*.032f,
                    Color.rgb(13, 148, 136),
                    Color.rgb(5, 150, 105),
                    android.graphics.Shader.TileMode.CLAMP));
            c.drawRoundRect(panelL + w*.180f, panelB - h*.112f, panelR - w*.180f, panelB - h*.036f, 28, 28, p);
            p.setShader(null);

            p.setColor(Color.WHITE);
            p.setTextSize(Math.max(20f, h*.027f));
            c.drawText("A  월드맵 열기", w*.50f, panelB - h*.064f, p);

            p.setColor(Color.rgb(100, 116, 139));
            p.setTextSize(Math.max(13f, h*.018f));
            c.drawText("B 버튼으로 포털로 돌아가기", w*.50f, panelB + h*.040f, p);

            p.setTextAlign(Paint.Align.LEFT);
            p.setStyle(Paint.Style.FILL);
            p.setShader(null);
        }

        void drawRewardScreen(Canvas c,int w,int h) {
            if (rewardLife <= 0) return;

            float t = rewardLife / 180f;
            float scale = 1f + (float)Math.sin((1f-t)*Math.PI) * .08f;

            p.setStyle(Paint.Style.FILL);
            p.setColor(Color.argb(160,15,23,42));
            c.drawRect(0,0,w,h,p);

            for(int i=0;i<42;i++){
                float x = ((i*89 + rewardLife*7) % 1000) / 1000f * w;
                float y = ((i*137 + (180-rewardLife)*12) % 1000) / 1000f * h;
                int cc = i%4==0 ? Color.rgb(250,204,21) : i%4==1 ? Color.rgb(34,197,94) : i%4==2 ? Color.rgb(56,189,248) : Color.rgb(251,113,133);
                p.setColor(cc);
                c.drawRoundRect(new RectF(x,y,x+12,y+18),4,4,p);
            }

            float cw = w*.68f*scale;
            float ch = h*.46f*scale;
            RectF card = new RectF(w*.5f-cw/2,h*.5f-ch/2,w*.5f+cw/2,h*.5f+ch/2);

            p.setColor(Color.WHITE);
            c.drawRoundRect(card,42,42,p);
            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(9);
            p.setColor(rewardColor);
            c.drawRoundRect(card,42,42,p);
            p.setStyle(Paint.Style.FILL);

            p.setTextAlign(Paint.Align.CENTER);

            p.setColor(rewardColor);
            uiText(62);
            p.setFakeBoldText(true);
            c.drawText(rewardBadge.length()>0 ? rewardBadge : "🎉",card.centerX(),card.top+95,p);

            p.setColor(Color.rgb(15,23,42));
            uiText(38);
            p.setFakeBoldText(true);
            c.drawText(rewardTitle,card.centerX(),card.top+160,p);

            p.setColor(Color.rgb(71,85,105));
            uiText(23);
            p.setFakeBoldText(false);
            c.drawText(rewardSub,card.centerX(),card.top+212,p);

            p.setColor(Color.rgb(14,165,233));
            uiText(18);
            c.drawText("잠시 후 탐험으로 돌아가요",card.centerX(),card.bottom-42,p);

            p.setTextAlign(Paint.Align.LEFT);
        }


        void uiText(float size) {
            p.setTextSize(size * uiTextScale);
        }

        float uiSize(float size) {
            return size * uiTextScale;
        }

        void hud(Canvas c,int w,int h) {
            p.setStyle(Paint.Style.FILL);
            p.setColor(Color.argb(236,255,255,255));
            c.drawRoundRect(new RectF(18,14,w-18,76),24,24,p);

            p.setColor(Color.rgb(8,145,178));
            uiText(25);
            p.setFakeBoldText(true);
            c.drawText("🌿 EDUNI 정글탐험",42,53,p);

            drawProgressBar(c,w*.42f,30,w*.17f,22,foundStars/(float)targetStars(),Color.rgb(250,204,21),"별 "+foundStars+"/"+targetStars());
            drawProgressBar(c,w*.62f,30,w*.17f,22,caughtBirds/(float)targetBirds(),Color.rgb(34,197,94),"새 "+caughtBirds+"/"+targetBirds());

            p.setColor(Color.rgb(244,63,94));
            uiText(22);
            p.setFakeBoldText(true);
            String hp = "";
            for(int i=0;i<hearts;i++) hp += "♥";
            c.drawText(hp,w-150,53,p);

            p.setColor(Color.argb(220,15,23,42));
            c.drawRoundRect(new RectF(22,h-78,w-22,h-14),20,20,p);
            p.setColor(Color.WHITE);
            uiText(18);
            p.setFakeBoldText(false);
            c.drawText(log,46,h-40,p); drawFeedback(c,w,h);
        }

        void world(Canvas c,int w,int h) { for (Dot s: stars) if (!s.done) { p.setColor(Color.rgb(250,204,21)); uiText(36); c.drawText("★",s.x*w-16,s.y*h+14,p); } for (Bird b: birds) if (!b.caught) { float x=b.x*w,y=b.y*h; p.setColor(Color.argb(110,255,255,255)); c.drawCircle(x,y,34,p); uiText(38); c.drawText(b.icon,x-19,y+14,p); } float x=px*w,y=py*h; p.setColor(Color.argb(80,0,0,0)); c.drawOval(new RectF(x-28,y+24,x+28,y+38),p); p.setColor(Color.rgb(56,189,248)); c.drawCircle(x,y,28,p); p.setColor(Color.rgb(253,186,116)); c.drawCircle(x,y-24,19,p); p.setColor(Color.WHITE); uiText(17); c.drawText("나",x-9,y+6,p); drawCostumeOverlay(c,x,y); }

        void worldV26_4(Canvas c,int w,int h) {
            RectF mr = eduniMapRectV26_4(w,h);
            float unit = Math.max(.55f, Math.min(mr.width(), mr.height()) / Math.max(1f, Math.min(w,h)));
            float birdR = 34f * unit;
            float playerR = 28f * unit;

            for (Dot s: stars) if (!s.done) {
                float sx = mr.left + s.x * mr.width();
                float sy = mr.top + s.y * mr.height();
                p.setColor(Color.rgb(250,204,21));
                uiText(36);
                c.drawText("★", sx - 16f * unit, sy + 14f * unit, p);
            }

            for (Bird b: birds) if (!b.caught) {
                float x = mr.left + b.x * mr.width();
                float y = mr.top + b.y * mr.height();
                p.setColor(Color.argb(110,255,255,255));
                c.drawCircle(x, y, birdR, p);
                uiText(38);
                c.drawText(b.icon, x - 19f * unit, y + 14f * unit, p);
            }

            float x = mr.left + px * mr.width();
            float y = mr.top + py * mr.height();
            p.setColor(Color.argb(80,0,0,0));
            c.drawOval(new RectF(x-playerR, y+playerR*.86f, x+playerR, y+playerR*1.36f), p);
            p.setColor(Color.rgb(56,189,248));
            c.drawCircle(x, y, playerR, p);
            p.setColor(Color.rgb(253,186,116));
            c.drawCircle(x, y-playerR*.86f, 19f*unit, p);
            p.setColor(Color.WHITE);
            uiText(17);
            c.drawText("나", x-9f*unit, y+6f*unit, p);
            drawCostumeOverlay(c,x,y);
        }

        float sxV26_5(float x, RectF r) { return r.left + x * r.width(); }
        float syV26_5(float y, RectF r) { return r.top + y * r.height(); }

        void drawPathSegmentV26_5(Canvas c, RectF r, float ax, float ay, float bx, float by, Paint paint) {
            c.drawLine(sxV26_5(ax,r), syV26_5(ay,r), sxV26_5(bx,r), syV26_5(by,r), paint);
        }

        void drawTreeV26_5(Canvas c, RectF r, float nx, float ny, float size) {
            float x = sxV26_5(nx,r), y = syV26_5(ny,r), s = Math.min(r.width(), r.height()) * size;
            p.setStyle(Paint.Style.FILL);
            p.setColor(Color.rgb(116, 74, 45));
            c.drawRoundRect(new RectF(x-s*.16f,y-s*.15f,x+s*.16f,y+s*.48f),s*.08f,s*.08f,p);
            p.setColor(Color.rgb(34, 139, 84));
            c.drawCircle(x-s*.28f,y-s*.18f,s*.30f,p);
            c.drawCircle(x+s*.22f,y-s*.20f,s*.34f,p);
            c.drawCircle(x,y-s*.42f,s*.38f,p);
            p.setColor(Color.rgb(71, 168, 103));
            c.drawCircle(x+s*.02f,y-s*.34f,s*.20f,p);
        }

        void drawRockV26_5(Canvas c, RectF r, float nx, float ny, float size) {
            float x = sxV26_5(nx,r), y = syV26_5(ny,r), s = Math.min(r.width(), r.height()) * size;
            p.setStyle(Paint.Style.FILL);
            p.setColor(Color.rgb(148, 163, 184));
            c.drawOval(new RectF(x-s,y-s*.45f,x+s,y+s*.45f),p);
            p.setColor(Color.rgb(203, 213, 225));
            c.drawOval(new RectF(x-s*.45f,y-s*.25f,x+s*.20f,y+s*.08f),p);
        }

        void drawFlowerV26_5(Canvas c, RectF r, float nx, float ny, int color) {
            float x = sxV26_5(nx,r), y = syV26_5(ny,r), s = Math.min(r.width(), r.height()) * .010f;
            p.setStyle(Paint.Style.FILL);
            p.setColor(Color.rgb(34, 139, 84));
            c.drawLine(x,y+s*2,x,y+s*6,p);
            p.setColor(color);
            c.drawCircle(x-s,y,s*1.3f,p);
            c.drawCircle(x+s,y,s*1.3f,p);
            c.drawCircle(x,y-s,s*1.3f,p);
            c.drawCircle(x,y+s,s*1.3f,p);
            p.setColor(Color.rgb(250, 204, 21));
            c.drawCircle(x,y,s*.9f,p);
        }

        void drawCostumeOverlay(Canvas c,float x,float y) {
            // EDUNI_NATIVE_JUNGLE_COSTUME_PATCH_V2_2
            // 0 기본, 1 탐험 모자, 2 반짝 안경, 3 별빛 망토

            if (outfitIndex == 1) {
                // 탐험 모자
                p.setColor(Color.rgb(245,158,11));
                c.drawOval(new RectF(x-30,y-46,x+30,y-34),p);
                p.setColor(Color.rgb(146,64,14));
                c.drawRoundRect(new RectF(x-17,y-56,x+17,y-36),8,8,p);

                // 초록 배지
                p.setColor(Color.rgb(34,197,94));
                c.drawCircle(x+18,y+2,7,p);
            } else if (outfitIndex == 2) {
                // 반짝 안경
                p.setStyle(Paint.Style.STROKE);
                p.setStrokeWidth(4);
                p.setColor(Color.rgb(17,24,39));
                c.drawCircle(x-8,y-25,7,p);
                c.drawCircle(x+8,y-25,7,p);
                c.drawLine(x-1,y-25,x+1,y-25,p);
                p.setStyle(Paint.Style.FILL);

                p.setColor(Color.rgb(250,204,21));
                uiText(22);
                p.setFakeBoldText(true);
                c.drawText("✦",x+20,y-31,p);
            } else if (outfitIndex == 3) {
                // 별빛 망토는 현재 구조상 몸 뒤가 아니라 옆 장식으로 표시
                p.setColor(Color.argb(215,59,130,246));
                c.drawOval(new RectF(x-40,y+4,x-12,y+48),p);
                c.drawOval(new RectF(x+12,y+4,x+40,y+48),p);

                p.setColor(Color.rgb(250,204,21));
                uiText(24);
                p.setFakeBoldText(true);
                c.drawText("★",x+18,y-3,p);
            }
        }

        void panel(Canvas c,int w,int h,String title) {
            p.setStyle(Paint.Style.FILL);
            p.setColor(Color.argb(185,15,23,42));
            c.drawRect(0,0,w,h,p);

            RectF shadow=new RectF(w*.12f+8,h*.14f+10,w*.88f+8,h*.82f+10);
            p.setColor(Color.argb(80,0,0,0));
            c.drawRoundRect(shadow,34,34,p);

            RectF r=new RectF(w*.12f,h*.14f,w*.88f,h*.82f);
            p.setColor(Color.WHITE);
            c.drawRoundRect(r,34,34,p);

            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(7);
            p.setColor(Color.rgb(125,211,252));
            c.drawRoundRect(r,34,34,p);
            p.setStyle(Paint.Style.FILL);

            p.setColor(Color.rgb(8,145,178));
            uiText(34);
            p.setFakeBoldText(true);
            c.drawText(title,w*.22f,h*.27f,p);

            p.setColor(Color.rgb(100,116,139));
            uiText(17);
            p.setFakeBoldText(false);
            c.drawText("방향키/스틱: 이동   A: 선택   B: 닫기",w*.18f,h*.76f,p);
        }

        void quiz(Canvas c,int w,int h) {
            if (quiz==null) return;
            if (quizExit.isConfirming()) { quizExitConfirm(c,w,h); return; }
            panel(c,w,h,"새 잡기 문제"); p.setColor(Color.rgb(15,23,42)); uiText(30); c.drawText(quiz.text,w*.22f,h*.33f,p); for(int i=0;i<quiz.options.length;i++){int col=i%2,row=i/2; option(c,new RectF(w*(.22f+col*.29f),h*(.43f+row*.16f),w*(.47f+col*.29f),h*(.54f+row*.16f)),quiz.options[i],i==select);}
            p.setColor(Color.rgb(71,85,105)); uiText(18); c.drawText("닫기",w*.77f,h*.27f,p);
        }
        void quizExitConfirm(Canvas c,int w,int h) {
            panel(c,w,h,"문제를 그만둘까요?");
            p.setColor(Color.rgb(15,23,42)); uiText(24); c.drawText("지금 문제와 선택은 그대로 둘 수 있어요.",w*.25f,h*.38f,p);
            option(c,new RectF(w*.26f,h*.52f,w*.46f,h*.64f),"계속 풀기",select==0);
            option(c,new RectF(w*.54f,h*.52f,w*.74f,h*.64f),"문제 나가기",select==1);
        }
        void mission(Canvas c,int w,int h) { panel(c,w,h,"오늘의 미션"); p.setColor(Color.rgb(15,23,42)); uiText(25); c.drawText("새 4마리 도감 등록: "+caughtBirds+"/4",w*.26f,h*.35f,p); c.drawText("별 5개 수집: "+foundStars+"/5",w*.26f,h*.43f,p); option(c,new RectF(w*.26f,h*.55f,w*.46f,h*.66f),"닫기",select==0); option(c,new RectF(w*.54f,h*.55f,w*.74f,h*.66f),"처음부터",select==1); }
        void closet(Canvas c,int w,int h) { panel(c,w,h,"옷장"); String[] it={"기본 복장","탐험 모자","반짝 안경","별빛 망토"}; for(int i=0;i<it.length;i++){int col=i%2,row=i/2; option(c,new RectF(w*(.22f+col*.29f),h*(.38f+row*.16f),w*(.47f+col*.29f),h*(.49f+row*.16f)),it[i],i==select);} }
        void option(Canvas c, RectF r, String t, boolean f) {
            p.setStyle(Paint.Style.FILL);
            p.setColor(Color.argb(60,0,0,0));
            c.drawRoundRect(new RectF(r.left+4,r.top+5,r.right+4,r.bottom+5),22,22,p);

            p.setColor(f ? Color.rgb(250,204,21) : Color.rgb(56,189,248));
            c.drawRoundRect(r,22,22,p);

            if(f){
                p.setStyle(Paint.Style.STROKE);
                p.setStrokeWidth(7);
                p.setColor(Color.rgb(234,88,12));
                c.drawRoundRect(r,22,22,p);
                p.setStyle(Paint.Style.FILL);

                p.setColor(Color.rgb(15,23,42));
                uiText(18);
                p.setFakeBoldText(true);
                c.drawText("▶",r.left+12,r.centerY()+7,p);
            }

            p.setColor(Color.WHITE);
            uiText(23);
            p.setFakeBoldText(true);
            c.drawText(t,r.left+(f?42:24),r.centerY()+8,p);
        }

        static class Spark { float x,y,vx,vy; int life,color; Spark(float x,float y,float vx,float vy,int life,int color){this.x=x;this.y=y;this.vx=vx;this.vy=vy;this.life=life;this.color=color;} }
        static class Dot { float x,y; boolean done; Dot(float x,float y){this.x=x;this.y=y;} }
        static class Bird { float x,y; String name,icon; boolean caught; Bird(float x,float y,String n,String i){this.x=x;this.y=y;name=n;icon=i;} }
        static class Quiz { String text, answer; String[] options; Bird bird; Quiz(String t,String[] o,String a){text=t;options=o;answer=a;} }

        // EDUNI_NATIVE_JUNGLE_MAP_HARD_APPLY_PATCH_V26_1
        private android.graphics.Bitmap[] eduniHardMapBitmapsV26_1;

        private void eduniLoadHardMapsV26_1() {
            if (eduniHardMapBitmapsV26_1 != null) return;

            int[] ids = new int[] {
                    getResources().getIdentifier("eduni_jungle_asset_map_00", "drawable", getContext().getPackageName()),
                    getResources().getIdentifier("eduni_jungle_asset_map_01", "drawable", getContext().getPackageName()),
                    getResources().getIdentifier("eduni_jungle_asset_map_02", "drawable", getContext().getPackageName()),
                    getResources().getIdentifier("eduni_jungle_asset_map_03", "drawable", getContext().getPackageName()),
                    getResources().getIdentifier("eduni_jungle_asset_map_04", "drawable", getContext().getPackageName()),
                    getResources().getIdentifier("eduni_jungle_asset_map_05", "drawable", getContext().getPackageName()),
                    getResources().getIdentifier("eduni_jungle_asset_map_06", "drawable", getContext().getPackageName()),
                    getResources().getIdentifier("eduni_jungle_asset_map_07", "drawable", getContext().getPackageName())
            };

            java.util.ArrayList<android.graphics.Bitmap> list = new java.util.ArrayList<>();
            for (int id : ids) {
                if (id == 0) continue;
                try {
                    android.graphics.Bitmap b = android.graphics.BitmapFactory.decodeResource(getResources(), id);
                    if (b != null) list.add(b);
                } catch (Exception ignored) {}
            }

            eduniHardMapBitmapsV26_1 = list.toArray(new android.graphics.Bitmap[0]);
        }

        private int eduniIntFieldV26_1(String name, int fallback) {
            try {
                java.lang.reflect.Field f = getClass().getDeclaredField(name);
                f.setAccessible(true);
                return f.getInt(this);
            } catch (Exception ignored) {
                return fallback;
            }
        }

        private boolean eduniBoolFieldV26_1(String name, boolean fallback) {
            try {
                java.lang.reflect.Field f = getClass().getDeclaredField(name);
                f.setAccessible(true);
                return f.getBoolean(this);
            } catch (Exception ignored) {
                return fallback;
            }
        }

        private android.graphics.Bitmap eduniPickHardMapV26_1() {
            eduniLoadHardMapsV26_1();
            if (eduniHardMapBitmapsV26_1 == null || eduniHardMapBitmapsV26_1.length == 0) return null;

            int stage = eduniIntFieldV26_1("stageIndex", eduniIntFieldV26_1("stageSelect", 0));
            if (stage < 0) stage = 0;

            return eduniHardMapBitmapsV26_1[stage % eduniHardMapBitmapsV26_1.length];
        }

        private void drawEduniHardMapBackgroundV26_1(android.graphics.Canvas c, int w, int h) {
            if (w <= 0 || h <= 0) return;

            boolean start = eduniBoolFieldV26_1("showStartScreen", false);
            boolean select = eduniBoolFieldV26_1("showStageSelect", false);
            if (start || select) return;

            android.graphics.Bitmap b = eduniPickHardMapV26_1();
            if (b == null || b.isRecycled()) return;

            float bw = b.getWidth();
            float bh = b.getHeight();
            if (bw <= 0 || bh <= 0) return;

            float scale = Math.min(w / bw, h / bh);
            float dw = bw * scale;
            float dh = bh * scale;
            float left = (w - dw) * 0.5f;
            float top = (h - dh) * 0.5f;

            android.graphics.RectF dst = new android.graphics.RectF(left, top, left + dw, top + dh);
            android.graphics.Paint mp = new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG | android.graphics.Paint.FILTER_BITMAP_FLAG | android.graphics.Paint.DITHER_FLAG);
            mp.setStyle(android.graphics.Paint.Style.FILL);
            mp.setColor(android.graphics.Color.rgb(17, 83, 58));
            c.drawRect(0, 0, w, h, mp);
            c.drawBitmap(b, null, dst, mp);

            mp.setShader(new android.graphics.LinearGradient(
                    0, 0, 0, h,
                    android.graphics.Color.argb(18, 255, 255, 255),
                    android.graphics.Color.argb(42, 0, 0, 0),
                    android.graphics.Shader.TileMode.CLAMP));
            c.drawRect(0, 0, w, h, mp);
            mp.setShader(null);
        }


        // EDUNI_NATIVE_JUNGLE_MAP_DRAW_ORDER_FIX_PATCH_V26_2
        private android.graphics.Bitmap[] eduniHardMapBitmapsV26_2;

        private void eduniLoadHardMapsV26_2() {
            if (eduniHardMapBitmapsV26_2 != null) return;

            int[] ids = new int[] {
                    getResources().getIdentifier("eduni_jungle_asset_map_00", "drawable", getContext().getPackageName()),
                    getResources().getIdentifier("eduni_jungle_asset_map_01", "drawable", getContext().getPackageName()),
                    getResources().getIdentifier("eduni_jungle_asset_map_02", "drawable", getContext().getPackageName()),
                    getResources().getIdentifier("eduni_jungle_asset_map_03", "drawable", getContext().getPackageName()),
                    getResources().getIdentifier("eduni_jungle_asset_map_04", "drawable", getContext().getPackageName()),
                    getResources().getIdentifier("eduni_jungle_asset_map_05", "drawable", getContext().getPackageName()),
                    getResources().getIdentifier("eduni_jungle_asset_map_06", "drawable", getContext().getPackageName()),
                    getResources().getIdentifier("eduni_jungle_asset_map_07", "drawable", getContext().getPackageName())
            };

            java.util.ArrayList<android.graphics.Bitmap> list = new java.util.ArrayList<>();
            for (int id : ids) {
                if (id == 0) continue;
                try {
                    android.graphics.Bitmap b = android.graphics.BitmapFactory.decodeResource(getResources(), id);
                    if (b != null) list.add(b);
                } catch (Exception ignored) {}
            }

            eduniHardMapBitmapsV26_2 = list.toArray(new android.graphics.Bitmap[0]);
        }

        private int eduniIntFieldV26_2(String name, int fallback) {
            try {
                java.lang.reflect.Field f = getClass().getDeclaredField(name);
                f.setAccessible(true);
                return f.getInt(this);
            } catch (Exception ignored) {
                return fallback;
            }
        }

        private boolean eduniBoolFieldV26_2(String name, boolean fallback) {
            try {
                java.lang.reflect.Field f = getClass().getDeclaredField(name);
                f.setAccessible(true);
                return f.getBoolean(this);
            } catch (Exception ignored) {
                return fallback;
            }
        }

        private android.graphics.Bitmap eduniPickHardMapV26_2() {
            eduniLoadHardMapsV26_2();
            if (eduniHardMapBitmapsV26_2 == null || eduniHardMapBitmapsV26_2.length == 0) return null;

            int stage = eduniIntFieldV26_2("stageIndex", eduniIntFieldV26_2("stageSelect", 0));
            if (stage < 0) stage = 0;

            return eduniHardMapBitmapsV26_2[stage % eduniHardMapBitmapsV26_2.length];
        }

        void drawCampBitmapAtWorld(Canvas canvas, android.graphics.Bitmap bitmap, RectF map,
                                   float worldX, float worldY, float width, float footRatio) {
            if (bitmap == null || bitmap.getWidth() <= 0 || bitmap.getHeight() <= 0) return;
            float height = width * bitmap.getHeight() / bitmap.getWidth();
            float x = map.left + worldX * map.width();
            float y = map.top + worldY * map.height();
            canvas.drawBitmap(bitmap, null, new RectF(x - width * .5f, y - height * footRatio,
                    x + width * .5f, y + height * (1f - footRatio)), p);
        }

        void drawCampGeometryBackground(Canvas canvas, int w, int h) {
            RectF map = eduniMapRectV26_4(w, h);
            p.setStyle(Paint.Style.FILL);
            if (campGroundShader != null) {
                campShaderMatrix.reset();
                campShaderMatrix.setTranslate(map.left, map.top);
                campGroundShader.setLocalMatrix(campShaderMatrix);
                p.setShader(campGroundShader);
                canvas.drawRect(map, p);
                p.setShader(null);
            } else {
                p.setColor(Color.rgb(74, 201, 120));
                canvas.drawRect(map, p);
            }

            // Decoration stays off the route; path and interaction coordinates remain the front-facing read.
            drawCampBitmapAtWorld(canvas, campTreeSprite, map, .07f, .19f, 150f, .86f);
            drawCampBitmapAtWorld(canvas, campTreeSprite, map, .91f, .19f, 148f, .86f);
            drawCampBitmapAtWorld(canvas, campTreeSprite, map, .10f, .88f, 166f, .86f);
            drawCampBitmapAtWorld(canvas, campTreeSprite, map, .88f, .86f, 164f, .86f);
            drawCampBitmapAtWorld(canvas, campRockSprite, map, .30f, .16f, 66f, .72f);
            drawCampBitmapAtWorld(canvas, campRockSprite, map, .73f, .78f, 72f, .72f);
            drawCampBitmapAtWorld(canvas, campHutSprite, map, .70f, .24f, 104f, .80f);

            // Perch is anchored to the authored Camp landmark, behind the walkable trail and bird.
            float perchX = map.left + campWorld.landmarkX * map.width();
            float perchY = map.top + campWorld.landmarkY * map.height();
            p.setColor(Color.rgb(120, 73, 34));
            canvas.drawRoundRect(new RectF(perchX - 7f, perchY - 34f, perchX + 7f, perchY + 15f), 7f, 7f, p);
            p.setColor(Color.rgb(250, 204, 21));
            canvas.drawCircle(perchX, perchY - 36f, 13f, p);

            float pathWidth = map.height() * CampVisualGeometry.WALKABLE_RADIUS * 2f;
            p.setStyle(Paint.Style.STROKE);
            p.setStrokeCap(Paint.Cap.ROUND);
            p.setStrokeJoin(Paint.Join.ROUND);
            p.setStrokeWidth(pathWidth + 14f);
            p.setColor(Color.rgb(135, 102, 55));
            drawCampPathSegments(canvas, map, p);
            p.setStrokeWidth(pathWidth);
            if (campPathShader != null) {
                campShaderMatrix.reset();
                campShaderMatrix.setTranslate(map.left, map.top);
                campPathShader.setLocalMatrix(campShaderMatrix);
                p.setShader(campPathShader);
                drawCampPathSegments(canvas, map, p);
                p.setShader(null);
            } else {
                p.setColor(Color.rgb(239, 210, 139));
                drawCampPathSegments(canvas, map, p);
            }
            p.setStyle(Paint.Style.FILL);
        }

        void drawCampPathSegments(Canvas canvas, RectF map, Paint paint) {
            for (CampVisualGeometry.Segment segment : CampVisualGeometry.pathSegments()) {
                canvas.drawLine(map.left + segment.ax * map.width(), map.top + segment.ay * map.height(),
                        map.left + segment.bx * map.width(), map.top + segment.by * map.height(), paint);
            }
        }

        private void drawEduniHardMapBackgroundV26_2(android.graphics.Canvas c, int w, int h) {
            if (w <= 0 || h <= 0) return;

            boolean start = eduniBoolFieldV26_2("showStartScreen", false);
            boolean select = eduniBoolFieldV26_2("showStageSelect", false);
            if (start || select) return;

            if (stageIndex == 0) {
                ensureEduniSprites();
                drawCampGeometryBackground(c, w, h);
                return;
            }

            android.graphics.Paint mp = new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG | android.graphics.Paint.FILTER_BITMAP_FLAG | android.graphics.Paint.DITHER_FLAG);
            android.graphics.Bitmap map = eduniPickHardMapV26_2();
            if(map != null && !map.isRecycled()) {
                RectF dst = eduniMapRectV26_4(w, h);
                mp.setStyle(android.graphics.Paint.Style.FILL);
                mp.setShader(new android.graphics.LinearGradient(
                        0, 0, 0, h,
                        android.graphics.Color.rgb(12, 80, 56),
                        android.graphics.Color.rgb(28, 120, 76),
                        android.graphics.Shader.TileMode.CLAMP));
                c.drawRect(0, 0, w, h, mp);
                mp.setShader(null);
                c.drawBitmap(map, null, dst, mp);
                mp.setStyle(android.graphics.Paint.Style.STROKE);
                mp.setStrokeWidth(Math.max(5f, Math.min(w,h) * .006f));
                mp.setColor(android.graphics.Color.argb(190, 220, 252, 232));
                c.drawRoundRect(dst, 18f, 18f, mp);
                mp.setShader(new android.graphics.LinearGradient(
                        0, dst.top, 0, dst.bottom,
                        android.graphics.Color.argb(4, 255, 255, 255),
                        android.graphics.Color.argb(28, 0, 0, 0),
                        android.graphics.Shader.TileMode.CLAMP));
                mp.setStyle(android.graphics.Paint.Style.FILL);
                c.drawRect(dst, mp);
                mp.setShader(null);
                return;
            }
            RectF r = new RectF(0, 0, w, h);
            int s = stageIndex % 3;
            int ground = s == 0 ? Color.rgb(70, 174, 106) : (s == 1 ? Color.rgb(82, 184, 135) : Color.rgb(225, 173, 112));
            int ground2 = s == 0 ? Color.rgb(38, 132, 84) : (s == 1 ? Color.rgb(119, 204, 163) : Color.rgb(239, 199, 139));
            int path = s == 2 ? Color.rgb(226, 186, 145) : Color.rgb(228, 224, 182);
            int pathEdge = s == 2 ? Color.rgb(189, 132, 95) : Color.rgb(169, 196, 139);

            mp.setStyle(android.graphics.Paint.Style.FILL);
            mp.setShader(new android.graphics.LinearGradient(0, 0, 0, h, ground2, ground, android.graphics.Shader.TileMode.CLAMP));
            c.drawRect(0, 0, w, h, mp);
            mp.setShader(null);

            if(s == 2) {
                mp.setColor(Color.rgb(55, 169, 213));
                c.drawOval(new RectF(w*.70f,h*.50f,w*1.08f,h*1.02f),mp);
                mp.setColor(Color.argb(95,255,255,255));
                c.drawArc(new RectF(w*.74f,h*.56f,w*.98f,h*.88f),210,85,false,mp);
            } else {
                mp.setColor(s == 0 ? Color.rgb(58, 182, 193) : Color.rgb(103, 197, 223));
                c.drawOval(new RectF(w*.38f,h*.62f,w*.52f,h*.75f),mp);
            }

            mp.setStyle(android.graphics.Paint.Style.STROKE);
            mp.setStrokeCap(android.graphics.Paint.Cap.ROUND);
            mp.setStrokeJoin(android.graphics.Paint.Join.ROUND);
            mp.setStrokeWidth(Math.min(w,h) * .135f);
            mp.setColor(pathEdge);
            drawStagePathV26_5(c, r, mp);
            mp.setStrokeWidth(Math.min(w,h) * .105f);
            mp.setColor(path);
            drawStagePathV26_5(c, r, mp);
            mp.setStyle(android.graphics.Paint.Style.FILL);

            drawTreeV26_5(c,r,.10f,.22f,.055f); drawTreeV26_5(c,r,.88f,.20f,.052f); drawTreeV26_5(c,r,.16f,.88f,.060f);
            drawTreeV26_5(c,r,.74f,.86f,.064f); drawRockV26_5(c,r,.30f,.18f,.018f); drawRockV26_5(c,r,.83f,.56f,.020f);
            drawFlowerV26_5(c,r,.28f,.56f,Color.rgb(244,114,182)); drawFlowerV26_5(c,r,.62f,.26f,Color.rgb(147,197,253));
            drawFlowerV26_5(c,r,.58f,.78f,Color.rgb(216,180,254)); drawFlowerV26_5(c,r,.43f,.36f,Color.rgb(251,191,36));

            mp.setShader(new android.graphics.LinearGradient(
                    0, 0, 0, h,
                    android.graphics.Color.argb(10, 255, 255, 255),
                    android.graphics.Color.argb(34, 0, 0, 0),
                    android.graphics.Shader.TileMode.CLAMP));
            c.drawRect(0, 0, w, h, mp);
            mp.setShader(null);
        }

        private void drawStagePathV26_5(android.graphics.Canvas c, RectF r, android.graphics.Paint mp) {
            int s = stageIndex % 3;
            if(s == 0) {
                drawPathSegmentV26_5(c,r,.13f,.78f,.13f,.30f,mp);
                drawPathSegmentV26_5(c,r,.13f,.30f,.48f,.28f,mp);
                drawPathSegmentV26_5(c,r,.48f,.12f,.48f,.92f,mp);
                drawPathSegmentV26_5(c,r,.13f,.54f,.84f,.54f,mp);
                drawPathSegmentV26_5(c,r,.84f,.35f,.84f,.58f,mp);
            } else if(s == 1) {
                drawPathSegmentV26_5(c,r,.16f,.78f,.30f,.66f,mp);
                drawPathSegmentV26_5(c,r,.30f,.66f,.22f,.42f,mp);
                drawPathSegmentV26_5(c,r,.22f,.42f,.47f,.28f,mp);
                drawPathSegmentV26_5(c,r,.47f,.28f,.68f,.38f,mp);
                drawPathSegmentV26_5(c,r,.68f,.38f,.80f,.64f,mp);
                drawPathSegmentV26_5(c,r,.42f,.62f,.80f,.64f,mp);
            } else {
                drawPathSegmentV26_5(c,r,.12f,.62f,.34f,.44f,mp);
                drawPathSegmentV26_5(c,r,.34f,.44f,.54f,.48f,mp);
                drawPathSegmentV26_5(c,r,.54f,.48f,.75f,.30f,mp);
                drawPathSegmentV26_5(c,r,.54f,.48f,.66f,.78f,mp);
                drawPathSegmentV26_5(c,r,.26f,.78f,.66f,.78f,mp);
            }
        }

}
}

/* EDUNI_READABILITY_V16_DONE */

/* EDUNI_NATIVE_JUNGLE_V17_TO_V20_QUALITY_PACK_V2_APPLIED */

/* EDUNI_NATIVE_JUNGLE_WORLDMAP_DEFAULT_CHALLENGE_FIX_V20_2_APPLIED */

/* EDUNI_NATIVE_JUNGLE_WORLDMAP_WEBVIEW_HARD_FIX_V20_3_APPLIED */

/* EDUNI_NATIVE_JUNGLE_WORLDMAP_NAV_BACK_FINAL_V20_8_1_APPLIED */

/* EDUNI_NATIVE_JUNGLE_WORLDMAP_NAV_BACK_FINALIZER_V20_8_2_APPLIED */

/* EDUNI_NATIVE_JUNGLE_ACTUAL_HANDLEKEY_FIX_V20_10_APPLIED */

/* EDUNI_NATIVE_JUNGLE_HANDLEKEY_HELPER_REPAIR_V20_11_APPLIED */

/* EDUNI_NATIVE_JUNGLE_INTRO_INPUT_GUARD_V21_0_APPLIED */

/* EDUNI_NATIVE_JUNGLE_INTRO_GUIDE_COPY_PATCH_V21_1_APPLIED */

/* EDUNI_NATIVE_JUNGLE_WORLDMAP_UX_PATCH_V21_2_APPLIED */

/* EDUNI_NATIVE_JUNGLE_INTRO_WORLDMAP_FLOW_FIX_V21_3_APPLIED */

/* EDUNI_NATIVE_JUNGLE_INTRO_A_TO_WORLDMAP_FIX_V21_4_APPLIED */

/* EDUNI_NATIVE_JUNGLE_STARTGAME_UNREACHABLE_FIX_V21_4_1_APPLIED */

/* EDUNI_NATIVE_JUNGLE_DRAW_GUARD_FIX_V21_5_APPLIED */

/* EDUNI_NATIVE_JUNGLE_V21_6_TO_V24_FINAL_PACK_APPLIED */

/* EDUNI_NATIVE_JUNGLE_MODERN_DESIGN_PATCH_V24_1_APPLIED */

/* EDUNI_NATIVE_JUNGLE_REFINED_LIST_DESIGN_PATCH_V24_2_APPLIED */

/* EDUNI_NATIVE_JUNGLE_ASSET_WIRING_PATCH_V25_APPLIED */
