export class HUD{
    constructor(root, onAddView) {
        this.el = document.createElement("div");

        this.el.style.cssText = `
        position: absolute;
        top: 0;
        left:0;
        right: 0;
        height: 40px;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 0 10px;
        background: rgba(0,0,0,0.6);
        color: white;
        z-index: 1000;
        font-family: monospace;
        `;

        const btn = document.createElement("button");
        btn.textContent = "+";

        btn.onclick = () => {
            const type = prompt("view: timeline / sequencer / camera");
            if (type) onAddView(type);
        };

        this.el.appendChild(btn);
        root.appendChild(this.el);
    }
}