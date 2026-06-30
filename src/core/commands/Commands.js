import { trackManager } from "../TrackManager.js";

export class MoveClipCommand {
    constructor(clip, fromStartTime, toStartTime) {
        this.clip = clip;
        this.from = fromStartTime;
        this.to = toStartTime;
    }

    execute() { this.clip.moveTo(this.to); trackManager._notify(); }
    undo() { this.clip.moveTo(this.from); trackManager._notify(); }
}

export class TrimClipCommand {
    constructor(clip, before, after) {
        this.clip = clip;
        this.before = before;
        this.after = after;
    }

    _apply(state) {
        this.clip.startTime = state.startTime;
        this.clip.duration = state.duration;
        this.clip.trimStart = state.trimStart;
        this.clip.trimEnd = state.trimEnd;
        trackManager._notify();
    }
    execute() { this._apply(this.after);}
    undo() { this._apply(this.before ); }
}

export class SplitClipCommand {
    constructor(track, originalClip, leftClip, rightClip) {
        this.track = track;
        this.originalClip = originalClip;
        this.leftClip = leftClip;
        this.rightClip = rightClip;
    }

    execute() {
        this.track.removeClip(this.leftClip.id);
        this.track.removeClip(this.rightClip.id);
        this.track.addClip(this.leftClip);
        this.track.addClip(this.rightClip);
        trackManager._notify();
    }

    undo() {
        this.track.removeClip(this.leftClip.id);
        this.track.removeClip(this.rightClip.id);
        this.track.addClip(this.originalClip);
        trackManager._notify();
    }
}

export class DeleteClipCommand {
    constructor(track, clip) {
        this.track = track;
        this.clip = clip;
    }
    execute() { this.track.removeClip(this.clip.id); trackManager._notify(); }
    undo() { this.track.addClip(this.clip); trackManager._notify(); }
}

export class CreateTrackCommand {
    constructor(options) {
        this.options = options;
        this.track = null;
    }

    execute() {
        if (this.track) {
            trackManager.tracks.push(this.track);
            trackManager._notify();
        } else {
            this.track = trackManager.createTrack(this.options);
        }
    }

    undo() {
        trackManager.removeTrack(this.track.id);
    }
}

export class DeleteTrackCommand {
    constructor(track) {
        this.track = track;
        this._index = null;
    }

    execute() {
        this._index = trackManager.tracks.findIndex(t => t.id === this.track.id);
        trackManager.removeTrack(this.track.id);
    }

    undo() {
        const index = this._index ?? trackManager.tracks.length;
        trackManager.tracks.splice(index, 0, this.track);
        trackManager._notify();
    }
}

export class ToggleMuteCommand {
    constructor(trackId) { this.trackId = trackId; }
    execute() { trackManager.toggleMute(this.trackId); }
    undo() { trackManager.toggleMute(this.trackId); }
}

export class ToggleSoloCommand {
    constructor(trackId) { this.trackId = trackId; }
    execute() { trackManager.toggleSolo(this.trackId); }
    undo() { trackManager.toggleSolo(this.trackId); }
}

export class SetVolumeCommand {
    constructor(track, fromValue, toValue) {
        this.track = track;
        this.from = fromValue;
        this.to = toValue;
    }

    execute() { this.track.setVolume(this.to); trackManager._notify(); }
    undo() { this.track.setVolume(this.from); trackManager._notify(); }
}

export class FadeClipCommand {
    constructor(clip, before, after) {
        this.clip = clip;
        this.before = before;
        this.after = after;
    }
    _apply(state) {
        this.clip.fadeIn = state.fadeIn;
        this.clip.fadeOut = state.fadeOut;
        trackManager._notify()
    }
    execute() { this._apply(this.after); }
    undo() { this._apply(this.before)}

}

export class DuplicateClipCommand {
    constructor(track, originalClip) {
        this.track = track;
        this.clip = originalClip.clone();
        this.clip.startTime = originalClip.startTime;
    }

    execute() {
        this.track.addClip(this.clip);
        trackManager._notify();
    }

    undo() {
        this.track.removeClip(this.clip.id);
        trackManager._notify();
    }
}

export class MoveMultipleClipsCommand {
    constructor(items) {
        this.items = items;
    }

    execute() {
        for (const item of this.items) {
            item.clip.moveTo(item.to);
        }
        trackManager._notify();
    }

    undo() {
        for (const item of this.items) {
            item.clip.moveTo(item.from);
        }
        trackManager._notify();
    }
}