export class CameraPanel{
    constructor() {
        this.container = document.createElement("div");
        this.container.style.cssText = `
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content-center;
        overflow: hidden;
        background: #090909;
        `;
        this.canvas = document.createElement("canvas");

        this.canvas.style.cssText = `
        width:100%;
        height: 100%;
        object-fit: contain;
        `;
        this.container.appendChild(this.canvas);
    }

    getCanvas() {
        return this.canvas;
    }
}