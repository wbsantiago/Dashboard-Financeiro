package io.github.wbsantiago.financas10.preview;

import android.util.AtomicFile;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;

final class SnapshotStore {
    private final AtomicFile file;
    SnapshotStore(File path) { file = new AtomicFile(path); }
    synchronized String read() throws Exception {
        if (!file.getBaseFile().exists() && !new File(file.getBaseFile() + ".bak").exists()) return null;
        return new String(file.readFully(), StandardCharsets.UTF_8);
    }
    synchronized void write(String snapshot) throws Exception {
        JSONObject next = new JSONObject(snapshot);
        if (next.optInt("version") != 1 || next.optLong("revision", -1) < 0 || !(next.opt("data") instanceof JSONObject)) {
            throw new IOException("Invalid snapshot");
        }
        String previous = read();
        if (previous != null) {
            try { if (new JSONObject(previous).optLong("revision", -1) > next.getLong("revision")) return; }
            catch (org.json.JSONException ignored) { /* A validated WebView mirror can repair a corrupt native snapshot. */ }
        }
        FileOutputStream stream = null;
        try {
            stream = file.startWrite();
            stream.write(snapshot.getBytes(StandardCharsets.UTF_8));
            file.finishWrite(stream);
        } catch (Exception error) { if (stream != null) file.failWrite(stream); throw error; }
    }
}
