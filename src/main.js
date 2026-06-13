import {HandLandmarker, FilesetResolver} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.js";

const app = document.querySelector("#app");


const video = document.createElement("video");
video.autoplay = true;
video.playsInline = true;

video.style.display = "none"


app.appendChild(video);

const canvas = document.createElement("canvas");
app.appendChild(canvas);

const ctx = canvas.getContext("2d");

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
        ctx.fillStyle = "red";
        for (const point of window.currentLandmarks) {
            ctx.beginPath();
            ctx.arc((1 - point.x) * canvas.width, point.y * canvas.height, 8, 0, Math.PI * 2);
            ctx.fill();
        }
    }


requestAnimationFrame(loop);
}

startCamera();