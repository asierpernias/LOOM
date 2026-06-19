import  { NOTES, FADE_FRAMES, INSTRUMENT_FRAMES, SMOOTH } from "./config.js"
import {audioEngine} from "./core/AudioEngine.js";
import {freqToNote, instrumentSamplers, releaseNote } from "./instrumental/Instruments.js";
import { HandRenderer } from "./gesture/HandRenderer.js";
import { GestureManager } from "./gesture/GestureManager.js";
import {Track} from "./models/Track.js";
import {recorderEngine} from "./core/RecorderEngine.js";
import * as Tone from "tone";
import { InstrumentFactory } from "./instrumental/Instruments.js";

const app = document.querySelector("#app");
const canvas = document.createElement("canvas");
const gestureManager = new GestureManager();
const handRenderer = new HandRenderer(canvas);

const tracks = {
    1: new Track({name: "Piano", instrument: "piano"}),
    2: new Track({name: "Synth",  instrument: "synth"}),
    3: new Track({name: "Bass", instrument: "bass"})
};
recorderEngine.arm(tracks[1]);

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
const welcome = document.createElement("div")
welcome.style.cssText = `
    position:fixed;
    inset:0;
    background: rgba(0,0,0,0.85);
    color:white;
    font-family:monospace;
    display:flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 20px;
    z-index:10;
    `;

welcome.innerHTML = `
     <h1 style="font-size: 2rem; margin:0;">THEREMIN</h1>
    <p style="text-align:center; line-height:1.6;">
        1 finger - Theremin (sine) <br>
        2 fingers - Synth (square) <br>
        3 fingers - Bass (sawtooth) <br> </br>
        Move your hand to control pitch and volume
    </p>
    <button style="
    background: white;
    color: black;
    border: none;
    padding: 12px 32px;
    font-family: monospace;
    font-size:1rem; 
    cursor: pointer;
    ">START</button>

    
    `;

app.appendChild(welcome)

app.style.cssText = `
    display: flex;
    height: 100vh;
`;

canvas.style.cssText = `
    display:block;
    flex: 1;
    border: none;
`;

const sidebar = document.createElement("div");
sidebar.style.cssText = `
    width: 280px;
    background: #111;
    color: white;
    font-family: monospace;
    padding: 20px;
    display:flex;
    flex-direction: column;
    gap:24px;
`;
sidebar.innerHTML = `
    <h2 style="margin:0; font-size:1rem; letter-spacing:2px;">OPTIONS</h2>
    <div id="instrumentDisplay" style = "color: white; border: 1px solid #afafaf; padding: 10px; font-size: 1.1rem;">---</div>
    <label style="color:white; display:flex; flex-direction:column; gap:8px;"> REVERB
        <input type="range" id="reverbSlider" min="0" max="1" step="0.01" value="0">
    </label>
    <label style="color:white; display:flex; flex-direction:column; gap:8px;"> DELAY TIME
        <input type="range" id="delaySlider" min="0" max="1" step="0.01" value="0">
    </label>
    <label style="color:white; display:flex; flex-direction:column; gap:8px;"> DELAY FEEDBACK
        <input type="range" id="feedbackSlider" min="0" max="0.9" step="0.01" value="0">
    </label>
    <label style="color:white; display:flex; flex-direction:column; gap:8px;"> OCTAVE
        <input type="range" id="octaveSlider" min="1" max="4" step="1" value="1">
    </label>
    <div style="display:flex, flex-direction:column, gap:8px;">
        <label style="color: white;">ARMAR PISTA</label>
        <select id="armSelect">
            <option value="1">Piano</option>
            <option value="2">Synth</option>
            <option value="3">Bass</option>
        </select>
        <button id="recButton" style="
        background: #ff4444;
        color:white;
        border: none;
        padding: 10px;
        font-family: monospace;
        cursor: pointer;
        "> REC </button>
    </div>
`;
app.appendChild(sidebar);
sidebar.style.display = "none"

welcome.querySelector("button").addEventListener("click", async () => {
    await import("tone").then(t => t.start());
    sidebar.style.display = "flex"
    welcome.remove();
    startApp();
});

document.getElementById("reverbSlider").addEventListener("input", e => 
    audioEngine.setReverb(parseFloat(e.target.value)));

document.getElementById("delaySlider").addEventListener("input", e => 
    audioEngine.setDelayTime(parseFloat(e.target.value)));

document.getElementById("feedbackSlider").addEventListener("input", e => 
    audioEngine.setDelayFeedback(parseFloat(e.target.value)));

document.getElementById("octaveSlider").addEventListener("input", e => {
    const multiplier = Math.pow(2, parseInt(e.target.value) - 1);
    window.octaveMultiplier = multiplier;
});

let isRecording = false;

document.getElementById("armSelect").addEventListener("change", e => {
    const fingerCount = parseInt(e.target.value);
    recorderEngine.arm(tracks[fingerCount]);
});

document.getElementById("recButton").addEventListener("click", async e =>{
    const btn = document.getElementById("recButton");
    if (!isRecording) {
        recorderEngine.start();
        isRecording = true;
        btn.textContent = "STOP";
        btn.style.background = "#444";
    } else {
        const clip = recorderEngine.stop();
        isRecording = false;
        btn.textContent = "REC";
        btn.style.background = "#ff4444";
        console.log("Clip grabado:", clip);

        await recorderEngine.renderClip(clip, InstrumentFactory);
        console.log("Clip renderizado:", clip.audioData);
        
        const player = new Tone.Player(clip.audioData).toDestination();
        player.start();
    }
});


app.appendChild(canvas);

gestureManager.mount(app);

async function startApp() {
    const {width, height} = await gestureManager.start();
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
        document.getElementById("instrumentDisplay").textContent = `${["Piano", "Synth", "Bass"][currentFingers - 1]} | ${noteName} | vol: ${vol.toFixed(2)}`;

        const sampler = instrumentSamplers[fingers] ?? instrumentSamplers[1];

        audioEngine.setVolume(vol);

        if (noteName !== lastNote || sampler !== lastSampler) {
            if (lastSampler && lastNote){
                releaseNote(lastSampler, lastNote);
                if (recorderEngine.isArmed(tracks[currentFingers])) {
                    recorderEngine.noteOff(lastNote);
                }
            }
            sampler.triggerAttack(noteName);
            lastNote = noteName;
            lastSampler = sampler;
            if (recorderEngine.isArmed(tracks[fingers])) {
                recorderEngine.noteOn(noteName, {
                    velocity: vol,
                    instrument: tracks[fingers].instrument
                });
            }
        }
        
        } else {
        if (fadeCounter > 0) {
            fadeCounter--;
        } else {
            if (lastSampler && lastNote) {
                releaseNote(lastSampler, lastNote);
                if (recorderEngine.isArmed(tracks[currentFingers])) {
                    recorderEngine.noteOff(lastNote);
                }
                lastNote = null;
                lastSampler = null;
            }
           audioEngine.silence();

            document.getElementById("instrumentDisplay").textContent = "---"
        }
    }


requestAnimationFrame(loop);
}