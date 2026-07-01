import  { NOTES, FADE_FRAMES, INSTRUMENT_FRAMES, SMOOTH } from "./config.js"
import {audioEngine} from "./core/AudioEngine.js";
import {freqToNote, instrumentSamplers, releaseNote } from "./instrumental/Instruments.js";
import { HandRenderer } from "./gesture/HandRenderer.js";
import { GestureManager } from "./gesture/GestureManager.js";
import {trackManager} from "./core/TrackManager.js";
import {recorderEngine} from "./core/RecorderEngine.js";
import { InstrumentFactory } from "./instrumental/Instruments.js";
import "./styles/themes.css";
import { Workspace } from "./workspace/Workspace.js";
import { WindowManager } from "./ui/windows/WindowManager.js";
import { createView } from "./ui/views/ViewFactory.js";
import { HUD } from "./ui/hud/HUD.js";
import { TrackList } from "./ui/TrackList.js";
import { Transport } from "./ui/Transport.js";

const app = document.querySelector("#app");
const workspace = new Workspace(app);
const windows = new WindowManager(workspace.el);
const gestureManager = new GestureManager();
const cameraPanel = new CameraPanel();
const cameraView = createView("camera", { gestureManager });
const timelineView = createView("timeline");
const transportContainer = document.createElement("div");
const transport = new Transport(transportContainer);
const trackContainer = document.createElement("div");

if (trackManager.getAllTracks().length === 0) {
    trackManager.createTrack({name: "Pista 1", instrument: "synth"});
}

const trackList = new TrackList(trackContainer, transport);
timelineView.timeline.setTransport(transport);

app.appendChild(workspace.el);

const thereminControls = document.createElement("div");

thereminControls.style.cssText = `
    width: 100%
    height: 100%
    box-sizing: border-box;
    background: #111;
    color: white;
    font-family: monospace;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    overflow-y: auto;
`;

thereminControls.innerHTML = `
    <h2 style="margin:0; font-size:1rem; letter-spacing:2px;">THEREMIN</h2>

    <div id="instrumentDisplay" style="
        border: 1px solid #555;
        padding: 10px;
        font-size: 0.95rem;
        min-height: 20px;
    ">---</div>

    <label style="display:flex; flex-direction:column; gap:6px;">
        REVERB
        <input type="range" id="reverbSlider" min="0" max="1" step="0.01" value="0">
    </label>

    <label style="display:flex; flex-direction:column; gap:6px;">
        DELAY TIME
        <input type="range" id="delaySlider" min="0" max="1" step="0.01" value="0">
    </label>

    <label style="display:flex; flex-direction:column; gap:6px;">
        DELAY FEEDBACK
        <input type="range" id="feedbackSlider" min="0" max="0.9" step="0.01" value="0">
    </label>

    <label style="display:flex; flex-direction:column; gap:6px;">
        OCTAVE
        <input type="range" id="OctaveSlider" min="1" max="4" step="1" value="1">
    </label>

    <button id="recButton" style="
        background: #ff4444;
        color: white;
        border: none;
        font-family: monospace;
        cursor: pointer;
        padding: 10px;
    ">REC</button>

`;


thereminControls.querySelector("#reverbSlider").addEventListener("input", e => {
    audioEngine.setReverb(parseFloat(e.target.value));
});
thereminControls.querySelector("#delaySlider").addEventListener("input", e => {
    audioEngine.setDelayTime(parseFloat(e.target.value));
});
thereminControls.querySelector("#feedbackSlider").addEventListener("input", e => {
    audioEngine.setDelayFeedback(parseFloat(e.target.value));
});
thereminControls.querySelector("#OctaveSlider").addEventListener("input", e => {
    const multiplier = Math.pow(2, parseInt(e.target.value, 10) - 1);
    window.octaveMultiplier = multiplier;
});
let isRecording = false;

thereminControls.querySelector("#recButton").addEventListener("click", async e => {
    const Btn = e.currentTarget;

    if(!isRecording) {
        recorderEngine.start();
        isRecording = true;
        Btn.textContent = "STOP";
        Btn.style.background = "#444";
        return;
    }

    const clip = recorderEngine.stop();
    isRecording = false;
    Btn.textContent = "REC";
    Btn.style.background = "#ff4444";

    await recorderEngine.renderClip(clip, InstrumentFactory);
    timelineView.timeline.render();
});

function openOrFocusWindow(id) {
    if (windows.hasWindow(id)) {
        window.focusWindow(id);
        return;
    }

    switch(id) {
        case "timeline":
            windows.createWindow({id: "timeline", title: timelineView.title, component: timelineView.component});
            break;
        case "timeline":
            windows.createWindow({id: "camera", title: cameraView.title, component: cameraView.component});
            break;
        case "timeline":
            windows.createWindow({id: "transport", title: "Transport / FX", component: transportContainer});
            break;
        case "timeline":
            windows.createWindow({id: "tracks", title: "Tracks", component: trackContainer});
            break;
        case "timeline":
            windows.createWindow({id: "thereminControls", title: "Theremin Controls", component: thereminControls});
            break;
        default:
            console.warn(`[HUD] tipo de vista desconocido: ${id}`);
    }
}
["timeline", "camera", "transport", "tracks", "thereminControls"].forEach(openOrFocusWindow)
const hud = new HUD(app, (type) => openOrFocusWindow(type)); 

const handRenderer = cameraView.handRenderer

let fadeCounter = 0;

let currentFingers = 1;
let pendingFingers = null;
let instrumentCounter = 0;

let lastNote = null;
let lastSampler = null;

let smoothX = 0;
let smoothY = 0;

function getNote(x) {
    const index = Math.floor(x * NOTES.length);
    const clamped = Math.max(0, Math.min(NOTES.length - 1, index));
    return NOTES[clamped] * (window.octaveMultiplier ?? 1);
}
app.style.cssText = `
    width: 100%;
    height: 100vh;
    overflow: hidden;
`;


async function startApp() {
    const {width, height} = await gestureManager.start();
    const aspectRatio = width / height;

    handRenderer.resize(width, height);
    loop();
}

  function loop() {
        const video = gestureManager.getVideoElement();
        const landmarks = gestureManager.getLandmarks();

        handRenderer.drawVideoFrame(video);

        if (landmarks) {
            fadeCounter = FADE_FRAMES;

            const color = ["#00ff88", "#ff6600", "#ff00ff"][currentFingers - 1] ?? "white";
        
            const fingers = GestureManager.countFingers(landmarks);
            const instrumentName = ["piano", "synth", "bass"][fingers - 1] ?? "piano";

            if (fingers !== currentFingers) {
                if (fingers === pendingFingers) {
                    instrumentCounter++;
                    if (instrumentCounter >= INSTRUMENT_FRAMES) {
                        if (lastSampler && lastNote) {
                            releaseNote(lastSampler, lastNote);
                        } 
                        currentFingers = fingers;
                        instrumentCounter = 0;
                    }
                } else {
                    pendingFingers = fingers;
                    instrumentCounter = 0;
                }
            }
            else {
                pendingFingers = null;
                instrumentCounter = 0;
            }
        
            handRenderer.drawHand(landmarks, color);

            const wrist = landmarks[0];
            const rawX = 1 - wrist.x;
            const rawY = wrist.y;
        
            smoothX += (rawX - smoothX) * SMOOTH;
            smoothY += (rawY - smoothY) * SMOOTH;

            const freq = getNote(smoothX);
            const vol = 1 - smoothY;


            const noteName = freqToNote(freq);
            const sampler = instrumentSamplers[fingers] ?? instrumentSamplers[1];

            audioEngine.setLiveVolume(vol);

            if (noteName !== lastNote || sampler !== lastSampler) {
                
                const display = document.getElementById("instrumentDisplay");
                if (display) {
                    display.textContent = `${["Piano", "Synth", "Bass"][currentFingers - 1]} | ${noteName} | vol: ${vol.toFixed(2)}`;
                } else {
                    display.textContent = "---";
                }

                if (lastSampler && lastNote){
                    releaseNote(lastSampler, lastNote);
                    recorderEngine.noteOff(lastNote);
                }
                sampler.triggerAttack(noteName);
                lastNote = noteName;
                lastSampler = sampler;
                recorderEngine.noteOn(noteName, {
                    velocity: vol,
                    instrument: instrumentName
                });
            }
        
            } else {
            if (fadeCounter > 0) {
                fadeCounter--;
            } else {
                if (lastSampler && lastNote) {
                    releaseNote(lastSampler, lastNote);
                    recorderEngine.noteOff(lastNote);
                    lastNote = null;
                    lastSampler = null;
                }
                audioEngine.silenceLive();

            }   
        }



        requestAnimationFrame(loop);
        }
startApp();