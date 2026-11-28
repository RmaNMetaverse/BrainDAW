package com.rmanmetaverse.braindaw;

import android.os.Bundle;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle state) {
        SplashScreen.installSplashScreen(this);
        registerPlugin(StudioAudioPlugin.class);
        super.onCreate(state);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        // System overlays can take window focus while the WebView is still visible.
        if (getBridge() != null) {
            getBridge().triggerWindowJSEvent(hasFocus ? "braindawwindowfocus" : "braindawwindowblur");
        }
    }
}
