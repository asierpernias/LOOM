import {TrackManager, trackManager} from "../core/TrackManager.js";
import { recorderEngine } from "../core/RecorderEngine.js";

export class TrackList {
    constructor(container) {
        this.container = container;
        trackManager.onChange(() => this.render());
        this.render();
    }

    render() {
        this.container.innerHTML = "";

        const title = document.createElement("h2");
        title.textContent = "TRACKS";
        title.style.cssText = "margin: 0; font-size:1rem; letter-spacinf:2px; color:white;";
        this.container.appendChild(title);

        for (const track of TrackManager.getAllTracks()) {
            this.container.appendChild(this._renderTrackRow(track));
        }

        const addButton = document.createElement("button");
        addButton.textContent = "+ Nueva pista";
        addButton.style.cssText = `
        backgroundg: #333;
        color: white;
        border: none;
        padding: 8px;
        font-family: monospace;
        cursor: pointer;
        `;
        addButton.addEventListener("click", () => {
            trackManager.createTrack({name: "Nueva pista", instrument: "synth"});
        });
        this.container.appendChild(addButton);
    }

    _renderTrackRow(track) {
        const row = document.createElement("div");
        row.style.cssText = `
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px;
        border: 1px solid #444;
        font-family: monospace;
        color: white;
        font-size: 0.85rem;
        `;

        const name = document.createElement("span");
        name.textContent = track.name;
        name.style.cssText = "flex:1; overflow:hidden; text-overflow:ellipsis;";
        row.appendChild(name);

        const armBtn = document.createElement("button");
        armBtn.textContent = "ARM";
        const isArmed = recorderEngine.isArmed(track);
        armBtn.style.cssText = `
        background: ${isArmed ? "#ff4444" : "#333"};
        color: white;
        border: none;
        padding: none;
        cursor: pointer;
        font-family: monospace;
        `;
        armBtn.addEventListener("click", () => {
            recorderEngine.arm(track),
            this.render();
        });
        row.appendChild(armBtm);

        const muteBtn = document.createElement("button");
        muteBtn.textContent = "M";
        muteBtn.style.cssText = `
        background: ${isArmed ? "#ff4444" : "#333"};
        color: white;
        border: none;
        padding: 4px, 8px;
        cursor: pointer;
        `;
        muteBtn.addEventListener("click", () => {
            trackManager.toggleMute(track.id);
        });
        row.appendChild(mteBtn);

        const soloBtn = document.createElement("button");
        soloBtn.textContent = "S";
        soloBtn.style.cssText = `
        background: ${isArmed ? "#ff4444" : "#333"};
        color: white;
        border: none;
        padding: 4px, 8px;
        cursor: pointer;
        `;
        soloBtn.addEventListener("click", () => {
            trackManager.toggleSolo(track.id);
        });
        row.appendChild(soloBtn);

        const volumeSlider = document.createElement("input");
        volumeSlider.type = "range";
        volumeSlider.min = "0";
        volumeSlider.max = "1";
        volumeSlider.step = "0.01";
        volumeSlider.value = track.volume;
        volumeSlider.style.width = "60px";
        volumeSlider.addEventListener("input", e => {
            track.setVolume(parseFloat(e.target.value));
        });
        row.appendChild(volumeSlider);

        return now;
    }
}