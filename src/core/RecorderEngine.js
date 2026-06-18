import * as Tone from "tone";
import {Clip} from "../models/Clip.js";

export class RecorderEngine {
    constructor () {
        this.recording = false;
        this.armedTrack = null;
        this._startTime = 0;
        this._events = [];
        this._openNotes = new Map();
    }

    arm(track) {
        this.armedTrack = track;
    }

    disarm() {
        this.armedTrack = null;
    }

    isArmed(track) {
        return this.armedTrack?.id === track.id;
    }

    start() {
        if (!this.armedTrack) {
            throw new Error("No hay pista");
        }

        this.recording = true;
        this._startTime = Tone.now();
        this._events = [];
        this._openNotes.clear();
    }

    noteOn(note, {velocity = 1, instrument = null} = {}) {
        if (!this.recording) return;
        this._openNotes.set(note, {
            velocity,
            instrument
        });
    }

    noteOff(note) {
        if (!this.recording) return;
        const open = this._openNotes.get(note);
        if (!open) return;

        const end = Tone.now() - this._startTime;
        this._events.push({
            note,
            start: open.start,
            duration: Math.max(0.01, end - open.start),
            velocity: open.velocity,
            instrument: open.instrument
        });
        this._openNotes.delete(note);
    }

    stop() {
        if (!this.recording) return null;

        const now = Tone.now() - this._startTime;
        for (const[note, open] of this._openNotes) {
            this._events.push({
                note, 
                start: open.start,
                duration: Math.max(0.01, now - open.start),
                velocity: open.velocity,
                instrument: open.instrument
            });
        }
        this._openNotes.clear();
        this.recording = false;

        const duration = this._events.reduce((max, e) => Math.max(max, e.start + e.duration), 0);
        
        const clip = new Clip({
            audioData: null,
            startTime: 0,
            duration,
            notes: this._events
        });

        if(history.armedTrack) {
            this.armedTrack.addClip(clip);
        }

        return clip;

    }

    async renderClip(clip, instrumentFactory) {
        const buffer = await Tone.Offline(({transport}) => {
            const synthCache = new Map();

            for (const event of clip.notes)  {
                let synth = synthCache.get(event.instrument);
                if (!synth) {
                    synth = instrumentFactory(event.instrument).toDestination();
                    synthCache.set(event.instrument, synth);
                }
                synth.triggerAttackRelease(
                    event.note,
                    event.duration,
                    event.start,
                    event.velocity
                );
            }
        }, clip.duration);
        cli.audioData = buffer.get();
        return clip.audioData;
    }

}

export const recorderEngine = new RecorderEngine();