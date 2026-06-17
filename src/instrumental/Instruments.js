import * as Tone from "tone"
import {audioEngine} from "../core/AudioEngine.js"
export const piano = new Tone.Sampler({
    urls: {A4: "A4.mp3"},
    baseUrl: "https://tonejs.github.io/audio/salamander/",
}).connect(audioEngine.reverb);

export const synth = new Tone.PolySynth(Tone.Synth,{
    oscillator: {type: "square"},
    envelope: {attack: 0.1, decay: 0.2, sustain: 0.8, release: 1}
}).connect(audioEngine.reverb);

export const bass = new Tone.MembraneSynth({
    envelope: {attack: 0.01, decay: 0.4, sustain: 0.2, release:1}
}).connect(audioEngine.reverb);

export const instrumentSamplers = { 1: piano, 2: synth, 3: bass};


export function releaseNote(sampler, note) {
    if (sampler instanceof Tone.PolySynth || sampler instanceof Tone.Sampler) {
        sampler.triggerRelease(note);
    } else {
        sampler.triggerRelease();
    }
}


export function freqToNote(freq) { return Tone.Frequency(freq).toNote();}