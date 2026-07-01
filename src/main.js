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
import { CameraPanel } from "./ui/layout/CameraPanel.js";
import { createView } from "./ui/views/ViewFactory.js";
import { HUD } from "./ui/hud/HUD.js";
import { start } from "tone";

const app = document.querySelector("#app");
const workspace = new Workspace(app);
const windows = new WindowManager(workspace.el);
const gestureManager = new GestureManager();
const cameraPanel = new CameraPanel();
const cameraView = createView("camera", { gestureManager });
const timelineView = createView("timeline");

const hud = new HUD(app, (type) => {
    windows.createWindow(createView(type));
});

app.appendChild(workspace.el);
windows.createWindow({
    id: "timeline",
    title: timelineView.title,
    component: timelineView.component
});
windows.createWindow({
    id: "camera",
    title: cameraView.title,
    component: cameraView.component
});

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

let isRecording = false;

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