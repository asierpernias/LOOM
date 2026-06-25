import { trackManager } from "../core/TrackManager.js";
import { InstrumentFactory } from "../instrumental/Instruments.js";
import { recorderEngine } from "../core/RecorderEngine.js";
import { exportClipsToMidi, exportAllTracksToMidi } from "../export/MidiExporter.js"
import { WavExporter } from "../export/WavExporter.js";

export class Timeline {
    constructor(container, {pixelsPerSecond = 40} = {}) {
        this.container = container;
        this.pixelsPerSecond = pixelsPerSecond;
        this.transport = null;
        this.selectedClips = new Set();

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
        if (!this.transport.isPlaying) return;
        const time = this.transport.getCurrentTime();
        this._cursorEl.style.left = `${90 + time * this.pixelsPerSecond}px`;
        this._cursorEl.style.display = this.transport.isPlaying ? "block" : "none";
    }

    render() {
        this.container.innerHTML = "";

        const toolbar = this.renderToolbar();
        this.container.appendChild(toolbar);

        const lanesWrapper = document.createElement("div");
        lanesWrapper.style.cssText = `
        position: relative;
        `

        lanesWrapper.addEventListener("mousedown", e => {
            if (e.target === lanesWrapper) {
                this.selectedClips.clear();
                this.render();
            }
        });

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
        block.dataset.clipId = clip.id;
        block.style.cssText = `
        position: absolute;
        top: 4px;
        left: ${left}px;
        width: ${width}px;
        height: 52px;
        background: #222;
        border: 1px solid ${this.selectedClips.has(clip.id) ? "#C97A4A" : "#555"};
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
            
            if (e.shiftKey) {
                if (this.selectedClips.has(clip.id)) {
                    this.selectedClips.delete(clip.id);
                } else {
                    this.selectedClips.add(clip.id);
                }
                this._refreshSelectionStyles();
            }
            
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
        let originalTrimStart = 0;
        let originalTrimEnd = 0;
        let block = null;

        handle.addEventListener("mousedown", e => {
            block = handle.parentElement;
            console.log("mosuedown startdura", clip.duration);
            dragging = true;
            startMouseX = e.clientX;
            startDuration = clip.duration;
            startTime = clip.startTime;
            originalTrimStart = clip.trimStart ?? 0;
            originalTrimEnd = clip.trimEnd ?? 0;
            e.stopPropagation();
        });

        window.addEventListener("mousemove", e => {
            if (!dragging) return;
            console.log("mousemove dragging:", dragging, "side:", side, "deltaTime", (e.clientX - startMouseX) / this.pixelsPerSecond);
            const deltaPx = e.clientX - startMouseX;
            const deltaTime = deltaPx / this.pixelsPerSecond;

            if (side === "start") {
                const trimStart = Math.max(-startTime, Math.min(startDuration - 0.05, deltaTime));
                clip.startTime = startTime + trimStart;
                clip.duration = startDuration - trimStart;
            } else {
                clip.duration = Math.max(0.05, startDuration + deltaTime);
            }
            
            if (block) {
                block.style.left = `${clip.startTime * this.pixelsPerSecond}px`;
                block.style.width = `${Math.max(20, clip.duration * this.pixelsPerSecond)}px`;
            }
            
        });

        window.addEventListener("mouseup", () => {
            if (!dragging) return;
            dragging = false;
            const trimEndDelta = Math.max(0, (startTime + startDuration) - (clip.startTime + clip.duration));
            const trimStartDelta = Math.max(0, clip.startTime - startTime);
            console.log("antes reset:", { clipStart: clip.startTime, clipDuration: clip.duration });
            clip.startTime = startTime;
            clip.duration = startDuration;
            clip.trimStart = originalTrimStart;
            clip.trimEnd = originalTrimEnd;
            console.log("trimStartDelta:", trimStartDelta, "trimEndDelta:", trimEndDelta, "startDuration:", startDuration, "clipDuration:", clip.duration);
            console.log("trim:", { trimStartDelta, trimEndDelta, clipTrimStart: clip.trimStart, clipTrimEnd: clip.trimEnd });
            clip.trim({ 
                trimStart: trimStartDelta,
                trimEnd: trimEndDelta,
            });
            console.log("post trim:", { trimStart: clip.trimStart, trimEnd: clip.trimEnd });

            this.render();
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
                    if (left.notes.length > 0) await recorderEngine.renderClip(left, InstrumentFactory);
                    if (right.notes.length > 0) await recorderEngine.renderClip(right, InstrumentFactory);
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

            const isMultiSelected = this.selectedClips.has(clip.id) && this.selectedClips > 1;

            if (isMultiSelected) {
                const exportSelectOption = this._menuItem("Exportar seleccion de clips", () => {
                    const clips = trackManager.getAllTracks()
                        .flatMap(t => t.getClipsSorted())
                        .filter(c => this.selectedClips.has(c.id));
                    exportClipsToMidi(clips, "selecion.mid");
                    menu.remove();
                });
                menu.appendChild(exportSelectOption);
            } else {
                const exportClipOption = this._menuItem("Exportar clip a MIDI", () => {
                    exportClipsToMidi([clip], `${track.name ?? "clip"}.mid`);
                    menu.remove();
                });
                menu.appendChild(exportClipOption);
            }

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
        color: white;
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

    renderToolbar() {
        const bar = document.createElement("div");
        bar.style.cssText = `
        display: flex;
        gap: 8px;
        padding: 4px 0 8px 0;
        position: relative;
        `;

        const exportAllBtn = document.createElement("button");
        exportAllBtn.textContent = "Exportar";
        exportAllBtn.style.cssText = `
        background: #111;
        color: white;
        border: 1px solid #555;
        border-radius: 3px;
        padding: 4px 10px;
        font-family: monospace;
        font-size: 0.8rem;
        cursor: pointer;
        `;

        const dropdown = document.createElement("div");
        dropdown.style.cssText = `
        display: none;
        position: fixed;
        background: #1a1a1a;
        border: 1px solid #444;
        border-radius: 3px;
        min-width: 160px;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        flex-direction: column;
        `;
        document.body.appendChild(dropdown);

        const wavOption = this._menuItem("Exportar a WAV", async() => {
            const blob = await WavExporter.exportProjectToWav();
            this._downloadBlob(blob, "projecto.wav");
            dropdown.style.display = "none";
        });
        dropdown.appendChild(wavOption);

        const mp3Option = this._menuItem("Exportar a MP3", () => {});
        dropdown.appendChild(mp3Option);

        const midiOption = this._menuItem("Exportar a MIDI", () => {
            exportAllTracksToMidi(trackManager.getAllTracks(), "project.mid");
            dropdown.style.display = "none";
        });
        dropdown.appendChild(midiOption);

        exportAllBtn.addEventListener("click", e => {
            e.stopPropagation();
            const isOpen = dropdown.style.display === "flex";
            dropdown.style.display = isOpen ? "none" : "flex";    
        });
        
        const closeOnOutsideClick = (e) => {
            if (!bar.contains(e.target)) {
                dropdown.style.display = "none";
            }
        };

        window.addEventListener("mousedown", closeOnOutsideClick);

        bar.appendChild(exportAllBtn);
        bar.appendChild(dropdown);
        return bar;
    }

    _downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    _refreshSelectionStyles() {
        const lanesWrapper = this.container.querySelector("div");
        if (!lanesWrapper) return;
        lanesWrapper.querySelectorAll("[data-clip-id]").forEach(el => {
            const isSelected = this.selectedClips.has(el.dataset.clipId);
            el.style.borderColor = isSelected ? "#C97A4A" : "#555";
        });
    }
}