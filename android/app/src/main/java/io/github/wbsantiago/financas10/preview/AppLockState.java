package io.github.wbsantiago.financas10.preview;

/** Local session policy. No credentials, financial records or wall-clock timestamps are stored. */
final class AppLockState {
    private boolean enabled;
    private boolean locked;
    private boolean paused;
    private boolean promptAttempted;
    private long backgroundAt = -1;
    private int timeoutSeconds;

    AppLockState(boolean enabled, int timeoutSeconds) {
        this.enabled = enabled;
        this.locked = enabled; // Every new process starts locked when protection is enabled.
        this.timeoutSeconds = validTimeout(timeoutSeconds) ? timeoutSeconds : 30;
    }
    static boolean validTimeout(int seconds) { return seconds == 0 || seconds == 30 || seconds == 60 || seconds == 300; }
    boolean enabled() { return enabled; }
    boolean locked() { return enabled && locked; }
    boolean shielded() { return enabled && (locked || paused); }
    int timeoutSeconds() { return timeoutSeconds; }
    boolean shouldAutoPrompt() { return locked() && !promptAttempted; }
    void promptStarted() { promptAttempted = true; }
    void pause() { paused = true; }
    void background(long elapsedMillis) { if (backgroundAt < 0) backgroundAt = elapsedMillis; }
    void foreground(long elapsedMillis) {
        if (enabled && backgroundAt >= 0 && (elapsedMillis < backgroundAt || elapsedMillis - backgroundAt >= timeoutSeconds * 1000L)) lock();
        paused = false;
        backgroundAt = -1;
    }
    void lock() { if (enabled && !locked) { locked = true; promptAttempted = false; } }
    void authenticated() { locked = false; backgroundAt = -1; promptAttempted = false; }
    void configureAfterAuthentication(boolean enabled, int seconds) {
        if (!validTimeout(seconds)) throw new IllegalArgumentException("Invalid lock interval");
        this.enabled = enabled;
        this.timeoutSeconds = seconds;
        authenticated();
    }
}
