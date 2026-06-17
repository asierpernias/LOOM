import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { FINGER_BASE, FINGER_TIPS } from "../config";

export class GestureManager {
    constructor() {
        this.video = document.createElement("video");
        this.video.autoplay = true;
        this.video.playsInline = true;
        this.video.style.display = "none";

        this.handLandmarker = null;
        this.landmarks = null;
        this._listeners = [];
        this._running = false;
    }

    mount(parent) {
        parent.appendChild(this.video);
    }

    onUpdate(callback) {
        this._listeners.push(callback);
    }

    getLandmarks() {
        return this.landmarks;
    }

    async start() {
        const stream = await navigator.mediaDevices.getUserMedia({video: true});
        this.video.srcObject = stream;
        await this.video.play();

        this._running = true;

        await this._initHandDetection();

        if (!this.video.videoWidth) {
            await new Promise(resolve => {
                this.video.addEventListener("loadedmetadata", resolve, {once: true} );
            });
        }

        return  {width: this.video.videoWidth, height: this.video.videoHeight};

    }

    async _initHandDetection() {
        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {modelAssetPath:"https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"},
            numHands: 1,
            runningMode: "VIDEO"
        });

        const detect = () => {
            if (!this._running) return;
            if (this.video.readyState >= 2) {
                const result = this.handLandmarker.detectForVideo(this.video, performance.now());
                this.landmarks = result.landmarks[0] ?? null;
                for (const cb of this._listeners) cb(this.landmarks);
            }
            requestAnimationFrame(detect);
        };
        detect();
    }

    static countFingers(landmarks) {
        let count = 0;
        for (let i = 0; i < FINGER_TIPS.length; i++) {
            if (landmarks[FINGER_TIPS[i]].y < landmarks[FINGER_BASE[i]].y) {
                count++;
            }
        }
        return count;
    }
    getVideoElement() {
        return this.video
    }
}
