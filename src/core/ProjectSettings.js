class ProjectSettings {
    constructor() {
        this.bpm = 120;
        this.snapResolution = "1/8";
        this._listeners = [];
    }

    onChange(cb) {
        this._listeners.push(cb);
    }

    _notify() {
        for (const cb of this._listeners) cb();
    }

    setBpm(value) {
        this.bpm = Math.max(20, Math.min(400, value));
        this._notify();
    }

    setSnapResolution(value) {
        this.snapResolution = value;
        this._notify();
    }

    getSnapSeconds() {
        if (this.snapResolution === "free") return null;
        const beatDuration = 60 / this.bpm;
        const fractions = { "1/4": 1, "1/8": 0.5, "1/16": 0.25 };
        return beatDuration * (fractions[this.snapResolution] ?? 1);
    }

    snapToGrid(time) {
        const snapSeconds = this.getSnapSeconds();
        if (snapSeconds === null) return time;
        return Math.round(time / snapSeconds) * snapSeconds;
    }
}

export const projectSettings = new ProjectSettings();