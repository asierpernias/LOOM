import { TrackManager, trackManager } from "../core/TrackManager.js";
import { InstrumentFactory } from "../instrumental/Instruments.js";
import { recorderEngine } from "../core/RecorderEngine.js";
import { exportClipsToMidi, exportAllTracksToMidi } from "../export/MidiExporter.js"
import { WavExporter } from "../export/WavExporter.js";
import { Mp3Exporter } from "../export/MP3Exporter.js";
import { saveProject, loadProject } from "../export/ProjectSerializer.js";
import { importAudioFile } from "../export/ImportAudio.js";
import { importMidiFile } from "../export/ImportMidi.js";
import { historyManager } from "../core/HistoryManager.js";
import { MoveClipCommand, TrimClipCommand, SplitClipCommand, DeleteClipCommand, FadeClipCommand, DuplicateClipCommand, MoveMultipleClipsCommand } from "../core/commands/Commands.js";
import { projectSettings } from "../core/ProjectSettings.js";

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
        projectSettings.onChange(() => this.render());
        window.addEventListener("keydown", e => {
            const isCtrl10rCmd = e.ctrlKey || e.metaKey;
            if (!isCtrl10rCmd) return;

            if (e.key === "z" || e.key === "Z") {
                e.preventDefault();
                historyManager.undo();
            } else if (e.key === "y" || e.key === "Y") {
                e.preventDefault();
                historyManager.redo();
            }});
        this.container.addEventListener("wheel", e => {
            if (!(e.ctrlKey  || e.metaKey)) return;
            e.preventDefault();
            const delta = e.deltaY > 0 ? -10 : 10;
            this.pixelsPerSecond = Math.max(5, Math.min(300, this.pixelsPerSecond + delta));
            this.render();
        });
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

    _renderGrid(lanesWrapper, totalWidth) {
        const snapSeconds =projectSettings.getSnapSeconds();
        if (snapSeconds === null) return;

        const gridContainer = document.createElement("div");
        gridContainer.style.cssText = `
        position: absolute;
        top: 0;
        bottom: 0;
        left: 95;
        width: ${totalWidth}px;
        pointer-events: none;
        z-index: 0;
        `;

        const totalSeconds = totalWidth / this.pixelsPerSecond;
        const lineCount = Math.ceil(totalSeconds / snapSeconds);

        for (let i = 0; i <= lineCount; i++) {
            const time = i * snapSeconds;
            const left = time * this.pixelsPerSecond;


            const line = document.createElement("div");
            const isBeatStart = i % 4 === 0;

            line.style.cssText = ` 
            position: absolute;
            top: 0;
            bottom: 0;
            left: ${left}px;
            width: 1px;
            background: ${isBeatStart ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.01)"};
            `;
            gridContainer.appendChild(line);
        }

        lanesWrapper.appendChild(gridContainer);
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

        const AllClips = trackManager.getAllTracks().flatMap(t => t.getClipsSorted());
        const maxEndTime = AllClips.reduce((max, c) => Math.max(max, c.endTime), 0);
        const totalWidth = Math.max(8, (maxEndTime + 10) * this.pixelsPerSecond);

        this._renderGrid(lanesWrapper, totalWidth);

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
        const fadeInPx = clip.fadeIn * this.pixelsPerSecond;
        const fadeOutPx = clip.fadeOut * this.pixelsPerSecond;


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
            canvas.style.cssText = "display: block; width: 100%; height: 100%;";
            this._drawWaveform(canvas, clip.audioData);
            block.appendChild(canvas);
        }

        const fadeOverlay = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        fadeOverlay.setAttribute("width", width);
        fadeOverlay.setAttribute("height", 52);
        fadeOverlay.style.cssText = `
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        `;

        const fadeInLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        fadeInLine.setAttribute("x1", 0);
        fadeInLine.setAttribute("y1", 52);

        fadeInLine.setAttribute("x2", fadeInPx);
        fadeInLine.setAttribute("y2", 0);

        fadeInLine.setAttribute("stroke", "#C97A4A");
        fadeInLine.setAttribute("stroke-width", "2");

        fadeOverlay.appendChild(fadeInLine);

        const fadeOutLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        fadeOutLine.setAttribute("x1", width - fadeOutPx);
        fadeOutLine.setAttribute("y1", 0);

        fadeOutLine.setAttribute("x2", width);
        fadeOutLine.setAttribute("y2", 52);

        fadeOutLine.setAttribute("stroke", "#C97A4A");
        fadeOutLine.setAttribute("stroke-width", "2");

        fadeOverlay.appendChild(fadeOutLine);
        block.appendChild(fadeOverlay);

        const fadeInHandle = document.createElement("div");
        fadeInHandle.style.cssText = `
        position: absolute;
        left: 0;
        top: 0;
        width: 8px;
        height: 8px;
        background: #C97A4A;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        pointer-events: auto;
        z-index: 10;
        `;
        fadeInHandle.style.left = `${fadeInPx}px`;
        fadeInHandle.style.top = "0px";

        block.appendChild(fadeInHandle);

        const fadeOutHandle = document.createElement("div");
        fadeOutHandle.style.cssText = `
        position: absolute;
        left: 0;
        top: 0;
        width: 8px;
        height: 8px;
        background: #C97A4A;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        pointer-events: auto;
        z-index: 10;
        `;
        fadeOutHandle.style.left = `${width - fadeOutPx}px`;
        fadeOutHandle.style.top = "0px";

        block.appendChild(fadeOutHandle);


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
        this._attachDragFade(fadeInHandle, clip, "in");
        this._attachDragFade(fadeOutHandle, clip, "out");

        this._attachContextMenu(block, clip, track);
        return block;
    }

    _attachDragMove(block, clip, track) {
        let dragging = false;
        let startMouseX = 0;
        const before = [];

        for (const t of trackManager.getAllTracks()) {
            for (const c of t.getClipsSorted()) {
                if (this.selectedClips.has(c.id)) {
                    before.push({
                        clip: c,
                        track: t,
                        startTime: c.startTime
                    });
                }
            }
        }
        if (before.length === 0) {
            before.push({
                clip,
                track,
                startTime: clip.startTime
            });
        }
        

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
            block.style.cursor = "grabbing";
            e.stopPropagation();
        });

        const movingIds = before.map(item => item.clip.id);

        window.addEventListener("mousemove", e => {
            if (!dragging) return;
            const deltaPx = e.clientX - startMouseX;
            const deltaTime = deltaPx / this.pixelsPerSecond;

            const leader = before[0];

            const proposedStart = Math.max(0, leader.startTime + deltaTime);
            const snappedStart = projectSettings.snapToGrid(proposedStart);

            const leaderFinal = leader.track._findFreeSlot(leader.clip.duration, snappedStart, leader.clip.id, movingIds);

            const delta = leaderFinal - leader.startTime;

            for (const item of before) {
                item.clip.moveTo(Math.max(0, item.startTime + delta));
            }
            this.render();
        });

        window.addEventListener("mouseup", () => {
            if (!dragging) return;
            dragging = false;
            block.style.cursor = "grab";

            const changes = [];

            for (const item of before) {
                if (item.clip.startTime !== item.startTime) {
                    changes.push({
                        clip: item.clip,
                        from: item.startTime,
                        to: item.clip.startTime
                    });
                }
            }

            for (const item of changes) {
                item.clip.moveTo(item.from);
            }

            if (changes.length > 0) {
                historyManager.execute(
                    new MoveMultipleClipsCommand(changes)
                );
            } else {
                this.render();
            }
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

            const before = {
                startTime,
                duration: startDuration,
                trimStart: originalTrimStart,
                trimEnd: originalTrimEnd,
            };

            clip.startTime = startTime;
            clip.duration = startDuration;
            clip.trimStart = originalTrimStart;
            clip.trimEnd = originalTrimEnd;
           
            clip.trim({ 
                trimStart: trimStartDelta,
                trimEnd: trimEndDelta,
            });

            const after = {
                startTime: clip.startTime,
                duration: clip.duration,
                trimStart: clip.trimStart,
                trimEnd: clip.trimEnd,
            };

            clip.startTime = before.startTime;
            clip.duration = before.duration;
            clip.trimStart = before.trimStart;
            clip.trimEnd = before.trimEnd;

            const changed = before.startTime !== after.startTime
                || before.duration !== after.duration
                || before.trimStart !== after.trimStart
                || before.trimEnd !== after.trimEnd;

            if (changed) {
                historyManager.execute(new TrimClipCommand(clip, before, after));
            } else {
                this.render();
            }
        });
    }

    
    _attachDragFade(handle, clip, side) {

        let startMouseX;
        let startFade;

        handle.addEventListener("mousedown", e => {
            e.stopPropagation();

            startMouseX = e.clientX;
            startFade = side === "in"
                ? clip.fadeIn
                : clip.fadeOut;
            const before = {fadeIn: clip.fadeIn, fadeOut: clip.fadeOut};
            const onMove = e => {
                const deltaSeconds = (e.clientX -startMouseX) /this.pixelsPerSecond;

                if (side === "in") {
                    clip.fadeIn = Math.max(0, Math.min(clip.duration, startFade + deltaSeconds));
                } else {
                    clip.fadeOut = Math.max(0, Math.min(clip.duration, startFade - deltaSeconds));
                }
                    
                trackManager._notify();
            };


        const onUp = () => {
            window.removeEventListener("mousemove", onMove);

            const after = {fadeIn: clip.fadeIn, fadeOut: clip.fadeOut};
            clip.fadeIn = before.fadeIn;
            clip.fadeOut = before.fadeOut;

            if (after.fadeIn !== before.fadeIn || after.fadeOut !== before.fadeOut) {
                historyManager.execute(new FadeClipCommand(clip, before, after));
            } else {
                this.render();
            }
        };

        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp, {once: true});
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
                    if (left.notes.length > 0) await recorderEngine.renderClip(left, InstrumentFactory);
                    if (right.notes.length > 0) await recorderEngine.renderClip(right, InstrumentFactory);
                    historyManager.execute(new SplitClipCommand(track, clip, left, right));
                } catch (err) {
                    console.warn("Split:", err.message);
                }
                menu.remove();
            });
            menu.append(splitOption);

            const deleteOption = this._menuItem("Eliminar clip", () => {
                historyManager.execute(new DeleteClipCommand(track, clip));
                menu.remove();
            });
            menu.appendChild(deleteOption);

            const duplicateOption = this._menuItem("Duplicar clip", () => {
                historyManager.execute(new DuplicateClipCommand(track, clip));
                menu.remove();
            });
            menu.appendChild(duplicateOption);

            document.body.appendChild(menu);

            const getSelectedClips = () => {
                const fromSelection = trackManager.getAllTracks()
                    .flatMap(t => t.getClipsSorted())
                    .filter(c => this.selectedClips.has(c.id));
                return fromSelection.length > 0 ? fromSelection : [clip];
            }
            
            const exportSelectionWavOption = this._menuItem("Exportar seleccion a WAV", async () => {
            await WavExporter.exportClipsToWav(getSelectedClips(), "seleccion.wav");
            menu.remove();
            });
            menu.appendChild(exportSelectionWavOption);

            const exportSelectionMp3Option = this._menuItem("Exportar seleccion a Mp3", async () => {
                    await Mp3Exporter.exportClipsToMp3(getSelectedClips(), "seleccion.mp3");
                    menu.remove();
                });
                menu.appendChild(exportSelectionMp3Option);
                
            
            const exportClipOption = this._menuItem("Exportar a MIDI", () => {
                exportClipsToMidi(getSelectedClips(), "selection.mid");
                menu.remove();
            });
            menu.appendChild(exportClipOption);
            

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

        const mp3Option = this._menuItem("Exportar a MP3", async () => {
            await Mp3Exporter.exportProjectToMp3();
            dropdown.style.display = "none"
        });
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

        const bpmLabel = document.createElement("label");
        bpmLabel.textContent = "BPM";
        bpmLabel.style.cssText = "color: white; font-family: monospace; font-size: 0.8rem; display: flex; align-items:center; gap: 4px;";

        const bpmInput = document.createElement("input");
        bpmInput.type = "number";
        bpmInput.min = "20";
        bpmInput.max = "400";
        bpmInput.value = projectSettings.bpm;
        bpmInput.style.cssText = "width: 50px; font-family: monospace;";
        bpmInput.addEventListener("change", () => {
            projectSettings.setBpm(parseInt(bpmInput.value, 10));
        });
        bpmLabel.appendChild(bpmInput);
        bar.appendChild(bpmLabel);

        const snapSelect = document.createElement("select");
        snapSelect.style.cssText = "font-family: monospace; background: #111; color: white; border: 1px solid #555;";
        for (const value of ["1/4", "1/8", "1/16", "free"]) {
            const opt = document.createElement("option");
            opt.value = value;
            opt.textContent = value === "free" ? "Libre" : value;
            if (value === projectSettings.snapResolution) opt.selected = true;
            snapSelect.appendChild(opt);
        }
        snapSelect.addEventListener("change", () => {
            projectSettings.setSnapResolution(snapSelect.value);
        });
        bar.appendChild(snapSelect);

        const zoomOutBtn = document.createElement("button");
        zoomOutBtn.textContent = "-";
        zoomOutBtn.style.cssText = exportAllBtn.style.cssText; 
        zoomOutBtn.addEventListener("click", () => {
            this.pixelsPerSecond = Math.max(5, this.pixelsPerSecond - 10);
            this.render();
        })
        bar.appendChild(zoomOutBtn);

        const zoomInBtn = document.createElement("button");
        zoomInBtn.textContent = "+";
        zoomInBtn.style.cssText = exportAllBtn.style.cssText;
        zoomInBtn.addEventListener("click", () => {
            this.pixelsPerSecond = Math.min(300, this.pixelsPerSecond + 10);
            this.render();
        });
        bar.appendChild(zoomInBtn);

        const undoBtn = document.createElement("button"); 
        undoBtn.textContent = "Undo";
        undoBtn.style.cssText = exportAllBtn.style.cssText;
        undoBtn.addEventListener("click", () => historyManager.undo());
        bar.appendChild(undoBtn);

        const redoBtn = document.createElement("button");
        redoBtn.textContent = "Redo";
        redoBtn.style.cssText = exportAllBtn.style.cssText;
        redoBtn.addEventListener("click", () => historyManager.redo());
        bar.appendChild(redoBtn);

        const saveBtn = document.createElement("button");
        saveBtn.textContent = "Guardar proyecto";
        saveBtn.style.cssText = exportAllBtn.style.cssText;
        saveBtn.addEventListener("click", () => {
            saveProject("project.zip");
        });
        bar.appendChild(saveBtn);

        const loadBtn = document.createElement("button");
        loadBtn.textContent = "Cargar proyecto";
        loadBtn.style.cssText = exportAllBtn.style.cssText;

        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = ".zip";
        fileInput.style.display = "none";
        fileInput.addEventListener("change", async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const shouldClear = confirm(
                "¿Quieres borrar todas las pistas actuales antes de cargar el proyecto?\n\n" +
                "Aceptar: se borran las pistas actuales. \n" + 
                "Cancelar: el proyecto se añade a las pistas existentes."
            );
            if (shouldClear) {
                for (const track of trackManager.getAllTracks()) {
                    trackManager.removeTrack(track.id);
                }
            }
            await loadProject(file);
            fileInput.value = "";
        });

        loadBtn.addEventListener("click", () => fileInput.click());

        const importBtn = document.createElement("button");
        importBtn.style.cssText = exportAllBtn.style.cssText;
        importBtn.textContent = "Importar pista";

        const imporrtInput = document.createElement("input");
        imporrtInput.type = "file";
        imporrtInput.accept = ".wav, .mp3, .mid, .midi";
        imporrtInput.style.display = "none";
        imporrtInput.addEventListener("change", async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const ext = file.name.split(".").pop().toLowerCase();
            try {
                if (ext === "mid" || ext === "midi") {
                    await importMidiFile(file);
                } else if (ext === "wav" || ext == "mp3") {
                    await importAudioFile(file);
                } else {
                    alert("Formato no soportado" + ext);
                }
            } catch (err) {
                console.error("Error importando archivo:", err);
                alert("No se pudo importar el archivo: " + err.message);
            }

            imporrtInput.value = "";
        });

        importBtn.addEventListener("click", () => imporrtInput.click());

        bar.appendChild(importBtn);
        bar.appendChild(imporrtInput);

        bar.appendChild(loadBtn);
        bar.appendChild(fileInput);
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
