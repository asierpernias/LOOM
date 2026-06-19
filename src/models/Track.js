import {Clip} from "./Clip.js";

export class Track {
    constructor({name = "Track", instrument = null} = {}) {
        this.id = crypto.randomUUID();
        this.name = name;
        this.instrument = instrument;
        this.clips = [];
        this.volume = 1;
        this.muted = false;
        this.solo = false;
    }

    addClip(clipOptions) {
        const clip = clipOptions instanceof Clip ? clipOptions: new Clip(clipOptions);
        this.clips.push(clip);
        return clip;
    }

    removeClip(clipId) {
        this.clips = this.clips.filter(c => c.id !== clipId);
    }

    getClip(clipId) {
        return this.clips.find(c => c.id === clipId) ?? null;
    }

    setLiveVolume(value) {
        this.volume = Math.max(0, Math.min(1, value));
    }

    toggleMute() {
        this.muted = !this.muted;
    }

    toggleSolo() {
        this.solo = !this.solo;
    }

    getClipsSorted() {
        return [...this.clips].sort((a, b) => a.startTime - b.startTime);
    }

    getDuration() {
        return this.clips.reduce((max, c) => Math.max(max, c.endTime), 0);
    }

}