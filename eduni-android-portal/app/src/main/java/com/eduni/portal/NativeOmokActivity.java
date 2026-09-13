package com.eduni.portal;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RadialGradient;
import android.graphics.RectF;
import android.graphics.Shader;
import android.os.Bundle;
import android.util.Log;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;

import java.util.ArrayList;
import java.util.Random;

public class NativeOmokActivity extends Activity {
    OmokView game;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        game = new OmokView(this);
        setContentView(game);
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        return game != null && game.handleKey(event) || super.dispatchKeyEvent(event);
    }

    @Override
    public boolean onGenericMotionEvent(MotionEvent event) {
        return game != null && game.handleMotion(event) || super.onGenericMotionEvent(event);
    }

    static class OmokView extends View {
        static final int EMPTY = 0;
        static final int BLACK = 1;
        static final int WHITE = 2;

        static final int OVERLAY_NONE = 0;
        static final int OVERLAY_EXIT = 1;
        static final int OVERLAY_SETTINGS = 2;
        static final int OVERLAY_ITEM_UNDO = 3;
        static final int OVERLAY_ITEM_HINT = 4;
        static final int OVERLAY_ITEM_SELECT = 5;

        static final int LIMIT_UNLIMITED = 999;

        final Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        final Paint bitmapPaint = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG | Paint.DITHER_FLAG);
        final RectF bitmapDestination = new RectF();
        final ArrayList<Move> history = new ArrayList<>();
        final Random random = new Random();

        final String[] aiNames = {"쉬움", "보통", "어려움"};
        final int[] boardOptions = {15, 19, 25};
        final int[] limitOptions = {0, 1, 3, 5, 10, LIMIT_UNLIMITED};

        int boardSize = 25;
        int aiLevel = 1;
        int undoLimit = 3;
        int hintLimit = 3;
        int firstTurn = BLACK;
        boolean aiExplain = true;

        int[][] board;
        int cursorR;
        int cursorC;
        int currentTurn = BLACK;
        int winner = EMPTY;
        boolean gameOver = false;
        boolean aiThinking = false;
        int lastR = -1;
        int lastC = -1;
        int[] winLine = null;

        int undoUsed = 0;
        int hintUsed = 0;
        int hintR = -1;
        int hintC = -1;

        int overlay = OVERLAY_NONE;
        int exitChoice = 0;
        int itemChoice = 1;
        int itemSelectChoiceV8_3 = 0;
        int settingIndex = 0;

        long lastStickMoveAt = 0;
        String message = "AI 대결 모드예요. 25줄판은 더 오래 생각하며 둘 수 있어요.";
        long messageUntil = 0;

        RectF touchPause = new RectF();
        RectF touchHint = new RectF();
        RectF touchUndo = new RectF();
        RectF touchInfo = new RectF();
        RectF touchSettings = new RectF();
        RectF touchRestart = new RectF();

        RectF touchMode = new RectF();
        RectF touchTurn = new RectF();
        RectF touchLimit = new RectF();
        RectF touchScore = new RectF();

        RectF[] settingRows = new RectF[8];
        RectF settingsSave = new RectF();
        RectF settingsNewGame = new RectF();
        RectF settingsResetRecord = new RectF();
        RectF settingsResetAll = new RectF();
        RectF settingsClose = new RectF();

        Bitmap stoneBlackNormal;
        Bitmap stoneBlackLastMove;
        Bitmap stoneWhiteNormal;
        Bitmap stoneWhiteLastMove;
        Bitmap cursorNormal;
        Bitmap cursorValid;
        Bitmap cursorOccupied;
        Bitmap hintMarker;
        Bitmap hintPulse;

        OmokView(Context context) {
            super(context);
            setFocusable(true);
            setFocusableInTouchMode(true);
            requestFocus();
            loadSettings();
            loadVisualBitmaps();
            resetGame();
        }

        void loadVisualBitmaps() {
            stoneBlackNormal = loadVisualBitmap("omok_stone_black_normal_v01");
            stoneBlackLastMove = loadVisualBitmap("omok_stone_black_last_move_v01");
            stoneWhiteNormal = loadVisualBitmap("omok_stone_white_normal_v01");
            stoneWhiteLastMove = loadVisualBitmap("omok_stone_white_last_move_v01");
            cursorNormal = loadVisualBitmap("omok_cursor_normal_v01");
            cursorValid = loadVisualBitmap("omok_cursor_valid_v01");
            cursorOccupied = loadVisualBitmap("omok_cursor_occupied_v01");
            hintMarker = loadVisualBitmap("omok_hint_marker_v01");
            hintPulse = loadVisualBitmap("omok_hint_pulse_v01");
        }

        Bitmap loadVisualBitmap(String drawableName) {
            int resourceId = getResources().getIdentifier(drawableName, "drawable", getContext().getPackageName());
            if (resourceId == 0) {
                Log.w("NativeOmok", "Bitmap fallback for " + drawableName + ": drawable missing");
                return null;
            }
            BitmapFactory.Options options = new BitmapFactory.Options();
            options.inScaled = false;
            Bitmap bitmap = BitmapFactory.decodeResource(getResources(), resourceId, options);
            if (bitmap == null) {
                Log.w("NativeOmok", "Bitmap fallback for " + drawableName + ": decode returned null");
            }
            return bitmap;
        }

        void loadSettings() {
            SharedPreferences sp = getContext().getSharedPreferences("eduni_native_omok_settings_v6", Context.MODE_PRIVATE);
            boardSize = sp.getInt("boardSize", 25);
            aiLevel = clamp(sp.getInt("aiLevel", 1), 0, 2);
            undoLimit = sp.getInt("undoLimit", 3);
            hintLimit = sp.getInt("hintLimit", 3);
            firstTurn = sp.getInt("firstTurn", BLACK);
            aiExplain = sp.getBoolean("aiExplain", true);

            if (boardSize != 15 && boardSize != 19 && boardSize != 25) boardSize = 25;
            if (!isValidLimit(undoLimit)) undoLimit = 3;
            if (!isValidLimit(hintLimit)) hintLimit = 3;
            if (firstTurn != BLACK && firstTurn != WHITE) firstTurn = BLACK;
        }

        void saveSettings() {
            getContext().getSharedPreferences("eduni_native_omok_settings_v6", Context.MODE_PRIVATE)
                    .edit()
                    .putInt("boardSize", boardSize)
                    .putInt("aiLevel", aiLevel)
                    .putInt("undoLimit", undoLimit)
                    .putInt("hintLimit", hintLimit)
                    .putInt("firstTurn", firstTurn)
                    .putBoolean("aiExplain", aiExplain)
                    .apply();
        }

        boolean isValidLimit(int value) {
            for (int v: limitOptions) if (v == value) return true;
            return false;
        }

        void resetGame() {
            board = new int[boardSize][boardSize];
            history.clear();
            cursorR = boardSize / 2;
            cursorC = boardSize / 2;
            currentTurn = firstTurn;
            winner = EMPTY;
            gameOver = false;
            aiThinking = false;
            lastR = -1;
            lastC = -1;
            winLine = null;
            undoUsed = 0;
            hintUsed = 0;
            hintR = -1;
            hintC = -1;
            overlay = OVERLAY_NONE;

            if (currentTurn == WHITE) {
                aiThinking = true;
                postDelayed(new Runnable() {
                    @Override
                    public void run() {
                        aiMove();
                    }
                }, 280);
            }
            invalidate();
        }

boolean handleKey(KeyEvent e) {
            final boolean down = e.getAction() == KeyEvent.ACTION_DOWN;
            final int code = e.getKeyCode();

            if (!down) return isHandledKey(code);
            if (e.getRepeatCount() > 0 && isActionKey(code)) return true;

            if (overlay == OVERLAY_EXIT) return handleTwoChoiceKey(code, OVERLAY_EXIT);
            if (overlay == OVERLAY_ITEM_UNDO) return handleTwoChoiceKey(code, OVERLAY_ITEM_UNDO);
            if (overlay == OVERLAY_ITEM_HINT) return handleTwoChoiceKey(code, OVERLAY_ITEM_HINT);
            if (overlay == OVERLAY_ITEM_SELECT) return handleItemSelectKeyV8_3(code);
            if (overlay == OVERLAY_SETTINGS) return handleSettingsKey(code);

            switch (code) {
                case KeyEvent.KEYCODE_DPAD_LEFT:
                    moveCursor(0, -1);
                    return true;
                case KeyEvent.KEYCODE_DPAD_RIGHT:
                    moveCursor(0, 1);
                    return true;
                case KeyEvent.KEYCODE_DPAD_UP:
                    moveCursor(-1, 0);
                    return true;
                case KeyEvent.KEYCODE_DPAD_DOWN:
                    moveCursor(1, 0);
                    return true;
                case KeyEvent.KEYCODE_BUTTON_A:
                case KeyEvent.KEYCODE_DPAD_CENTER:
                case KeyEvent.KEYCODE_ENTER:
                case KeyEvent.KEYCODE_SPACE:
                    placeByPlayer();
                    return true;
                case KeyEvent.KEYCODE_BUTTON_B:
                case KeyEvent.KEYCODE_BACK:
                case KeyEvent.KEYCODE_ESCAPE:
                    openExitOverlay();
                    return true;
                case KeyEvent.KEYCODE_BUTTON_X:
                    openSettingsOverlay();
                    return true;
                case KeyEvent.KEYCODE_BUTTON_Y:
                    openItemSelectOverlayV8_3();
                    return true;
                case KeyEvent.KEYCODE_BUTTON_START:
                case KeyEvent.KEYCODE_MENU:
                    openSettingsOverlay();
                    return true;
                default:
                    return false;
            }
        }

        void openExitOverlay() {
            overlay = OVERLAY_EXIT;
            exitChoice = 0;
            invalidate();
        }

        void openUndoOverlay() {
            if (!canOpenUndo()) return;
            overlay = OVERLAY_ITEM_UNDO;
            itemChoice = 1;
            invalidate();
        }

        void openHintOverlay() {
            if (!canOpenHint()) return;
            overlay = OVERLAY_ITEM_HINT;
            itemChoice = 1;
            invalidate();
        }

        void openSettingsOverlay() {
            overlay = OVERLAY_SETTINGS;
            settingIndex = 0;
            invalidate();
        }

        boolean canOpenUndo() {
            if (history.isEmpty()) {
                showMessage("무를 돌이 없어요");
                return false;
            }
            if (undoLimit != LIMIT_UNLIMITED && undoUsed >= undoLimit) {
                showMessage("무르기 아이템을 모두 사용했어요");
                return false;
            }
            return true;
        }

        boolean canOpenHint() {
            if (gameOver || aiThinking || currentTurn != BLACK) {
                showMessage("지금은 힌트를 쓸 수 없어요");
                return false;
            }
            if (hintLimit != LIMIT_UNLIMITED && hintUsed >= hintLimit) {
                showMessage("힌트 아이템을 모두 사용했어요");
                return false;
            }
            return true;
        }

boolean handleTwoChoiceKey(int code, int kind) {
            /*
             * EDUNI_NATIVE_OMOK_PORTAL_EXIT_FIX_PATCH_V8_1
             * B popup has 3 choices. Support keyboard arrows, joystick d-pad,
             * tab, and shoulder buttons so the selection can always move to "포털로".
             */
            switch (code) {
                case KeyEvent.KEYCODE_DPAD_LEFT:
                case KeyEvent.KEYCODE_SYSTEM_NAVIGATION_LEFT:
                case KeyEvent.KEYCODE_BUTTON_L1:
                    if (kind == OVERLAY_EXIT) exitChoice = (exitChoice + 2) % 3;
                    else itemChoice = 0;
                    invalidate();
                    return true;

                case KeyEvent.KEYCODE_DPAD_RIGHT:
                case KeyEvent.KEYCODE_SYSTEM_NAVIGATION_RIGHT:
                case KeyEvent.KEYCODE_TAB:
                case KeyEvent.KEYCODE_BUTTON_R1:
                    if (kind == OVERLAY_EXIT) exitChoice = (exitChoice + 1) % 3;
                    else itemChoice = 1;
                    invalidate();
                    return true;

                case KeyEvent.KEYCODE_DPAD_UP:
                case KeyEvent.KEYCODE_SYSTEM_NAVIGATION_UP:
                    if (kind == OVERLAY_EXIT) {
                        exitChoice = (exitChoice + 2) % 3;
                        invalidate();
                    }
                    return true;

                case KeyEvent.KEYCODE_DPAD_DOWN:
                case KeyEvent.KEYCODE_SYSTEM_NAVIGATION_DOWN:
                    if (kind == OVERLAY_EXIT) {
                        exitChoice = (exitChoice + 1) % 3;
                        invalidate();
                    }
                    return true;

                case KeyEvent.KEYCODE_1:
                case KeyEvent.KEYCODE_NUMPAD_1:
                    if (kind == OVERLAY_EXIT) {
                        exitChoice = 0;
                        invalidate();
                    }
                    return true;

                case KeyEvent.KEYCODE_2:
                case KeyEvent.KEYCODE_NUMPAD_2:
                    if (kind == OVERLAY_EXIT) {
                        exitChoice = 1;
                        invalidate();
                    }
                    return true;

                case KeyEvent.KEYCODE_3:
                case KeyEvent.KEYCODE_NUMPAD_3:
                    if (kind == OVERLAY_EXIT) {
                        exitChoice = 2;
                        invalidate();
                    }
                    return true;

                case KeyEvent.KEYCODE_BUTTON_A:
                case KeyEvent.KEYCODE_DPAD_CENTER:
                case KeyEvent.KEYCODE_ENTER:
                case KeyEvent.KEYCODE_SPACE:
                    confirmTwoChoice(kind);
                    return true;

                case KeyEvent.KEYCODE_BUTTON_B:
                case KeyEvent.KEYCODE_BACK:
                case KeyEvent.KEYCODE_ESCAPE:
                    overlay = OVERLAY_NONE;
                    invalidate();
                    return true;

                default:
                    return true;
            }
        }

void confirmTwoChoice(int kind) {
            if (kind == OVERLAY_EXIT) {
                if (exitChoice == 0) {
                    overlay = OVERLAY_NONE;
                    invalidate();
                } else if (exitChoice == 1) {
                    resetGame();
                    showMessage("새 게임을 시작했어요");
                } else {
                    returnToPortalV8_1();
                }
                return;
            }

            if (itemChoice == 0) {
                overlay = OVERLAY_NONE;
                invalidate();
                return;
            }

            overlay = OVERLAY_NONE;
            if (kind == OVERLAY_ITEM_UNDO) doUndoPair();
            else if (kind == OVERLAY_ITEM_HINT) doHint();
        }


        void returnToPortalV8_1() {
            /*
             * EDUNI_NATIVE_OMOK_PORTAL_EXIT_FIX_PATCH_V8_1_1
             * v8.1에서 confirmTwoChoice()가 이 메서드를 호출하는데,
             * 일부 파일 구조에서 helper 삽입이 누락되어 컴파일 오류가 났습니다.
             */
            try {
                Activity a = (Activity) getContext();
                android.content.Intent intent = new android.content.Intent(a, MainActivity.class);
                intent.setData(android.net.Uri.parse("http://100.75.214.95:8081/portal"));
                intent.putExtra("url", "http://100.75.214.95:8081/portal");
                intent.putExtra("target_url", "http://100.75.214.95:8081/portal");
                intent.putExtra("eduni_target", "portal");
                intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK | android.content.Intent.FLAG_ACTIVITY_CLEAR_TASK);
                a.startActivity(intent);
                a.finish();
            } catch (Exception ignored) {
                try {
                    ((Activity) getContext()).finish();
                } catch (Exception ignored2) {}
            }
        }

void openItemSelectOverlayV8_3() {
            overlay = OVERLAY_ITEM_SELECT;
            itemSelectChoiceV8_3 = 0;
            invalidate();
        }

        boolean handleItemSelectKeyV8_3(int code) {
            switch (code) {
                case KeyEvent.KEYCODE_DPAD_LEFT:
                case KeyEvent.KEYCODE_DPAD_UP:
                case KeyEvent.KEYCODE_SYSTEM_NAVIGATION_LEFT:
                case KeyEvent.KEYCODE_SYSTEM_NAVIGATION_UP:
                case KeyEvent.KEYCODE_BUTTON_L1:
                    itemSelectChoiceV8_3 = (itemSelectChoiceV8_3 + 2) % 3;
                    invalidate();
                    return true;

                case KeyEvent.KEYCODE_DPAD_RIGHT:
                case KeyEvent.KEYCODE_DPAD_DOWN:
                case KeyEvent.KEYCODE_SYSTEM_NAVIGATION_RIGHT:
                case KeyEvent.KEYCODE_SYSTEM_NAVIGATION_DOWN:
                case KeyEvent.KEYCODE_TAB:
                case KeyEvent.KEYCODE_BUTTON_R1:
                    itemSelectChoiceV8_3 = (itemSelectChoiceV8_3 + 1) % 3;
                    invalidate();
                    return true;

                case KeyEvent.KEYCODE_1:
                case KeyEvent.KEYCODE_NUMPAD_1:
                    itemSelectChoiceV8_3 = 0;
                    confirmItemSelectV8_3();
                    return true;

                case KeyEvent.KEYCODE_2:
                case KeyEvent.KEYCODE_NUMPAD_2:
                    itemSelectChoiceV8_3 = 1;
                    confirmItemSelectV8_3();
                    return true;

                case KeyEvent.KEYCODE_3:
                case KeyEvent.KEYCODE_NUMPAD_3:
                    itemSelectChoiceV8_3 = 2;
                    confirmItemSelectV8_3();
                    return true;

                case KeyEvent.KEYCODE_BUTTON_A:
                case KeyEvent.KEYCODE_DPAD_CENTER:
                case KeyEvent.KEYCODE_ENTER:
                case KeyEvent.KEYCODE_SPACE:
                    confirmItemSelectV8_3();
                    return true;

                case KeyEvent.KEYCODE_BUTTON_B:
                case KeyEvent.KEYCODE_BACK:
                case KeyEvent.KEYCODE_ESCAPE:
                    overlay = OVERLAY_NONE;
                    invalidate();
                    return true;

                default:
                    return true;
            }
        }

        void confirmItemSelectV8_3() {
            if (itemSelectChoiceV8_3 == 0) {
                overlay = OVERLAY_NONE;
                openUndoOverlay();
            } else if (itemSelectChoiceV8_3 == 1) {
                overlay = OVERLAY_NONE;
                openHintOverlay();
            } else {
                overlay = OVERLAY_NONE;
                invalidate();
            }
        }

        void handleItemSelectTouchV8_3(float x, float y) {
            int w = getWidth();
            int h = getHeight();

            RectF undo = new RectF(w * .31f, h * .46f, w * .69f, h * .56f);
            RectF hint = new RectF(w * .31f, h * .585f, w * .69f, h * .685f);
            RectF cancel = new RectF(w * .31f, h * .71f, w * .69f, h * .81f);

            if (undo.contains(x, y)) {
                itemSelectChoiceV8_3 = 0;
                confirmItemSelectV8_3();
            } else if (hint.contains(x, y)) {
                itemSelectChoiceV8_3 = 1;
                confirmItemSelectV8_3();
            } else if (cancel.contains(x, y)) {
                itemSelectChoiceV8_3 = 2;
                confirmItemSelectV8_3();
            }
        }

        void drawItemSelectOverlayV8_3(Canvas c, int w, int h) {
            drawDim(c, w, h);

            RectF card = centeredCard(w, h, .54f, .68f);
            p.setColor(Color.WHITE);
            c.drawRoundRect(card, 30, 30, p);

            p.setTextAlign(Paint.Align.CENTER);
            p.setColor(Color.rgb(15, 23, 42));
            p.setFakeBoldText(true);
            p.setTextSize(Math.max(31f, h * .052f));
            c.drawText("아이템 선택", w * .50f, h * .30f, p);

            p.setFakeBoldText(false);
            p.setTextSize(Math.max(18f, h * .030f));
            p.setColor(Color.rgb(100, 116, 139));
            c.drawText("↑↓ 또는 ←→ 로 선택 · A 실행 · B 취소", w * .50f, h * .385f, p);

            drawItemSelectButtonV8_3(c, new RectF(w * .31f, h * .46f, w * .69f, h * .56f),
                    "1. 무르기 아이템", "내 돌 + AI 돌 되돌리기 · 남은 횟수 " + remainText(undoUsed, undoLimit), itemSelectChoiceV8_3 == 0);

            drawItemSelectButtonV8_3(c, new RectF(w * .31f, h * .585f, w * .69f, h * .685f),
                    "2. 힌트 아이템", "추천 위치 표시 · 남은 횟수 " + remainText(hintUsed, hintLimit), itemSelectChoiceV8_3 == 1);

            drawItemSelectButtonV8_3(c, new RectF(w * .31f, h * .71f, w * .69f, h * .81f),
                    "3. 취소 [B]", "게임으로 돌아가기", itemSelectChoiceV8_3 == 2);

            p.setTextSize(Math.max(15f, h * .024f));
            p.setColor(Color.rgb(100, 116, 139));
            c.drawText("Y: 아이템 선택 · X: 부모 설정", w * .50f, h * .885f, p);

            p.setTextAlign(Paint.Align.LEFT);
        }

        void drawItemSelectButtonV8_3(Canvas c, RectF r, String title, String sub, boolean selected) {
            p.setStyle(Paint.Style.FILL);
            p.setColor(selected ? Color.rgb(37, 99, 235) : Color.rgb(248, 250, 252));
            c.drawRoundRect(r, 20, 20, p);

            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(selected ? 4f : 1.5f);
            p.setColor(selected ? Color.rgb(147, 197, 253) : Color.rgb(203, 213, 225));
            c.drawRoundRect(r, 20, 20, p);

            p.setStyle(Paint.Style.FILL);
            p.setTextAlign(Paint.Align.LEFT);
            p.setFakeBoldText(true);
            p.setTextSize(Math.max(20f, getHeight() * .033f));
            p.setColor(selected ? Color.WHITE : Color.rgb(15, 23, 42));
            c.drawText(title, r.left + 24f, r.top + 36f, p);

            p.setFakeBoldText(false);
            p.setTextSize(Math.max(15f, getHeight() * .024f));
            p.setColor(selected ? Color.rgb(219, 234, 254) : Color.rgb(71, 85, 105));
            c.drawText(sub, r.left + 24f, r.top + 65f, p);

            p.setTextAlign(Paint.Align.LEFT);
            p.setFakeBoldText(false);
        }

                boolean handleSettingsKey(int code) {
            switch (code) {
                case KeyEvent.KEYCODE_DPAD_UP:
                    settingIndex = clamp(settingIndex - 1, 0, 7);
                    invalidate();
                    return true;
                case KeyEvent.KEYCODE_DPAD_DOWN:
                    settingIndex = clamp(settingIndex + 1, 0, 7);
                    invalidate();
                    return true;
                case KeyEvent.KEYCODE_DPAD_LEFT:
                    changeSetting(-1);
                    return true;
                case KeyEvent.KEYCODE_DPAD_RIGHT:
                    changeSetting(1);
                    return true;
                case KeyEvent.KEYCODE_BUTTON_A:
                case KeyEvent.KEYCODE_DPAD_CENTER:
                case KeyEvent.KEYCODE_ENTER:
                case KeyEvent.KEYCODE_SPACE:
                    changeSetting(1);
                    return true;
                case KeyEvent.KEYCODE_BUTTON_B:
                case KeyEvent.KEYCODE_BACK:
                case KeyEvent.KEYCODE_ESCAPE:
                    saveSettings();
                    overlay = OVERLAY_NONE;
                    showMessage("설정을 저장했어요");
                    invalidate();
                    return true;
                default:
                    return true;
            }
        }

        void changeSetting(int dir) {
            if (settingIndex == 0) {
                // Game mode: only AI vs player for now.
                showMessage("대결 모드는 현재 AI vs 사람만 지원해요");
            } else if (settingIndex == 1) {
                aiLevel = wrap(aiLevel + dir, aiNames.length);
            } else if (settingIndex == 2) {
                firstTurn = firstTurn == BLACK ? WHITE : BLACK;
                showMessage(firstTurn == BLACK ? "사람 먼저" : "AI 먼저");
            } else if (settingIndex == 3) {
                aiExplain = !aiExplain;
            } else if (settingIndex == 4) {
                hintLimit = cycleLimit(hintLimit, dir);
            } else if (settingIndex == 5) {
                undoLimit = cycleLimit(undoLimit, dir);
            } else if (settingIndex == 6) {
                showMessage("시간 제한은 아직 무제한이에요");
            } else if (settingIndex == 7) {
                int idx = 0;
                for (int i = 0; i < boardOptions.length; i++) if (boardOptions[i] == boardSize) idx = i;
                boardSize = boardOptions[wrap(idx + dir, boardOptions.length)];
                showMessage("오목판 " + boardSize + "줄 · 저장 후 새 게임에 적용");
            }
            invalidate();
        }

        int cycleLimit(int current, int dir) {
            int idx = 0;
            for (int i = 0; i < limitOptions.length; i++) {
                if (limitOptions[i] == current) {
                    idx = i;
                    break;
                }
            }
            return limitOptions[wrap(idx + dir, limitOptions.length)];
        }

        int wrap(int v, int size) {
            while (v < 0) v += size;
            while (v >= size) v -= size;
            return v;
        }

        boolean isHandledKey(int code) {
            switch (code) {
                case KeyEvent.KEYCODE_DPAD_LEFT:
                case KeyEvent.KEYCODE_DPAD_RIGHT:
                case KeyEvent.KEYCODE_DPAD_UP:
                case KeyEvent.KEYCODE_DPAD_DOWN:
                case KeyEvent.KEYCODE_BUTTON_A:
                case KeyEvent.KEYCODE_DPAD_CENTER:
                case KeyEvent.KEYCODE_ENTER:
                case KeyEvent.KEYCODE_SPACE:
                case KeyEvent.KEYCODE_BUTTON_B:
                case KeyEvent.KEYCODE_BACK:
                case KeyEvent.KEYCODE_ESCAPE:
                case KeyEvent.KEYCODE_BUTTON_X:
                case KeyEvent.KEYCODE_BUTTON_Y:
                case KeyEvent.KEYCODE_BUTTON_START:
                case KeyEvent.KEYCODE_MENU:
                    return true;
                default:
                    return false;
            }
        }

        boolean isActionKey(int code) {
            return code == KeyEvent.KEYCODE_BUTTON_A
                    || code == KeyEvent.KEYCODE_DPAD_CENTER
                    || code == KeyEvent.KEYCODE_ENTER
                    || code == KeyEvent.KEYCODE_SPACE
                    || code == KeyEvent.KEYCODE_BUTTON_X
                    || code == KeyEvent.KEYCODE_BUTTON_Y
                    || code == KeyEvent.KEYCODE_BUTTON_START
                    || code == KeyEvent.KEYCODE_MENU;
        }

boolean handleMotion(MotionEvent e) {
            if ((e.getSource() & android.view.InputDevice.SOURCE_JOYSTICK) == 0
                    && (e.getSource() & android.view.InputDevice.SOURCE_GAMEPAD) == 0) {
                return false;
            }

            if (e.getAction() != MotionEvent.ACTION_MOVE) return false;

            long now = System.currentTimeMillis();
            if (now - lastStickMoveAt < 120) return true;

            float x = getCenteredAxis(e, MotionEvent.AXIS_X);
            float y = getCenteredAxis(e, MotionEvent.AXIS_Y);
            float hx = getCenteredAxis(e, MotionEvent.AXIS_HAT_X);
            float hy = getCenteredAxis(e, MotionEvent.AXIS_HAT_Y);

            if (Math.abs(hx) > Math.abs(x)) x = hx;
            if (Math.abs(hy) > Math.abs(y)) y = hy;

            if (Math.abs(x) < .45f && Math.abs(y) < .45f) return true;

            if (overlay == OVERLAY_EXIT || overlay == OVERLAY_ITEM_UNDO || overlay == OVERLAY_ITEM_HINT) {
                if (Math.abs(x) > Math.abs(y)) {
                    if (overlay == OVERLAY_EXIT) exitChoice = x > 0 ? (exitChoice + 1) % 3 : (exitChoice + 2) % 3;
                    else itemChoice = x > 0 ? 1 : 0;
                    invalidate();
                } else if (overlay == OVERLAY_EXIT) {
                    exitChoice = y > 0 ? (exitChoice + 1) % 3 : (exitChoice + 2) % 3;
                    invalidate();
                }
                lastStickMoveAt = now;
                return true;
            }

            if (overlay == OVERLAY_ITEM_SELECT) {
                if (Math.abs(x) > Math.abs(y)) itemSelectChoiceV8_3 = x > 0 ? (itemSelectChoiceV8_3 + 1) % 3 : (itemSelectChoiceV8_3 + 2) % 3;
                else itemSelectChoiceV8_3 = y > 0 ? (itemSelectChoiceV8_3 + 1) % 3 : (itemSelectChoiceV8_3 + 2) % 3;
                invalidate();
                lastStickMoveAt = now;
                return true;
            }

            if (overlay == OVERLAY_SETTINGS) {
                if (Math.abs(x) > Math.abs(y)) changeSetting(x > 0 ? 1 : -1);
                else {
                    settingIndex = clamp(settingIndex + (y > 0 ? 1 : -1), 0, 7);
                    invalidate();
                }
                lastStickMoveAt = now;
                return true;
            }

            if (Math.abs(x) > Math.abs(y)) moveCursor(0, x > 0 ? 1 : -1);
            else moveCursor(y > 0 ? 1 : -1, 0);

            lastStickMoveAt = now;
            return true;
        }

        float getCenteredAxis(MotionEvent event, int axis) {
            float value = event.getAxisValue(axis);
            return Math.abs(value) > .20f ? value : 0f;
        }

        void moveCursor(int dr, int dc) {
            cursorR = clamp(cursorR + dr, 0, boardSize - 1);
            cursorC = clamp(cursorC + dc, 0, boardSize - 1);
            hintR = -1;
            hintC = -1;
            invalidate();
        }

        int clamp(int v, int min, int max) {
            return Math.max(min, Math.min(max, v));
        }

@Override
        public boolean onTouchEvent(MotionEvent event) {
            if (event.getAction() != MotionEvent.ACTION_DOWN) return true;
            float x = event.getX();
            float y = event.getY();

            if (overlay == OVERLAY_EXIT || overlay == OVERLAY_ITEM_UNDO || overlay == OVERLAY_ITEM_HINT) {
                handleTwoChoiceTouch(x, y, overlay);
                return true;
            }

            if (overlay == OVERLAY_ITEM_SELECT) {
                handleItemSelectTouchV8_3(x, y);
                return true;
            }

            if (overlay == OVERLAY_SETTINGS) {
                handleSettingsTouch(x, y);
                return true;
            }

            if (handleRailTouchV8_3(x, y)) {
                return true;
            }

            if (touchMode.contains(x, y)) {
                showMessage("AI vs 사람 모드예요");
                return true;
            }
            if (touchTurn.contains(x, y)) {
                showMessage(statusText());
                return true;
            }
            if (touchLimit.contains(x, y)) {
                openSettingsOverlay();
                return true;
            }
            if (touchScore.contains(x, y)) {
                showMessage("현재 전적은 이번 판 기준 표시예요");
                return true;
            }

            BoardRect br = boardRect(getWidth(), getHeight());
            int c = Math.round((x - br.left) / br.cell);
            int r = Math.round((y - br.top) / br.cell);

            if (r < 0 || c < 0 || r >= boardSize || c >= boardSize) return true;

            cursorR = r;
            cursorC = c;
            placeByPlayer();
            return true;
        }

boolean handleRailTouchV8_3(float x, float y) {
            if (x > railW() + 8f) return false;

            if (touchPause.contains(x, y)) {
                openExitOverlay();
                return true;
            }
            if (touchHint.contains(x, y)) {
                openItemSelectOverlayV8_3();
                return true;
            }
            if (touchUndo.contains(x, y)) {
                openItemSelectOverlayV8_3();
                return true;
            }
            if (touchInfo.contains(x, y)) {
                showMessage("AI 오목: 5개를 먼저 이으면 승리!");
                return true;
            }
            if (touchSettings.contains(x, y)) {
                openSettingsOverlay();
                return true;
            }
            if (touchRestart.contains(x, y)) {
                resetGame();
                showMessage("새 게임을 시작했어요");
                return true;
            }

            float bh = 74f;
            float gap = 12f;
            float top = 104f;

            if (y >= top && y <= top + bh) {
                openExitOverlay();
                return true;
            }
            top += bh + gap;
            if (y >= top && y <= top + bh) {
                openItemSelectOverlayV8_3();
                return true;
            }
            top += bh + gap;
            if (y >= top && y <= top + bh) {
                openItemSelectOverlayV8_3();
                return true;
            }
            top += bh + gap;
            if (y >= top && y <= top + bh) {
                showMessage("AI 오목: 5개를 먼저 이으면 승리!");
                return true;
            }
            top += bh + gap;
            if (y >= top && y <= top + bh) {
                openSettingsOverlay();
                return true;
            }

            if (y >= getHeight() - 104f) {
                resetGame();
                showMessage("새 게임을 시작했어요");
                return true;
            }

            return x <= railW();
        }

void handleTwoChoiceTouch(float x, float y, int kind) {
            int w = getWidth();
            int h = getHeight();

            if (kind == OVERLAY_EXIT) {
                RectF back = new RectF(w * .22f, h * .60f, w * .405f, h * .73f);
                RectF newGame = new RectF(w * .415f, h * .60f, w * .585f, h * .73f);
                RectF portal = new RectF(w * .595f, h * .60f, w * .78f, h * .73f);

                if (back.contains(x, y)) {
                    exitChoice = 0;
                    confirmTwoChoice(kind);
                } else if (newGame.contains(x, y)) {
                    exitChoice = 1;
                    confirmTwoChoice(kind);
                } else if (portal.contains(x, y)) {
                    exitChoice = 2;
                    confirmTwoChoice(kind);
                }
                return;
            }

            RectF cancel = new RectF(w * .32f, h * .62f, w * .49f, h * .73f);
            RectF ok = new RectF(w * .51f, h * .62f, w * .68f, h * .73f);

            if (cancel.contains(x, y)) {
                itemChoice = 0;
                confirmTwoChoice(kind);
            } else if (ok.contains(x, y)) {
                itemChoice = 1;
                confirmTwoChoice(kind);
            }
        }

        void handleSettingsTouch(float x, float y) {
            if (settingsClose.contains(x, y)) {
                saveSettings();
                overlay = OVERLAY_NONE;
                showMessage("설정을 저장했어요");
                invalidate();
                return;
            }

            if (settingsSave.contains(x, y)) {
                saveSettings();
                overlay = OVERLAY_NONE;
                showMessage("설정을 저장했어요");
                invalidate();
                return;
            }

            if (settingsNewGame.contains(x, y)) {
                saveSettings();
                resetGame();
                showMessage("새 게임을 시작했어요");
                return;
            }

            if (settingsResetRecord.contains(x, y)) {
                showMessage("승패 기록 초기화는 다음 버전에 연결할게요");
                return;
            }

            if (settingsResetAll.contains(x, y)) {
                boardSize = 25;
                aiLevel = 1;
                undoLimit = 3;
                hintLimit = 3;
                firstTurn = BLACK;
                aiExplain = true;
                saveSettings();
                resetGame();
                showMessage("설정을 초기화했어요");
                return;
            }

            for (int i = 0; i < settingRows.length; i++) {
                if (settingRows[i] != null && settingRows[i].contains(x, y)) {
                    settingIndex = i;
                    changeSetting(x > settingRows[i].centerX() ? 1 : -1);
                    invalidate();
                    return;
                }
            }
        }

        void placeByPlayer() {
            if (gameOver) {
                resetGame();
                return;
            }
            if (aiThinking || currentTurn != BLACK) return;
            if (board[cursorR][cursorC] != EMPTY) {
                showMessage("이미 돌이 있어요");
                return;
            }

            hintR = -1;
            hintC = -1;
            placeStone(cursorR, cursorC, BLACK);

            if (!gameOver) {
                currentTurn = WHITE;
                aiThinking = true;
                postDelayed(new Runnable() {
                    @Override
                    public void run() {
                        aiMove();
                    }
                }, 250);
            }
        }

        void placeStone(int r, int c, int color) {
            if (!inside(r, c) || board[r][c] != EMPTY || gameOver) return;

            board[r][c] = color;
            history.add(new Move(r, c, color));
            lastR = r;
            lastC = c;

            int[] line = findWinLine(r, c, color);
            if (line != null) {
                winLine = line;
                winner = color;
                gameOver = true;
            } else if (isDraw()) {
                winner = EMPTY;
                gameOver = true;
            }

            invalidate();
        }

        void aiMove() {
            if (gameOver) {
                aiThinking = false;
                return;
            }

            int[] move = findBestMove(WHITE);
            if (move == null) {
                aiThinking = false;
                currentTurn = BLACK;
                invalidate();
                return;
            }

            cursorR = move[0];
            cursorC = move[1];
            placeStone(move[0], move[1], WHITE);

            aiThinking = false;
            if (!gameOver) currentTurn = BLACK;
            invalidate();
        }

        int[] findBestMove(int color) {
            int opponent = color == BLACK ? WHITE : BLACK;

            int[] win = findImmediate(color);
            if (win != null) return win;

            int[] block = findImmediate(opponent);
            if (block != null) return block;

            ArrayList<int[]> candidates = collectCandidates();
            if (candidates.isEmpty()) return new int[]{boardSize / 2, boardSize / 2};

            if (aiLevel == 0 && random.nextInt(100) < 28) {
                return candidates.get(random.nextInt(candidates.size()));
            }

            int bestScore = Integer.MIN_VALUE;
            ArrayList<int[]> best = new ArrayList<>();

            for (int[] pos: candidates) {
                int r = pos[0];
                int c = pos[1];

                int attack = scorePoint(r, c, color);
                int defend = scorePoint(r, c, opponent);
                int score;

                if (aiLevel == 0) score = attack + defend - distancePenalty(r, c) * 3;
                else if (aiLevel == 1) score = attack * 2 + defend * 2 - distancePenalty(r, c);
                else score = attack * 3 + defend * 4 + forkBonus(r, c, color) + forkBonus(r, c, opponent) - distancePenalty(r, c);

                if (score > bestScore) {
                    bestScore = score;
                    best.clear();
                    best.add(pos);
                } else if (score == bestScore) {
                    best.add(pos);
                }
            }

            return best.get(random.nextInt(best.size()));
        }

        ArrayList<int[]> collectCandidates() {
            ArrayList<int[]> list = new ArrayList<>();
            boolean[][] seen = new boolean[boardSize][boardSize];
            boolean hasStone = false;

            for (int r = 0; r < boardSize; r++) {
                for (int c = 0; c < boardSize; c++) {
                    if (board[r][c] == EMPTY) continue;
                    hasStone = true;
                    int radius = boardSize >= 25 ? 2 : 2;
                    for (int dr = -radius; dr <= radius; dr++) {
                        for (int dc = -radius; dc <= radius; dc++) {
                            int nr = r + dr;
                            int nc = c + dc;
                            if (!inside(nr, nc) || board[nr][nc] != EMPTY || seen[nr][nc]) continue;
                            seen[nr][nc] = true;
                            list.add(new int[]{nr, nc});
                        }
                    }
                }
            }

            if (!hasStone) list.add(new int[]{boardSize / 2, boardSize / 2});
            return list;
        }

        int forkBonus(int r, int c, int color) {
            int bonus = 0;
            int[][] dirs = {{1,0}, {0,1}, {1,1}, {1,-1}};
            for (int[] d: dirs) {
                int count = 1;
                int open = 0;

                int nr = r + d[0];
                int nc = c + d[1];
                while (inside(nr, nc) && board[nr][nc] == color) {
                    count++;
                    nr += d[0];
                    nc += d[1];
                }
                if (inside(nr, nc) && board[nr][nc] == EMPTY) open++;

                nr = r - d[0];
                nc = c - d[1];
                while (inside(nr, nc) && board[nr][nc] == color) {
                    count++;
                    nr -= d[0];
                    nc -= d[1];
                }
                if (inside(nr, nc) && board[nr][nc] == EMPTY) open++;

                if (count >= 3 && open == 2) bonus += 1400;
                if (count >= 4) bonus += 5000;
            }
            return bonus;
        }

        int[] findImmediate(int color) {
            for (int r = 0; r < boardSize; r++) {
                for (int c = 0; c < boardSize; c++) {
                    if (board[r][c] != EMPTY) continue;
                    board[r][c] = color;
                    boolean win = findWinLine(r, c, color) != null;
                    board[r][c] = EMPTY;
                    if (win) return new int[]{r, c};
                }
            }
            return null;
        }

        int scorePoint(int r, int c, int color) {
            int total = 0;
            int[][] dirs = {{1,0}, {0,1}, {1,1}, {1,-1}};

            for (int[] d: dirs) {
                int count = 1;
                int open = 0;

                int nr = r + d[0];
                int nc = c + d[1];
                while (inside(nr, nc) && board[nr][nc] == color) {
                    count++;
                    nr += d[0];
                    nc += d[1];
                }
                if (inside(nr, nc) && board[nr][nc] == EMPTY) open++;

                nr = r - d[0];
                nc = c - d[1];
                while (inside(nr, nc) && board[nr][nc] == color) {
                    count++;
                    nr -= d[0];
                    nc -= d[1];
                }
                if (inside(nr, nc) && board[nr][nc] == EMPTY) open++;

                if (count >= 5) total += 100000;
                else if (count == 4 && open == 2) total += 24000;
                else if (count == 4) total += 10000;
                else if (count == 3 && open == 2) total += 3200;
                else if (count == 3) total += 900;
                else if (count == 2 && open == 2) total += 260;
                else if (count == 2) total += 90;
                else total += 8;
            }

            return total;
        }

        int distancePenalty(int r, int c) {
            int center = boardSize / 2;
            return Math.abs(r - center) + Math.abs(c - center);
        }

        int[] findWinLine(int r, int c, int color) {
            int[][] dirs = {{1,0}, {0,1}, {1,1}, {1,-1}};

            for (int[] d: dirs) {
                ArrayList<int[]> line = new ArrayList<>();
                line.add(new int[]{r, c});

                int nr = r + d[0];
                int nc = c + d[1];
                while (inside(nr, nc) && board[nr][nc] == color) {
                    line.add(new int[]{nr, nc});
                    nr += d[0];
                    nc += d[1];
                }

                nr = r - d[0];
                nc = c - d[1];
                while (inside(nr, nc) && board[nr][nc] == color) {
                    line.add(0, new int[]{nr, nc});
                    nr -= d[0];
                    nc -= d[1];
                }

                if (line.size() >= 5) {
                    int[] first = line.get(0);
                    int[] last = line.get(line.size() - 1);
                    return new int[]{first[0], first[1], last[0], last[1]};
                }
            }

            return null;
        }

        boolean isDraw() {
            for (int r = 0; r < boardSize; r++) {
                for (int c = 0; c < boardSize; c++) {
                    if (board[r][c] == EMPTY) return false;
                }
            }
            return true;
        }

        boolean inside(int r, int c) {
            return r >= 0 && c >= 0 && r < boardSize && c < boardSize;
        }

        void doUndoPair() {
            if (!canOpenUndo()) return;

            gameOver = false;
            winner = EMPTY;
            winLine = null;
            aiThinking = false;
            hintR = -1;
            hintC = -1;

            int remove = history.size() >= 2 ? 2 : 1;
            for (int i = 0; i < remove; i++) {
                Move m = history.remove(history.size() - 1);
                board[m.r][m.c] = EMPTY;
            }

            undoUsed++;

            if (!history.isEmpty()) {
                Move last = history.get(history.size() - 1);
                lastR = last.r;
                lastC = last.c;
            } else {
                lastR = -1;
                lastC = -1;
            }

            currentTurn = BLACK;
            showMessage("무르기 사용 " + usedText(undoUsed, undoLimit));
            invalidate();
        }

        void doHint() {
            if (!canOpenHint()) return;

            int[] move = findBestMove(BLACK);
            if (move == null) {
                showMessage("추천할 수가 없어요");
                return;
            }

            hintR = move[0];
            hintC = move[1];
            hintUsed++;
            showMessage("힌트 사용 " + usedText(hintUsed, hintLimit));
            invalidate();
        }

        String usedText(int used, int limit) {
            if (limit == LIMIT_UNLIMITED) return used + "회";
            return used + "/" + limit;
        }

        String limitLabel(int limit) {
            if (limit == LIMIT_UNLIMITED) return "무제한";
            return limit + "회";
        }

        String remainText(int used, int limit) {
            if (limit == LIMIT_UNLIMITED) return "무제한";
            return Math.max(0, limit - used) + "회 남음";
        }

        void showMessage(String msg) {
            message = msg;
            messageUntil = System.currentTimeMillis() + 2600;
            invalidate();
        }

@Override
        protected void onDraw(Canvas c) {
            super.onDraw(c);
            int w = getWidth();
            int h = getHeight();

            drawBackground(c, w, h);
            BoardRect br = boardRect(w, h);
            drawRail(c, w, h);
            drawTopBar(c, w, h, br);
            drawBoardShell(c, w, h, br);
            drawBoard(c, w, h, br);
            drawBottomTip(c, w, h, br);

            if (overlay == OVERLAY_EXIT) drawExitOverlay(c, w, h);
            else if (overlay == OVERLAY_SETTINGS) drawSettingsOverlay(c, w, h);
            else if (overlay == OVERLAY_ITEM_SELECT) drawItemSelectOverlayV8_3(c, w, h);
            else if (overlay == OVERLAY_ITEM_UNDO) drawItemOverlay(c, w, h, true);
            else if (overlay == OVERLAY_ITEM_HINT) drawItemOverlay(c, w, h, false);
        }

void drawBackground(Canvas c, int w, int h) {
            p.setStyle(Paint.Style.FILL);
            p.setShader(new android.graphics.LinearGradient(
                    0, 0, w, h,
                    Color.rgb(241, 245, 249),
                    Color.rgb(248, 250, 252),
                    Shader.TileMode.CLAMP
            ));
            c.drawRect(0, 0, w, h, p);
            p.setShader(null);

            p.setColor(Color.rgb(226, 232, 240));
            c.drawRect(railW(), 0, railW() + 10f, h, p);
        }

float railW() { return 310f; }

        float headerH() { return 84f; }

BoardRect boardRect(int w, int h) {
            float left = railW() + 12f;
            float right = w - 10f;
            float top = headerH() + 6f;
            float bottom = h - 30f;

            float maxW = right - left;
            float maxH = bottom - top;
            float size = Math.min(maxW, maxH);

            float bx = left + Math.max(0f, (maxW - size) * .58f);
            float by = top + Math.max(0f, (maxH - size) * .47f);

            return new BoardRect(bx, by, size, size / (boardSize - 1));
        }

void drawRail(Canvas c, int w, int h) {
            float rw = railW();

            p.setStyle(Paint.Style.FILL);
            p.setColor(Color.WHITE);
            c.drawRect(0, 0, rw, h, p);

            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(1.5f);
            p.setColor(Color.rgb(226, 232, 240));
            c.drawLine(rw - 1f, 0, rw - 1f, h, p);
            p.setStyle(Paint.Style.FILL);

            p.setColor(Color.rgb(79, 70, 229));
            c.drawRoundRect(new RectF(18, 14, 72, 68), 20, 20, p);

            p.setTextAlign(Paint.Align.CENTER);
            p.setFakeBoldText(true);
            p.setTextSize(34f);
            p.setColor(Color.WHITE);
            c.drawText("五", 45, 53, p);

            p.setTextAlign(Paint.Align.LEFT);
            p.setTextSize(19f);
            p.setColor(Color.rgb(15, 23, 42));
            c.drawText("EDUNI", 88, 38, p);
            p.setTextSize(24f);
            c.drawText("오목", 88, 66, p);

            float y = 104f;
            float bh = 74f;
            float gap = 12f;

            touchPause.set(14, y, rw - 14, y + bh);
            drawRailButton(c, touchPause, "Ⅱ", "정지", "B: 메뉴 · 포털/새 게임", true, 0);
            y += bh + gap;

            touchHint.set(14, y, rw - 14, y + bh);
            drawRailButton(c, touchHint, "Y", "아이템 선택", "힌트 / 무르기 / 취소", false, remainCount(hintUsed, hintLimit));
            y += bh + gap;

            touchUndo.set(14, y, rw - 14, y + bh);
            drawRailButton(c, touchUndo, "Y", "아이템 선택", "방향키로 고르고 A 사용", false, remainCount(undoUsed, undoLimit));
            y += bh + gap;

            touchInfo.set(14, y, rw - 14, y + bh);
            drawRailButton(c, touchInfo, "설명", "게임 설명", "오목 규칙과 AI 안내", false, 0);
            y += bh + gap;

            touchSettings.set(14, y, rw - 14, y + bh);
            drawRailButton(c, touchSettings, "X", "부모 설정", "X 버튼 또는 터치", false, 0);

            touchRestart.set(14, h - 92, rw - 14, h - 14);
            drawRailButton(c, touchRestart, "새판", "새 게임", "처음부터 다시 시작", true, 0);
        }

        int remainCount(int used, int limit) {
            if (limit == LIMIT_UNLIMITED) return -1;
            return Math.max(0, limit - used);
        }

void drawRailButton(Canvas c, RectF r, String icon, String label, String sub, boolean selected, int badge) {
            p.setStyle(Paint.Style.FILL);
            p.setColor(selected ? Color.rgb(255, 247, 237) : Color.rgb(248, 250, 252));
            c.drawRoundRect(r, 20, 20, p);

            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(selected ? 2.4f : 1.5f);
            p.setColor(selected ? Color.rgb(251, 146, 60) : Color.rgb(203, 213, 225));
            c.drawRoundRect(r, 20, 20, p);
            p.setStyle(Paint.Style.FILL);

            RectF iconBox = new RectF(r.left + 12f, r.top + 12f, r.left + 64f, r.bottom - 12f);
            p.setColor(selected ? Color.rgb(255, 237, 213) : Color.rgb(238, 242, 255));
            c.drawRoundRect(iconBox, 16, 16, p);

            p.setTextAlign(Paint.Align.CENTER);
            p.setFakeBoldText(true);
            p.setTextSize(icon.length() >= 3 ? 16f : 26f);
            p.setColor(selected ? Color.rgb(194, 65, 12) : Color.rgb(79, 70, 229));
            c.drawText(icon, iconBox.centerX(), iconBox.centerY() + 8f, p);

            p.setTextAlign(Paint.Align.LEFT);
            p.setTextSize(25f);
            p.setColor(Color.rgb(15, 23, 42));
            c.drawText(label, r.left + 78f, r.top + 33f, p);

            p.setFakeBoldText(false);
            p.setTextSize(17f);
            p.setColor(Color.rgb(71, 85, 105));
            c.drawText(sub, r.left + 78f, r.top + 59f, p);

            if (badge > 0) {
                p.setColor(Color.rgb(239, 68, 68));
                c.drawCircle(r.right - 18f, r.top + 18f, 14f, p);
                p.setTextAlign(Paint.Align.CENTER);
                p.setFakeBoldText(true);
                p.setColor(Color.WHITE);
                p.setTextSize(14f);
                c.drawText(String.valueOf(badge), r.right - 18f, r.top + 23f, p);
            }

            p.setTextAlign(Paint.Align.LEFT);
            p.setFakeBoldText(false);
        }

        void drawTopBar(Canvas c, int w, int h, BoardRect br) {
            float left = railW() + 10f;
            float top = 14f;
            float right = w - 10f;
            float bottom = 82f;

            p.setStyle(Paint.Style.FILL);
            p.setColor(Color.WHITE);
            c.drawRoundRect(new RectF(left, top, right, bottom), 18, 18, p);

            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(1.4f);
            p.setColor(Color.rgb(226, 232, 240));
            c.drawRoundRect(new RectF(left, top, right, bottom), 18, 18, p);
            p.setStyle(Paint.Style.FILL);

            p.setTextAlign(Paint.Align.LEFT);
            p.setFakeBoldText(true);
            p.setTextSize(20f);
            p.setColor(Color.rgb(15, 23, 42));
            c.drawText("EDUNI 오목", left + 16f, top + 30f, p);

            p.setFakeBoldText(false);
            p.setTextSize(13.5f);
            p.setColor(Color.rgb(51, 65, 85));
            c.drawText("AI 대결 · " + boardSize + "줄판 · " + statusText() + " · 힌트 " + remainText(hintUsed, hintLimit) + " · 무르기 " + remainText(undoUsed, undoLimit), left + 16f, top + 55f, p);

            float cardW = 62f;
            float gap = 8f;
            float x = right - (cardW * 4f + gap * 3f) - 8f;
            touchMode.set(x, top + 9f, x + cardW, bottom - 9f);
            drawTopCard(c, touchMode, "모드", "AI");
            x += cardW + gap;
            touchTurn.set(x, top + 9f, x + cardW, bottom - 9f);
            drawTopCard(c, touchTurn, "차례", currentTurn == BLACK ? "나" : "AI");
            x += cardW + gap;
            touchLimit.set(x, top + 9f, x + cardW, bottom - 9f);
            drawTopCard(c, touchLimit, "제한", limitShort());
            x += cardW + gap;
            touchScore.set(x, top + 9f, x + cardW + 16f, bottom - 9f);
            drawTopCard(c, touchScore, "전적", "0승 0패");
        }

        String limitShort() {
            if (undoLimit == LIMIT_UNLIMITED && hintLimit == LIMIT_UNLIMITED) return "∞";
            return Math.max(0, hintLimit == LIMIT_UNLIMITED ? 9 : hintLimit - hintUsed) + "";
        }

        void drawTopCard(Canvas c, RectF r, String label, String value) {
            p.setStyle(Paint.Style.FILL);
            p.setColor(Color.rgb(248, 250, 252));
            c.drawRoundRect(r, 14, 14, p);

            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(1.3f);
            p.setColor(Color.rgb(203, 213, 225));
            c.drawRoundRect(r, 14, 14, p);
            p.setStyle(Paint.Style.FILL);

            p.setTextAlign(Paint.Align.CENTER);
            p.setFakeBoldText(false);
            p.setTextSize(11f);
            p.setColor(Color.rgb(71, 85, 105));
            c.drawText(label, r.centerX(), r.top + 16f, p);

            p.setFakeBoldText(true);
            p.setTextSize(17f);
            p.setColor(Color.rgb(15, 23, 42));
            c.drawText(value, r.centerX(), r.top + 39f, p);
        }

        void drawBoardShell(Canvas c, int w, int h, BoardRect br) {
            RectF shell = new RectF(railW() + 10f, headerH() + 8f, w - 10f, h - 8f);

            p.setStyle(Paint.Style.FILL);
            p.setColor(Color.WHITE);
            c.drawRoundRect(shell, 18, 18, p);

            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(1.2f);
            p.setColor(Color.rgb(226, 232, 240));
            c.drawRoundRect(shell, 18, 18, p);
            p.setStyle(Paint.Style.FILL);
        }

        void drawBoard(Canvas c, int w, int h, BoardRect br) {
            p.setStyle(Paint.Style.FILL);
            p.setColor(Color.rgb(110, 69, 30));
            c.drawRoundRect(br.left - 21, br.top - 21, br.left + br.size + 21, br.top + br.size + 21, 20, 20, p);

            p.setShader(new android.graphics.LinearGradient(
                    br.left, br.top, br.left + br.size, br.top + br.size,
                    Color.rgb(239, 193, 105),
                    Color.rgb(219, 151, 57),
                    Shader.TileMode.CLAMP
            ));
            c.drawRoundRect(br.left - 15, br.top - 15, br.left + br.size + 15, br.top + br.size + 15, 18, 18, p);
            p.setShader(null);

            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(Math.max(0.85f, br.cell * .026f));
            p.setColor(Color.rgb(82, 47, 21));
            for (int i = 0; i < boardSize; i++) {
                float x = br.left + i * br.cell;
                float y = br.top + i * br.cell;
                c.drawLine(br.left, y, br.left + br.size, y, p);
                c.drawLine(x, br.top, x, br.top + br.size, p);
            }

            drawStarPoints(c, br);

            if (OmokVisualBinding.isHintVisible(hintR, hintC, boardSize,
                    inside(hintR, hintC) ? board[hintR][hintC] : -1)) {
                float hx = br.left + hintC * br.cell;
                float hy = br.top + hintR * br.cell;
                if (hintMarker != null && hintPulse != null) {
                    drawBitmapAtAnchor(c, hintPulse, hx, hy, 64f, 64f, br.cell * .90f);
                    drawBitmapAtAnchor(c, hintMarker, hx, hy, 64f, 64f, br.cell * .72f);
                } else {
                    drawPrimitiveHint(c, hx, hy, br.cell);
                }
            }

            if (winLine != null) {
                p.setStyle(Paint.Style.STROKE);
                p.setStrokeWidth(Math.max(6f, br.cell * .15f));
                p.setColor(Color.rgb(20, 184, 166));
                c.drawLine(
                        br.left + winLine[1] * br.cell,
                        br.top + winLine[0] * br.cell,
                        br.left + winLine[3] * br.cell,
                        br.top + winLine[2] * br.cell,
                        p
                );
            }

            for (int r = 0; r < boardSize; r++) {
                for (int col = 0; col < boardSize; col++) {
                    if (board[r][col] == EMPTY) continue;
                    drawStone(c, br, r, col, board[r][col]);
                }
            }

            drawCursor(c, br);
        }

        void drawStarPoints(Canvas c, BoardRect br) {
            int[][] stars;
            if (boardSize == 25) {
                stars = new int[][]{{4,4},{4,12},{4,20},{12,4},{12,12},{12,20},{20,4},{20,12},{20,20}};
            } else if (boardSize == 19) {
                stars = new int[][]{{3,3},{3,9},{3,15},{9,3},{9,9},{9,15},{15,3},{15,9},{15,15}};
            } else {
                stars = new int[][]{{3,3},{3,7},{3,11},{7,3},{7,7},{7,11},{11,3},{11,7},{11,11}};
            }

            p.setStyle(Paint.Style.FILL);
            p.setColor(Color.rgb(75, 45, 20));
            for (int[] s: stars) {
                c.drawCircle(br.left + s[1] * br.cell, br.top + s[0] * br.cell, Math.max(2.5f, br.cell * .066f), p);
            }
        }

        void drawStone(Canvas c, BoardRect br, int r, int col, int color) {
            float cx = br.left + col * br.cell;
            float cy = br.top + r * br.cell;
            Bitmap bitmap = stoneBitmap(color, r == lastR && col == lastC);
            if (bitmap != null) {
                drawBitmapAtAnchor(c, bitmap, cx, cy,
                        OmokVisualBinding.STONE_PIVOT_X, OmokVisualBinding.STONE_PIVOT_Y,
                        OmokVisualBinding.stoneFootprint(br.cell));
                return;
            }
            float radius = br.cell * .34f;

            p.setStyle(Paint.Style.FILL);

            if (color == BLACK) {
                p.setShader(new RadialGradient(
                        cx - radius * .25f,
                        cy - radius * .28f,
                        radius * 1.25f,
                        Color.rgb(71, 85, 105),
                        Color.rgb(2, 6, 23),
                        Shader.TileMode.CLAMP
                ));
            } else {
                p.setShader(new RadialGradient(
                        cx - radius * .25f,
                        cy - radius * .28f,
                        radius * 1.25f,
                        Color.WHITE,
                        Color.rgb(203, 213, 225),
                        Shader.TileMode.CLAMP
                ));
            }

            c.drawCircle(cx, cy, radius, p);
            p.setShader(null);

            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(Math.max(1.0f, br.cell * .032f));
            p.setColor(color == BLACK ? Color.rgb(15, 23, 42) : Color.rgb(148, 163, 184));
            c.drawCircle(cx, cy, radius, p);

            if (r == lastR && col == lastC) {
                p.setStyle(Paint.Style.FILL);
                p.setColor(color == BLACK ? Color.WHITE : Color.rgb(15, 23, 42));
                c.drawCircle(cx, cy, Math.max(2.2f, radius * .17f), p);
            }
        }

        void drawCursor(Canvas c, BoardRect br) {
            float cx = br.left + cursorC * br.cell;
            float cy = br.top + cursorR * br.cell;
            boolean occupied = board[cursorR][cursorC] != EMPTY;
            boolean placeable = !gameOver && !aiThinking && currentTurn == BLACK;
            Bitmap bitmap = cursorBitmap(OmokVisualBinding.cursorState(occupied, placeable));
            if (bitmap != null) {
                drawBitmapAtAnchor(c, bitmap, cx, cy,
                        OmokVisualBinding.CURSOR_PIVOT_X, OmokVisualBinding.CURSOR_PIVOT_Y,
                        OmokVisualBinding.cursorFootprint(br.cell));
                return;
            }
            float r = br.cell * .44f;

            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(Math.max(2.4f, br.cell * .072f));
            p.setColor(Color.rgb(79, 70, 229));
            c.drawCircle(cx, cy, r, p);

            p.setStyle(Paint.Style.FILL);
            p.setColor(Color.argb(25, 79, 70, 229));
            c.drawCircle(cx, cy, r * 1.10f, p);
        }

        Bitmap stoneBitmap(int color, boolean lastMove) {
            if (color == BLACK) return lastMove ? stoneBlackLastMove : stoneBlackNormal;
            if (color == WHITE) return lastMove ? stoneWhiteLastMove : stoneWhiteNormal;
            return null;
        }

        Bitmap cursorBitmap(OmokVisualBinding.CursorState state) {
            if (state == OmokVisualBinding.CursorState.VALID) return cursorValid;
            if (state == OmokVisualBinding.CursorState.OCCUPIED) return cursorOccupied;
            return cursorNormal;
        }

        void drawBitmapAtAnchor(Canvas canvas, Bitmap bitmap, float anchorX, float anchorY,
                                float pivotX, float pivotY, float targetWidth) {
            float left = OmokVisualBinding.anchoredLeft(anchorX, bitmap.getWidth(), pivotX, targetWidth);
            float top = OmokVisualBinding.anchoredTop(anchorY, bitmap.getHeight(), pivotY, targetWidth);
            bitmapDestination.set(left, top, left + targetWidth, top + targetWidth);
            canvas.drawBitmap(bitmap, null, bitmapDestination, bitmapPaint);
        }

        void drawPrimitiveHint(Canvas canvas, float x, float y, float cell) {
            p.setStyle(Paint.Style.FILL);
            p.setColor(Color.argb(170, 20, 184, 166));
            canvas.drawCircle(x, y, cell * .22f, p);
            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(Math.max(2.4f, cell * .06f));
            p.setColor(Color.rgb(15, 118, 110));
            canvas.drawCircle(x, y, cell * .38f, p);
        }

        void drawBottomTip(Canvas c, int w, int h, BoardRect br) {
            RectF tip = new RectF(Math.max(railW() + 36f, br.left - 20f), h - 44f, Math.min(w - 22f, br.left + br.size + 20f), h - 10f);
            p.setStyle(Paint.Style.FILL);
            p.setColor(Color.argb(245, 255, 255, 255));
            c.drawRoundRect(tip, 16, 16, p);

            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(1.2f);
            p.setColor(Color.rgb(226, 232, 240));
            c.drawRoundRect(tip, 16, 16, p);

            p.setStyle(Paint.Style.FILL);
            p.setTextAlign(Paint.Align.CENTER);
            p.setFakeBoldText(true);
            p.setTextSize(13.5f);
            p.setColor(Color.rgb(51, 65, 85));

            String msg = (System.currentTimeMillis() < messageUntil && message != null && message.length() > 0)
                    ? message
                    : "AI 대결 모드예요. AI가 방어만 하지 않고 공격 수도 만들어요.";
            c.drawText(msg, tip.centerX(), tip.centerY() + 5f, p);
        }

        String statusText() {
            if (gameOver) {
                if (winner == BLACK) return "승리! A로 새 판";
                if (winner == WHITE) return "AI 승리";
                return "무승부";
            }
            if (aiThinking || currentTurn == WHITE) return "AI 생각 중";
            return "현재 나, 흑돌 차례";
        }

void drawExitOverlay(Canvas c, int w, int h) {
            drawDim(c, w, h);

            RectF card = centeredCard(w, h, .62f, .52f);
            p.setColor(Color.WHITE);
            c.drawRoundRect(card, 30, 30, p);

            p.setTextAlign(Paint.Align.CENTER);
            p.setColor(Color.rgb(15, 23, 42));
            p.setFakeBoldText(true);
            p.setTextSize(Math.max(30f, h * .050f));
            c.drawText("무엇을 할까요?", w * .50f, h * .35f, p);

            p.setFakeBoldText(false);
            p.setTextSize(Math.max(18f, h * .030f));
            p.setColor(Color.rgb(100, 116, 139));
            c.drawText("← → 로 선택 이동 · A 선택 · B 게임으로 돌아가기", w * .50f, h * .435f, p);

            drawChoiceButton(c, new RectF(w * .22f, h * .60f, w * .405f, h * .73f), "게임으로 [B]", exitChoice == 0);
            drawChoiceButton(c, new RectF(w * .415f, h * .60f, w * .585f, h * .73f), "새 게임", exitChoice == 1);
            drawChoiceButton(c, new RectF(w * .595f, h * .60f, w * .78f, h * .73f), "포털로", exitChoice == 2);

            p.setTextSize(Math.max(15f, h * .024f));
            p.setColor(Color.rgb(100, 116, 139));
            c.drawText("키보드 숫자 1/2/3으로도 선택할 수 있어요.", w * .50f, h * .80f, p);

            p.setTextAlign(Paint.Align.LEFT);
        }

void drawItemOverlay(Canvas c, int w, int h, boolean undo) {
            drawDim(c, w, h);

            RectF card = centeredCard(w, h, .52f, .58f);
            p.setColor(Color.WHITE);
            c.drawRoundRect(card, 30, 30, p);

            String title = undo ? "무르기 아이템" : "힌트 아이템";
            String desc = undo ? "내 돌과 AI 돌을 한 번 되돌릴까요?" : "추천 위치를 보드에 표시할까요?";
            String remain = undo ? remainText(undoUsed, undoLimit) : remainText(hintUsed, hintLimit);

            p.setTextAlign(Paint.Align.CENTER);
            p.setColor(Color.rgb(15, 23, 42));
            p.setFakeBoldText(true);
            p.setTextSize(Math.max(30f, h * .050f));
            c.drawText(title, w * .50f, h * .34f, p);

            p.setFakeBoldText(false);
            p.setTextSize(Math.max(18f, h * .030f));
            p.setColor(Color.rgb(71, 85, 105));
            c.drawText(desc, w * .50f, h * .43f, p);

            p.setColor(Color.rgb(37, 99, 235));
            p.setFakeBoldText(true);
            p.setTextSize(Math.max(18f, h * .030f));
            c.drawText("남은 횟수: " + remain, w * .50f, h * .50f, p);

            p.setFakeBoldText(false);
            p.setTextSize(Math.max(15f, h * .025f));
            p.setColor(Color.rgb(100, 116, 139));
            c.drawText("취소는 B · 사용은 A", w * .50f, h * .555f, p);

            drawChoiceButton(c, new RectF(w * .32f, h * .62f, w * .49f, h * .73f), "취소 [B]", itemChoice == 0);
            drawChoiceButton(c, new RectF(w * .51f, h * .62f, w * .68f, h * .73f), "사용 [A]", itemChoice == 1);
            p.setTextAlign(Paint.Align.LEFT);
        }

        void drawDim(Canvas c, int w, int h) {
            p.setStyle(Paint.Style.FILL);
            p.setColor(Color.argb(145, 15, 23, 42));
            c.drawRect(0, 0, w, h, p);
        }

        RectF centeredCard(int w, int h, float wr, float hr) {
            float cw = w * wr;
            float ch = h * hr;
            return new RectF((w - cw) / 2f, (h - ch) / 2f, (w + cw) / 2f, (h + ch) / 2f);
        }

        void drawChoiceButton(Canvas c, RectF r, String text, boolean selected) {
            p.setStyle(Paint.Style.FILL);
            p.setColor(selected ? Color.rgb(37, 99, 235) : Color.rgb(226, 232, 240));
            c.drawRoundRect(r, 22, 22, p);

            if (selected) {
                p.setStyle(Paint.Style.STROKE);
                p.setStrokeWidth(4f);
                p.setColor(Color.argb(120, 191, 219, 254));
                c.drawRoundRect(r, 22, 22, p);
            }

            p.setStyle(Paint.Style.FILL);
            p.setTextAlign(Paint.Align.CENTER);
            p.setFakeBoldText(true);
            p.setColor(selected ? Color.WHITE : Color.rgb(51, 65, 85));
            p.setTextSize(Math.max(22f, getHeight() * .034f));
            c.drawText(text, r.centerX(), r.centerY() + 8f, p);
            p.setFakeBoldText(false);
        }

void drawSettingsOverlay(Canvas c, int w, int h) {
            drawDim(c, w, h);

            RectF card = centeredCard(w, h, .64f, .90f);
            p.setStyle(Paint.Style.FILL);
            p.setColor(Color.WHITE);
            c.drawRoundRect(card, 26, 26, p);

            settingsClose.set(card.right - 64f, card.top + 18f, card.right - 22f, card.top + 60f);
            p.setColor(Color.rgb(241, 245, 249));
            c.drawCircle(settingsClose.centerX(), settingsClose.centerY(), 21f, p);
            p.setTextAlign(Paint.Align.CENTER);
            p.setFakeBoldText(true);
            p.setTextSize(26f);
            p.setColor(Color.rgb(15, 23, 42));
            c.drawText("×", settingsClose.centerX(), settingsClose.centerY() + 9f, p);

            p.setTextAlign(Paint.Align.LEFT);
            p.setColor(Color.rgb(15, 23, 42));
            p.setFakeBoldText(true);
            p.setTextSize(Math.max(34f, h * .055f));
            c.drawText("부모 설정", card.left + 32f, card.top + 55f, p);

            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(1.4f);
            p.setColor(Color.rgb(226, 232, 240));
            c.drawLine(card.left, card.top + 78f, card.right, card.top + 78f, p);
            p.setStyle(Paint.Style.FILL);

            float x1 = card.left + 32f;
            float x2 = card.centerX() + 18f;
            float colW = (card.width() - 82f) / 2f;
            float y = card.top + 118f;

            p.setTextAlign(Paint.Align.LEFT);
            p.setFakeBoldText(true);
            p.setTextSize(23f);
            p.setColor(Color.rgb(30, 41, 59));
            c.drawText("대결 모드", x1, y, p);
            y += 26f;

            drawSettingField(c, 0, x1, y, colW, "게임 모드", "AI vs 사람");
            drawSettingField(c, 1, x2, y, colW, "AI 난이도", aiNames[aiLevel]);
            y += 88f;
            drawSettingField(c, 2, x1, y, colW, "AI 대결 선공", firstTurn == BLACK ? "사람 먼저" : "AI 먼저");
            drawSettingField(c, 3, x2, y, colW, "AI 설명", aiExplain ? "켜기" : "끄기");
            y += 92f;

            p.setFakeBoldText(true);
            p.setTextSize(23f);
            p.setColor(Color.rgb(30, 41, 59));
            c.drawText("도움 기능", x1, y, p);
            y += 26f;

            drawSettingField(c, 4, x1, y, colW, "힌트 개수 0~10", limitLabel(hintLimit));
            drawSettingField(c, 5, x2, y, colW, "무르기 개수 0~10", limitLabel(undoLimit));
            y += 88f;
            drawSettingField(c, 6, x1, y, colW, "한 수 제한 시간", "0");
            drawSettingField(c, 7, x2, y, colW, "오목판 크기", boardSize + "줄");

            settingsSave.set(card.left + 32f, card.top + 508f, card.right - 32f, card.top + 562f);
            drawFullButton(c, settingsSave, "설정 저장", Color.rgb(37, 99, 235), Color.WHITE);

            p.setTextAlign(Paint.Align.LEFT);
            p.setFakeBoldText(true);
            p.setTextSize(21f);
            p.setColor(Color.rgb(30, 41, 59));
            c.drawText("초기화", card.left + 32f, card.top + 598f, p);

            settingsNewGame.set(card.left + 32f, card.top + 620f, card.centerX() - 9f, card.top + 670f);
            settingsResetRecord.set(card.centerX() + 9f, card.top + 620f, card.right - 32f, card.top + 670f);
            drawFullButton(c, settingsNewGame, "새 게임 시작", Color.rgb(241, 245, 249), Color.rgb(15, 23, 42));
            drawFullButton(c, settingsResetRecord, "승패 기록 초기화", Color.rgb(254, 226, 226), Color.rgb(220, 38, 38));

            settingsResetAll.set(card.left + 32f, card.top + 690f, card.right - 32f, card.top + 740f);
            drawFullButton(c, settingsResetAll, "설정 초기화", Color.rgb(254, 226, 226), Color.rgb(220, 38, 38));

            p.setFakeBoldText(false);
        }

void drawSettingField(Canvas c, int idx, float x, float y, float w, String label, String value) {
            if (settingRows[idx] == null) settingRows[idx] = new RectF();
            settingRows[idx].set(x, y + 22f, x + w, y + 72f);

            p.setTextAlign(Paint.Align.LEFT);
            p.setFakeBoldText(true);
            p.setTextSize(19f);
            p.setColor(Color.rgb(71, 85, 105));
            c.drawText(label, x, y + 14f, p);

            RectF r = settingRows[idx];
            p.setStyle(Paint.Style.FILL);
            p.setColor(idx == settingIndex ? Color.rgb(239, 246, 255) : Color.rgb(248, 250, 252));
            c.drawRoundRect(r, 13, 13, p);

            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(idx == settingIndex ? 2.4f : 1.3f);
            p.setColor(idx == settingIndex ? Color.rgb(37, 99, 235) : Color.rgb(203, 213, 225));
            c.drawRoundRect(r, 13, 13, p);
            p.setStyle(Paint.Style.FILL);

            p.setTextAlign(Paint.Align.LEFT);
            p.setFakeBoldText(true);
            p.setTextSize(23f);
            p.setColor(Color.rgb(15, 23, 42));
            c.drawText(value, r.left + 14f, r.centerY() + 8f, p);

            if (idx != 3 && idx != 6) {
                p.setTextAlign(Paint.Align.RIGHT);
                p.setTextSize(24f);
                p.setColor(Color.rgb(15, 23, 42));
                c.drawText("⌄", r.right - 14f, r.centerY() + 7f, p);
            }
        }

void drawFullButton(Canvas c, RectF r, String text, int bg, int fg) {
            p.setStyle(Paint.Style.FILL);
            p.setColor(bg);
            c.drawRoundRect(r, 15, 15, p);

            p.setTextAlign(Paint.Align.CENTER);
            p.setFakeBoldText(true);
            p.setTextSize(22f);
            p.setColor(fg);
            c.drawText(text, r.centerX(), r.centerY() + 8f, p);
        }

        static class Move {
            final int r;
            final int c;
            final int color;

            Move(int r, int c, int color) {
                this.r = r;
                this.c = c;
                this.color = color;
            }
        }

        static class BoardRect {
            final float left;
            final float top;
            final float size;
            final float cell;

            BoardRect(float left, float top, float size, float cell) {
                this.left = left;
                this.top = top;
                this.size = size;
                this.cell = cell;
            }
        }
    }
}
