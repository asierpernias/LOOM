import { trackManager} from "../core/TrackManager.js";
import { recorderEngine } from "../core/RecorderEngine.js";
import { historyManager } from "../core/HistoryManager.js";
import { ToggleMuteCommand, ToggleSoloCommand, SetVolumeCommand, CreateTrackCommand } from "../core/commands/Commands.js";

export class TrackList {
    constructor(container, transport) {
        this.container = container;
        this.transport = transport;
        trackManager.onChange(() => this.render());
        this.render();
        this._pausePosition = 0;
    }

    render() {
        this.container.innerHTML = "";

        const title = document.createElement("h2");
        title.textContent = "TRACKS";
        title.style.cssText = "width: 100%; box-sizing: border-box; margin: 0; font-size:1rem; letter-spacing:2px; color:white;";
        this.container.appendChild(title);

        for (const track of trackManager.getAllTracks()) {
            this.container.appendChild(this._renderTrackRow(track));
        }

        const addButton = document.createElement("button");
        addButton.textContent = "+ Nueva pista";
        addButton.style.cssText = `
        background: #333;
        color: white;
        border: none;
        padding: 8px;
        font-family: monospace;
        cursor: pointer;
        `;
        addButton.addEventListener("click", () => {
            historyManager.execute(new CreateTrackCommand({name: "Nueva pista", instrument: "synth"}));
        });
        this.container.appendChild(addButton);
    }

    _renderTrackRow(track) {
        const row = document.createElement("div");
        row.style.cssText = `
        ;
        align-items: center;
        gap: 6px;
        padding: 6px;
        border: 1px solid #444;
        font-family: monospace;
        color: white;
        font-size: 0.85rem;
        width: 100%;
        box-sizing: border-box;
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
        padding: 4px 8px;
        cursor: pointer;
        font-family: monospace;
        `;
        armBtn.addEventListener("click", () => {
            recorderEngine.arm(track);
            this.render();
        });
        row.appendChild(armBtn);

        const muteBtn = document.createElement("button");
        muteBtn.textContent = "M";
        muteBtn.style.cssText = `
        background: ${track.muted ? "#ff4444" : "#333"};
        color: white;
        border: none;
        padding: 4px 8px;
        cursor: pointer;
        `;
        muteBtn.addEventListener("click", () => {
            historyManager.execute(new ToggleMuteCommand(track.id));
        });
        row.appendChild(muteBtn);

        const soloBtn = document.createElement("button");
        soloBtn.textContent = "S";
        soloBtn.style.cssText = `
        background: ${track.solo ? "#ff4444" : "#333"};
        color: white;
        border: none;
        padding: 4px 8px;
        cursor: pointer;
        `;
        soloBtn.addEventListener("click", () => {
            historyManager.execute(new ToggleSoloCommand(track.id));
        });
        row.appendChild(soloBtn);

        const playBtn = document.createElement("button");
        playBtn.textContent = "▶";
        playBtn.style.cssText = `
        background: #333;
        color: white; 
        border: none;
        padding: 4px 8px;
        cursor: pointer;
        `;
        playBtn.addEventListener("click", () => {
            this.transport.playTrack(track.id);
        });
        row.appendChild(playBtn);

        const volumeSlider = document.createElement("input");
        volumeSlider.type = "range";
        volumeSlider.min = "0";
        volumeSlider.max = "1";
        volumeSlider.step = "0.01";
        volumeSlider.value = track.volume;
        volumeSlider.style.width = "60px";

        let volumeBeforeDrag =  track.volume;
        volumeSlider.addEventListener("pointerdown", () => {
            volumeBeforeDrag = track.volume;
        });

        volumeSlider.addEventListener("input", e => {
            track.setVolume(parseFloat(e.target.value));
        });

        volumeSlider.addEventListener("change", () => {
            const finalValue = track.volume;
            if (finaleValue !== volumeBeforeDrag) {
                track.setVolume(volumeBeforeDrag);
                historyManager.execute(new SetVolumeCommand(track, volumeBeforeDrag, finalValue));
            }
        })
        row.appendChild(volumeSlider);

        return row;
    }
}