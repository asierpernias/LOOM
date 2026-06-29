export class Clip {
    /** 
     * @param {Object} opts
     * @param {AudioBuffer |Blob|null} opts.audioData
     * @param {number} opts.startTime
     * @param {number} opts.duration
     * @param {Array} opts.notes
     */
   
    constructor({audioData = null,
            startTime = 0,
            duration = 0,
            notes = [],
            trimStart = 0,
            trimEnd = 0,
            fadeIn = 0,
            fadeOut = 0,
        } = {}) {
        this.id = crypto.randomUUID();
        this.audioData = audioData;
        this.startTime = startTime;
        this.duration = duration;
        this.notes = notes;
        this.trimStart = trimStart;
        this.trimEnd = trimEnd;
        this.fadeIn = fadeIn;
        this.fadeOut = fadeOut;
    }

    get endTime() {
        return this.startTime + this.duration;
    }

    addNote({note, start, duration, velocity, instrument}) {
        this.notes.push({note, start, duration, velocity, instrument});
    }       

    split(time) {
        if (time <= this.startTime || time >= this.endTime) {
            throw new Error("split: tiempo de corte")
        }
        const relativeCut = time - this.startTime;

        let leftAudio = null;
        let rightAudio = null;

        if (this.audioData) {
            const sampleRate = this.audioData.sampleRate;
            const cutFrame = Math.floor(relativeCut * sampleRate);
            const totalFrames = this.audioData.length;
            const channels = this.audioData.numberOfChannels;

            leftAudio = new AudioBuffer({
                numberOfChannels: channels,
                length: Math.max(1, cutFrame),
                sampleRate
            });
            rightAudio = new AudioBuffer({
                numberOfChannels: channels,
                length: Math.max(1, totalFrames - cutFrame),
                sampleRate
            });

            for (let c = 0; c < channels; c++) {
                const data = this.audioData.getChannelData(c);
                leftAudio.copyToChannel(data.slice(0, cutFrame), c);
                rightAudio.copyToChannel(data.slice(cutFrame), c);
            }
        }

        const left = new Clip({
            audioData: leftAudio,
            startTime: this.startTime, 
            duration: relativeCut,
            notes: this.notes
                .filter(n => n.start < relativeCut)
                .map(n => ({
                    ...n,
                    duration: Math.min(n.duration, relativeCut - n.start)
                }))
        });

        const right = new Clip({
            audioData: rightAudio,
            startTime: time, 
            duration: this.duration - relativeCut,
            notes: this.notes
                .filter(n => n.start + n.duration > relativeCut)
                .map(n => ({
                    ...n,
                    duration: n.start >= relativeCut
                        ? n.duration : n.duration - (relativeCut - n.start),
                    start: Math.max(0, n.start - relativeCut)
                }))
        });

        return [left, right];
    }

    trim({trimStart = 0, trimEnd = 0} = {}) {
        this.trimStart = (this.trimStart ?? 0) + trimStart;
        this.trimEnd = (this.trimEnd ?? 0) + trimEnd;
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