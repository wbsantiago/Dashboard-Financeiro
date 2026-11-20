package io.github.wbsantiago.financas10.preview;

import static org.junit.Assert.*;
import android.content.Intent;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class SnapshotStoreTest {
    private String snapshot(long revision, int value) throws Exception {
        return new JSONObject().put("version", 1).put("revision", revision).put("data", new JSONObject().put("fictionalValue", value)).toString();
    }
    @Test public void atomicCopySurvivesRestartAndIgnoresLateOlderWrites() throws Exception {
        File file = File.createTempFile("snapshot-instrumentation-", ".json", InstrumentationRegistry.getInstrumentation().getTargetContext().getCacheDir());
        file.delete();
        try {
            SnapshotStore store = new SnapshotStore(file);
            assertNull(store.read()); store.write(snapshot(2, 27)); store.write(snapshot(1, 99));
            JSONObject restored = new JSONObject(new SnapshotStore(file).read());
            assertEquals(2, restored.getLong("revision")); assertEquals(27, restored.getJSONObject("data").getInt("fictionalValue"));
        } finally { file.delete(); }
    }
    @Test public void invalidReplacementNeverDestroysTheLastValidCopy() throws Exception {
        File file = File.createTempFile("snapshot-instrumentation-", ".json", InstrumentationRegistry.getInstrumentation().getTargetContext().getCacheDir());
        file.delete();
        try {
            SnapshotStore store = new SnapshotStore(file); store.write(snapshot(1, 42));
            try { store.write("{broken"); fail("Must reject invalid replacement"); } catch (org.json.JSONException expected) { }
            assertEquals(42, new JSONObject(store.read()).getJSONObject("data").getInt("fictionalValue"));
        } finally { file.delete(); }
    }
    @Test public void filePickersUseScopedDocumentsWithoutBroadStorageAccess() {
        Intent save = DeviceFiles.createBackupIntent("financas10-backup-test.json"), open = DeviceFiles.openBackupIntent();
        assertEquals(Intent.ACTION_CREATE_DOCUMENT, save.getAction()); assertEquals("application/json", save.getType());
        assertEquals("financas10-backup-test.json", save.getStringExtra(Intent.EXTRA_TITLE));
        assertEquals(Intent.ACTION_OPEN_DOCUMENT, open.getAction()); assertTrue(open.hasCategory(Intent.CATEGORY_OPENABLE));
        assertEquals(3, open.getStringArrayExtra(Intent.EXTRA_MIME_TYPES).length);
    }
    @Test public void aValidMirrorCanRepairAnUnreadableSnapshot() throws Exception {
        File file = File.createTempFile("snapshot-instrumentation-", ".json", InstrumentationRegistry.getInstrumentation().getTargetContext().getCacheDir());
        try {
            try (FileOutputStream stream = new FileOutputStream(file)) { stream.write("{broken".getBytes(StandardCharsets.UTF_8)); }
            SnapshotStore store = new SnapshotStore(file); store.write(snapshot(2, 51));
            assertEquals(51, new JSONObject(store.read()).getJSONObject("data").getInt("fictionalValue"));
        } finally { file.delete(); }
    }
    @Test public void largeExportUsesAnOwnedFileAndShortTokenInsteadOfActivityState() throws Exception {
        File cache = InstrumentationRegistry.getInstrumentation().getTargetContext().getCacheDir();
        char[] characters = new char[2 * 1024 * 1024]; java.util.Arrays.fill(characters, 'x');
        File staged = DeviceFiles.stageExport(cache, new JSONObject().put("fictional", new String(characters)).toString());
        try {
            assertTrue(staged.length() > 2 * 1024 * 1024);
            assertTrue(staged.getName().length() < 100);
            assertEquals(staged.getCanonicalPath(), DeviceFiles.exportFile(cache, staged.getName()).getCanonicalPath());
            try { DeviceFiles.exportFile(cache, "../local-financial-snapshot-v1.json"); fail("Must reject paths outside export cache"); }
            catch (IllegalArgumentException expected) { }
        } finally { staged.delete(); }
    }
}
