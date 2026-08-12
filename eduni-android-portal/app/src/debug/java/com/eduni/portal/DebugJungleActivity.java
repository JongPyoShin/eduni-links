package com.eduni.portal;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;

public class DebugJungleActivity extends Activity {
    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        startActivity(new Intent(this, NativeJungleActivity.class));
        finish();
    }
}
