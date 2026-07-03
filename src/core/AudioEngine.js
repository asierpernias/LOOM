import * as Tone from "tone";

Tone.getContext().lookAhead = 0.01;
class AudioEngine {
    constructor() {
        this.liveChannel = new Tone.Channel({volume: 0}).toDestination();
        this.playbackChannel = new Tone.Channel({volume: 0}).toDestination();

        this.reverb = new Tone.Reverb({decay: 2, wet: 0});
        this.delay = new Tone.FeedbackDelay({delayTime: 0, feedback: 0, wet: 0});
        
        this.reverb.connect(this.delay);
        this.delay.connect(this.liveChannel);
    }

    setReverb(val) {
        this.reverb.wet.value = val;
    }

    setDelayTime(val) {
        this.delay.delayTime.value = val;
    }

    setDelayFeedback(val) {
        this.delay.feedback.value = val;
    }

    setLiveVolume(vol) {
        this.liveChannel.volume.rampTo(Tone.gainToDb(Math.max(0.000001, vol)), 0.05);
    }

    silenceLive() {
        this.liveChannel.volume.rampTo(-Infinity, 0.1);
    }

    setPlaybackVolume(vol) {
        this.playbackChannel.volume.rampTo(Tone.gainToDb(Math.max(0.0000001, vol)), 0.05);
    }
}

export const audioEngine = new AudioEngine();