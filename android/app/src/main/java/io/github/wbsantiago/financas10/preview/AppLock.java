package io.github.wbsantiago.financas10.preview;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AppLock")
public class AppLock extends Plugin {
    private interface Operation { void run(AppLockController controller); }
    private void onUi(PluginCall call, Operation action) {
        getActivity().runOnUiThread(() -> {
            AppLockController controller = ((MainActivity) getActivity()).getAppLockController();
            if (controller == null) { call.reject("Proteção ainda não disponível. Tente novamente.", "NOT_READY"); return; }
            action.run(controller);
        });
    }
    @PluginMethod public void getStatus(PluginCall call) { onUi(call, controller -> call.resolve(controller.status())); }
    @PluginMethod public void setEnabled(PluginCall call) {
        Boolean enabled = call.getBoolean("enabled");
        if (enabled == null) { call.reject("Configuração de proteção inválida."); return; }
        onUi(call, controller -> controller.configure(enabled, call));
    }
    @PluginMethod public void setTimeout(PluginCall call) {
        Integer seconds = call.getInt("seconds");
        if (seconds == null) { call.reject("Intervalo inválido."); return; }
        onUi(call, controller -> controller.setTimeout(seconds, call));
    }
    @PluginMethod public void openSecuritySettings(PluginCall call) {
        onUi(call, controller -> { controller.openSecuritySettings(); call.resolve(new JSObject()); });
    }
}
