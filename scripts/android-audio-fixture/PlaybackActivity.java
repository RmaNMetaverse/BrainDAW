package com.rmanmetaverse.audiofixture;

import android.app.Activity;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.ToneGenerator;
import android.util.Log;

public final class PlaybackActivity extends Activity {
    private AudioFocusRequest focus;
    private ToneGenerator tone;

    @Override protected void onResume() {
        super.onResume();
        if (focus != null) return;
        AudioAttributes music = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_MEDIA)
            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
            .build();
        focus = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
            .setAudioAttributes(music)
            .build();
        AudioManager audio = getSystemService(AudioManager.class);
        if (audio.requestAudioFocus(focus) != AudioManager.AUDIOFOCUS_REQUEST_GRANTED) {
            throw new IllegalStateException("The fixture could not acquire media focus.");
        }
        tone = new ToneGenerator(AudioManager.STREAM_MUSIC, 16);
        if (!tone.startTone(ToneGenerator.TONE_DTMF_1, 30000)) {
            throw new IllegalStateException("The fixture could not start its media tone.");
        }
        Log.i("BrainDAWFixture", "Media tone started with audio focus");
    }

    @Override protected void onDestroy() {
        if (tone != null) tone.release();
        if (focus != null) getSystemService(AudioManager.class).abandonAudioFocusRequest(focus);
        super.onDestroy();
    }
}
