package ro.medicare.app;

import android.app.Activity;
import android.app.ActivityManager;
import android.app.admin.DevicePolicyManager;
import android.content.Context;
import android.media.AudioManager;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Funzioni native usate da MEDICARE: volume e blocco dello schermo (kiosk). */
@CapacitorPlugin(name = "Medicare")
public class MedicarePlugin extends Plugin {

    private int previousVolume = -1;

    private AudioManager audio() {
        return (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
    }

    @PluginMethod
    public void setMaxVolume(PluginCall call) {
        AudioManager am = audio();
        if (am != null) {
            if (previousVolume < 0) previousVolume = am.getStreamVolume(AudioManager.STREAM_MUSIC);
            am.setStreamVolume(AudioManager.STREAM_MUSIC, am.getStreamMaxVolume(AudioManager.STREAM_MUSIC), 0);
        }
        call.resolve();
    }

    @PluginMethod
    public void restoreVolume(PluginCall call) {
        AudioManager am = audio();
        if (am != null && previousVolume >= 0) {
            am.setStreamVolume(AudioManager.STREAM_MUSIC, previousVolume, 0);
        }
        previousVolume = -1;
        call.resolve();
    }

    @PluginMethod
    public void startKiosk(PluginCall call) {
        Activity a = getActivity();
        a.runOnUiThread(() -> {
            try {
                a.startLockTask();
                call.resolve();
            } catch (Exception e) {
                call.reject(e.getMessage());
            }
        });
    }

    @PluginMethod
    public void stopKiosk(PluginCall call) {
        Activity a = getActivity();
        a.runOnUiThread(() -> {
            try {
                a.stopLockTask();
            } catch (Exception ignored) { }
            call.resolve();
        });
    }

    @PluginMethod
    public void isKiosk(PluginCall call) {
        ActivityManager am = (ActivityManager) getContext().getSystemService(Context.ACTIVITY_SERVICE);
        boolean active = false;
        if (am != null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                active = am.getLockTaskModeState() != ActivityManager.LOCK_TASK_MODE_NONE;
            } else {
                active = am.isInLockTaskMode();
            }
        }
        DevicePolicyManager dpm = (DevicePolicyManager) getContext().getSystemService(Context.DEVICE_POLICY_SERVICE);
        boolean owner = dpm != null && dpm.isDeviceOwnerApp(getContext().getPackageName());
        JSObject r = new JSObject();
        r.put("active", active);
        r.put("deviceOwner", owner);
        call.resolve(r);
    }
}
