import * as Tone from "tone"
import {audioEngine} from "../core/AudioEngine.js"
export const piano = new Tone.PolySynth(Tone.Synth, {
    oscillator: {type: "triangle"},
    envelope: {attack: 0.02, decay: 0.3, sustain: 0.9, release: 0.5}
}).connect(audioEngine.reverb);

export const synth = new Tone.PolySynth(Tone.Synth,{
    oscillator: {type: "square"},
    envelope: {attack: 0.1, decay: 0.2, sustain: 0.8, release: 1}
}).connect(audioEngine.reverb);

export const bass = new Tone.PolySynth(Tone.FMSynth, {
    harmonicity: 2,
    modulationIndex: 8,
    envelope: {attack: 0.02, decay: 0.3, sustain: 0.9, release: 0.5},
    modulationEnvelope: {attack: 0.02, decay: 0.3, sustain: 0.9, release: 0.5}
}).connect(audioEngine.reverb);

export const instrumentSamplers = { 1: piano, 2: synth, 3: bass};


export function releaseNote(sampler, note) {
    sampler.triggerRelease(note);
    
}


export function freqToNote(freq) { return Tone.Frequency(freq).toNote();}

