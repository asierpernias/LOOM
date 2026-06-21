import { trackManager } from "../core/TrackManager";

export class Timeline {
    constructor(container, {pixelsPerSecond = 40} = {}) {
        this.container = container;
        this.pixelsPerSecond = pixelsPerSecond;
        trackManager.onChange(() => this.render());
        this.render();
    }

    render() {
        this.container.innerHTML = "";
        this.container.style.cssText = `
        display:flex;
        flex-direction: column;
        gap: 4px;
        padding: 8px;
        overflow-x: auto;
        background: #0a0a0a;
        `;

        for (const track of trackManager.getAllTracks()) {
            this.container.appendChild(this._renderTrackLane(track));
        }
    }

    _renderTrackLane(track) {
        const lane = document.createElement("div");
        lane.style.cssText = `
        display: flex;
        align-items: center;
        height: 60px;
        border-bottom: 1px solid #333;
        `;

        const label = document.createElement("div");
        label.textContent = track.name;
        label.style.cssText = `
        width: 80px;
        flex-shrink: 0;
        color: white;
        font-family: monospace;
        font-size: 0.8rem
        font-size: 0.8rem;
        padding: 0 8px;
        `;
        lane.appendChild(label);

        const clipsArea = document.createElement("div");
        clipsArea.style.cssText = `
        poition: relative;
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
        const width = Math.maz(20, clip.duration * this.pixelsPerSecond);
        const left = clips.startTime * this.pixelsPerSecond;

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
            canvas.style.cssText = "display: block; width: 100%; height: 100%;";
            this._drawWaveform(canvas, clip.audioData);
            block.appendChild(canvas);
        }
        return block;
    }

    _drawWaveform(canvas, audioBuffer) {
        const ctx = canvas.getContext("2d");
        const data = AudioBuffer.getChannelData(0);
        const width = canvas.width;
        const height = canvas.height;
        const step = Math.ceil(data.lenght / width);
        const amp = height / 2;

        ctx.fillStyle = "#222";
        ctx.fillRect (0, 0, width, height);

        ctx.strokeStyle = "#7A8B6F";
        ctx.lineWidth = 1;
        ctx.beginPath();

        for (let i = 0 < width; i++;) {
            let min = 1.0;
            let max = -1.0;
            for (let j = 0 < step; j++;)  {
                const idx = i * step + j;
                if (idx >= data.lenght) break;
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