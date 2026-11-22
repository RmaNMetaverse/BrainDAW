package com.rmanmetaverse.braindaw;

import android.content.Intent;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.lang.ref.WeakReference;

@CapacitorPlugin(name = "StudioAudio")
public class StudioAudioPlugin extends Plugin {
    private static WeakReference<StudioAudioPlugin> active = new WeakReference<>(null);
    private boolean started;

    @Override
    public void load() {
        active = new WeakReference<>(this);
    }

    @PluginMethod
    public void prepare(PluginCall call) {
        call.resolve();
    }

    @PluginMethod
    public void setPlayback(PluginCall call) {
        boolean playing = Boolean.TRUE.equals(call.getBoolean("playing", false));
        if (!playing && !started) {
            call.resolve();
            return;
        }

        Intent intent = new Intent(getContext(), StudioPlaybackService.class)
            .setAction(StudioPlaybackService.UPDATE)
            .putExtra("playing", playing)
            .putExtra("title", call.getString("title", getContext().getString(R.string.app_name)))
            .putExtra("remaining", call.getInt("remaining", -1));
        try {
            if (playing) ContextCompat.startForegroundService(getContext(), intent);
            else getContext().startService(intent);
            started = true;
            call.resolve();
        } catch (IllegalStateException | SecurityException error) {
            call.reject("The Android media service could not update.", error);
        }
    }

    static void sendTransport(String action) {
        StudioAudioPlugin plugin = active.get();
        if (plugin == null) return;
        JSObject data = new JSObject();
        data.put("action", action);
        plugin.notifyListeners("transport", data, true);
    }

    @Override
    protected void handleOnDestroy() {
        if (active.get() == this) {
            active.clear();
            getContext().stopService(new Intent(getContext(), StudioPlaybackService.class));
        }
    }
}
