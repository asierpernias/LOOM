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
        this._starTimeLoop();
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
        
        const timeDisplay = document.createElement("div");
        timeDisplay.style.cssText = `
        color: white;
        font-faily: monospace;
        font-size: 0.9rem;
        padding: 0 8px;
        min-width: 70px;
        display: flex;
        align-items: center;
        `;
        timeDisplay.textContent = "00:00.0";
        this.container.appendChild(timeDisplay);
        this._timeDisplay = timeDisplay;

        this._playBtnRef = playBtn;
    }

    _starTimeLoop() {
        const update = () => {
            if (this._timeDisplay) {
                const t = Tone.Transport.seconds;
                const mins = Math.floor(t/60).toString().padStart(2, "0");
                const secs = Math.floor(t % 60).toString().padStart(2, "0");
                const dec = Math.floor((t % 1) * 10);
                this._timeDisplay.textContenr = `${mins}:${secs}.${dec}`;
            }
            requestAnimationFrame(update);
        };
        update();
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

    _createPlayer(track, clip) {
        
        const fadeIn = clip.fadeIn ?? 0;
        const fadeOut = clip.fadeOut ?? 0;

        let destination = audioEngine.playbackChannel;
        let gainNode = null;

        if (fadeIn > 0 || fadeOut > 0) {
            gainNode = new Tone.Gain(fadeIn > 0 ? 0 : 1).connect(audioEngine.playbackChannel);
            destination = gainNode;
            this._scheduledPlayers.push(gainNode);
        }

        const player = new Tone.Player(clip.audioData)
            .connect(destination);
        player.volume.value = Tone.gainToDb(track.volume); 
        player.sync().start(clip.startTime, clip.trimStart ?? 0);
        player.offset = clip.trimStart ?? 0;
        this._scheduledPlayers.push(player);

        if (gainNode) {
            if (fadeIn > 0) {
                Tone.Transport.schedule((time) => {
                    gainNode.gain.setValueAtTime(0, time);
                    gainNode.gain.linearRampToValueAtTime(1, time + fadeIn);
                }, clip.startTime); 
            }
            if (fadeOut > 0) {
                const fadeOutStart = clip.startTime + clip.duration - fadeOut;
                Tone.Transport.schedule((time) => {
                    gainNode.gain.setValueAtTime(1, time);
                    gainNode.gain.linearRampToValueAtTime(0, time + fadeOut);
                }, fadeOutStart);
            }
        }
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
                this._createPlayer(track, clip);
            }
        }

        audioEngine.setPlaybackVolume(1);
        Tone.Transport.start("+0.01", this._pausePosition);
        this.isPlaying = true;
        this._playBtnRef.textContent = "PAUSE";
        this._notify();
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
            if (typeof player.unsync === "function") {
                player.unsync()
            }
            player.dispose()
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
            this._createPlayer(track, clip);
        }

        audioEngine.setPlaybackVolume(1);
        Tone.Transport.start();
        this.isPlaying = true;
        this._playBtnRef.textContent = "PAUSE";
        this._notify();
    }
}