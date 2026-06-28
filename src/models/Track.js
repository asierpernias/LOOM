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
        const freeStart = this._findFreeSlot(clip.duration, clip.startTime, clip.id);
        clip.startTime = freeStart;
        this.clips.push(clip);
        return clip;
    }

    _findFreeSlot(duration, desiredStart, excludeClipId = null) {
        const others = this.clips
            .filter(c => c.id !== excludeClipId)
            .slice()
            .sort((a, b) => a.startTime - b.startTime);

        if (others.length === 0) {
            return Math.max(0, desiredStart);
        }

        const gaps = [];
        let cursor = 0;
        for (const other of others) {
            if (other.startTime > cursor) {
                gaps.push({
                    start:cursor,
                    end: other.startTime
                });
            }
            cursor = Math.max(cursor, other.endTime);
        }
        gaps.push({
            start: cursor,
            end: Infinity
        });

        const desired = Math.max(0, desiredStart);

        for (const gap of gaps) {
            const gapSize = gap.end - gap.start;
            if (desired >= gap.start && desired + duration <= gap.end) {
                return desired;
            }
        }

        let best = null;
        let bestDistance = Infinity;
        for (const gap of gaps) {
            const gapSize = gap.end -gap.start;
            if (gapSize < duration) continue;

            const candidateStart = Math.max(gap.start, Math.min(desired, gap.end - duration));
            const distance = Math.abs(candidateStart - desired);

            if (distance < bestDistance) {
                bestDistance = distance;
                best = candidateStart;
            }
        }

        return best;

    }

    removeClip(clipId) {
        this.clips = this.clips.filter(c => c.id !== clipId);
    }

    getClip(clipId) {
        return this.clips.find(c => c.id === clipId) ?? null;
    }

    setVolume(value) {
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