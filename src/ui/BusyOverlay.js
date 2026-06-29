export class BusyOverlay {
    constructor() {
        this.el = document.createElement("div");

        this.el.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.45);
        display: none;
        justify-content: center;
        align-items: center;
        z-index: 5000;
        `;

        const box = document.createElement("div");
        box.style.cssText = `
        
        background: #1b1b1b;
        color: white;
        padding: 18px 30px;
        border: 1px solid #444;
        border-radius: 6px;
        font-family: monospace;
        font-size: 1rem;
        `;
        box.textContent = "Procesando...";

        this.el.appendChild(box);
        document.body.appendChild(this.el);

        this.box = box;
    }

    show(text = "Procesando...") {
        this.box.textContent = text;
        this.el.style.display = "flex";
    }

    hide() {
        this.el.style.display = "none";
    }
}

export const busyOverlay = new BusyOverlay();