import { Pattern } from "../models/Patterns.js";
import { sequencerEngine } from "../core/SequencerEngine.js";
import { trackManager } from "../core/TrackManager.js"; 
import * as Tone from "tone";

export class Sequencer {
    constructor(container) {
        this.container = container;
        this.pattern = new Pattern({name: "Pattern 1", steps: 16, bpm: 120});
        sequencerEngine.setPattern(this.pattern);
        sequencerEngine.onChange(step => this._highlightStep(step));
        this.render();
    }

    render() {
        this.container.innerHTML = "";
        this.container.style.cssText = `
        display: none;
        flex-direction: column;
        gap: 12px;
        padding: 16px;
        background: #0a0a0a;
        height: 100%;
        box-sizing: border-box;
        font-family: monospace;
        color: white
        `;

        this.container.appendChild(this._renderToolbar());
        this.container.appendChild(this._renderGrid());
        this.container.appendChild(this._renderAddInstrument());
    }

    _renderToolbar() {
        const bar = document.createElement("div");
        bar.style.cssText = "display:flex; align-items:center; gap: 12px; flex-wrap wrap;";

        const bpmLabel = document.createElement("label");
        bpmLabel.style.cssText = "display:flex; align-items; center; gap: 6px;";
        bpmLabel.textContent = "BPM";
        const bpmInput = document.createElement("input");
        bpmInput.type = "number";
        bpmInput.min = 40; bpmInput.max = 240; bpmInput.value = this.pattern.bpm;
        bpmInput.style.cssText = "width: 60px; background: #222; color: white; border: 1px splid #444; font-family: monospace; ";
        bpmInput.addEventListener("change", e => {
            this.pattern.bpm = parseInt(e.target.value);
        });
        bpmLabel.appendChild(bpmInput);
        bar.appendChild(bpmLabel);

        const stepsLabel = document.createElement("label");
        stepsLabel.style.cssText = "display: flex; align-items: center: gap6px;";
        stepsLabel.textContent = "STEPS";
        const stepsInput = document.createElement("input");
        stepsInput.type = "number";
        stepsInput.min = 8; stepsInput.max = 64; stepsInput.value = this.pattern.steps;
        stepsInput.style.cssText = "width: 60px; background: #222; color: white; border: 1px solid #444; padding: 4px; font-family: monospace;";
        stepsInput.addEventListener("change", e => {
            this.pattern.setSteps(parseInt(e.target.value));
            this.render();
        });
        stepsLabel.appendChild(stepsInput);
        bar.appendChild(stepsLabel);

        const playBtn = document.createElement("button");
        playBtn.textContent = "PLAY";
        playBtn.style.cssText = this._btnStyle("#333");
        let playing = false;
        playBtn.addEventListener("click", () => {
            if (!playing) {
                sequencerEngine.start();
                playBtn.textContent = "STOP";
                playBtn.style.background = "#444";
                playing = true;
            } else {
                sequencerEngine.stop();
                playBtn.textContent = "PLAY";
                playBtn.style.background = "#333";
                playing = false;
            }
        });
        sequencerEngine.onStop(() => {
            playing = false;
            playBtn.textContent = "PLAY";
            playBtn.style.background = "#333";
        })
        bar.appendChild(playBtn);
        
        const exportBtn = document.createElement("button");
        exportBtn.textContent = "-> TIMELINE";
        exportBtn.style.cssText = this._btnStyle("#1a5c2a");
        exportBtn.addEventListener("click", async () => {
            exportBtn.textContent = "Renderzando...";
            exportBtn.disabled = true;
            const clip = await sequencerEngine.renderToClip();
            if (clip) {
                const track = trackManager.createTrack({name: this.pattern.name, instrument: "drums"});
                track.addClip(clip);
                trackManager._notify();
            }
            exportBtn.textContent = "-> TIMELINE";
            exportBtn.disabled = false
        });
        bar.appendChild(exportBtn);
        return bar;
    }

    _renderGrid()  {
        const grid = document.createElement("div");
        grid.id = "sequencer-grid";
        grid.style.cssText = "display: flex; flex-direction: column; gap: 6px;";

        for (const instrument of this.pattern.instruments) {
            grid.appendChild(this._renderInstrumentRow(instrument));
        }

        this._gridEl = grid;
        return grid;
    }

    _renderInstrumentRow(instrument) {
        const row = document.createElement("div");
        row.dataset.instrumentId = instrument.id;
        row.style.cssText = "display: flex; align-items: center; gap: 6px;";

        const name = document.createElement("div");
        name.textContent = instrument.name;
        name.style.cssText = "width: 80px; font-size: 0.8rem; color: #aaa; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis;";
        row.appendChild(name)

        const stepsContainer = document.createElement("div");
        stepsContainer.style.cssText = "display: flex; gap: 3px; flex-wrap: nowrap;";

        instrument.steps.forEach((active, i) => {
            const btn = document.createElement("button");
            btn.dataset.step = i;
            btn.style.cssText = `
            width: 28px; height: 28px;
            background: ${active ? "#C97A4A" : "#222"};
            border: 1px solid ${i % 4 === 0 ? "#666" : "#333"};
            cursor: pointer;
            flex-shrink: 0;
            `;
            btn.addEventListener("click", () => {
                this.pattern.toggleStep(instrument.id, i);
                btn.style.background = instrument.steps[i] ? "#C97A4A" : "#222";
            });
            stepsContainer.appendChild(btn);

        });

        row.appendChild(stepsContainer);

        const delBtn = document.createElement("button");
        delBtn.textContent = "X";
        delBtn.style.cssText = this._btnStyle("#333") + "padding: 4px; font-size: 0.8rem";
        delBtn.addEventListener("click", () => {
            this.pattern.removeInstrument(instrument.id);
            this.render();
        });

        row.appendChild(delBtn);

        return row;
    }

    _renderAddInstrument() {
        const section = document.createElement("div");
        section.style.cssText = "display: flex; align-items: center; gap: 8px; flex-wrap: wrap;";

        const nameInput = document.createElement("input");
        nameInput.placeholder = "Nombre instrumento";
        nameInput.style.cssText = "background: #222; color: white; border: 1px solid #444; padding: 6px; font-family: monospace;";

        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "audio/*";
        fileInput.style.cssText = "color: white; font-family: monospace; font-size: 0.8rem;";

        const addBtn = document.createElement("button");
        addBtn.textContent = "+ Añadir";
        addBtn.style.cssText = this._btnStyle("#333");
        addBtn.addEventListener("click", async () => {
            const file = fileInput.files[0];
            if (!file) return;

            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await Tone.context.rawContext.decodeAudioData(arrayBuffer);

            this.pattern.addInstrument({
                name: nameInput.value || file.name.replace(/\.[^.]+$/, ""),
                buffer: audioBuffer
            });

            nameInput.value = "";
            fileInput.value = "";
            this.render();
        });

        section.appendChild(nameInput);
        section.appendChild(fileInput);
        section.appendChild(addBtn);
        return section;
    }

    _highlightStep(step) {
        if (!this._gridEl) return;
        this._gridEl.querySelectorAll("button[data-step]").forEach(btn => {
            const instrumentId = btn.closest("[data-instrument-id]")?.dataset.instrumentId;
            const instrument = this.pattern.instruments.find(i => i.id === instrumentId);
            if (!instrument) return;
            const i = parseInt(btn.dataset.step);
            const isActive = instrument.steps[i];
            const isCurrent = i === step;
            btn.style.background = isCurrent ? "#fff" : isActive ? "#C97A4A" : "#222";

        });
    }

     _btnStyle(bg) {
        return `background: ${bg}; color: white; border: none; padding: 6px 12px; font-family: monospace; cursor: pointer;`;        
    }
}