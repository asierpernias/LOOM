import { HAND_CONNECTIONS } from "../config";

export class HandRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
    }


    drawHand(landmarks, color) {
        const ctx = this.ctx;
        const {width, height} = this.canvas;

        ctx.fillStyle = color;
        for (const point of landmarks) {
            ctx.beginPath();
            ctx.arc((1 - point.x) * width, point.y * height, 8, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        for (const [a, b] of HAND_CONNECTIONS) {
            const pa = landmarks[a];
            const pb = landmarks[b];
            ctx.beginPath();
            ctx.moveTo((1 - pa.x) * width, pa.y * height);
            ctx.lineTo((1 - pb.x) * width, pb.y * height);
            ctx.stroke();
        }
    }
    
    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
    }

    drawVideoFrame(video) {
        const ctx = this.ctx;
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(video, -this.canvas.width, 0);
        ctx.restore();
    }

}