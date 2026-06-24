import * as Tone from "tone";
import { Clip } from "../models/Clip";


export class SequencerEngine {
    constructor() {
        this._pattern = null;
        this._sequence = null;
        this._currentStep = 0;
        this._listeners = [];
    }

    onChange(callback) {
        this._listeners.push(callback);
    }

    _notify() {
        for (const cb of this._listeners) cb(this._currentStep);
    }

    setPattern(pattern) {
        this._pattern = pattern;
    }

    start() {
        if (!this._pattern) return;
        this.stop();

        Tone.Transport.bpm.value = this._pattern.bpm;

        const stepDuration = `${this._pattern.steps * 4}n`;

        this._sequence = new Tone.Sequence((time, step) => {
            this._currentStep = step;
            this._notify();

            for (const instrument of this._pattern.instruments) {
                if (!instrument.steps[step] || !instrument.buffer) continue;

                const source = Tone.context.createBufferSource();
                source.buffer = instrument.buffer;
                source.connect(Tone.context.destination);
                source.start(time);
            }
        }, [...Array(this._pattern.steps).keys()], "16n");

        this._sequence.start(0);
        Tone.Transport.start();
    }

    stop() {
        if (this._sequence) {
            this._sequence.stop();
            this._sequence.dispose();
            this._sequence = null;
        }

        this._currentStep = 0;
        this._notify();
    }

    async renderToClip() {
        if (!this._pattern) return null;

        console.log("pattern:", {
            bpm: this._pattern.bpm,
            steps: this._pattern.steps,
              stepDuration: this._pattern.getStepDuration(),
            totalDuration: this._pattern.getTotalDuration()
        })
        const duration = this._pattern.getTotalDuration();

        const buffer = await Tone.Offline(({transport}) => {
            transport.bpm.value = this._pattern.bpm;

            const stepDuration = this._pattern.getStepDuration();

            for (const instrument of this._pattern.instruments) {
                if (!instrument.buffer) continue;

                instrument.steps.forEach((active, stepIndex) => {
                    if (!active) return;
                    const time = stepIndex * stepDuration;

                    const player = new Tone.Player(instrument.buffer).toDestination();
                    player.start(time);
                });
            } 

            transport.start();
        }, duration + 0.5);

        return new Clip({
            audioData: buffer.get(),
            startTime: 0,
            duration,
            notes: []
        });
    }
}

export const sequencerEngine = new SequencerEngine();