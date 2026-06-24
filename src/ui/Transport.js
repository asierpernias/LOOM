import * as Tone from "tone";
import { trackManager, TrackManager } from "../core/TrackManager.js";
import { audioEngine } from "../core/AudioEngine.js";

export class Transport {
    constructor(container) {
        this.container = container;
        this.isPlaying = false;
        this.isLooping = false;
        this._scheduledPlayers = [];
        this._listeners = [];
        this._pausePosition = 0;

        this.render();
    }

    onChange(callback) {
        this._listeners.push(callback);
    }

    _notify() {
        for (const cb of this._listeners) cb({isPlaying: this.isPlaying, isLooping: this.isLooping});
    }

    render() {
        this.container.innerHTML = "";

        const playBtn = document.createElement("button");
        playBtn.id = "transportPlayBtn";
        playBtn.textContent = "PLAY";
        playBtn.style.cssText = this._buttonStyle("#333");
        playBtn.addEventListener("click", () => {
            this.isPlaying ? this.pause() : this.playAll();
        });
        this.container.appendChild(playBtn);

        const stopBtn = document.createElement("button");
        stopBtn.textContent = "STOP";
        stopBtn.style.cssText = this._buttonStyle("#333");
        stopBtn.addEventListener("click", () => this.stop());
        this.container.appendChild(stopBtn);

        const loopBtn = document.createElement("button");
        loopBtn.id = "transportLoopBtn";
        loopBtn.textContent = "LOOP";
        loopBtn.style.cssText = this._buttonStyle(this.isLooping ? "#00aa55": "#333");
        loopBtn.addEventListener("click", () => {
            this.isLooping = !this.isLooping;
            Tone.Transport.loop = this.isLooping;
            loopBtn.style.background = this.isLooping ? "#00aa55" : "#333";
        });
        this.container.appendChild(loopBtn);
        
        this._playBtnRef = playBtn;
    }

    _buttonStyle(bg) {
        return `
        background: ${bg};
        color: white;
        border: none;
        padding: 8px 14px;
        font-family: monospace;
        cursor: pointer;
        `;
    }

    playAll() {

        if (this.isPlaying) return;
        this._cleanupPlayers();

        Tone.Transport.lookahead = 0;

        const tracks = trackManager.getAllTracks();
        const totalDuration = Math.max(0.1, ...tracks.map(t => t.getDuration()), 0.1);

        Tone.Transport.loopEnd = totalDuration;
        Tone.Transport.loop = this.isLooping;

        for (const track of tracks) {
            if (!trackManager.isTrackAudible(track.id)) continue;

            for (const clip of track.getClipsSorted()) {
                if (!clip.audioData) continue;

                const player = new Tone.Player(clip.audioData)
                    .connect(audioEngine.playbackChannel);
                player.volume.value = Tone.gainToDb(track.volume); 
                player.sync().start(clip.startTime);
                this._scheduledPlayers.push(player);
                console.log("Player creado, buffer cargado:", player.loaded, "duración buffer:", player.buffer?.duration);
            }
        }

        audioEngine.setPlaybackVolume(1);
        Tone.Transport.start("+0.01", this._pausePosition);
        this.isPlaying = true;
        this._playBtnRef.textContent = "PAUSE";
        this._notify();

        for (const track of tracks) {
    for (const clip of track.getClipsSorted()) {
        console.log("clip startTime:", clip.startTime, "duration:", clip.duration);
    }
}
    }

    stop() {
        Tone.Transport.stop();
        Tone.Transport.position = 0;
        this._pausePosition = 0;
        this._cleanupPlayers();
        this.isPlaying = false;
        if (this._playBtnRef) this._playBtnRef.textContent = "PLAY";
        this._notify();
    }

    pause() {
        this._pausePosition = Tone.Transport.seconds;
        Tone.Transport.pause();
        this._cleanupPlayers();
        this.isPlaying = false;

        if (this._playBtnRef) {
            this._playBtnRef.textContent = "PLAY";
        }

        this._notify();
    }

    _cleanupPlayers() {
        for (const player of this._scheduledPlayers) {
            player.unsync();
            player.dispose();
        }
        this._scheduledPlayers = [];
    }

    getCurrentTime() {
        return Tone.Transport.seconds;
    }

    playTrack(trackId) {
        this.stop();

        const track = trackManager.getTrack(trackId);
        if (!track) return;

        const totalDuration = Math.max(0.1, track.getDuration());
        Tone.Transport.loopEnd = totalDuration;
        Tone.Transport.loop = this.isLooping;

        for (const clip of track.getClipsSorted()) {
            if (!clip.audioData) continue;
            const player = new Tone.Player(clip.audioData)
                .connect(audioEngine.playbackChannel);
            player.sync().start(clip.startTime);
            this._scheduledPlayers.push(player);
        }

        audioEngine.setPlaybackVolume(1);
        Tone.Transport.start();
        this.isPlaying = true;
        this._playBtnRef.textContent = "PAUSE";
        this._notify();
    }
}