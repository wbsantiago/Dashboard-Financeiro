package io.github.wbsantiago.financas10.preview;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import android.content.pm.ActivityInfo;
import android.content.res.Configuration;
import android.os.SystemClock;
import android.view.Window;
import android.view.WindowManager;
import android.app.KeyguardManager;
import android.os.PowerManager;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.Test;
import org.junit.runner.RunWith;

/** Checks actual Android window decor; browser resizing cannot detect native title bars. */
@RunWith(AndroidJUnit4.class)
public class HeaderRotationTest {
    private void assertNoTitleBar(ActivityScenario<MainActivity> scenario) {
        scenario.onActivity(activity -> {
            assertNull("Only the web dashboard may supply the header", activity.getActionBar());
            assertNull(activity.getSupportActionBar());
            assertFalse(activity.getWindow().hasFeature(Window.FEATURE_ACTION_BAR));
        });
    }

    private void rotate(ActivityScenario<MainActivity> scenario, int requested, int expected) {
        scenario.onActivity(activity -> activity.setRequestedOrientation(requested));
        long deadline = SystemClock.uptimeMillis() + 5000;
        AtomicBoolean reached = new AtomicBoolean(false);
        while (!reached.get() && SystemClock.uptimeMillis() < deadline) {
            scenario.onActivity(activity -> reached.set(activity.getResources().getConfiguration().orientation == expected));
            if (!reached.get()) SystemClock.sleep(100);
        }
        assertEquals("Device must reach the requested orientation", true, reached.get());
        assertNoTitleBar(scenario);
    }

    @Test
    public void launchAndRotationKeepOnlyTheDashboardHeader() {
        // No financial data is created, imported, cleared or deleted by this test.
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            scenario.onActivity(activity -> {
                assertFalse("Desbloqueie o Android para conferir a rotação", activity.getSystemService(KeyguardManager.class).isKeyguardLocked());
                assertTrue("Mantenha a tela acesa durante o teste", activity.getSystemService(PowerManager.class).isInteractive());
                activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            });
            try {
                assertNoTitleBar(scenario);
                rotate(scenario, ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE, Configuration.ORIENTATION_LANDSCAPE);
                rotate(scenario, ActivityInfo.SCREEN_ORIENTATION_PORTRAIT, Configuration.ORIENTATION_PORTRAIT);
            } finally {
                scenario.onActivity(activity -> {
                    activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
                    activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                });
            }
        }
    }
}
