package io.github.wbsantiago.financas10.preview;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import android.content.res.Configuration;

public class MainActivity extends BridgeActivity {
    private AppLockController appLock;
    AppLockController getAppLockController() { return appLock; }
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DeviceFiles.class);
        registerPlugin(AppLock.class);
        super.onCreate(savedInstanceState);
        // BridgeActivity must apply its NoActionBar theme before window decor is created.
        EdgeToEdge.enable(this);
        appLock = new AppLockController(this);
    }
    @Override public void onPause() { if (appLock != null) appLock.pause(); super.onPause(); }
    @Override public void onStop() { if (appLock != null) appLock.stop(); super.onStop(); }
    @Override public void onResume() { super.onResume(); if (appLock != null) appLock.resume(); }
    @Override public void onDestroy() { if (appLock != null) appLock.destroy(); super.onDestroy(); }
    @Override public void onConfigurationChanged(Configuration configuration) { super.onConfigurationChanged(configuration); if (appLock != null) appLock.appearanceChanged(); }
    @Override public void onWindowFocusChanged(boolean focused) { super.onWindowFocusChanged(focused); if (appLock != null) appLock.windowFocusChanged(focused); }
}
