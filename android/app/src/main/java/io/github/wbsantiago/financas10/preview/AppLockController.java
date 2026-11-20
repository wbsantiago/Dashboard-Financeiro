package io.github.wbsantiago.financas10.preview;

import android.app.Activity;
import android.app.KeyguardManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.graphics.Color;
import android.os.Build;
import android.os.SystemClock;
import android.os.PowerManager;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.view.inputmethod.InputMethodManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;

/** Owns the gate outside the WebView, including startup, recovery and public local pages. */
final class AppLockController {
    private static final String PREFS = "financas10_app_lock_v1";
    private final MainActivity activity;
    private final SharedPreferences preferences;
    private final AppLockState state;
    private final View webView;
    private final ScrollView shield;
    private final TextView title;
    private final TextView description;
    private final Button unlock;
    private final Button configureDevice;
    private final Button leave;
    private final OnBackPressedCallback back;
    private final ActivityResultLauncher<Intent> credentialLauncher;
    private final BroadcastReceiver screenOff;
    private BiometricPrompt prompt;
    private Pending pending;
    private long requestId;
    private boolean destroyed;
    private boolean resumed;
    private boolean automaticPromptPosted;

    private static final class Pending {
        final long id;
        final String operation;
        final int seconds;
        final PluginCall call;
        Pending(long id, String operation, int seconds, PluginCall call) { this.id = id; this.operation = operation; this.seconds = seconds; this.call = call; }
    }

    AppLockController(MainActivity activity) {
        this.activity = activity;
        preferences = activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        state = new AppLockState(preferences.getBoolean("enabled", false), preferences.getInt("timeoutSeconds", 30));
        webView = activity.getBridge().getWebView();
        credentialLauncher = activity.registerForActivityResult(new ActivityResultContracts.StartActivityForResult(), result -> {
            Pending current = pending;
            if (current == null) return;
            if (result.getResultCode() == Activity.RESULT_OK) succeeded(current.id);
            else failed(current.id, "Confirmação cancelada. A proteção foi mantida como estava.", "CANCELLED");
        });
        shield = new ScrollView(activity);
        shield.setFillViewport(true);
        shield.setClickable(true);
        shield.setFocusableInTouchMode(true);
        shield.setContentDescription("Proteção do Mês de Boa");
        shield.setTag("financas10-native-lock-shield");
        LinearLayout content = new LinearLayout(activity);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setGravity(Gravity.CENTER);
        int padding = dp(28);
        content.setPadding(padding, padding, padding, padding);
        title = new TextView(activity);
        title.setText("Mês de Boa bloqueado");
        title.setTextSize(26);
        title.setGravity(Gravity.CENTER);
        title.setTypeface(null, android.graphics.Typeface.BOLD);
        description = new TextView(activity);
        description.setTextSize(16);
        description.setGravity(Gravity.CENTER);
        description.setPadding(0, dp(18), 0, dp(26));
        unlock = new Button(activity);
        unlock.setText("Tentar novamente");
        unlock.setAllCaps(false);
        unlock.setMinHeight(dp(52));
        unlock.setOnClickListener(view -> authenticate("unlock", state.timeoutSeconds(), null));
        configureDevice = new Button(activity);
        configureDevice.setText("Configurar bloqueio no Android");
        configureDevice.setAllCaps(false);
        configureDevice.setOnClickListener(view -> openSecuritySettings());
        leave = new Button(activity);
        leave.setText("Sair do aplicativo"); leave.setAllCaps(false);
        leave.setOnClickListener(view -> { cancelPending(); activity.moveTaskToBack(true); });
        content.addView(title); content.addView(description);
        content.addView(unlock, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        content.addView(configureDevice, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        content.addView(leave, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        shield.addView(content);
        activity.addContentView(shield, new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        ViewCompat.setOnApplyWindowInsetsListener(shield, (view, insets) -> {
            androidx.core.graphics.Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            return insets;
        });
        back = new OnBackPressedCallback(false) { @Override public void handleOnBackPressed() { cancelPending(); activity.moveTaskToBack(true); } };
        activity.getOnBackPressedDispatcher().addCallback(activity, back);
        screenOff = new BroadcastReceiver() { @Override public void onReceive(Context context, Intent intent) {
            if (Intent.ACTION_SCREEN_OFF.equals(intent.getAction())) { state.lock(); updateShield(); }
            else requestAutomaticPrompt();
        } };
        IntentFilter screenEvents = new IntentFilter(Intent.ACTION_SCREEN_OFF); screenEvents.addAction(Intent.ACTION_USER_PRESENT);
        ContextCompat.registerReceiver(activity, screenOff, screenEvents, ContextCompat.RECEIVER_NOT_EXPORTED);
        updateShield();
    }

    private int dp(int value) { return Math.round(value * activity.getResources().getDisplayMetrics().density); }
    private boolean deviceSecure() { return activity.getSystemService(KeyguardManager.class).isDeviceSecure(); }
    JSObject status() {
        JSObject result = new JSObject();
        result.put("supported", true); result.put("enabled", state.enabled()); result.put("locked", state.locked());
        result.put("deviceSecure", deviceSecure()); result.put("timeoutSeconds", state.timeoutSeconds());
        result.put("biometricAvailable", Build.VERSION.SDK_INT >= 30 && BiometricManager.from(activity).canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG) == BiometricManager.BIOMETRIC_SUCCESS);
        return result;
    }
    void pause() { resumed = false; state.pause(); updateShield(); }
    void stop() {
        state.background(SystemClock.elapsedRealtime());
        // Android owns cancellation. Its credential fallback can open a separate system Activity.
        // Cancelling here would dismiss a legitimate PIN/password confirmation.
    }
    void resume() { resumed = true; state.foreground(SystemClock.elapsedRealtime()); updateShield(); requestAutomaticPrompt(); }
    void windowFocusChanged(boolean focused) { if (focused) requestAutomaticPrompt(); }
    private void requestAutomaticPrompt() {
        if (automaticPromptPosted || !state.shouldAutoPrompt() || !deviceSecure()) return;
        automaticPromptPosted = true;
        activity.getWindow().getDecorView().post(() -> {
            automaticPromptPosted = false;
            boolean phoneReady = !activity.getSystemService(KeyguardManager.class).isKeyguardLocked()
                && activity.getSystemService(PowerManager.class).isInteractive() && activity.hasWindowFocus();
            if (!destroyed && resumed && phoneReady && pending == null && state.shouldAutoPrompt()) authenticate("unlock", state.timeoutSeconds(), null);
        });
    }
    void appearanceChanged() { updateShield(); }
    void destroy() {
        destroyed = true; cancelPending();
        activity.unregisterReceiver(screenOff);
    }
    void openSecuritySettings() {
        try { activity.startActivity(new Intent(Settings.ACTION_SECURITY_SETTINGS)); }
        catch (RuntimeException ignored) { description.setText("Abra as configurações do Android e configure um PIN, padrão ou senha para desbloquear."); }
    }
    void configure(boolean enabled, PluginCall call) {
        if (state.locked()) { call.reject("Desbloqueie o aplicativo antes de alterar a proteção.", "LOCKED"); return; }
        authenticate(enabled ? "enable" : "disable", state.timeoutSeconds(), call);
    }
    void setTimeout(int seconds, PluginCall call) {
        if (!AppLockState.validTimeout(seconds)) { call.reject("Intervalo de bloqueio inválido.", "INVALID_TIMEOUT"); return; }
        if (!state.enabled() || state.locked()) { call.reject("Ative e desbloqueie a proteção primeiro.", "LOCKED"); return; }
        authenticate("timeout", seconds, call);
    }
    private void authenticate(String operation, int seconds, PluginCall call) {
        if (destroyed || pending != null) { if (call != null) call.reject("Há uma confirmação em andamento.", "BUSY"); return; }
        if (!deviceSecure()) { if (call != null) call.reject("Configure um PIN, padrão ou senha nas configurações do Android.", "DEVICE_NOT_SECURE"); updateShield(); return; }
        if ("unlock".equals(operation) && !state.locked()) return;
        Pending current = new Pending(++requestId, operation, seconds, call); pending = current;
        state.promptStarted();
        updateShield();
        try {
            if (Build.VERSION.SDK_INT < 30) {
                Intent intent = activity.getSystemService(KeyguardManager.class).createConfirmDeviceCredentialIntent("Desbloquear Mês de Boa", "Confirme o bloqueio do seu celular");
                if (intent == null) { failed(current.id, "Configure o bloqueio do celular no Android.", "UNAVAILABLE"); return; }
                credentialLauncher.launch(intent);
                return;
            }
            prompt = new BiometricPrompt(activity, ContextCompat.getMainExecutor(activity), new BiometricPrompt.AuthenticationCallback() {
                @Override public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) { succeeded(current.id); }
                @Override public void onAuthenticationError(int errorCode, CharSequence message) {
                    String text = errorCode == BiometricPrompt.ERROR_LOCKOUT || errorCode == BiometricPrompt.ERROR_LOCKOUT_PERMANENT
                        ? "Biometria temporariamente indisponível. Tente novamente e use o PIN ou senha do celular."
                        : "Confirmação cancelada ou indisponível. Tente novamente para continuar.";
                    failed(current.id, text, "AUTHENTICATION_NOT_COMPLETED");
                }
            });
            BiometricPrompt.PromptInfo info = new BiometricPrompt.PromptInfo.Builder()
                .setTitle("Desbloquear Mês de Boa")
                .setSubtitle("Confirme sua identidade neste celular")
                .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.DEVICE_CREDENTIAL)
                .build();
            prompt.authenticate(info);
        } catch (RuntimeException ignored) { failed(current.id, "Não foi possível abrir a confirmação do Android. Tente novamente.", "UNAVAILABLE"); }
    }
    private void succeeded(long id) {
        Pending current = pending;
        if (destroyed || current == null || current.id != id) return;
        if (!"unlock".equals(current.operation)) {
            boolean enabled = !"disable".equals(current.operation);
            if (!preferences.edit().putBoolean("enabled", enabled).putInt("timeoutSeconds", current.seconds).commit()) {
                failed(id, "Não foi possível guardar a proteção. A configuração anterior foi mantida.", "SAVE_FAILED"); return;
            }
            state.configureAfterAuthentication(enabled, current.seconds);
        } else state.authenticated();
        pending = null; prompt = null; updateShield();
        if (current.call != null) current.call.resolve(status());
    }
    private void failed(long id, String message, String code) {
        Pending current = pending;
        if (current == null || current.id != id) return;
        pending = null; prompt = null;
        updateShield();
        if (state.locked()) description.setText(message);
        if (current.call != null) current.call.reject(message, code);
    }
    private void cancelPending() {
        Pending current = pending;
        if (current == null) return;
        BiometricPrompt active = prompt;
        failed(current.id, "Confirmação cancelada. A configuração anterior foi mantida.", "CANCELLED");
        if (active != null) active.cancelAuthentication();
    }
    private void updateShield() {
        boolean visible = state.shielded() || pending != null;
        boolean protectedWindow = state.enabled() || pending != null;
        if (protectedWindow) activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
        else activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
        shield.setVisibility(visible ? View.VISIBLE : View.GONE);
        webView.setImportantForAccessibility(visible ? View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS : View.IMPORTANT_FOR_ACCESSIBILITY_AUTO);
        webView.setEnabled(!visible); back.setEnabled(visible);
        boolean light = (activity.getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) != Configuration.UI_MODE_NIGHT_YES;
        shield.setBackgroundColor(Color.parseColor(light ? "#f1f5f9" : "#0d141c"));
        title.setTextColor(Color.parseColor(light ? "#18304d" : "#edf4ff"));
        description.setTextColor(Color.parseColor(light ? "#48617c" : "#a9bdd7"));
        title.setText(pending != null ? "Confirme no Android" : "Mês de Boa bloqueado");
        description.setText(pending != null ? "Use a biometria ou o bloqueio do seu celular." : !deviceSecure()
            ? "Configure um PIN, padrão ou senha no Android para voltar a desbloquear este aplicativo."
            : "Seu planejamento está protegido neste aparelho. Use a biometria ou o PIN, padrão ou senha do celular.");
        unlock.setEnabled(pending == null && deviceSecure());
        boolean showRecoveryActions = pending == null && state.locked() && (!state.shouldAutoPrompt() || !deviceSecure());
        unlock.setVisibility(showRecoveryActions ? View.VISIBLE : View.GONE);
        leave.setVisibility(showRecoveryActions ? View.VISIBLE : View.GONE);
        configureDevice.setVisibility(!deviceSecure() ? View.VISIBLE : View.GONE);
        if (visible) {
            shield.bringToFront();
            ((InputMethodManager) activity.getSystemService(Context.INPUT_METHOD_SERVICE)).hideSoftInputFromWindow(webView.getWindowToken(), 0);
        }
    }
}
