export class Pattern {
    constructor({name = "Pattern", steps = 16, bpm = 120} = {}) {
        this.id = crypto.randomUUID();
        this.name = name;
        this.steps = steps;
        this.bpm = bpm;
        this.instruments = [];
    }

    addInstrument({name = "Instrument", buffer = null} = {}) {
        const instrument = {
            id: crypto.randomUUID(),
            name,
            buffer,
            steps: new Array(this.steps).fill(false)
        };
        this.instruments.push(instrument);
        return instrument;
    }

    removeInstrument(instrumentID) {
        this.instruments = this.instruments.filter(i => i.id !== instrumentID);
    }

    toggleStep(instrumentId, stepIndex) {
        const instrument = this.instruments.find(i => i.id === instrumentId);
        if (!instrument) return;
        instrument.steps[stepIndex] = !instrument.steps[stepIndex];
    }

    setSteps(count) {
        this.steps = count;
        for (const instrument of this.instruments) {
            if (instrument.steps.length < count) {
                instrument.steps = [
                    ...instrument.steps,
                    ...new Array(count - instrument.steps.length).fill(false)
                ];
            } else {
                instrument.steps = instrument.steps.slice(0, count);
            }
        }
    }

    getStepDuration() {
        return (60 / this.bpm) / 4;
    }

    getTotalDuration() {
        return this.getStepDuration() * this.steps;
    }
}