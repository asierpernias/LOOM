import {HandLandmarker, FilesetResolver} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.js";

import  {NOTES, FINGER_BASE, FINGER_TIPS, FADE_FRAMES, INSTRUMENT_FRAMES, SMOOTH } from "./config.js"
import  { freqToNote, instrumentSamplers, setReverb, setDelayTime, setDelayFeedback, setVolume, releaseNote, silenceVolume} from "./audio.js"

const app = document.querySelector("#app");
const canvas = document.createElement("canvas");


let handPresent = false;
let fadeCounter

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
`;
app.appendChild(sidebar);
sidebar.style.display = "none"

welcome.querySelector("button").addEventListener("click", async () => {
    await import("tone").then(t => t.start());
    sidebar.style.display = "flex"
    welcome.remove();
    startCamera();
});

const overlay = document.createElement("div")
overlay.style.cssText = `
position: fixed;
top: 20px;
left: 20px;
color:white;
font-family: monospace;
font-size: 18px;
pointer-events: none;
`
app.appendChild(overlay)


const video = document.createElement("video");
video.autoplay = true;
video.playsInline = true;

video.style.display = "none"


app.appendChild(video);

document.getElementById("reverbSlider").addEventListener("input", e => 
    setReverb(parseFloat(e.target.value)));

document.getElementById("delaySlider").addEventListener("input", e => 
    setDelayTime(parseFloat(e.target.value)));

document.getElementById("feedbackSlider").addEventListener("input", e => 
    setDelayFeedback(parseFloat(e.target.value)));

document.getElementById("octaveSlider").addEventListener("input", e => {
    const multiplier = Math.pow(2, parseInt(e.target.value) - 1);
    window.octaveMultiplier = multiplier;
});



app.appendChild(canvas);

const ctx = canvas.getContext("2d");

function countFingers(landmarks) {
    let count = 0;
    for (let i = 0; i < FINGER_TIPS.length; i++) {
        if (landmarks[FINGER_TIPS[i]].y < landmarks[FINGER_BASE[i]].y) {
            count ++;
        }
    }
    return count;
}
async function initHandDetection() {
    const vision = await FilesetResolver.forVisionTasks(
         "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );
    const handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"},
        numHands: 1, 
        runningMode: "VIDEO"
    });
    function detect() {
        if (video.readyState >= 2){
            const result = handLandmarker.detectForVideo(video, performance.now());
        window.currentLandmarks = result.landmarks[0] ?? null;
        }
        requestAnimationFrame(detect);
    }
    detect();
}

initHandDetection();

async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
        video: true
    });

    video.srcObject = stream;
    await video.play();

    if (!video.videoWidth){
        await new Promise(resolve => {
        video.addEventListener("loadedmetadata", resolve, {once: true});
    });
    }
    

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    loop();
}

function loop() {
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0);
    ctx.restore();

    if (window.currentLandmarks) {
        fadeCounter = FADE_FRAMES;

        ctx.fillStyle = ["#00ff88", "#ff6600", "#ff00ff"][currentFingers - 1] ?? "white";
        
        const fingers = countFingers(window.currentLandmarks);
        
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
        
        for (const point of window.currentLandmarks) {
            ctx.beginPath();
            ctx.arc((1 - point.x) * canvas.width, point.y * canvas.height, 8, 0, Math.PI * 2);
            ctx.fill();
        }

        const wrist = window.currentLandmarks[0];
        const rawX = 1 - wrist.x;
        const rawY = wrist.y;
        
        smoothX += (rawX - smoothX) * SMOOTH;
        smoothY += (rawY - smoothY) * SMOOTH;

        const freq = getNote(smoothX);
        const vol = 1 - smoothY;


        const noteName = freqToNote(freq);
        document.getElementById("instrumentDisplay").textContent = `${["Piano", "Synth", "Bass"][currentFingers - 1]} | ${noteName} | vol: ${vol.toFixed(2)}`;

        const sampler = instrumentSamplers[fingers] ?? instrumentSamplers[1];

        setVolume(vol);

        if (noteName !== lastNote || sampler !== lastSampler) {
            if (lastSampler && lastNote){
                releaseNote(lastSampler, lastNote);
        }
            sampler.triggerAttack(noteName);
            lastNote = noteName;
            lastSampler = sampler;
        }

        } else {
        if (fadeCounter > 0) {
            fadeCounter--;
        } else {
            if (lastSampler && lastNote) {
                releaseNote(lastSampler, lastNote);
                lastNote = null;
                lastSampler = null;
            }
           silenceVolume();

            document.getElementById("instrumentDisplay").textContent = "---"
        }
     }

   

requestAnimationFrame(loop);
}

