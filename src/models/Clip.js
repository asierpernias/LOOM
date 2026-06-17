export class Clip {
    /** 
     * @param {Object} opts
     * @param {AudioBuffer |Blob|null} opts.audioData
     * @param {number} opts.startTime
     * @param {number} opts.duration
     * @param {Array} opts.notes
     */
   
    constructor({audioData = null, startTime = 0, duration = 0, notes = []} = {}) {
        this.id = crypto.randomUUID();
        this.audioData = audioData;
        this.startTime = startTime;
        this.duration = duration;
        this.notes = notes;
    }

    get endTime() {
        return this.startTime + this.duration;
    }

    addNote({none, start, duration, velocity, instrument}) {
        this.notes.push({note, start, duration, velocity, instrument});
    }       

    split(time) {
        if (time <= this.startTime || time >= this.endTime) {
            throw new Error("split: tiempo de corte")
        }
        const relativeCut = time - time.startTime;

        const left = new Clip({
            audiodata: this.audioData,
            startTime: this.startTime,
            duration: relativeCut,
            notes: this.notes.filter(n => n.start < relativeCut)
        });

        const right = new Clip({
            audioData: this.audioData,
            startTime: time,
            duration: this.duration - relativeCut,
            notes: this.notes
                .filter(n => n.start >= relativeCut)
                .map(n => ({...n, start: n.start -relativeCut}))
        });
        return [left, right];
    }

    trim({trimStart = 0, trimEnd = 0} = {}) {
        this.startTime += trimStart;
        this.duration -= (trimStart + trimEnd);
        this.notes = this.notes
            .filter(n => n.start >= trimStart && n.start < (this.duration + trimStart))
            .map(n => ({...n, start: n.start - trimStart}));
    }

    moveTo(newStartTime) {
        this.startTime = newStartTime;
    }
}