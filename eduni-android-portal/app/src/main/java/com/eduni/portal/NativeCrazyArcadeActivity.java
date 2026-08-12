package com.eduni.portal;

import android.app.Activity;
import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RadialGradient;
import android.graphics.RectF;
import android.graphics.Shader;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.Random;

public class NativeCrazyArcadeActivity extends Activity {
    CrazyView game;

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        hideSystemUi();
        game = new CrazyView(this);
        setContentView(game);
    }

    @Override protected void onResume() {
        super.onResume();
        hideSystemUi();
        if (game != null) game.resume();
    }

    @Override protected void onPause() {
        if (game != null) game.pause();
        super.onPause();
    }

    @Override public boolean dispatchKeyEvent(KeyEvent e) {
        return game != null && game.handleKey(e) || super.dispatchKeyEvent(e);
    }

    @Override public void onBackPressed() {
        if (game != null && game.back()) return;
        super.onBackPressed();
    }

    private void hideSystemUi() {
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                        | View.SYSTEM_UI_FLAG_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        );
    }

    static class CrazyView extends View {
        static final int MENU = 0, PLAY = 1, END = 2;
        static final int START_DELAY_MS = 1000;
        static final int ROUND_SECONDS = 100;

        static final int ITEM_WATER = 0;
        static final int ITEM_POWER = 1;
        static final int ITEM_ROLLER = 2;
        static final int ITEM_GLOVE = 3;
        static final int ITEM_DART = 4;
        static final int ITEM_NEEDLE = 5;
        static final int ITEM_TIMER = 6;
        static final int ITEM_SHIELD = 7;
        static final int ITEM_TURTLE = 8;
        static final int ITEM_TANK = 9;
        static final int ITEM_COUNT = 10;

        final Handler handler = new Handler(Looper.getMainLooper());
        final Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        final Random rnd = new Random(22);
        final Runnable tick = new Runnable() {
            @Override public void run() {
                update();
                invalidate();
                if (running) handler.postDelayed(this, 16);
            }
        };

        final String[][] questionBank = {
                {"3 + 4 = ?", "7", "8", "9"},
                {"10 - 6 = ?", "3", "4", "5"},
                {"2 x 5 = ?", "8", "10", "12"},
                {"15 / 3 = ?", "4", "5", "6"},
                {"다음 중 물에서 사는 것은?", "토끼", "물고기", "사자"},
                {"하루는 몇 시간?", "12", "24", "30"},
                {"봄 다음 계절은?", "여름", "가을", "겨울"},
                {"한글 자음 ㄱ 다음은?", "ㄴ", "ㄷ", "ㅁ"},
                {"대한민국 수도는?", "부산", "서울", "대전"},
                {"5 x 6 = ?", "25", "30", "36"}
        };

        boolean running;
        int mode = MENU;
        int difficulty = 0;
        int score = 0;
        int timeLeft = ROUND_SECONDS;
        int startMs = 0;
        int endKind = 0;
        int maxBombs = 2;
        int waterPower = 1;
        int activeBombs = 0;
        int shieldUntil = 0;
        int tankUntil = 0;
        int turtleUntil = 0;
        int selectedItem = ITEM_DART;
        int nextQuizAt = 0;
        int quizIndex = 0;
        int correctOption = 0;
        int feedbackUntil = 0;
        String feedback = "문제를 맞히면 아이템 지급";

        float px = .52f, py = .72f;
        float vx = 0, vy = 0;
        float lastDx = 1, lastDy = 0;
        RectF field = new RectF();
        RectF side = new RectF();
        RectF itemBar = new RectF();
        RectF bombButton = new RectF();
        RectF itemButton = new RectF();
        RectF[] answerRects = {new RectF(), new RectF(), new RectF()};
        RectF[] itemSlots = new RectF[ITEM_COUNT];
        int[] inventory = new int[ITEM_COUNT];

        final ArrayList<Enemy> enemies = new ArrayList<>();
        final ArrayList<Bomb> bombs = new ArrayList<>();
        final ArrayList<ItemDrop> drops = new ArrayList<>();

        CrazyView(Context c) {
            super(c);
            setFocusable(true);
            setFocusableInTouchMode(true);
            for (int i = 0; i < itemSlots.length; i++) itemSlots[i] = new RectF();
        }

        void resume() {
            running = true;
            requestFocus();
            handler.removeCallbacks(tick);
            handler.post(tick);
        }

        void pause() {
            running = false;
            handler.removeCallbacks(tick);
        }

        boolean back() {
            if (mode == PLAY || mode == END) {
                mode = MENU;
                return true;
            }
            return false;
        }

        boolean handleKey(KeyEvent e) {
            boolean down = e.getAction() == KeyEvent.ACTION_DOWN;
            int k = e.getKeyCode();
            if (mode == MENU && down) {
                if (k == KeyEvent.KEYCODE_DPAD_UP) difficulty = (difficulty + 2) % 3;
                else if (k == KeyEvent.KEYCODE_DPAD_DOWN) difficulty = (difficulty + 1) % 3;
                else if (isA(k)) startGame();
                else if (isB(k)) finishActivity();
                return true;
            }
            if (mode == END && down) {
                if (isA(k)) startGame();
                else if (isB(k)) mode = MENU;
                return true;
            }
            if (mode != PLAY) return false;
            if (k == KeyEvent.KEYCODE_DPAD_LEFT) { vx = down ? -1 : (vx < 0 ? 0 : vx); return true; }
            if (k == KeyEvent.KEYCODE_DPAD_RIGHT) { vx = down ? 1 : (vx > 0 ? 0 : vx); return true; }
            if (k == KeyEvent.KEYCODE_DPAD_UP) { vy = down ? -1 : (vy < 0 ? 0 : vy); return true; }
            if (k == KeyEvent.KEYCODE_DPAD_DOWN) { vy = down ? 1 : (vy > 0 ? 0 : vy); return true; }
            if (down && isA(k)) { placeBomb(); return true; }
            if (down && (k == KeyEvent.KEYCODE_BUTTON_X || k == KeyEvent.KEYCODE_X)) { useSelectedItem(); return true; }
            if (down && k >= KeyEvent.KEYCODE_1 && k <= KeyEvent.KEYCODE_3) { answer(k - KeyEvent.KEYCODE_1); return true; }
            if (down && k >= KeyEvent.KEYCODE_4 && k <= KeyEvent.KEYCODE_9) {
                selectedItem = Math.min(ITEM_COUNT - 1, ITEM_WATER + (k - KeyEvent.KEYCODE_1));
                return true;
            }
            if (down && isB(k)) { mode = MENU; return true; }
            return false;
        }

        boolean isA(int k) {
            return k == KeyEvent.KEYCODE_BUTTON_A || k == KeyEvent.KEYCODE_ENTER || k == KeyEvent.KEYCODE_SPACE || k == KeyEvent.KEYCODE_DPAD_CENTER;
        }

        boolean isB(int k) {
            return k == KeyEvent.KEYCODE_BUTTON_B || k == KeyEvent.KEYCODE_ESCAPE || k == KeyEvent.KEYCODE_BACK;
        }

        void finishActivity() {
            try { ((Activity)getContext()).finish(); } catch (Exception ignored) {}
        }

        int now() {
            return (int)(System.currentTimeMillis() & 0x7fffffff);
        }

        void startGame() {
            mode = PLAY;
            endKind = 0;
            score = 0;
            timeLeft = ROUND_SECONDS;
            maxBombs = 2;
            waterPower = 1;
            activeBombs = 0;
            shieldUntil = 0;
            tankUntil = 0;
            turtleUntil = 0;
            selectedItem = ITEM_DART;
            feedback = "문제를 맞히면 아이템 지급";
            feedbackUntil = 0;
            px = .52f;
            py = .72f;
            vx = 0;
            vy = 0;
            lastDx = 1;
            lastDy = 0;
            for (int i = 0; i < inventory.length; i++) inventory[i] = 0;
            inventory[ITEM_DART] = 1;
            inventory[ITEM_NEEDLE] = difficulty > 0 ? 1 : 0;
            bombs.clear();
            drops.clear();
            enemies.clear();
            int count = 4 + difficulty * 3;
            for (int i = 0; i < count; i++) spawnEnemy(i, count);
            startMs = now();
            nextQuizAt = now() + 2600;
            newQuestion();
        }

        void spawnEnemy(int i, int count) {
            float row = count <= 5 ? .30f : (i % 2 == 0 ? .28f : .46f);
            float x = .18f + (i % Math.max(1, (count + 1) / 2)) * (.72f / Math.max(1, (count + 1) / 2));
            float y = row + (rnd.nextFloat() - .5f) * .10f;
            enemies.add(new Enemy(clamp(x, .12f, .88f), clamp(y, .18f, .72f), rnd.nextBoolean() ? 1 : -1, rnd.nextBoolean() ? 1 : -1));
        }

        void update() {
            if (mode != PLAY) return;
            int elapsed = Math.max(0, now() - startMs - START_DELAY_MS);
            timeLeft = Math.max(0, ROUND_SECONDS - elapsed / 1000);
            if (timeLeft <= 0) end(false);
            if (now() > nextQuizAt) {
                newQuestion();
                nextQuizAt = now() + 15000 - difficulty * 2500;
            }
            if (now() - startMs < START_DELAY_MS) return;
            movePlayer();
            for (Enemy e: enemies) moveEnemy(e);
            updateBombs();
            collectDrops();
            checkTouches();
            if (enemies.isEmpty()) end(true);
        }

        void newQuestion() {
            quizIndex = rnd.nextInt(questionBank.length);
            correctOption = 0;
        }

        void answer(int option) {
            if (mode != PLAY) return;
            if (option == correctOption) {
                int item = rewardItem();
                inventory[item] = Math.min(9, inventory[item] + 1);
                selectedItem = item;
                score += 50 + difficulty * 25;
                feedback = "정답! " + itemName(item) + " 획득";
                feedbackUntil = now() + 1800;
            } else {
                score = Math.max(0, score - 10);
                feedback = "오답! 다음 문제 도전";
                feedbackUntil = now() + 1600;
            }
            newQuestion();
            nextQuizAt = now() + 14000 - difficulty * 2000;
        }

        int rewardItem() {
            if (difficulty == 0) {
                int[] pool = {ITEM_WATER, ITEM_POWER, ITEM_ROLLER, ITEM_DART};
                return pool[rnd.nextInt(pool.length)];
            }
            if (difficulty == 1) {
                int[] pool = {ITEM_POWER, ITEM_GLOVE, ITEM_DART, ITEM_NEEDLE, ITEM_TIMER, ITEM_SHIELD};
                return pool[rnd.nextInt(pool.length)];
            }
            int[] pool = {ITEM_POWER, ITEM_GLOVE, ITEM_DART, ITEM_NEEDLE, ITEM_TIMER, ITEM_SHIELD, ITEM_TURTLE, ITEM_TANK};
            return pool[rnd.nextInt(pool.length)];
        }

        void movePlayer() {
            float mx = vx, my = vy;
            float len = (float)Math.hypot(mx, my);
            if (len > 1f) { mx /= len; my /= len; }
            if (Math.abs(mx) > .08f || Math.abs(my) > .08f) {
                lastDx = mx;
                lastDy = my;
            }
            float speed = .0038f + inventory[ITEM_ROLLER] * .00015f;
            if (turtleUntil > now()) speed += .0018f;
            if (tankUntil > now()) speed += .0008f;
            px = clamp(px + mx * speed, .07f, .93f);
            py = clamp(py + my * speed, .12f, .88f);
        }

        void moveEnemy(Enemy e) {
            if (e.caughtUntil > now()) return;
            if (rnd.nextInt(80) == 0) e.dx *= -1;
            if (rnd.nextInt(90) == 0) e.dy *= -1;
            float speed = .0014f + difficulty * .00035f;
            e.x += e.dx * speed;
            e.y += e.dy * speed;
            if (e.x < .08f || e.x > .92f) { e.x = clamp(e.x, .08f, .92f); e.dx *= -1; }
            if (e.y < .14f || e.y > .86f) { e.y = clamp(e.y, .14f, .86f); e.dy *= -1; }
        }

        void placeBomb() {
            if (now() - startMs < START_DELAY_MS || activeBombs >= maxBombs) return;
            for (Bomb b: bombs) if (!b.water && dist(px, py, b.x, b.y) < .045f) return;
            Bomb b = new Bomb(px, py, now());
            if (tankUntil > now()) b.fast = true;
            bombs.add(b);
            activeBombs++;
        }

        void useSelectedItem() {
            if (selectedItem < 0 || selectedItem >= ITEM_COUNT || inventory[selectedItem] <= 0) return;
            if (selectedItem == ITEM_WATER) { maxBombs++; }
            else if (selectedItem == ITEM_POWER) { waterPower = Math.min(6, waterPower + 1); }
            else if (selectedItem == ITEM_ROLLER) { score += 20; }
            else if (selectedItem == ITEM_GLOVE) { throwNearestBomb(); }
            else if (selectedItem == ITEM_DART) { useDart(); }
            else if (selectedItem == ITEM_NEEDLE) { shieldUntil = now() + 1800; }
            else if (selectedItem == ITEM_TIMER) { timeLeft += 8; startMs += 8000; }
            else if (selectedItem == ITEM_SHIELD) { shieldUntil = now() + 9000; }
            else if (selectedItem == ITEM_TURTLE) { turtleUntil = now() + 9000; }
            else if (selectedItem == ITEM_TANK) { tankUntil = now() + 9000; }
            inventory[selectedItem]--;
            feedback = itemName(selectedItem) + " 사용";
            feedbackUntil = now() + 1300;
        }

        void throwNearestBomb() {
            Bomb target = null;
            float best = .14f;
            for (Bomb b: bombs) {
                if (b.water) continue;
                float d = dist(px, py, b.x, b.y);
                if (d < best) {
                    best = d;
                    target = b;
                }
            }
            if (target != null) {
                float len = Math.max(.001f, (float)Math.hypot(lastDx, lastDy));
                target.vx = lastDx / len * .006f;
                target.vy = lastDy / len * .006f;
            }
        }

        void useDart() {
            Iterator<Enemy> it = enemies.iterator();
            while (it.hasNext()) {
                Enemy e = it.next();
                float dx = e.x - px, dy = e.y - py;
                float len = Math.max(.0001f, (float)Math.hypot(dx, dy));
                float aim = dx / len * lastDx + dy / len * lastDy;
                if (aim > .72f || e.caughtUntil > now()) {
                    it.remove();
                    score += 120;
                    return;
                }
            }
        }

        void updateBombs() {
            int t = now();
            Iterator<Bomb> it = bombs.iterator();
            while (it.hasNext()) {
                Bomb b = it.next();
                b.x = clamp(b.x + b.vx, .07f, .93f);
                b.y = clamp(b.y + b.vy, .12f, .88f);
                b.vx *= .96f;
                b.vy *= .96f;
                int fuse = b.fast ? 1500 : 2600;
                if (!b.water && t - b.start > fuse) {
                    b.water = true;
                    b.waterStart = t;
                    hitWater(b);
                }
                if (b.water && t - b.waterStart > 520) {
                    it.remove();
                    activeBombs = Math.max(0, activeBombs - 1);
                }
            }
        }

        void hitWater(Bomb b) {
            float reach = .11f + waterPower * .035f;
            if (onWater(px, py, b, reach)) hitPlayer();
            for (Enemy e: enemies) if (onWater(e.x, e.y, b, reach)) e.caughtUntil = now() + 5000;
            if (rnd.nextFloat() < .32f) {
                int kind = rnd.nextInt(ITEM_COUNT);
                drops.add(new ItemDrop(clamp(b.x + (rnd.nextFloat() - .5f) * .18f, .08f, .92f), clamp(b.y + (rnd.nextFloat() - .5f) * .18f, .14f, .86f), kind, now()));
            }
        }

        boolean onWater(float x, float y, Bomb b, float reach) {
            return dist(x, y, b.x, b.y) < .055f
                    || (Math.abs(y - b.y) < .035f && Math.abs(x - b.x) < reach)
                    || (Math.abs(x - b.x) < .035f && Math.abs(y - b.y) < reach);
        }

        void hitPlayer() {
            if (shieldUntil > now()) shieldUntil = 0;
            else end(false);
        }

        void collectDrops() {
            Iterator<ItemDrop> it = drops.iterator();
            while (it.hasNext()) {
                ItemDrop item = it.next();
                if (now() - item.start > 9000) {
                    it.remove();
                    continue;
                }
                if (dist(px, py, item.x, item.y) < .055f) {
                    inventory[item.kind] = Math.min(9, inventory[item.kind] + 1);
                    selectedItem = item.kind;
                    score += 30;
                    feedback = itemName(item.kind) + " 획득";
                    feedbackUntil = now() + 1400;
                    it.remove();
                }
            }
        }

        void checkTouches() {
            Iterator<Enemy> it = enemies.iterator();
            while (it.hasNext()) {
                Enemy e = it.next();
                if (dist(px, py, e.x, e.y) < .065f) {
                    if (e.caughtUntil > now()) {
                        it.remove();
                        score += 100;
                    } else {
                        hitPlayer();
                    }
                }
            }
        }

        void end(boolean clear) {
            if (mode != PLAY) return;
            endKind = clear ? 1 : -1;
            mode = END;
        }

        float clamp(float v, float a, float b) {
            return Math.max(a, Math.min(b, v));
        }

        float dist(float ax, float ay, float bx, float by) {
            return (float)Math.hypot(ax - bx, ay - by);
        }

        @Override public boolean onTouchEvent(MotionEvent ev) {
            int action = ev.getActionMasked();
            float x = ev.getX(ev.getActionIndex()), y = ev.getY(ev.getActionIndex());
            if (action == MotionEvent.ACTION_DOWN || action == MotionEvent.ACTION_POINTER_DOWN) {
                if (mode == MENU) {
                    int pick = menuPick(y, getHeight());
                    if (pick >= 0) { difficulty = pick; startGame(); }
                    return true;
                }
                if (mode == END) { startGame(); return true; }
                if (mode == PLAY) {
                    for (int i = 0; i < answerRects.length; i++) if (answerRects[i].contains(x, y)) { answer(i); return true; }
                    for (int i = 0; i < itemSlots.length; i++) if (itemSlots[i].contains(x, y)) { selectedItem = i; return true; }
                    if (bombButton.contains(x, y)) { placeBomb(); return true; }
                    if (itemButton.contains(x, y)) { useSelectedItem(); return true; }
                }
            }
            if (mode == PLAY && (action == MotionEvent.ACTION_DOWN || action == MotionEvent.ACTION_MOVE || action == MotionEvent.ACTION_POINTER_DOWN)) {
                int pointer = 0;
                float cx = 112f, cy = getHeight() - 116f;
                float dx = ev.getX(pointer) - cx, dy = ev.getY(pointer) - cy;
                if (Math.hypot(dx, dy) < 115f) {
                    vx = Math.abs(dx) > 18f ? Math.max(-1f, Math.min(1f, dx / 72f)) : 0f;
                    vy = Math.abs(dy) > 18f ? Math.max(-1f, Math.min(1f, dy / 72f)) : 0f;
                    return true;
                }
            }
            if (action == MotionEvent.ACTION_UP || action == MotionEvent.ACTION_CANCEL) { vx = 0; vy = 0; }
            return true;
        }

        int menuPick(float y, int h) {
            float top = h * .38f;
            for (int i = 0; i < 3; i++) if (y > top + i * 92f && y < top + i * 92f + 70f) return i;
            return -1;
        }

        @Override protected void onDraw(Canvas c) {
            int w = getWidth(), h = getHeight();
            if (mode == MENU) {
                drawMenu(c, w, h);
                return;
            }
            layout(w, h);
            drawStage(c, w, h);
            drawHud(c, w, h);
            drawItemBar(c, w, h);
            drawControls(c, w, h);
            if (mode == END) drawEnd(c, w, h);
        }

        void layout(int w, int h) {
            float margin = 18f;
            float sideW = Math.max(310f, w * .23f);
            field.set(margin, margin, w - sideW - margin, h - 104f);
            side.set(field.right + 10f, margin, w - margin, h - margin);
            itemBar.set(field.left + 150f, h - 82f, field.right - 24f, h - 18f);
        }

        float sx(float x) { return field.left + x * field.width(); }
        float sy(float y) { return field.top + y * field.height(); }
        float unit() { return Math.min(field.width(), field.height()); }

        void drawMenu(Canvas c, int w, int h) {
            p.setStyle(Paint.Style.FILL);
            p.setShader(new LinearGradient(0, 0, w, h, Color.rgb(11, 82, 123), Color.rgb(5, 26, 64), Shader.TileMode.CLAMP));
            c.drawRect(0, 0, w, h, p);
            p.setShader(null);
            RectF card = new RectF(w * .22f, h * .14f, w * .78f, h * .88f);
            p.setColor(Color.rgb(239, 250, 255));
            c.drawRoundRect(card, 26, 26, p);
            text(c, "EDUNI Crazy Arcade", card.left + 70, card.top + 96, 46, Color.rgb(15, 23, 42), true);
            text(c, "문제를 맞혀 아이템을 받고, 이동하면서 물풍선을 놓아 몬스터를 잡으세요.", card.left + 70, card.top + 148, 22, Color.rgb(71, 85, 105), false);
            String[] names = {"쉬움  보상 기본 아이템", "보통  특수 아이템 추가", "어려움  탑승/강화 아이템 추가"};
            float y = h * .38f;
            for (int i = 0; i < 3; i++) {
                RectF r = new RectF(card.left + 70, y + i * 92f, card.right - 70, y + i * 92f + 70f);
                p.setColor(i == difficulty ? Color.rgb(45, 212, 191) : Color.WHITE);
                c.drawRoundRect(r, 20, 20, p);
                text(c, names[i], r.left + 36, r.top + 45, 27, i == difficulty ? Color.WHITE : Color.rgb(15, 23, 42), true);
            }
            text(c, "A 시작  /  B 뒤로", card.left + 70, card.bottom - 46, 22, Color.rgb(100, 116, 139), false);
        }

        void drawStage(Canvas c, int w, int h) {
            p.setStyle(Paint.Style.FILL);
            p.setColor(Color.rgb(8, 86, 152));
            c.drawRect(0, 0, w, h, p);
            p.setShader(new LinearGradient(field.left, field.top, field.right, field.bottom, Color.rgb(96, 173, 55), Color.rgb(43, 139, 45), Shader.TileMode.CLAMP));
            c.drawRoundRect(field, 10, 10, p);
            p.setShader(null);
            drawGrass(c);
            drawBorderTrees(c);
            drawHouseAndPond(c);
            for (ItemDrop item: drops) drawFieldItem(c, item);
            for (Bomb b: bombs) drawBomb(c, b);
            for (Enemy e: enemies) drawEnemy(c, e);
            drawPlayer(c);
        }

        void drawGrass(Canvas c) {
            p.setStrokeWidth(2f);
            for (int i = 0; i < 180; i++) {
                float x = sx((i * 37 % 100) / 100f);
                float y = sy((i * 61 % 100) / 100f);
                p.setColor(i % 5 == 0 ? Color.rgb(247, 211, 60) : Color.argb(90, 228, 255, 180));
                c.drawLine(x, y, x + (i % 7 - 3), y + 5, p);
            }
            p.setStyle(Paint.Style.FILL);
        }

        void drawBorderTrees(Canvas c) {
            float u = unit();
            for (int i = 0; i < 8; i++) {
                drawTree(c, field.left + 28, field.top + 48 + i * field.height() / 8f, u * .035f);
                drawTree(c, field.right - 28, field.top + 48 + i * field.height() / 8f, u * .035f);
            }
            for (int i = 0; i < 5; i++) drawTree(c, field.left + 80 + i * 90, field.top + 32, u * .042f);
        }

        void drawTree(Canvas c, float x, float y, float r) {
            p.setColor(Color.rgb(123, 84, 35));
            c.drawRoundRect(new RectF(x - r * .25f, y, x + r * .25f, y + r * 1.25f), r * .18f, r * .18f, p);
            p.setColor(Color.rgb(17, 122, 47));
            c.drawCircle(x, y, r, p);
            p.setColor(Color.rgb(20, 150, 58));
            c.drawCircle(x - r * .45f, y + r * .18f, r * .62f, p);
            c.drawCircle(x + r * .45f, y + r * .18f, r * .62f, p);
        }

        void drawHouseAndPond(Canvas c) {
            float u = unit();
            RectF house = new RectF(field.left + u*.26f, field.top + u*.055f, field.left + u*.43f, field.top + u*.18f);
            p.setColor(Color.rgb(239, 145, 32));
            c.drawRoundRect(house, 12, 12, p);
            p.setColor(Color.rgb(190, 47, 25));
            Path roof = new Path();
            roof.moveTo(house.left - 10, house.top + 8);
            roof.lineTo((house.left + house.right) / 2, house.top - u*.055f);
            roof.lineTo(house.right + 10, house.top + 8);
            roof.close();
            c.drawPath(roof, p);
            p.setColor(Color.rgb(109, 70, 24));
            c.drawRoundRect(new RectF(house.centerX() - 12, house.bottom - 34, house.centerX() + 12, house.bottom), 8, 8, p);
            RectF pond = new RectF(field.left + u*.55f, field.top + u*.045f, field.left + u*.72f, field.top + u*.16f);
            p.setColor(Color.rgb(81, 190, 229));
            c.drawRoundRect(pond, 18, 18, p);
            p.setColor(Color.argb(140, 255, 255, 255));
            c.drawOval(new RectF(pond.left + 16, pond.top + 10, pond.right - 20, pond.bottom - 18), p);
        }

        void drawBomb(Canvas c, Bomb b) {
            float u = unit();
            float x = sx(b.x), y = sy(b.y);
            if (b.water) {
                float reach = u * (.11f + waterPower * .035f);
                p.setColor(Color.argb(220, 109, 207, 255));
                c.drawRoundRect(new RectF(x - reach, y - u*.026f, x + reach, y + u*.026f), u*.03f, u*.03f, p);
                c.drawRoundRect(new RectF(x - u*.026f, y - reach, x + u*.026f, y + reach), u*.03f, u*.03f, p);
                p.setShader(new RadialGradient(x, y, u*.055f, Color.WHITE, Color.rgb(74, 190, 255), Shader.TileMode.CLAMP));
                c.drawCircle(x, y, u*.055f, p);
                p.setShader(null);
            } else {
                p.setShader(new RadialGradient(x - u*.015f, y - u*.018f, u*.05f, Color.WHITE, Color.rgb(88, 190, 232), Shader.TileMode.CLAMP));
                c.drawCircle(x, y, u*.035f, p);
                p.setShader(null);
            }
        }

        void drawEnemy(Canvas c, Enemy e) {
            float u = unit();
            float x = sx(e.x), y = sy(e.y);
            boolean caught = e.caughtUntil > now();
            if (caught) {
                p.setShader(new RadialGradient(x, y, u*.055f, Color.WHITE, Color.rgb(126, 204, 255), Shader.TileMode.CLAMP));
                c.drawCircle(x, y, u*.052f, p);
                p.setShader(null);
            }
            p.setColor(caught ? Color.rgb(255, 174, 201) : Color.rgb(255, 137, 173));
            c.drawOval(new RectF(x - u*.034f, y - u*.028f, x + u*.034f, y + u*.032f), p);
            c.drawCircle(x - u*.023f, y - u*.030f, u*.012f, p);
            c.drawCircle(x + u*.023f, y - u*.030f, u*.012f, p);
            p.setColor(Color.rgb(55, 65, 81));
            c.drawCircle(x - u*.012f, y - u*.006f, u*.004f, p);
            c.drawCircle(x + u*.012f, y - u*.006f, u*.004f, p);
        }

        void drawPlayer(Canvas c) {
            float u = unit();
            float x = sx(px), y = sy(py);
            if (shieldUntil > now()) {
                p.setStyle(Paint.Style.STROKE);
                p.setStrokeWidth(Math.max(3f, u * .006f));
                p.setColor(Color.rgb(191, 219, 254));
                c.drawCircle(x, y, u*.060f, p);
                p.setStyle(Paint.Style.FILL);
            }
            p.setShader(new RadialGradient(x - u*.015f, y - u*.015f, u*.055f, Color.WHITE, tankUntil > now() ? Color.rgb(37, 99, 235) : Color.rgb(27, 84, 211), Shader.TileMode.CLAMP));
            c.drawCircle(x, y, turtleUntil > now() ? u*.052f : u*.040f, p);
            p.setShader(null);
            p.setColor(Color.WHITE);
            c.drawCircle(x - u*.014f, y - u*.010f, u*.010f, p);
            c.drawCircle(x + u*.014f, y - u*.010f, u*.010f, p);
            p.setColor(Color.rgb(15, 23, 42));
            c.drawCircle(x - u*.014f, y - u*.010f, u*.004f, p);
            c.drawCircle(x + u*.014f, y - u*.010f, u*.004f, p);
        }

        void drawFieldItem(Canvas c, ItemDrop item) {
            float u = unit();
            drawItemIcon(c, sx(item.x), sy(item.y), u*.030f, item.kind, true);
        }

        void drawHud(Canvas c, int w, int h) {
            p.setColor(Color.rgb(0, 67, 148));
            c.drawRoundRect(side, 16, 16, p);
            p.setColor(Color.rgb(18, 120, 217));
            c.drawRoundRect(new RectF(side.left + 12, side.top + 12, side.right - 12, side.top + 64), 10, 10, p);
            text(c, "미션 현황", side.left + 28, side.top + 48, 26, Color.WHITE, true);

            float y = side.top + 92;
            drawStat(c, "시간", String.valueOf(timeLeft), y, Color.rgb(255, 231, 128)); y += 52;
            drawStat(c, "점수", String.valueOf(score), y, Color.WHITE); y += 52;
            drawStat(c, "적", enemies.size() + "마리", y, Color.rgb(255, 190, 210)); y += 52;
            drawStat(c, "물풍선", activeBombs + "/" + maxBombs, y, Color.rgb(125, 211, 252)); y += 52;
            drawStat(c, "물줄기", "Lv " + waterPower, y, Color.rgb(167, 243, 208)); y += 58;

            p.setColor(Color.rgb(8, 92, 184));
            RectF quiz = new RectF(side.left + 14, y, side.right - 14, y + 230);
            c.drawRoundRect(quiz, 12, 12, p);
            text(c, "문제", quiz.left + 16, quiz.top + 32, 20, Color.rgb(191, 219, 254), true);
            text(c, questionBank[quizIndex][0], quiz.left + 16, quiz.top + 68, 24, Color.WHITE, true);
            for (int i = 0; i < 3; i++) {
                answerRects[i].set(quiz.left + 16, quiz.top + 88 + i * 43, quiz.right - 16, quiz.top + 124 + i * 43);
                p.setColor(Color.rgb(19, 133, 230));
                c.drawRoundRect(answerRects[i], 9, 9, p);
                text(c, (i + 1) + ". " + questionBank[quizIndex][i + 1], answerRects[i].left + 14, answerRects[i].top + 25, 18, Color.WHITE, true);
            }
            String msg = feedbackUntil > now() ? feedback : "정답 보상: 난이도별 아이템";
            text(c, msg, quiz.left + 16, quiz.bottom - 18, 17, Color.rgb(255, 231, 128), true);

            int remain = START_DELAY_MS - (now() - startMs);
            if (remain > 0) text(c, "READY", field.centerX() - 48, field.top + 74, 34, Color.WHITE, true);
        }

        void drawStat(Canvas c, String label, String value, float y, int valueColor) {
            RectF box = new RectF(side.left + 18, y, side.right - 18, y + 40);
            p.setColor(Color.rgb(4, 88, 178));
            c.drawRoundRect(box, 9, 9, p);
            text(c, label, box.left + 14, box.top + 27, 18, Color.rgb(191, 219, 254), true);
            p.setTextAlign(Paint.Align.RIGHT);
            text(c, value, box.right - 14, box.top + 28, 22, valueColor, true);
            p.setTextAlign(Paint.Align.LEFT);
        }

        void drawItemBar(Canvas c, int w, int h) {
            p.setColor(Color.rgb(0, 91, 181));
            c.drawRoundRect(itemBar, 14, 14, p);
            text(c, "아이템", itemBar.left + 18, itemBar.top + 40, 20, Color.WHITE, true);
            float size = Math.min(52f, (itemBar.width() - 110f) / ITEM_COUNT);
            float x = itemBar.left + 96f;
            for (int i = 0; i < ITEM_COUNT; i++) {
                itemSlots[i].set(x + i * size, itemBar.top + 8, x + i * size + size - 6, itemBar.bottom - 8);
                p.setColor(i == selectedItem ? Color.rgb(250, 204, 21) : Color.rgb(12, 100, 190));
                c.drawRoundRect(itemSlots[i], 8, 8, p);
                drawItemIcon(c, itemSlots[i].centerX(), itemSlots[i].centerY() - 3, size * .24f, i, false);
                if (inventory[i] > 0) {
                    p.setColor(Color.rgb(239, 68, 68));
                    c.drawCircle(itemSlots[i].right - 9, itemSlots[i].top + 9, 11, p);
                    p.setTextAlign(Paint.Align.CENTER);
                    text(c, String.valueOf(inventory[i]), itemSlots[i].right - 9, itemSlots[i].top + 16, 14, Color.WHITE, true);
                    p.setTextAlign(Paint.Align.LEFT);
                }
            }
        }

        void drawControls(Canvas c, int w, int h) {
            p.setColor(Color.argb(135, 15, 23, 42));
            c.drawRoundRect(new RectF(18, h-70, 520, h-18), 16, 16, p);
            text(c, "이동 중 A/버튼으로 물풍선 설치   X 선택 아이템 사용   문제는 우측 선택", 38, h-36, 19, Color.WHITE, true);
            p.setColor(Color.argb(110, 255, 255, 255));
            c.drawCircle(112, h-116, 72, p);
            p.setColor(Color.rgb(45, 212, 191));
            c.drawCircle(112, h-116, 34, p);
            itemButton.set(w-318, h-124, w-184, h-28);
            p.setColor(Color.rgb(249, 115, 22));
            c.drawRoundRect(itemButton, 22, 22, p);
            text(c, "아이템", itemButton.left + 31, itemButton.top + 62, 22, Color.WHITE, true);
            bombButton.set(w-166, h-124, w-34, h-28);
            p.setColor(Color.rgb(14, 165, 233));
            c.drawRoundRect(bombButton, 22, 22, p);
            text(c, "물풍선", bombButton.left + 29, bombButton.top + 62, 22, Color.WHITE, true);
        }

        void drawEnd(Canvas c, int w, int h) {
            p.setColor(Color.argb(170, 15, 23, 42));
            c.drawRect(0, 0, w, h, p);
            RectF card = new RectF(w*.30f, h*.26f, w*.70f, h*.74f);
            p.setColor(Color.WHITE);
            c.drawRoundRect(card, 26, 26, p);
            String title = endKind > 0 ? "클리어!" : "다시 도전!";
            int color = endKind > 0 ? Color.rgb(20, 184, 166) : Color.rgb(244, 63, 94);
            text(c, title, card.left + 64, card.top + 96, 44, color, true);
            text(c, "점수 " + score + "  /  A 다시 시작  /  B 메뉴", card.left + 64, card.top + 156, 24, Color.rgb(71, 85, 105), false);
        }

        void drawItemIcon(Canvas c, float x, float y, float r, int kind, boolean fieldDrop) {
            int color;
            if (kind == ITEM_WATER) color = Color.rgb(34, 197, 94);
            else if (kind == ITEM_POWER) color = Color.rgb(250, 204, 21);
            else if (kind == ITEM_ROLLER) color = Color.rgb(168, 85, 247);
            else if (kind == ITEM_GLOVE) color = Color.rgb(251, 146, 60);
            else if (kind == ITEM_DART) color = Color.rgb(249, 115, 22);
            else if (kind == ITEM_NEEDLE) color = Color.rgb(244, 63, 94);
            else if (kind == ITEM_TIMER) color = Color.rgb(45, 212, 191);
            else if (kind == ITEM_SHIELD) color = Color.rgb(59, 130, 246);
            else if (kind == ITEM_TURTLE) color = Color.rgb(22, 163, 74);
            else color = Color.rgb(30, 64, 175);
            p.setColor(color);
            if (fieldDrop) c.drawCircle(x, y, r * 1.25f, p);
            else c.drawRoundRect(new RectF(x-r*1.25f, y-r*1.25f, x+r*1.25f, y+r*1.25f), r*.45f, r*.45f, p);
            text(c, itemShort(kind), x - r*.72f, y + r*.45f, r * .95f, Color.WHITE, true);
        }

        String itemShort(int kind) {
            if (kind == ITEM_WATER) return "B";
            if (kind == ITEM_POWER) return "+";
            if (kind == ITEM_ROLLER) return "R";
            if (kind == ITEM_GLOVE) return "G";
            if (kind == ITEM_DART) return "D";
            if (kind == ITEM_NEEDLE) return "N";
            if (kind == ITEM_TIMER) return "T";
            if (kind == ITEM_SHIELD) return "S";
            if (kind == ITEM_TURTLE) return "거";
            return "탱";
        }

        String itemName(int kind) {
            if (kind == ITEM_WATER) return "물풍선";
            if (kind == ITEM_POWER) return "파워";
            if (kind == ITEM_ROLLER) return "롤러";
            if (kind == ITEM_GLOVE) return "글러브";
            if (kind == ITEM_DART) return "다트";
            if (kind == ITEM_NEEDLE) return "바늘";
            if (kind == ITEM_TIMER) return "타이머";
            if (kind == ITEM_SHIELD) return "쉴드";
            if (kind == ITEM_TURTLE) return "거북이";
            return "탱크";
        }

        void text(Canvas c, String s, float x, float y, float size, int color, boolean bold) {
            p.setShader(null);
            p.setStyle(Paint.Style.FILL);
            p.setColor(color);
            p.setTextSize(size);
            p.setFakeBoldText(bold);
            c.drawText(s, x, y, p);
            p.setFakeBoldText(false);
        }

        static class Bomb {
            float x, y, vx, vy;
            int start, waterStart;
            boolean water, fast;
            Bomb(float x, float y, int start) { this.x = x; this.y = y; this.start = start; }
        }

        static class Enemy {
            float x, y, dx, dy;
            int caughtUntil;
            Enemy(float x, float y, float dx, float dy) { this.x = x; this.y = y; this.dx = dx; this.dy = dy; }
        }

        static class ItemDrop {
            float x, y;
            int kind, start;
            ItemDrop(float x, float y, int kind, int start) { this.x = x; this.y = y; this.kind = kind; this.start = start; }
        }
    }
}
