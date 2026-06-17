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
            const pb = landmarks[p];
            ctx.beginPath();
            ctx.moveTo((1 - pa.x) * width, pa.y * height);
            ctx.lineTo((1 - pb.x) * width, pb.y * height);
            ctx.stroke();
        }
    }

}