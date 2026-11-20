package io.github.wbsantiago.financas10.preview;

import android.app.Activity;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "DeviceFiles")
public class DeviceFiles extends Plugin {
    static final int MAX_BYTES = 10 * 1024 * 1024;
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private SnapshotStore localStore;
    @Override public void load() { localStore = new SnapshotStore(new File(getContext().getFilesDir(), "local-financial-snapshot-v1.json")); }

    private String payload(PluginCall call, String key) throws Exception {
        String value = call.getString(key);
        if (value == null || value.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES) throw new Exception("Invalid size");
        return value;
    }
    private String filename(PluginCall call) {
        String name = call.getString("fileName", "financas10-backup.json");
        return name.matches("[A-Za-z0-9_-]{1,100}\\.json") ? name : "financas10-backup.json";
    }
    @PluginMethod public void readSnapshot(PluginCall call) {
        io.execute(() -> {
            try { String json = localStore.read(); JSObject result = new JSObject(); result.put("snapshot", json); call.resolve(result); }
            catch (Exception error) { call.reject("Não foi possível ler a cópia interna do aplicativo."); }
        });
    }
    @PluginMethod public void writeSnapshot(PluginCall call) {
        io.execute(() -> {
            try { localStore.write(payload(call, "snapshot")); call.resolve(); }
            catch (Exception error) { call.reject("Não foi possível gravar a cópia interna do aplicativo."); }
        });
    }
    static Intent createBackupIntent(String fileName) {
        return new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
            .setType("application/json").putExtra(Intent.EXTRA_TITLE, fileName);
    }
    static Intent openBackupIntent() {
        return new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*")
            .putExtra(Intent.EXTRA_MIME_TYPES, new String[] { "application/json", "text/plain", "application/octet-stream" });
    }
    static File stageExport(File cache, String json) throws Exception {
        File folder = new File(cache, "exports");
        if (!folder.exists() && !folder.mkdirs()) throw new Exception("No folder");
        File[] stale = folder.listFiles();
        if (stale != null) for (File file : stale) if (file.getName().startsWith("financas10-export-") && System.currentTimeMillis() - file.lastModified() > 86400000L) file.delete();
        File staged = File.createTempFile("financas10-export-", ".json", folder);
        try (FileOutputStream output = new FileOutputStream(staged)) { output.write(json.getBytes(StandardCharsets.UTF_8)); }
        return staged;
    }
    static File exportFile(File cache, String token) {
        if (token == null || !token.matches("financas10-export-[A-Za-z0-9_-]+\\.json")) throw new IllegalArgumentException("Invalid export token");
        return new File(new File(cache, "exports"), token);
    }
    @PluginMethod public void saveBackup(PluginCall call) {
        io.execute(() -> {
            try {
                File staged = stageExport(getContext().getCacheDir(), payload(call, "json"));
                // Capacitor persists call options in Android's activity Bundle. Keep that state small.
                call.getData().remove("json"); call.getData().put("exportToken", staged.getName());
                getBridge().executeOnMainThread(() -> {
                    try { startActivityForResult(call, createBackupIntent(filename(call)), "savedBackup"); }
                    catch (Exception error) { staged.delete(); call.reject("Não foi possível abrir o local para salvar o backup."); }
                });
            } catch (Exception error) { call.reject("Não foi possível preparar o backup. Confira o espaço disponível e tente novamente."); }
        });
    }
    @ActivityCallback private void savedBackup(PluginCall call, ActivityResult activityResult) {
        if (call == null) return;
        Uri uri = activityResult.getData() == null ? null : activityResult.getData().getData();
        io.execute(() -> {
            File staged = null;
            try {
                staged = exportFile(getContext().getCacheDir(), call.getString("exportToken"));
                if (activityResult.getResultCode() != Activity.RESULT_OK || uri == null) { call.resolve(new JSObject().put("cancelled", true)); return; }
                try (InputStream input = new FileInputStream(staged); OutputStream stream = getContext().getContentResolver().openOutputStream(uri, "wt")) {
                    if (stream == null) throw new Exception("No stream");
                    byte[] chunk = new byte[8192]; int count;
                    while ((count = input.read(chunk)) != -1) stream.write(chunk, 0, count);
                    stream.flush();
                }
                call.resolve(new JSObject().put("cancelled", false));
            } catch (Exception error) { call.reject("Não foi possível salvar o arquivo. A cópia do aplicativo foi mantida."); }
            finally { if (staged != null) staged.delete(); }
        });
    }
    @PluginMethod public void openBackup(PluginCall call) {
        try { startActivityForResult(call, openBackupIntent(), "openedBackup"); }
        catch (Exception error) { call.reject("Não foi possível abrir o seletor de arquivos."); }
    }
    @ActivityCallback private void openedBackup(PluginCall call, ActivityResult activityResult) {
        if (call == null) return;
        Uri uri = activityResult.getData() == null ? null : activityResult.getData().getData();
        if (activityResult.getResultCode() != Activity.RESULT_OK || uri == null) { call.resolve(new JSObject().put("cancelled", true)); return; }
        io.execute(() -> {
            try (InputStream input = getContext().getContentResolver().openInputStream(uri); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
                if (input == null) throw new Exception("No stream");
                byte[] chunk = new byte[8192]; int length;
                while ((length = input.read(chunk)) != -1) { if (output.size() + length > MAX_BYTES) throw new Exception("Too large"); output.write(chunk, 0, length); }
                String name = "backup.json";
                try (Cursor cursor = getContext().getContentResolver().query(uri, new String[] { OpenableColumns.DISPLAY_NAME }, null, null, null)) {
                    if (cursor != null && cursor.moveToFirst()) name = cursor.getString(0);
                }
                call.resolve(new JSObject().put("cancelled", false).put("fileName", name).put("json", output.toString(StandardCharsets.UTF_8.name())));
            } catch (Exception error) { call.reject("Não foi possível ler o backup. Use um arquivo JSON de até 10 MB."); }
        });
    }
    @PluginMethod public void prepareShare(PluginCall call) {
        io.execute(() -> {
            try {
                File folder = new File(getContext().getCacheDir(), "backups");
                if (!folder.exists() && !folder.mkdirs()) throw new Exception("No folder");
                File[] old = folder.listFiles();
                if (old != null) for (File file : old) if (file.getName().startsWith("financas10-backup-") && System.currentTimeMillis() - file.lastModified() > 86400000L) file.delete();
                File file = new File(folder, filename(call));
                try (FileOutputStream output = new FileOutputStream(file)) { output.write(payload(call, "json").getBytes(StandardCharsets.UTF_8)); }
                call.resolve(new JSObject().put("url", Uri.fromFile(file).toString()));
            } catch (Exception error) { call.reject("Não foi possível preparar o arquivo para compartilhar."); }
        });
    }
    @Override protected void handleOnDestroy() { io.shutdown(); }
}
