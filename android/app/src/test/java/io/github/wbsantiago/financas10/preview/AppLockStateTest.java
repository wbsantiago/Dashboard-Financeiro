package io.github.wbsantiago.financas10.preview;

import static org.junit.Assert.*;
import org.junit.Test;

public class AppLockStateTest {
    @Test public void optInStartsDisabledAndNewEnabledProcessStartsLocked() {
        assertFalse(new AppLockState(false, 30).shielded());
        assertTrue(new AppLockState(true, 30).locked());
    }
    @Test public void coldRestartNeverReusesAnAuthenticatedSession() {
        AppLockState first = new AppLockState(true, 30); first.authenticated(); assertFalse(first.locked());
        assertTrue(new AppLockState(first.enabled(), first.timeoutSeconds()).locked());
    }
    @Test public void pauseHidesImmediatelyButShortReturnDoesNotLoseAuthentication() {
        AppLockState state = new AppLockState(true, 30); state.authenticated();
        state.pause(); assertTrue(state.shielded()); state.background(1000); state.foreground(30999);
        assertFalse(state.locked()); assertFalse(state.shielded());
    }
    @Test public void intervalBoundaryAndImmediateModeRequireNewAuthentication() {
        AppLockState state = new AppLockState(true, 30); state.authenticated();
        state.background(1000); state.foreground(31000); assertTrue(state.locked());
        state.configureAfterAuthentication(true, 0); state.background(40000); state.foreground(40000); assertTrue(state.locked());
    }
    @Test public void screenOffIgnoresGracePeriodAndUnlockClearsOldBackgroundTimestamp() {
        AppLockState state = new AppLockState(true, 300); state.authenticated(); state.lock(); assertTrue(state.locked());
        state.background(1000); state.authenticated(); state.foreground(900000); assertFalse(state.locked());
    }
    @Test public void repeatedBackgroundDoesNotExtendTheGracePeriod() {
        AppLockState state = new AppLockState(true, 30); state.authenticated();
        state.background(1000); state.background(29000); state.foreground(31000); assertTrue(state.locked());
    }
    @Test public void monotonicClockRegressionFailsClosedAndInvalidIntervalCannotWeakenProtection() {
        AppLockState state = new AppLockState(true, 30); state.authenticated(); state.background(9000); state.foreground(1000); assertTrue(state.locked());
        try { state.configureAfterAuthentication(false, -1); fail(); } catch (IllegalArgumentException expected) { assertTrue(state.enabled()); assertTrue(state.locked()); }
        assertEquals(30, new AppLockState(true, 999999).timeoutSeconds());
    }
    @Test public void disablingAfterConfirmationRemovesShieldWithoutTouchingOtherData() {
        AppLockState state = new AppLockState(true, 30); state.authenticated(); state.configureAfterAuthentication(false, 30);
        state.pause(); state.background(1000); state.foreground(999999); assertFalse(state.locked()); assertFalse(state.shielded());
    }
    @Test public void lockedStartupPromptsAutomaticallyButCancellationDoesNotLoopOnResume() {
        AppLockState state = new AppLockState(true, 30);
        assertTrue(state.shouldAutoPrompt()); state.promptStarted();
        state.pause(); state.background(1000); state.foreground(40000);
        assertTrue(state.locked()); assertFalse(state.shouldAutoPrompt());
    }
    @Test public void successfulUnlockAllowsAutomaticPromptInTheNextLockCycle() {
        AppLockState state = new AppLockState(true, 30); state.promptStarted(); state.authenticated();
        assertFalse(state.shouldAutoPrompt()); state.lock(); assertTrue(state.shouldAutoPrompt());
        state.promptStarted(); state.authenticated(); state.background(1000); state.foreground(31000);
        assertTrue(state.shouldAutoPrompt());
    }
}
