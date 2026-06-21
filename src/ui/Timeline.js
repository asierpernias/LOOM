import { trackManager } from "../core/TrackManager.js";

export class Timeline {
    constructor(container, {pixelsPerSecond = 40} = {}) {
        this.container = container;
        this.pixelsPerSecond = pixelsPerSecond;
        this.transport = null;

        this.container.style.cssText = `
        flex-direction: column;
        gap: 4px;
        padding: 8px;
        overflow-y: auto;
        overflow-x: auto;
        background: #0a0a0a;
        max-height: 100%;
        box-sizing: border-box;
        position:relative;
        display: none;
        `;

        trackManager.onChange(() => this.render());
        this.render();
    }

    setTransport(transport) {
        this.transport = transport;
        this._startCursorLoop();
    }

    _startCursorLoop() {
        const update = () => {
            this._updateCursor();
            requestAnimationFrame(update);
        };
        update();
    }

    _updateCursor() {
        if (!this.transport || !this._cursorEl) return;
        const time = this.transport.getCurrentTime();
        this._cursorEl.style.left = `${time * this.pixelsPerSecond + 80}px`;
        this._cursorEl.style.display = this.transport.isPlaying ? "block" : "none";
    }

    render() {
        this.container.innerHTML = "";

        for (const track of trackManager.getAllTracks()) {
            this.container.appendChild(this._renderTrackLane(track));
        }

        this._cursorEl = document.createElement("div");
        this._cursorEl.style.cssText = `
        position: absolute;
        top: 0;
        bottom: 0;
        width: 2px;
        background: #C97A4A;
        display: none;
        pointer-events: none;
        `;
        this.container.appendChild(this._cursorEl);


    }

    _renderTrackLane(track) {
        const lane = document.createElement("div");
        lane.style.cssText = `
        align-items: center;
        height: 60px;
        border-bottom: 1px solid #333;
        min-height: 65px;
        `;

        const label = document.createElement("div");
        label.textContent = track.name;
        label.style.cssText = `
        width: 80px;
        flex-shrink: 0;
        color: white;
        font-family: monospace;
        font-size: 0.8rem;
        padding: 0 8px;
        `;
        lane.appendChild(label);

        const clipsArea = document.createElement("div");
        clipsArea.style.cssText = `
        position: relative;
        flex: 1;
        height: 100%;
        `;

        for (const clip of track.getClipsSorted()) {
            clipsArea.appendChild(this._renderClipBlock(clip));
        }

        lane.appendChild(clipsArea);
        return lane;
    }

    _renderClipBlock(clip) {
        const width = Math.max(20, clip.duration * this.pixelsPerSecond);
        const left = clip.startTime * this.pixelsPerSecond;

        const block = document.createElement("div");
        block.style.cssText = `
        position: absolute;
        top: 4px;
        left: ${left}px;
        width: ${width}px;
        height: 52px;
        background: #222;
        border: 1px solid #555;
        border-radius: 3px;
        overflow: hidden;
        `;

        if (clip.audioData) {
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = 52;
            canvas.style.cssText = "none; width: 100%; height: 100%;";
            this._drawWaveform(canvas, clip.audioData);
            block.appendChild(canvas);
        }
        return block;
    }

    _drawWaveform(canvas, audioBuffer) {
        const ctx = canvas.getContext("2d");
        const data = audioBuffer.getChannelData(0);
        const width = canvas.width;
        const height = canvas.height;
        const step = Math.ceil(data.length / width);
        const amp = height / 2;

        ctx.fillStyle = "#222";
        ctx.fillRect (0, 0, width, height);

        ctx.strokeStyle = "#7A8B6F";
        ctx.lineWidth = 1;
        ctx.beginPath();

        for (let i = 0; i < width; i++) {
            let min = 1.0;
            let max = -1.0;
            for (let j = 0; j < step; j++)  {
                const idx = i * step + j;
                if (idx >= data.length) break;
                const value = data [idx];
                if (value < min) min = value;
                if (value > max) max = value;
            }
            ctx.moveTo(i, amp + min * amp);
            ctx.lineTo(i, amp + max * amp);
        }
        ctx.stroke();
    }
}