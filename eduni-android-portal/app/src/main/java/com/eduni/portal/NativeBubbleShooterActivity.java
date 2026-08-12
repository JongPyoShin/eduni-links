package com.eduni.portal;

import android.app.Activity;
import android.content.Context;
import android.content.pm.ActivityInfo;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.DashPathEffect;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RadialGradient;
import android.graphics.RectF;
import android.graphics.Shader;
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

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.Random;

public class NativeBubbleShooterActivity extends Activity {
    Game game;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        game = new Game(this);
        setContentView(game);
        hideSystemUi();
        game.requestFocus();
    }

    @Override
    protected void onResume() {
        super.onResume();
        hideSystemUi();
        if (game != null) game.resume();
    }

    @Override
    protected void onPause() {
        if (game != null) game.pause();
        super.onPause();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            hideSystemUi();
            if (game != null) game.requestFocus();
        }
    }

    @Override
    public void onBackPressed() {
        if (game == null || !game.back()) finish();
    }

    private void hideSystemUi() {
        View d = getWindow().getDecorView();
        d.setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                        | View.SYSTEM_UI_FLAG_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        );
        if (android.os.Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController c = d.getWindowInsetsController();
            if (c != null) c.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
        }
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent e) {
        if (game != null && game.handleKey(e)) return true;
        return super.dispatchKeyEvent(e);
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (game != null && game.handleKeyDown(keyCode, event)) return true;
        return super.onKeyDown(keyCode, event);
    }

    @Override
    public boolean onKeyUp(int keyCode, KeyEvent event) {
        if (game != null && game.isHandled(keyCode)) return true;
        return super.onKeyUp(keyCode, event);
    }

    @Override
    public boolean dispatchGenericMotionEvent(MotionEvent e) {
        if (game != null && game.handleMotion(e)) return true;
        return super.dispatchGenericMotionEvent(e);
    }

    static class Game extends View {
        static final int FIELD = 0;
        static final int EXIT_MENU = 1;
        static final int CLEAR = 2;
        static final int GAME_OVER = 3;
        static final float AIM_MIN = (float) (-Math.PI + 0.22f);
        static final float AIM_MAX = -0.22f;

        final Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        final Handler main = new Handler(Looper.getMainLooper());
        final Random rnd = new Random();
        final ArrayList<Bubble> bubbles = new ArrayList<>();
        final ArrayList<String[]> deck = new ArrayList<>();

        final String[][] pairs = {
                {"家", "가"}, {"工", "공"}, {"歌", "가"}, {"青", "청"}, {"不", "불"},
                {"子", "자"}, {"電", "전"}, {"平", "평"}, {"夏", "하"}, {"川", "천"},
                {"先", "선"}, {"林", "림"}, {"韓", "한"}, {"國", "국"}, {"江", "강"},
                {"前", "전"}, {"字", "자"}, {"文", "문"}, {"春", "춘"}, {"時", "시"},
                {"學", "학"}, {"力", "력"}, {"生", "생"}, {"室", "실"}, {"內", "내"},
                {"立", "립"}, {"民", "민"}, {"村", "촌"}, {"正", "정"}, {"自", "자"},
                {"王", "왕"}, {"間", "간"}, {"寸", "촌"}, {"然", "연"}, {"兄", "형"},
                {"出", "출"}, {"車", "차"}, {"足", "족"}, {"有", "유"}, {"休", "휴"},
                {"旗", "기"}, {"長", "장"}, {"海", "해"}, {"口", "구"}, {"面", "면"},
                {"同", "동"}, {"地", "지"}, {"住", "주"}, {"年", "년"}, {"物", "물"},
                {"育", "육"}, {"里", "리"}, {"午", "오"}, {"月", "월"}, {"火", "화"},
                {"水", "수"}, {"金", "금"}, {"木", "목"}, {"土", "토"}, {"天", "천"},
                {"空", "공"}, {"雨", "우"}, {"雪", "설"}, {"白", "백"}, {"赤", "적"}
        };

        final int[] palette = {
                Color.rgb(56, 189, 248),
                Color.rgb(45, 212, 191),
                Color.rgb(251, 191, 36),
                Color.rgb(139, 92, 246),
                Color.rgb(244, 63, 94),
                Color.rgb(52, 211, 153)
        };

        boolean running;
        boolean aiming;
        boolean waiting;
        boolean shooting;
        boolean soundOn = true;
        int mode = FIELD;
        int score;
        int turn;
        int nextIndex;
        int exitChoice;
        long messageUntil;
        long lastMoveAt;

        float aimX;
        float aimY;
        float shotX;
        float shotY;
        float shotVX;
        float shotVY;
        float shotR;
        String shotTarget = "";
        String shotLabel = "";
        String message = "버블을 끌어서 조준하고 손을 떼면 발사!";
        Bubble current;

        final Runnable tick = new Runnable() {
            @Override
            public void run() {
                update();
                invalidate();
                if (running) main.postDelayed(this, 16);
            }
        };

        Game(Context c) {
            super(c);
            setFocusable(true);
            setFocusableInTouchMode(true);
            setClickable(true);
            reset();
        }

        void resume() {
            running = true;
            requestFocus();
            main.removeCallbacks(tick);
            main.post(tick);
        }

        void pause() {
            running = false;
            main.removeCallbacks(tick);
        }

        @Override
        protected void onAttachedToWindow() {
            super.onAttachedToWindow();
            requestFocus();
        }

        @Override
        public boolean onKeyDown(int keyCode, KeyEvent event) {
            return handleKeyDown(keyCode, event) || super.onKeyDown(keyCode, event);
        }

        @Override
        public boolean onKeyUp(int keyCode, KeyEvent event) {
            return isHandled(keyCode) || super.onKeyUp(keyCode, event);
        }

        void reset() {
            score = 0;
            turn = 0;
            nextIndex = 0;
            exitChoice = 0;
            mode = FIELD;
            waiting = false;
            shooting = false;
            aiming = false;
            bubbles.clear();
            deck.clear();

            for (String[] pair : pairs) deck.add(pair);
            Collections.shuffle(deck, rnd);

            BoardLayout l = layout(Math.max(480, getWidth()), Math.max(320, getHeight()));
            int cols = currentCols(l);
            int count = Math.min(cols * initialRows(l), deck.size());
            for (int i = 0; i < count; i++) {
                bubbles.add(makeBubble(deck.get(i), cols + i));
            }
            nextIndex = count;
            layoutBubbles(l);
            aimX = l.baseX;
            aimY = l.baseY - l.radius * 5.2f;
            chooseCurrent();
            showMessage("웹 포탈 방식: 앞줄 문제 버블을 조준해 맞혀봐!");
            invalidate();
        }

        Bubble makeBubble(String[] pair, int slotIndex) {
            return new Bubble(pair[0], pair[1], slotIndex, palette[Math.abs(slotIndex) % palette.length]);
        }

        int currentCols(BoardLayout l) {
            int byWidth = (int) Math.floor((l.width - l.radius * 1.6f) / (l.radius * 2.06f));
            return Math.max(7, Math.min(14, byWidth));
        }

        int initialRows(BoardLayout l) {
            float usableHeight = Math.max(0f, l.baseY - l.radius * 4.2f - l.top);
            int rowsByHeight = (int) Math.floor(usableHeight / (l.radius * 1.76f));
            return Math.max(2, Math.min(5, rowsByHeight));
        }

        void layoutBubbles(BoardLayout l) {
            int cols = currentCols(l);
            float gapX = l.radius * 2.06f;
            float gapY = l.radius * 1.76f;
            float top = l.top + l.radius + 16f;
            float rowWidth = (cols - 1) * gapX;

            for (Bubble b : bubbles) {
                int row = b.slotIndex / cols;
                int col = b.slotIndex % cols;
                float startX = l.left + (l.width - rowWidth) / 2f + (row % 2 == 1 ? l.radius * .55f : 0f);
                b.x = clamp(startX + col * gapX, l.left + l.radius + 8f, l.right - l.radius - 8f);
                b.y = top + row * gapY;
                b.r = l.radius;
            }
        }

        void chooseCurrent() {
            ArrayList<Bubble> live = liveBubbles();
            if (live.isEmpty()) {
                finishGame(true);
                return;
            }

            float frontY = live.get(0).y;
            for (Bubble b : live) frontY = Math.max(frontY, b.y);

            ArrayList<Bubble> front = new ArrayList<>();
            float radius = live.get(0).r <= 0f ? 24f : live.get(0).r;
            for (Bubble b : live) {
                if (Math.abs(b.y - frontY) < radius * .8f) front.add(b);
            }

            current = front.get(rnd.nextInt(front.size()));
            shotTarget = current.hanja;
            shotLabel = current.hangul;
            message = "'" + shotLabel + "' 소리 버블을 맞는 한자에 쏘자";
            messageUntil = System.currentTimeMillis() + 2500;
        }

        ArrayList<Bubble> liveBubbles() {
            ArrayList<Bubble> live = new ArrayList<>();
            for (Bubble b : bubbles) {
                if (!b.popped) live.add(b);
            }
            return live;
        }

        void addBackRowBubble(BoardLayout l) {
            if (deck.isEmpty()) return;
            int cols = currentCols(l);
            HashSet<Integer> occupied = new HashSet<>();
            for (Bubble b : bubbles) {
                if (!b.popped) occupied.add(b.slotIndex);
            }

            int slot = -1;
            for (int i = 0; i < cols; i++) {
                if (!occupied.contains(i)) {
                    slot = i;
                    break;
                }
            }

            if (slot < 0) {
                for (Bubble b : bubbles) {
                    if (!b.popped) b.slotIndex += cols;
                }
                turn += 1;
                occupied.clear();
                for (Bubble b : bubbles) {
                    if (!b.popped) occupied.add(b.slotIndex);
                }
                for (int i = 0; i < cols; i++) {
                    if (!occupied.contains(i)) {
                        slot = i;
                        break;
                    }
                }
            }

            if (slot < 0) return;
            Bubble b = makeBubble(deck.get(nextIndex % deck.size()), slot);
            nextIndex += 1;
            bubbles.add(b);
            layoutBubbles(l);
        }

        void afterTurn(boolean addBubble) {
            BoardLayout l = layout(getWidth(), getHeight());
            if (addBubble) addBackRowBubble(l);
            layoutBubbles(l);
            if (isDanger(l)) {
                finishGame(false);
                return;
            }
            waiting = false;
            chooseCurrent();
            invalidate();
        }

        boolean isDanger(BoardLayout l) {
            for (Bubble b : liveBubbles()) {
                if (b.y + b.r > l.baseY - l.radius * 2.2f) return true;
            }
            return false;
        }

        void finishGame(boolean clear) {
            mode = clear ? CLEAR : GAME_OVER;
            waiting = true;
            shooting = false;
            current = null;
            showMessage(clear ? "모든 버블을 터뜨렸어!" : "버블이 아래까지 내려왔어. 다시 시작해보자.");
        }

        boolean handleKeyDown(int keyCode, KeyEvent event) {
            int mapped = normalizeKeyboardKey(keyCode);
            if (mapped == keyCode) return handleKey(event);
            KeyEvent normalized = new KeyEvent(
                    event.getDownTime(),
                    event.getEventTime(),
                    event.getAction(),
                    mapped,
                    event.getRepeatCount(),
                    event.getMetaState()
            );
            return handleKey(normalized);
        }

        int normalizeKeyboardKey(int code) {
            switch (code) {
                case KeyEvent.KEYCODE_Q:
                case KeyEvent.KEYCODE_W:
                case KeyEvent.KEYCODE_NUMPAD_4:
                case KeyEvent.KEYCODE_NUMPAD_8:
                    return KeyEvent.KEYCODE_DPAD_LEFT;
                case KeyEvent.KEYCODE_E:
                case KeyEvent.KEYCODE_S:
                case KeyEvent.KEYCODE_NUMPAD_6:
                case KeyEvent.KEYCODE_NUMPAD_2:
                    return KeyEvent.KEYCODE_DPAD_RIGHT;
                case KeyEvent.KEYCODE_A:
                case KeyEvent.KEYCODE_J:
                    return KeyEvent.KEYCODE_BUTTON_A;
                case KeyEvent.KEYCODE_B:
                case KeyEvent.KEYCODE_K:
                    return KeyEvent.KEYCODE_BUTTON_B;
                default:
                    return code;
            }
        }

        boolean handleKey(KeyEvent e) {
            boolean down = e.getAction() == KeyEvent.ACTION_DOWN;
            int code = normalizeKeyboardKey(e.getKeyCode());
            if (!down) return isHandled(code);
            if (e.getRepeatCount() > 0 && isAction(code)) return true;

            if (mode == EXIT_MENU) {
                if (code == KeyEvent.KEYCODE_DPAD_LEFT || code == KeyEvent.KEYCODE_DPAD_UP) {
                    exitChoice = (exitChoice + 2) % 3;
                    invalidate();
                    return true;
                }
                if (code == KeyEvent.KEYCODE_DPAD_RIGHT || code == KeyEvent.KEYCODE_DPAD_DOWN || code == KeyEvent.KEYCODE_TAB) {
                    exitChoice = (exitChoice + 1) % 3;
                    invalidate();
                    return true;
                }
                if (code == KeyEvent.KEYCODE_BUTTON_A || code == KeyEvent.KEYCODE_DPAD_CENTER
                        || code == KeyEvent.KEYCODE_ENTER || code == KeyEvent.KEYCODE_SPACE) {
                    confirmExit();
                    return true;
                }
                if (code == KeyEvent.KEYCODE_BUTTON_B || code == KeyEvent.KEYCODE_BACK || code == KeyEvent.KEYCODE_ESCAPE) {
                    mode = FIELD;
                    invalidate();
                    return true;
                }
                return true;
            }

            if (mode == CLEAR || mode == GAME_OVER) {
                if (code == KeyEvent.KEYCODE_BUTTON_A || code == KeyEvent.KEYCODE_DPAD_CENTER
                        || code == KeyEvent.KEYCODE_ENTER || code == KeyEvent.KEYCODE_SPACE) {
                    reset();
                    return true;
                }
                if (code == KeyEvent.KEYCODE_BUTTON_B || code == KeyEvent.KEYCODE_BACK || code == KeyEvent.KEYCODE_ESCAPE) {
                    mode = EXIT_MENU;
                    exitChoice = 0;
                    invalidate();
                    return true;
                }
                return true;
            }

            switch (code) {
                case KeyEvent.KEYCODE_DPAD_LEFT:
                    adjustAim(-0.07f);
                    return true;
                case KeyEvent.KEYCODE_DPAD_RIGHT:
                    adjustAim(0.07f);
                    return true;
                case KeyEvent.KEYCODE_DPAD_UP:
                case KeyEvent.KEYCODE_DPAD_DOWN:
                    centerAim();
                    showMessage("정면 조준");
                    return true;
                case KeyEvent.KEYCODE_BUTTON_A:
                case KeyEvent.KEYCODE_DPAD_CENTER:
                case KeyEvent.KEYCODE_ENTER:
                case KeyEvent.KEYCODE_SPACE:
                    shoot();
                    return true;
                case KeyEvent.KEYCODE_BUTTON_B:
                case KeyEvent.KEYCODE_BACK:
                case KeyEvent.KEYCODE_ESCAPE:
                    mode = EXIT_MENU;
                    exitChoice = 0;
                    invalidate();
                    return true;
                case KeyEvent.KEYCODE_BUTTON_X:
                case KeyEvent.KEYCODE_X:
                case KeyEvent.KEYCODE_R:
                    reset();
                    return true;
                case KeyEvent.KEYCODE_BUTTON_Y:
                case KeyEvent.KEYCODE_Y:
                    soundOn = !soundOn;
                    showMessage(soundOn ? "효과음 켜짐" : "효과음 꺼짐");
                    return true;
                default:
                    return false;
            }
        }

        boolean handleMotion(MotionEvent e) {
            int s = e.getSource();
            boolean ctl = (s & InputDevice.SOURCE_JOYSTICK) == InputDevice.SOURCE_JOYSTICK
                    || (s & InputDevice.SOURCE_GAMEPAD) == InputDevice.SOURCE_GAMEPAD
                    || (s & InputDevice.SOURCE_DPAD) == InputDevice.SOURCE_DPAD;
            if (!ctl || e.getAction() != MotionEvent.ACTION_MOVE) return false;

            float x = axis(e, MotionEvent.AXIS_HAT_X, MotionEvent.AXIS_X, MotionEvent.AXIS_RX, MotionEvent.AXIS_Z);
            if (Math.abs(x) < .45f) return true;

            long now = System.currentTimeMillis();
            if (now - lastMoveAt < 55) return true;
            lastMoveAt = now;
            adjustAim(x > 0 ? 0.07f : -0.07f);
            return true;
        }

        float axis(MotionEvent e, int... axes) {
            for (int a : axes) {
                float v = e.getAxisValue(a);
                if (Math.abs(v) > .20f) return v;
            }
            return 0f;
        }

        void centerAim() {
            BoardLayout l = layout(getWidth(), getHeight());
            aimX = l.baseX;
            aimY = l.baseY - l.radius * 5.2f;
            invalidate();
        }

        void adjustAim(float deltaRad) {
            BoardLayout l = layout(getWidth(), getHeight());
            float angle = clamp(aimAngle(l) + deltaRad, AIM_MIN, AIM_MAX);
            float len = l.radius * 5.2f;
            aimX = l.baseX + (float) Math.cos(angle) * len;
            aimY = l.baseY + (float) Math.sin(angle) * len;
            showMessage("각도 " + Math.round(Math.toDegrees(-angle)) + "°");
            invalidate();
        }

        boolean isHandled(int code) {
            code = normalizeKeyboardKey(code);
            switch (code) {
                case KeyEvent.KEYCODE_DPAD_LEFT:
                case KeyEvent.KEYCODE_DPAD_RIGHT:
                case KeyEvent.KEYCODE_DPAD_UP:
                case KeyEvent.KEYCODE_DPAD_DOWN:
                case KeyEvent.KEYCODE_BUTTON_A:
                case KeyEvent.KEYCODE_BUTTON_B:
                case KeyEvent.KEYCODE_BUTTON_X:
                case KeyEvent.KEYCODE_BUTTON_Y:
                case KeyEvent.KEYCODE_DPAD_CENTER:
                case KeyEvent.KEYCODE_ENTER:
                case KeyEvent.KEYCODE_SPACE:
                case KeyEvent.KEYCODE_BACK:
                case KeyEvent.KEYCODE_ESCAPE:
                case KeyEvent.KEYCODE_TAB:
                case KeyEvent.KEYCODE_A:
                case KeyEvent.KEYCODE_B:
                case KeyEvent.KEYCODE_Q:
                case KeyEvent.KEYCODE_E:
                case KeyEvent.KEYCODE_W:
                case KeyEvent.KEYCODE_S:
                case KeyEvent.KEYCODE_J:
                case KeyEvent.KEYCODE_K:
                case KeyEvent.KEYCODE_X:
                case KeyEvent.KEYCODE_Y:
                case KeyEvent.KEYCODE_R:
                case KeyEvent.KEYCODE_NUMPAD_4:
                case KeyEvent.KEYCODE_NUMPAD_6:
                case KeyEvent.KEYCODE_NUMPAD_8:
                case KeyEvent.KEYCODE_NUMPAD_2:
                    return true;
                default:
                    return false;
            }
        }

        boolean isAction(int code) {
            return code == KeyEvent.KEYCODE_BUTTON_A
                    || code == KeyEvent.KEYCODE_BUTTON_B
                    || code == KeyEvent.KEYCODE_BUTTON_X
                    || code == KeyEvent.KEYCODE_BUTTON_Y
                    || code == KeyEvent.KEYCODE_DPAD_CENTER
                    || code == KeyEvent.KEYCODE_ENTER
                    || code == KeyEvent.KEYCODE_SPACE;
        }

        boolean back() {
            if (mode == EXIT_MENU) {
                mode = FIELD;
                invalidate();
                return true;
            }
            mode = EXIT_MENU;
            exitChoice = 0;
            invalidate();
            return true;
        }

        void confirmExit() {
            if (exitChoice == 0) {
                mode = FIELD;
                invalidate();
            } else if (exitChoice == 1) {
                reset();
            } else {
                returnToPortal();
            }
        }

        void returnToPortal() {
            try {
                Activity a = (Activity) getContext();
                android.content.Intent i = new android.content.Intent(a, MainActivity.class);
                i.setData(android.net.Uri.parse("http://100.75.214.95:8081/portal"));
                i.putExtra("url", "http://100.75.214.95:8081/portal");
                i.putExtra("target_url", "http://100.75.214.95:8081/portal");
                i.putExtra("eduni_target", "portal");
                i.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK | android.content.Intent.FLAG_ACTIVITY_CLEAR_TASK);
                a.startActivity(i);
                a.finish();
            } catch (Exception ignored) {
                try {
                    ((Activity) getContext()).finish();
                } catch (Exception ignored2) {
                }
            }
        }

        @Override
        public boolean onTouchEvent(MotionEvent event) {
            requestFocus();
            float x = event.getX();
            float y = event.getY();
            int w = getWidth();
            int h = getHeight();

            if (mode == EXIT_MENU) {
                if (event.getAction() == MotionEvent.ACTION_DOWN) handleExitTouch(x, y, w, h);
                return true;
            }

            if (mode == CLEAR || mode == GAME_OVER) {
                if (event.getAction() == MotionEvent.ACTION_DOWN) reset();
                return true;
            }

            RectF sound = new RectF(24, h - 68, 158, h - 18);
            RectF restart = new RectF(w - 170, h - 68, w - 24, h - 18);
            if (event.getAction() == MotionEvent.ACTION_DOWN && sound.contains(x, y)) {
                soundOn = !soundOn;
                showMessage(soundOn ? "효과음 켜짐" : "효과음 꺼짐");
                return true;
            }
            if (event.getAction() == MotionEvent.ACTION_DOWN && restart.contains(x, y)) {
                reset();
                return true;
            }

            BoardLayout l = layout(w, h);
            if (event.getAction() == MotionEvent.ACTION_DOWN) {
                if (!shooting && !waiting && y >= l.top && y <= l.bottom && x >= l.left && x <= l.right) {
                    aiming = true;
                    setAimPoint(l, x, y);
                    return true;
                }
            } else if (event.getAction() == MotionEvent.ACTION_MOVE) {
                if (aiming) {
                    setAimPoint(l, x, y);
                    return true;
                }
            } else if (event.getAction() == MotionEvent.ACTION_UP || event.getAction() == MotionEvent.ACTION_CANCEL) {
                if (aiming) {
                    setAimPoint(l, x, y);
                    aiming = false;
                    if (event.getAction() == MotionEvent.ACTION_UP) shoot();
                    return true;
                }
            }
            return true;
        }

        void handleExitTouch(float x, float y, int w, int h) {
            RectF r0 = new RectF(w * .31f, h * .45f, w * .69f, h * .55f);
            RectF r1 = new RectF(w * .31f, h * .58f, w * .69f, h * .68f);
            RectF r2 = new RectF(w * .31f, h * .71f, w * .69f, h * .81f);
            if (r0.contains(x, y)) {
                exitChoice = 0;
                confirmExit();
            } else if (r1.contains(x, y)) {
                exitChoice = 1;
                confirmExit();
            } else if (r2.contains(x, y)) {
                exitChoice = 2;
                confirmExit();
            }
        }

        void setAimPoint(BoardLayout l, float x, float y) {
            float angle = (float) Math.atan2(y - l.baseY, x - l.baseX);
            angle = clamp(angle, AIM_MIN, AIM_MAX);
            float dx = (float) Math.cos(angle);
            float dy = (float) Math.sin(angle);
            float len = Math.max(l.radius * 4f, distance(l.baseX, l.baseY, x, y));
            aimX = l.baseX + dx * len;
            aimY = l.baseY + dy * len;
            invalidate();
        }

        float aimAngle(BoardLayout l) {
            return clamp((float) Math.atan2(aimY - l.baseY, aimX - l.baseX), AIM_MIN, AIM_MAX);
        }

        void shoot() {
            if (shooting || waiting || mode != FIELD || current == null) return;

            BoardLayout l = layout(getWidth(), getHeight());
            float angle = aimAngle(l);
            shotR = l.radius * 1.04f;
            shotX = l.baseX;
            shotY = l.baseY;
            float speed = Math.max(8f, Math.min(11f, getHeight() / 65f));
            shotVX = (float) Math.cos(angle) * speed;
            shotVY = (float) Math.sin(angle) * speed;
            shotTarget = current.hanja;
            shotLabel = current.hangul;
            shooting = true;
            showMessage("발사! '" + shotLabel + "'에 맞는 " + shotTarget + " 찾기");
            invalidate();
        }

        void update() {
            if (!shooting) return;

            BoardLayout l = layout(getWidth(), getHeight());
            layoutBubbles(l);
            shotX += shotVX;
            shotY += shotVY;

            if (shotX < l.left + shotR) {
                shotX = l.left + shotR;
                shotVX = Math.abs(shotVX);
            } else if (shotX > l.right - shotR) {
                shotX = l.right - shotR;
                shotVX = -Math.abs(shotVX);
            }

            if (shotY < l.top + shotR) {
                missShot();
                return;
            }

            Bubble hit = findCollision();
            if (hit != null) handleHit(hit);
        }

        Bubble findCollision() {
            Bubble hit = null;
            float bestY = -1f;
            for (Bubble b : liveBubbles()) {
                float limit = shotR + b.r * .82f;
                if (distance(shotX, shotY, b.x, b.y) < limit && b.y > bestY) {
                    hit = b;
                    bestY = b.y;
                }
            }
            return hit;
        }

        void handleHit(Bubble hit) {
            shooting = false;
            if (hit.hanja.equals(shotTarget)) {
                hit.popped = true;
                score += 100;
                waiting = true;
                showMessage("정답! " + hit.hanja + " = " + hit.hangul);
                main.postDelayed(new Runnable() {
                    @Override
                    public void run() {
                        afterTurn(false);
                    }
                }, 520);
            } else {
                showMessage("틀렸어! 문제 버블이 하나 더 생겼어.");
                missShot();
            }
        }

        void missShot() {
            shooting = false;
            waiting = false;
            afterTurn(true);
        }

        void showMessage(String msg) {
            message = msg;
            messageUntil = System.currentTimeMillis() + 2200;
            invalidate();
        }

        @Override
        protected void onDraw(Canvas c) {
            int w = getWidth();
            int h = getHeight();
            BoardLayout l = layout(w, h);
            layoutBubbles(l);

            drawBackground(c, w, h);
            drawHeader(c, w, h);
            drawPlayCard(c, l);
            drawBubbles(c);
            drawAim(c, l);
            drawFooter(c, w, h);

            if (mode == EXIT_MENU) drawExitMenu(c, w, h);
            else if (mode == CLEAR || mode == GAME_OVER) drawEnd(c, w, h);
        }

        BoardLayout layout(int w, int h) {
            BoardLayout l = new BoardLayout();
            l.left = 24f;
            l.right = Math.max(l.left + 360f, w - 24f);
            l.top = 118f;
            l.bottom = Math.max(l.top + 260f, h - 82f);
            l.width = l.right - l.left;
            l.height = l.bottom - l.top;
            float sizeBasis = Math.min(l.width, l.height * .78f);
            l.radius = Math.max(18f, Math.min(29f, sizeBasis / 18f));
            l.baseX = (l.left + l.right) * .5f;
            l.baseY = l.bottom - l.radius - 38f;
            return l;
        }

        void drawBackground(Canvas c, int w, int h) {
            p.setStyle(Paint.Style.FILL);
            p.setShader(new LinearGradient(0, 0, w, h, Color.rgb(228, 246, 255), Color.rgb(255, 250, 241), Shader.TileMode.CLAMP));
            c.drawRect(0, 0, w, h, p);
            p.setShader(null);
        }

        void drawHeader(Canvas c, int w, int h) {
            RectF header = new RectF(24, 14, w - 24, 104);
            p.setStyle(Paint.Style.FILL);
            p.setColor(Color.WHITE);
            c.drawRoundRect(header, 12, 12, p);
            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(1.2f);
            p.setColor(Color.rgb(226, 232, 240));
            c.drawRoundRect(header, 12, 12, p);
            p.setStyle(Paint.Style.FILL);

            p.setTextAlign(Paint.Align.LEFT);
            p.setFakeBoldText(true);
            p.setTextSize(36f);
            p.setColor(Color.rgb(15, 23, 42));
            c.drawText("으두니 한자 슈터", header.left + 18, header.top + 42, p);

            p.setFakeBoldText(false);
            p.setTextSize(16f);
            p.setColor(Color.rgb(71, 85, 105));
            String target = current == null ? "" : "'" + current.hangul + "' 소리";
            c.drawText(target + " 버블을 맞는 한자에 쏘자", header.left + 18, header.top + 72, p);

            RectF scoreBox = new RectF(w - 246, 24, w - 38, 94);
            p.setStyle(Paint.Style.FILL);
            p.setColor(Color.rgb(248, 250, 252));
            c.drawRoundRect(scoreBox, 10, 10, p);
            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(1.2f);
            p.setColor(Color.rgb(203, 213, 225));
            c.drawRoundRect(scoreBox, 10, 10, p);
            p.setStyle(Paint.Style.FILL);
            p.setTextAlign(Paint.Align.CENTER);
            p.setFakeBoldText(false);
            p.setTextSize(13f);
            p.setColor(Color.rgb(71, 85, 105));
            c.drawText("점수 / 줄", scoreBox.centerX(), scoreBox.top + 22, p);
            p.setFakeBoldText(true);
            p.setTextSize(24f);
            p.setColor(Color.rgb(15, 23, 42));
            c.drawText(score + " / " + turn, scoreBox.centerX(), scoreBox.top + 54, p);
            p.setTextAlign(Paint.Align.LEFT);
        }

        void drawPlayCard(Canvas c, BoardLayout l) {
            RectF card = new RectF(l.left, l.top, l.right, l.bottom);
            p.setStyle(Paint.Style.FILL);
            p.setShader(new LinearGradient(card.left, card.top, card.right, card.bottom, Color.rgb(218, 246, 255), Color.rgb(255, 252, 236), Shader.TileMode.CLAMP));
            c.drawRoundRect(card, 10, 10, p);
            p.setShader(null);
            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(1.1f);
            p.setColor(Color.rgb(191, 219, 254));
            c.drawRoundRect(card, 10, 10, p);
            p.setStyle(Paint.Style.FILL);
        }

        void drawBubbles(Canvas c) {
            for (Bubble b : bubbles) {
                if (!b.popped) drawBubble(c, b.x, b.y, b.r, b.hanja, b.color);
            }
        }

        void drawAim(Canvas c, BoardLayout l) {
            float angle = aimAngle(l);
            Path guide = buildGuidePath(l, angle);
            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(4f);
            p.setColor(Color.rgb(20, 184, 166));
            p.setPathEffect(new DashPathEffect(new float[]{10f, 12f}, 0));
            c.drawPath(guide, p);
            p.setPathEffect(null);

            p.setStyle(Paint.Style.FILL);
            p.setColor(Color.rgb(245, 158, 11));
            c.drawArc(new RectF(l.baseX - l.radius * 1.35f, l.baseY - l.radius * 1.35f,
                    l.baseX + l.radius * 1.35f, l.baseY + l.radius * 1.35f), 195, 150, true, p);

            drawBubble(c, l.baseX, l.baseY, l.radius * 1.10f, shotLabel, Color.rgb(167, 243, 208));
            p.setTextAlign(Paint.Align.CENTER);
            p.setFakeBoldText(true);
            p.setTextSize(15f);
            p.setColor(Color.rgb(71, 85, 105));
            c.drawText("각도 " + Math.round(Math.toDegrees(-angle)) + "°", l.baseX, l.baseY + l.radius + 20, p);
            p.setTextAlign(Paint.Align.LEFT);

            if (shooting) drawBubble(c, shotX, shotY, shotR, shotLabel, Color.rgb(167, 243, 208));
        }

        Path buildGuidePath(BoardLayout l, float angle) {
            Path path = new Path();
            float shotGuideR = l.radius * 1.04f;
            float x = l.baseX;
            float y = l.baseY;
            float dx = (float) Math.cos(angle);
            float dy = (float) Math.sin(angle);
            path.moveTo(x, y);

            for (int segment = 0; segment < 8; segment++) {
                float wallT = Float.POSITIVE_INFINITY;
                if (dx < 0f) wallT = (l.left + shotGuideR - x) / dx;
                else if (dx > 0f) wallT = (l.right - shotGuideR - x) / dx;
                float topT = dy < 0f ? (l.top + shotGuideR - y) / dy : Float.POSITIVE_INFINITY;
                float nearestT = Math.min(wallT, topT);
                int hitType = nearestT == topT ? 1 : 2;

                for (Bubble b : liveBubbles()) {
                    float hitT = rayCircleT(x, y, dx, dy, b.x, b.y, shotGuideR + b.r * .82f);
                    if (hitT > 0f && hitT < nearestT) {
                        nearestT = hitT;
                        hitType = 3;
                    }
                }

                if (!Float.isFinite(nearestT) || nearestT <= 0f) break;
                x += dx * nearestT;
                y += dy * nearestT;
                path.lineTo(x, y);
                if (hitType == 1 || hitType == 3) break;
                dx *= -1f;
                x = clamp(x, l.left + shotGuideR, l.right - shotGuideR);
            }
            return path;
        }

        float rayCircleT(float ox, float oy, float dx, float dy, float cx, float cy, float radius) {
            float fx = ox - cx;
            float fy = oy - cy;
            float b = 2f * (fx * dx + fy * dy);
            float c = fx * fx + fy * fy - radius * radius;
            float disc = b * b - 4f * c;
            if (disc < 0f) return -1f;
            float root = (float) Math.sqrt(disc);
            float t1 = (-b - root) / 2f;
            float t2 = (-b + root) / 2f;
            if (t1 > 0f) return t1;
            if (t2 > 0f) return t2;
            return -1f;
        }

        void drawBubble(Canvas c, float cx, float cy, float r, String text, int color) {
            p.setStyle(Paint.Style.FILL);
            p.setColor(Color.argb(70, 15, 23, 42));
            c.drawCircle(cx + 3, cy + 4, r, p);
            p.setShader(new RadialGradient(cx - r * .35f, cy - r * .35f, r * 1.35f, Color.WHITE, color, Shader.TileMode.CLAMP));
            c.drawCircle(cx, cy, r, p);
            p.setShader(null);
            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(2.2f);
            p.setColor(darken(color));
            c.drawCircle(cx, cy, r, p);
            p.setStyle(Paint.Style.FILL);
            p.setTextAlign(Paint.Align.CENTER);
            p.setFakeBoldText(true);
            p.setTextSize(r * .88f);
            p.setColor(Color.rgb(15, 23, 42));
            Paint.FontMetrics fm = p.getFontMetrics();
            c.drawText(text, cx, cy - (fm.ascent + fm.descent) / 2f, p);
            p.setTextAlign(Paint.Align.LEFT);
            p.setFakeBoldText(false);
        }

        int darken(int color) {
            return Color.rgb(
                    Math.max(0, (int) (Color.red(color) * .72f)),
                    Math.max(0, (int) (Color.green(color) * .72f)),
                    Math.max(0, (int) (Color.blue(color) * .72f))
            );
        }

        void drawFooter(Canvas c, int w, int h) {
            RectF sound = new RectF(24, h - 68, 158, h - 18);
            RectF restart = new RectF(w - 170, h - 68, w - 24, h - 18);
            drawButton(c, sound, soundOn ? "효과음 켜짐" : "효과음 꺼짐", Color.rgb(37, 99, 235), Color.WHITE);
            drawButton(c, restart, "다시 시작", Color.rgb(15, 118, 110), Color.WHITE);

            RectF tip = new RectF(w * .20f, h - 62, w * .80f, h - 22);
            p.setStyle(Paint.Style.FILL);
            p.setColor(Color.argb(245, 255, 255, 255));
            c.drawRoundRect(tip, 14, 14, p);
            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(1.2f);
            p.setColor(Color.rgb(226, 232, 240));
            c.drawRoundRect(tip, 14, 14, p);
            p.setStyle(Paint.Style.FILL);
            p.setTextAlign(Paint.Align.CENTER);
            p.setFakeBoldText(true);
            p.setTextSize(15f);
            p.setColor(Color.rgb(51, 65, 85));
            String msg = System.currentTimeMillis() < messageUntil
                    ? message
                    : "드래그 후 놓기 발사 · ←→ 미세 조준 · A 발사 · B 메뉴 · X 다시 시작";
            c.drawText(msg, tip.centerX(), tip.centerY() + 6, p);
            p.setTextAlign(Paint.Align.LEFT);
        }

        void drawButton(Canvas c, RectF r, String text, int bg, int fg) {
            p.setStyle(Paint.Style.FILL);
            p.setColor(bg);
            c.drawRoundRect(r, 10, 10, p);
            p.setTextAlign(Paint.Align.CENTER);
            p.setFakeBoldText(true);
            p.setTextSize(16f);
            p.setColor(fg);
            c.drawText(text, r.centerX(), r.centerY() + 6, p);
            p.setTextAlign(Paint.Align.LEFT);
            p.setFakeBoldText(false);
        }

        void drawExitMenu(Canvas c, int w, int h) {
            p.setStyle(Paint.Style.FILL);
            p.setColor(Color.argb(150, 15, 23, 42));
            c.drawRect(0, 0, w, h, p);
            RectF card = new RectF(w * .28f, h * .20f, w * .72f, h * .84f);
            p.setColor(Color.WHITE);
            c.drawRoundRect(card, 28, 28, p);
            p.setTextAlign(Paint.Align.CENTER);
            p.setFakeBoldText(true);
            p.setTextSize(31f);
            p.setColor(Color.rgb(15, 23, 42));
            c.drawText("무엇을 할까요?", w * .50f, h * .31f, p);
            p.setFakeBoldText(false);
            p.setTextSize(17f);
            p.setColor(Color.rgb(100, 116, 139));
            c.drawText("↑↓ 선택 · A 실행 · B 게임으로", w * .50f, h * .39f, p);
            drawMenuButton(c, new RectF(w * .31f, h * .45f, w * .69f, h * .55f), "1. 게임으로 돌아가기 [B]", exitChoice == 0);
            drawMenuButton(c, new RectF(w * .31f, h * .58f, w * .69f, h * .68f), "2. 새 게임 시작", exitChoice == 1);
            drawMenuButton(c, new RectF(w * .31f, h * .71f, w * .69f, h * .81f), "3. 포털로 나가기", exitChoice == 2);
            p.setTextAlign(Paint.Align.LEFT);
        }

        void drawMenuButton(Canvas c, RectF r, String text, boolean selected) {
            p.setStyle(Paint.Style.FILL);
            p.setColor(selected ? Color.rgb(37, 99, 235) : Color.rgb(248, 250, 252));
            c.drawRoundRect(r, 18, 18, p);
            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(selected ? 4 : 1.5f);
            p.setColor(selected ? Color.rgb(147, 197, 253) : Color.rgb(203, 213, 225));
            c.drawRoundRect(r, 18, 18, p);
            p.setStyle(Paint.Style.FILL);
            p.setTextAlign(Paint.Align.CENTER);
            p.setFakeBoldText(true);
            p.setTextSize(18f);
            p.setColor(selected ? Color.WHITE : Color.rgb(15, 23, 42));
            c.drawText(text, r.centerX(), r.centerY() + 7, p);
            p.setTextAlign(Paint.Align.LEFT);
        }

        void drawEnd(Canvas c, int w, int h) {
            p.setStyle(Paint.Style.FILL);
            p.setColor(Color.argb(150, 15, 23, 42));
            c.drawRect(0, 0, w, h, p);
            RectF card = new RectF(w * .26f, h * .26f, w * .74f, h * .74f);
            p.setColor(Color.WHITE);
            c.drawRoundRect(card, 24, 24, p);
            p.setTextAlign(Paint.Align.CENTER);
            p.setFakeBoldText(true);
            p.setTextSize(34f);
            p.setColor(Color.rgb(15, 23, 42));
            c.drawText(mode == CLEAR ? "성공!" : "게임 끝", card.centerX(), card.top + 72, p);
            p.setFakeBoldText(false);
            p.setTextSize(18f);
            p.setColor(Color.rgb(71, 85, 105));
            c.drawText(mode == CLEAR ? "모든 버블을 터뜨렸어." : "버블이 아래까지 내려왔어.", card.centerX(), card.top + 118, p);
            drawButton(c, new RectF(card.centerX() - 110, card.bottom - 86, card.centerX() + 110, card.bottom - 34), "다시 시작", Color.rgb(37, 99, 235), Color.WHITE);
            p.setTextAlign(Paint.Align.LEFT);
        }

        float distance(float x1, float y1, float x2, float y2) {
            float dx = x1 - x2;
            float dy = y1 - y2;
            return (float) Math.sqrt(dx * dx + dy * dy);
        }

        float clamp(float v, float lo, float hi) {
            return Math.max(lo, Math.min(hi, v));
        }

        static class Bubble {
            final String hanja;
            final String hangul;
            final int color;
            int slotIndex;
            boolean popped;
            float x;
            float y;
            float r;

            Bubble(String hanja, String hangul, int slotIndex, int color) {
                this.hanja = hanja;
                this.hangul = hangul;
                this.slotIndex = slotIndex;
                this.color = color;
            }
        }

        static class BoardLayout {
            float left;
            float right;
            float top;
            float bottom;
            float width;
            float height;
            float radius;
            float baseX;
            float baseY;
        }
    }
}
