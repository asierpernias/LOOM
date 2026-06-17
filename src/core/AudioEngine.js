import * as Tone from "tone";

class AudioEngine {
    constructor() {
        this.reverb = new Tone.Reverb({decay: 2, wet: 0});
        this.delay = new Tone.FeedbackDelay({delayTime: 0, feedback: 0, wet: 0});

        // Cadena: instrumento -> reverb -> delay -> destino real
        this.reverb.connect(this.delay);
        this.delay.toDestination();
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

    setVolume(vol) {
        Tone.getDestination().volume.rampTo(Tone.gainToDb(Math.max(0.000001, vol)), 0.05);
    }

    silence() {
        Tone.getDestination().volume.rampTo(-Infinity, 0.1);
    }
}

export const audioEngine = new AudioEngine();