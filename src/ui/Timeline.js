import { trackManager } from "../core/TrackManager.js";
import { InstrumentFactory } from "../instrumental/Instruments.js";
import { recorderEngine } from "../core/RecorderEngine.js";

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
        this._cursorEl.style.left = `${80 + time * this.pixelsPerSecond}px`;
        this._cursorEl.style.display = this.transport.isPlaying ? "block" : "none";
    }

    render() {
        this.container.innerHTML = "";

        const lanesWrapper = document.createElement("div");
        lanesWrapper.style.cssText = `
        position: relative;
        `

        for (const track of trackManager.getAllTracks()) {
            lanesWrapper.appendChild(this._renderTrackLane(track));
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
        left: 80px;
        `;
        lanesWrapper.appendChild(this._cursorEl);
        this.container.appendChild(lanesWrapper);

    }

    _renderTrackLane(track) {

        const row = document.createElement("div");
        row.style.cssText = `
        display: flex;
        height: 65px;
        border-bottom: 1px solid #333;
        `;

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
        display: flex;
        align-items: center;
        `;
        row.appendChild(label)

        const clipsArea = document.createElement("div");
        clipsArea.style.cssText = `
        position: relative;
        flex: 1;
        height: 100%;
        `;

        for (const clip of track.getClipsSorted()) {
            clipsArea.appendChild(this._renderClipBlock(clip, track));
        }

        row.appendChild(clipsArea);
        return row;
    }

    _renderClipBlock(clip, track) {
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

        const leftHandle = document.createElement("div");
        leftHandle.style.cssText = `
        position: absolute; left: 0; top: 0; bottom: 0; width: 6px;
        cursor: ew-resize; background: rgba(255,255,255,0.15);
        `;
        block.appendChild(leftHandle);

        const rightHandle = document.createElement("div");
        rightHandle.style.cssText = ` 
        position: absolute; right: 0; top: 0; bottom: 0; width: 6px;
        cursor: ew-resize; background: rgba(255,255,255,0.15);
        `
        block.appendChild(rightHandle);

        this._attachDragMove(block, clip, track);
        this._attachDragTrim(leftHandle, clip, "start");
        this._attachDragTrim(rightHandle, clip, "end");

        this._attachContextMenu(block, clip, track);
        return block;
    }

    _attachDragMove(block, clip, track) {
        let dragging = false;
        let startMouseX = 0;
        let startClipTime = 0;

        block.addEventListener("mousedown", e => {
            if (e.target !== block && e.target.tagName !== "CANVAS") return;
            dragging = true;
            startMouseX = e.clientX;
            startClipTime = clip.startTime;
            block.style.cursor = "grabbing";
            e.stopPropagation();
        });

        window.addEventListener("mousemove", e => {
            if (!dragging) return;
            const deltaPx = e.clientX - startMouseX;
            const deltaTime = deltaPx / this.pixelsPerSecond;
            const proposedStart = Math.max(0, startClipTime + deltaTime);
            const finalStart = this._resolveCollision(track, clip, proposedStart);
            clip.moveTo(finalStart);
            block.style.left = `${finalStart * this.pixelsPerSecond}px`;
        });

        window.addEventListener("mouseup", () => {
            if (!dragging) return;
            dragging = false;
            block.style.cursor = "grab";
            this.render();
        });
    }

    _attachDragTrim(handle, clip, side) {
        let dragging = false;
        let startMouseX = 0;
        let startDuration = 0;
        let startTime = 0;

        handle.addEventListener("mousedown", e => {
            dragging = true;
            startMouseX = e.clientX;
            startDuration = clip.duration;
            startTime = clip.startTime;
            e.stopPropagation();
        });

        window.addEventListener("mousemove", e => {
            if (!dragging) return;
            const deltaPx = e.clientX - startMouseX;
            const deltaTime = deltaPx / this.pixelsPerSecond;

            if (side === "start") {
                const trimStart = Math.max(-startTime, Math.min(startDuration - 0.05, deltaTime));
                clip.startTime = startTime + trimStart;
                clip.duration = startDuration - trimStart;
            } else {
                clip.duration = Math.max(0.05, startDuration + deltaTime);
            }
            this.render();
        });

        window.addEventListener("mouseup", () => {
            dragging = false;
        });
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

    _attachContextMenu(block, clip, track) {
        block.addEventListener("contextmenu", e => {
            e.preventDefault();
            e.stopPropagation();

            document.querySelectorAll(".timeline-context-menu").forEach(m => m.remove());

            const menu = document.createElement("div");
            menu.className = "timeline-context-menu";
            menu.style.cssText = `
            position: fixed;
            left: ${e.clientX}px;
            top: ${e.clientY}px;
            background: #1a1a1a;
            border: 1px solid #444;
            font-family: monospace;
            font-size: 0.85rem;
            color: white;
            z-index: 1000;
            min-width: 160px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            `;

            const splitOption = this._menuItem("Cortar", async () => {
                const clipsArea = block.parentElement;
                const areaRect = clipsArea.getBoundingClientRect();
                const clickX = e.clientX - areaRect.left;
                const absoluteTime = clickX / this.pixelsPerSecond;
                
                try {
                    const [left, right] = clip.split(absoluteTime);
                    track.removeClip(clip.id);
                    track.addClip(left);
                    track.addClip(right);
                    await recorderEngine.renderClip(left, InstrumentFactory);
                    await recorderEngine.renderClip(right, InstrumentFactory);
                } catch (err) {
                    console.warn("Split:", err.message);
                }
                menu.remove();
            });
            menu.append(splitOption);

            const deleteOption = this._menuItem("Eliminar clip", () => {
                track.removeClip(clip.id);
                trackManager._notify();
                menu.remove();
            });
            menu.appendChild(deleteOption);

            document.body.appendChild(menu);

            const close = (ev) => {
                if (!menu.contains(ev.target)) {
                    menu.remove();
                    window.removeEventListener("mousedown", close);
                }
            };
            window.addEventListener("mousedown", close);
        });
    }

    _menuItem(label, onClick) {
        const item = document.createElement("div");
        item.textContent = label;
        item.style.cssText = ` 
        padding: 8px 14px;
        cursor: pointer;
        `;
        item.addEventListener("mouseenter", () => item.style.background = "#333");
        item.addEventListener("mouseleave", () => item.style.background = "transparent");
        item.addEventListener("mousedown", e => {
            e.stopPropagation();
            onClick();
        });

        return item;
    }

    _resolveCollision(track, clip, proposedStart) {
        const clips = track.getClipsSorted().filter(c => c.id !== clip.id);

        const duration = clip.duration;
        let start = Math.max(0, proposedStart);

        const sorted = clips.sort((a,b) => a.startTime - b.startTime);

        for (const other of sorted) {
            const overlap = 
                start < other.endTime && start + duration > other.startTime;
            
            if (!overlap) continue;

            const snapFoward = other.endTime;
            const snapBackward = other.startTime - duration;

            const distFoward = Math.abs(snapFoward - start);
            const distBackward = Math.abs(snapBackward - start);

            start = distFoward < distBackward ? snapFoward : snapBackward;

            return this._resolveCollision(track, clip, start);
        }
        return start;
    }
}