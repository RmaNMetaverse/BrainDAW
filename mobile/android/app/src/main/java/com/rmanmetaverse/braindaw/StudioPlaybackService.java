package com.rmanmetaverse.braindaw;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.ServiceInfo;
import android.media.AudioManager;
import android.media.MediaMetadata;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.os.SystemClock;
import androidx.core.content.ContextCompat;

public class StudioPlaybackService extends Service {
    static final String UPDATE = "com.rmanmetaverse.braindaw.UPDATE";
    private static final String PLAY = "com.rmanmetaverse.braindaw.PLAY";
    private static final String PAUSE = "com.rmanmetaverse.braindaw.PAUSE";
    private static final String CHANNEL = "studio_playback";
    private static final int NOTIFICATION = 42;

    private MediaSession session;
    private PowerManager.WakeLock wakeLock;
    private boolean foreground;

    private final BroadcastReceiver routes = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (AudioManager.ACTION_AUDIO_BECOMING_NOISY.equals(intent.getAction())) {
                StudioAudioPlugin.sendTransport("lost-route");
            }
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        PowerManager power = getSystemService(PowerManager.class);
        wakeLock = power.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "BrainDAW:StudioPlayback");
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel channel = new NotificationChannel(CHANNEL, "BrainDAW playback", NotificationManager.IMPORTANCE_LOW);
            channel.setDescription("Playback controls and sleep timer");
            getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }

        session = new MediaSession(this, "BrainDAW");
        session.setCallback(new MediaSession.Callback() {
            @Override public void onPlay() { StudioAudioPlugin.sendTransport("play"); }
            @Override public void onPause() { StudioAudioPlugin.sendTransport("pause"); }
            @Override public void onStop() { StudioAudioPlugin.sendTransport("stop"); }
        });
        session.setSessionActivity(openStudio());
        session.setActive(true);
        ContextCompat.registerReceiver(this, routes, new IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY),
            ContextCompat.RECEIVER_NOT_EXPORTED);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            stopSelf(startId);
            return START_NOT_STICKY;
        }
        String action = intent.getAction();
        if (PLAY.equals(action)) StudioAudioPlugin.sendTransport("play");
        else if (PAUSE.equals(action)) StudioAudioPlugin.sendTransport("pause");
        else if (UPDATE.equals(action)) {
            update(intent.getStringExtra("title"), intent.getBooleanExtra("playing", false), intent.getIntExtra("remaining", -1));
        }
        return START_STICKY;
    }

    private void update(String title, boolean playing, int remaining) {
        if (title == null) title = getString(R.string.app_name);
        session.setMetadata(new MediaMetadata.Builder()
            .putString(MediaMetadata.METADATA_KEY_TITLE, title)
            .putString(MediaMetadata.METADATA_KEY_ARTIST, "BrainDAW · NeuroScape Studio")
            .build());
        session.setPlaybackState(new PlaybackState.Builder()
            .setActions(PlaybackState.ACTION_PLAY | PlaybackState.ACTION_PAUSE | PlaybackState.ACTION_PLAY_PAUSE | PlaybackState.ACTION_STOP)
            .setState(playing ? PlaybackState.STATE_PLAYING : PlaybackState.STATE_PAUSED,
                PlaybackState.PLAYBACK_POSITION_UNKNOWN, playing ? 1f : 0f, SystemClock.elapsedRealtime())
            .build());

        Notification notification = notification(title, playing, remaining);
        if (playing) {
            if (Build.VERSION.SDK_INT >= 29) startForeground(NOTIFICATION, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            else startForeground(NOTIFICATION, notification);
            foreground = true;
            if (!wakeLock.isHeld()) wakeLock.acquire(8 * 60 * 60 * 1000L + 600_000L);
            // BrainDAW is a mixable sound bed. Leave audio focus with the user's media app.
        } else {
            if (foreground) stopForeground(STOP_FOREGROUND_DETACH);
            foreground = false;
            if (wakeLock.isHeld()) wakeLock.release();
            getSystemService(NotificationManager.class).notify(NOTIFICATION, notification);
        }
    }

    private Notification notification(String title, boolean playing, int remaining) {
        Notification.Builder builder = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(this, CHANNEL) : new Notification.Builder(this);
        String action = playing ? PAUSE : PLAY;
        PendingIntent mediaAction = PendingIntent.getService(this, playing ? 2 : 1, new Intent(this, StudioPlaybackService.class).setAction(action),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        builder.setContentTitle(title)
            .setContentText(remaining >= 0 ? "Sleep timer" : "BrainDAW")
            .setSmallIcon(R.drawable.ic_playback)
            .setOngoing(playing)
            .setOnlyAlertOnce(true)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setContentIntent(openStudio())
            .addAction(new Notification.Action.Builder(
                playing ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play,
                playing ? "Pause" : "Play", mediaAction).build())
            .setStyle(new Notification.MediaStyle().setMediaSession(session.getSessionToken()).setShowActionsInCompactView(0));
        if (playing && remaining > 0) {
            builder.setWhen(System.currentTimeMillis() + remaining * 1000L).setShowWhen(true)
                .setUsesChronometer(true).setChronometerCountDown(true);
        }
        return builder.build();
    }

    private PendingIntent openStudio() {
        Intent intent = new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        StudioAudioPlugin.sendTransport("stop");
        stopSelf();
    }

    @Override
    public void onDestroy() {
        unregisterReceiver(routes);
        if (wakeLock.isHeld()) wakeLock.release();
        session.release();
        getSystemService(NotificationManager.class).cancel(NOTIFICATION);
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }
}
