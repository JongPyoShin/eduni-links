package com.eduni.portal;

import android.content.Intent;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.pm.ActivityInfo;
import android.graphics.Color;
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
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.TextView;

public class MainActivity extends Activity {
    private static final String START_URL = "http://100.75.214.95:8081/portal";
    //private static final String START_URL = "http://10.0.2.2:8081/portal";
    private WebView webView;
    private TextView status;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private boolean leftDown, rightDown, upDown, downDown;

    @SuppressLint("SetJavaScriptEnabled")
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(15, 118, 110));

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(125, 211, 252));
        webView.setFocusable(true);
        webView.setFocusableInTouchMode(true);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {


                try {
                    if (request != null && request.getUrl() != null && eduniOpenNativeBubbleShooterIfNeeded(request.getUrl().toString())) {
                        return true;
                    }
                } catch (Exception ignored) {}
// EDUNI_NATIVE_OMOK_APP_PATCH_V1_REQUEST
                try {
                    if (eduniOpenNativeCrazyArcadeIfNeeded(request.getUrl().toString())) {
                        return true;
                    }
                } catch (Exception ignored) {}

                try {
                    if (request != null && request.getUrl() != null && eduniOpenNativeOmokIfNeeded(request.getUrl().toString())) {
                        return true;
                    }
                } catch (Exception ignored) {}


                return maybeOpenNativeJungle(request.getUrl().toString());
            }

            public boolean shouldOverrideUrlLoading(WebView view, String url) {
            if (eduniOpenNativeBubbleShooterIfNeeded(url)) return true;

                // EDUNI_NATIVE_OMOK_APP_PATCH_V1_STRING
                try {
                    if (eduniOpenNativeCrazyArcadeIfNeeded(url)) {
                        return true;
                    }
                } catch (Exception ignored) {}

                try {
                    if (eduniOpenNativeOmokIfNeeded(url)) {
                        return true;
                    }
                } catch (Exception ignored) {}


                return maybeOpenNativeJungle(url);
            }

            public void onPageFinished(WebView view, String url) {
                hideSystemUi();
                injectControllerShim();
                showStatus("EDUNI 준비 완료");
                webView.requestFocus();
            }

            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                showStatus("서버 연결 확인 필요");
            }
        });

        root.addView(webView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
        ));

        status = new TextView(this);
        status.setText("EDUNI 시작 중...");
        status.setTextColor(Color.WHITE);
        status.setTextSize(13);
        status.setBackgroundColor(Color.argb(170, 15, 118, 110));
        status.setPadding(14, 8, 14, 8);
        FrameLayout.LayoutParams statusParams = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT,
                FrameLayout.LayoutParams.WRAP_CONTENT
        );
        statusParams.leftMargin = 16;
        statusParams.topMargin = 16;
        root.addView(status, statusParams);

        setContentView(root);
        hideSystemUi();
        String startUrl = resolveStartUrl(getIntent());
        if (!eduniOpenNativeBubbleShooterIfNeeded(startUrl)) {
            webView.loadUrl(startUrl);
        }
    }

    private String resolveStartUrl(Intent intent) {
        if (intent != null) {
            String explicit = intent.getStringExtra("target_url");
            if (explicit == null || explicit.trim().isEmpty()) explicit = intent.getStringExtra("url");
            if (explicit != null && !explicit.trim().isEmpty()) return explicit;
        }
        return START_URL;
    }

    protected void onResume() {
        super.onResume();
        hideSystemUi();
        if (webView != null) webView.requestFocus();
    }

    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemUi();
    }

    private void hideSystemUi() {
        View decor = getWindow().getDecorView();
        decor.setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                        | View.SYSTEM_UI_FLAG_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        );
        if (android.os.Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController controller = decor.getWindowInsetsController();
            if (controller != null) {
                controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        }
    }

    private void showStatus(String text) {
        status.setText(text);
        status.setVisibility(View.VISIBLE);
        handler.removeCallbacksAndMessages(null);
        handler.postDelayed(() -> status.setVisibility(View.GONE), 1600);
    }

    private void injectControllerShim() {
        String js =
                "(function(){" +
                "if(window.__eduniNativeShimInstalled)return;" +
                "window.__eduniNativeShimInstalled=true;" +
                "window.__eduniNativeVector={x:0,y:0};" +
                "window.addEventListener('eduni-native-move',function(e){window.__eduniNativeVector=e.detail||{x:0,y:0};});" +
                "if(location.pathname.indexOf('/portal')>=0){" +
                "var style=document.createElement('style');" +
                "style.textContent='.__eduni-focus{outline:6px solid #facc15!important;outline-offset:4px!important;border-radius:18px!important;transform:scale(1.03)!important;} .__eduni-crazy{position:fixed;right:28px;bottom:28px;z-index:999999;background:#0891b2;color:white;border:0;border-radius:18px;padding:18px 24px;font-weight:900;font-size:22px;box-shadow:0 12px 26px rgba(8,47,73,.28)}';" +
                "document.head.appendChild(style);" +
                "if(!document.querySelector('.__eduni-crazy')){var crazy=document.createElement('button');crazy.className='__eduni-crazy';crazy.textContent='물풍선 배틀';crazy.onclick=function(){location.href='eduni://portal/crazyarcade'};document.body.appendChild(crazy);}" +
                "var idx=0;" +
                "function items(){return Array.prototype.slice.call(document.querySelectorAll('a[href],button,[role=button]')).filter(function(el){var r=el.getBoundingClientRect();return r.width>20&&r.height>20&&getComputedStyle(el).visibility!==\"hidden\"&&getComputedStyle(el).display!==\"none\";});}" +
                "function focus(i){var arr=items();if(!arr.length)return;arr.forEach(function(e){e.classList.remove('__eduni-focus')});idx=(i+arr.length)%arr.length;arr[idx].classList.add('__eduni-focus');arr[idx].scrollIntoView({block:'center',inline:'center',behavior:'smooth'});}" +
                "window.addEventListener('keydown',function(ev){var k=ev.key;if(['ArrowRight','ArrowDown'].indexOf(k)>=0){ev.preventDefault();focus(idx+1);}else if(['ArrowLeft','ArrowUp'].indexOf(k)>=0){ev.preventDefault();focus(idx-1);}else if(k==='Enter'||k===' '){var arr=items();if(arr[idx]){ev.preventDefault();arr[idx].click();}}else if(k==='Escape'){history.back();}},true);" +
                "setTimeout(function(){focus(0)},600);" +
                "}" +
                "})();";
        webView.evaluateJavascript(js, null);
    }


    private boolean maybeOpenNativeJungle(String url) {
        if (url == null) return false;
        String lower = url.toLowerCase();

        // EDUNI_APP_PROGRESS_DASHBOARD_ROUTE_PATCH_V8_1
        // Parent progress/report pages must stay inside the WebView.
        // Do not intercept them as the Native Jungle game.
        if (lower.contains("/jungle/progress")
                || lower.contains("/jungle/api/progress")
                || lower.contains("/portal/parent")
                || lower.contains("/parent")) {
            showStatus("학습 리포트 열기");
            return false;
        }
        if (lower.contains("/jungle") || lower.contains("jungle.expedition") || lower.contains("activity/jungle")) {
            startActivity(new Intent(this, NativeJungleActivity.class));
            showStatus("Native 정글탐험 실행");
            return true;
        }
        return false;
    }

    // removed generated dispatchKeyEvent by v20.5


    private boolean isGameKey(int keyCode) {
        switch (keyCode) {
            case KeyEvent.KEYCODE_DPAD_LEFT:
            case KeyEvent.KEYCODE_DPAD_RIGHT:
            case KeyEvent.KEYCODE_DPAD_UP:
            case KeyEvent.KEYCODE_DPAD_DOWN:
            case KeyEvent.KEYCODE_BUTTON_A:
            case KeyEvent.KEYCODE_BUTTON_B:
            case KeyEvent.KEYCODE_BUTTON_X:
            case KeyEvent.KEYCODE_BUTTON_Y:
            case KeyEvent.KEYCODE_BUTTON_START:
            case KeyEvent.KEYCODE_BUTTON_SELECT:
            case KeyEvent.KEYCODE_ENTER:
            case KeyEvent.KEYCODE_SPACE:
            case KeyEvent.KEYCODE_ESCAPE:
                return true;
            default:
                return false;
        }
    }

    private void handleGameKey(KeyEvent event) {
        String key = mapKey(event.getKeyCode());
        if (key == null) return;
        String type = event.getAction() == KeyEvent.ACTION_UP ? "keyup" : "keydown";
        dispatchKeyboard(type, key);
        if (event.getAction() == KeyEvent.ACTION_DOWN) showStatus("컨트롤러: " + key);
    }

    private String mapKey(int keyCode) {
        switch (keyCode) {
            case KeyEvent.KEYCODE_DPAD_LEFT: return "ArrowLeft";
            case KeyEvent.KEYCODE_DPAD_RIGHT: return "ArrowRight";
            case KeyEvent.KEYCODE_DPAD_UP: return "ArrowUp";
            case KeyEvent.KEYCODE_DPAD_DOWN: return "ArrowDown";
            case KeyEvent.KEYCODE_BUTTON_A:
            case KeyEvent.KEYCODE_ENTER:
            case KeyEvent.KEYCODE_SPACE: return "Enter";
            case KeyEvent.KEYCODE_BUTTON_B:
            case KeyEvent.KEYCODE_ESCAPE: return "Escape";
            case KeyEvent.KEYCODE_BUTTON_X: return "x";
            case KeyEvent.KEYCODE_BUTTON_Y: return "y";
            case KeyEvent.KEYCODE_BUTTON_START: return "p";
            case KeyEvent.KEYCODE_BUTTON_SELECT: return "Tab";
            default: return null;
        }
    }

    private void dispatchKeyboard(String type, String key) {
        String escapedKey = key.replace("\\", "\\\\").replace("'", "\\'");
        String js = "window.dispatchEvent(new KeyboardEvent('" + type + "',{key:'" + escapedKey + "',code:'" + escapedKey + "',bubbles:true,cancelable:true}));";
        webView.evaluateJavascript(js, null);
    }


    // EDUNI_CONTROLLER_MOTION_PATCH_V2
    public boolean dispatchGenericMotionEvent(MotionEvent event) {
        if (isControllerMotionEvent(event)) {
            float x = readBestAxis(event,
                    MotionEvent.AXIS_HAT_X,
                    MotionEvent.AXIS_X,
                    MotionEvent.AXIS_RX,
                    MotionEvent.AXIS_Z);

            float y = readBestAxis(event,
                    MotionEvent.AXIS_HAT_Y,
                    MotionEvent.AXIS_Y,
                    MotionEvent.AXIS_RY,
                    MotionEvent.AXIS_RZ);

            if (Math.abs(x) < 0.18f) x = 0f;
            if (Math.abs(y) < 0.18f) y = 0f;

            updateSyntheticDirections(x, y);
            dispatchNativeMove(x, y);
            showMoveStatus(x, y);
            return true;
        }
        return super.dispatchGenericMotionEvent(event);
    }

    private boolean isControllerMotionEvent(MotionEvent event) {
        int source = event.getSource();
        boolean fromJoystick = (source & InputDevice.SOURCE_JOYSTICK) == InputDevice.SOURCE_JOYSTICK;
        boolean fromGamepad = (source & InputDevice.SOURCE_GAMEPAD) == InputDevice.SOURCE_GAMEPAD;
        boolean fromDpad = (source & InputDevice.SOURCE_DPAD) == InputDevice.SOURCE_DPAD;
        return (fromJoystick || fromGamepad || fromDpad)
                && event.getAction() == MotionEvent.ACTION_MOVE;
    }

    private float readBestAxis(MotionEvent event, int... axes) {
        for (int axis : axes) {
            float value = getCenteredAxis(event, axis);
            if (Math.abs(value) >= 0.18f) return value;
        }
        return 0f;
    }

    private float getCenteredAxis(MotionEvent event, int axis) {
        InputDevice device = event.getDevice();
        float value = event.getAxisValue(axis);
        if (device == null) return value;

        InputDevice.MotionRange range = device.getMotionRange(axis, event.getSource());
        if (range == null) return value;

        float flat = Math.max(range.getFlat(), 0.12f);
        return Math.abs(value) > flat ? value : 0f;
    }

    private void showMoveStatus(float x, float y) {
        if (Math.abs(x) < 0.35f && Math.abs(y) < 0.35f) return;

        String dir;
        if (Math.abs(x) > Math.abs(y)) {
            dir = x < 0 ? "←" : "→";
        } else {
            dir = y < 0 ? "↑" : "↓";
        }
        showStatus("컨트롤러: 이동 " + dir);
    }

    private void updateSyntheticDirections(float x, float y) {
        boolean left = x < -0.35f;
        boolean right = x > 0.35f;
        boolean up = y < -0.35f;
        boolean down = y > 0.35f;

        updateDirection("ArrowLeft", left, leftDown);
        updateDirection("ArrowRight", right, rightDown);
        updateDirection("ArrowUp", up, upDown);
        updateDirection("ArrowDown", down, downDown);

        leftDown = left;
        rightDown = right;
        upDown = up;
        downDown = down;
    }

    private void updateDirection(String key, boolean next, boolean prev) {
        if (next == prev) return;
        dispatchKeyboard(next ? "keydown" : "keyup", key);
    }

    private void dispatchNativeMove(float x, float y) {
        String js = "window.dispatchEvent(new CustomEvent('eduni-native-move',{detail:{x:"
                + x + ",y:" + y + "}}));";
        webView.evaluateJavascript(js, null);
    }

    // removed generated onBackPressed by v20.5


    // EDUNI_WEBVIEW_BACK_TO_PORTAL_FIX_V20_1

    // removed generated onKeyDown by v20.5



    // EDUNI_WEBVIEW_BACK_TO_PORTAL_HARD_FIX_V20_3

    // removed generated eduniBackToPortal by v20.5


    // removed duplicate dispatchKeyEvent by v20.4


    // removed duplicate onBackPressed by v20.4



    // EDUNI_MAINACTIVITY_BRACE_REPAIR_V20_5
    private boolean eduniBackToPortal() {
        try {
            if (webView != null) {
                String home = START_URL;
                String url = webView.getUrl();

                if (home == null || home.length() == 0) {
                    home = "http://100.75.214.95:8081/portal";
                }

                if (url == null || !url.contains("/portal")) {
                    webView.loadUrl(home);
                    return true;
                }

                if (webView.canGoBack()) {
                    webView.goBack();
                    return true;
                }

                webView.loadUrl(home);
                return true;
            }
        } catch (Exception ignored) {}
        return false;
    }


    public boolean dispatchKeyEvent(android.view.KeyEvent event) {
        if (event != null
                && event.getAction() == android.view.KeyEvent.ACTION_DOWN
                && (event.getKeyCode() == android.view.KeyEvent.KEYCODE_BACK
                    || event.getKeyCode() == android.view.KeyEvent.KEYCODE_BUTTON_B
                    || event.getKeyCode() == android.view.KeyEvent.KEYCODE_ESCAPE)) {
            if (eduniBackToPortal()) return true;
        }
        return super.dispatchKeyEvent(event);
    }


    public void onBackPressed() {
        if (eduniBackToPortal()) return;
        super.onBackPressed();
    }

    private boolean eduniOpenNativeCrazyArcadeIfNeeded(String rawUrl) {
        if (rawUrl == null) return false;
        String u = rawUrl.toLowerCase();

        boolean isCrazyArcade =
                u.contains("crazyarcade")
                || u.contains("crazy-arcade")
                || u.contains("/waterbattle")
                || u.contains("/water-battle")
                || u.contains("/bubblebattle")
                || u.contains("/bubble-battle");

        if (!isCrazyArcade) return false;

        try {
            startActivity(new android.content.Intent(this, NativeCrazyArcadeActivity.class));
            showStatus("Native 물풍선 배틀 실행");
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }


    // EDUNI_NATIVE_OMOK_APP_PATCH_V1
    private boolean eduniOpenNativeOmokIfNeeded(String rawUrl) {
        if (rawUrl == null) return false;
        String u = rawUrl.toLowerCase();

        boolean isOmok =
                u.endsWith("/omok")
                || u.contains("/omok?")
                || u.contains("/omok#")
                || u.equals("omok")
                || u.contains("/static_games/eduni_omok")
                || u.contains("eduni_omok.html");

        if (!isOmok) return false;

        try {
            startActivity(new android.content.Intent(this, NativeOmokActivity.class));
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }


    // EDUNI_NATIVE_BUBBLE_SHOOTER_APP_PATCH_V1
    private boolean eduniOpenNativeBubbleShooterIfNeeded(String url) {
        try {
            if (url == null) return false;
            String u = url.toLowerCase(java.util.Locale.ROOT);
            if (!(u.contains("/bubble-shooter") || u.contains("bubble-shooter") || u.contains("eduni_bubble"))) return false;

            android.content.Intent intent = new android.content.Intent(this, NativeBubbleShooterActivity.class);
            startActivity(intent);
            showStatus("Native 한자 슈터 실행");
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }

}

/* EDUNI_MAINACTIVITY_BRACE_REPAIR_V20_5_APPLIED */

/* EDUNI_MAINACTIVITY_OVERRIDE_FINAL_REPAIR_V20_6_APPLIED */

/* EDUNI_MAINACTIVITY_REMOVE_OVERRIDE_SAFETY_PATCH_V20_7_APPLIED: removed 10 Override annotations */
