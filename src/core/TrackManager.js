import {Track} from "../models/Track.js";

export class TrackManager {
    constructor() {
        this.tracks = [];
        this._listeners = [];
    }

    onChange(callback) {
        this._listeners.push(callback);
    }

    _notify() {
        for (const cb of this._listeners) cb(this.tracks);
    }

    createTrack({name, instrument} = {}) {
        const track = new Track({name, instrument});
        this.tracks.push(track);
        this._notify();
        return track;
    }

    removeTrack(trackId) {
        this.tracks = this.tracks.filter(t => t.id !== trackId);
        this._notify();
    }

    getTrack(trackId) {
        return this.tracks.find(t => t.id === trackId) ?? null;
    }

    moveTrack(trackId, newIndex) {
        const fromIndex = this.tracks.findIndex(t => t.id === trackId);
        if (fromIndex === -1) return;
        const [track] = this.tracks.splice(fromIndex, 1);
        this.tracks.splice(newIndex, 0, track);
        this._notify();
    }

    toggleMute(trackId) {
        this.getTrack(trackId)?.toggleMute();
        this._notify();
    }

    toggleSolo(trackId) {
        this.getTrack(trackId)?.toggleSolo();
        this._notify();
    }

    isTrackAudible(trackId) {
        const track = this.getTrack(trackId);
        if (!track) return false;

        const anySolo = this.tracks.some(t => t.solo);
        if (anySolo) return track.solo;
        return !track.muted;
    }

    getAllTracks() {
        return [...this.tracks];
    }
}

export const trackManager = new TrackManager();