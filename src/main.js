import {HandLandmarker, FilesetResolver} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.js";

const app = document.querySelector("#app");

const audioCtx = new AudioContext();
const oscillator = audioCtx.createOscillator();
const gainNode = audioCtx.createGain();

const instruments = {
    1: {type: "sine", label:"Theremin"},
    2: {type: "square", label:"Synth"},
    3: {type: "sawtooth", label: "Bass"}
};

const FINGER_TIPS = [8, 12, 16, 20];
const FINGER_BASE = [6, 10, 14, 18];

let smoothX = 0;
let smoothY = 0;
const SMOOTH = 0.1;


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

oscillator.connect(gainNode);
gainNode.connect(audioCtx.destination);
gainNode.gain.value = 0;
oscillator.start();

document.addEventListener("click", () => {
    if (audioCtx.state === "suspended") {
        audioCtx.resume();
    }
}, {once: true})
const video = document.createElement("video");
video.autoplay = true;
video.playsInline = true;

video.style.display = "none"


app.appendChild(video);

const canvas = document.createElement("canvas");
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

    const colors = {
        "sine": "#00ff88",
        "square": "#ff6600",
        "sawtooth": "#ff00ff",
    };
    if (window.currentLandmarks) {
        ctx.fillStyle = colors[oscillator.type] ?? "white";
        
        const fingers = countFingers(window.currentLandmarks);
        const instrument = instruments[fingers] ?? instruments[1];

    
        oscillator.type = instrument.type;
        
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

        const freq = 100 + smoothX * 900;
        const vol = 1 - smoothY;

        overlay.textContent = `${instrument.label} | ${Math.round(freq)}hz | vol: ${vol.toFixed(2)} `;

        oscillator.frequency.setTargetAtTime(freq, audioCtx.currentTime, 0.05);
        gainNode.gain.setTargetAtTime(vol, audioCtx.currentTime, 0.05);
    } else {
        gainNode.gain.setTargetAtTime(0, audioCtx.currentTime, 0.05);
    }

   

requestAnimationFrame(loop);
}

startCamera();