import * as Tone from "tone";

export const reverb = new Tone.Reverb({decay: 2, wet: 0}).toDestination();
export const delay = new Tone.FeedbackDelay({delayTime: 0, feedback: 0, wet:0}).toDestination();


export const piano = new Tone.Sampler({
    urls: {A4: "A4.mp3"},
    baseUrl: "https://tonejs.github.io/audio/salamander/",
}).connect(reverb).connect(delay);

export const synth = new Tone.PolySynth(Tone.Synth,{
    oscillator: {type: "square"},
    envelope: {attack: 0.1, decay: 0.2, sustain: 0.8, release: 1}
}).connect(reverb).connect(delay);

export const bass = new Tone.MembraneSynth({
    envelope: {attack: 0.01, decay: 0.4, sustain: 0.2, release:1}
}).connect(reverb).connect(delay)

export const instrumentSamplers = { 1: piano, 2: synth, 3: bass};

export function setReverb(val) {reverb.wet.value = val;}
export function setDelayTime(val) {delay.delayTime.value = val;}
export function setDelayFeedback(val) {delay.feedback.value = val;}

export function releaseNote(sampler, note) {
    if (sampler instanceof Tone.PolySynth || sampler instanceof Tone.Sampler) {
        sampler.triggerRelease(note);
    } else {
        sampler.triggerRelease();
    }
}

export function setVolume(vol) {
    Tone.getDestination().volume.rampTo(Tone.gainToDb(Math.max(0.0001, vol)), 0.05);
}

export function silenceVolume() {
    Tone.getDestination().volume.rampTo(-Infinity, 0.1);
}

export function freqToNote(freq) { return Tone.Frequency(freq).toNote();}