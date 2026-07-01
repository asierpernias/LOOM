export class Workspace {
    constructor(root) {
        this.root = root;

        this.el = document.createElement("div");
        this.el.style.cssText = `
        position: absolute;
        inset: 0;
        background: #1a1a1a;
        overflow: hidden;
        `;

        this._createGrid();

        this.root.appendChild(this.el);
    }

    _createGrid() {
        const grid = document.createElement("div");

        grid.style.cssText = `
        position: absolute;
        inset: 0;
        background-image:
            linear-gradient(#000 1px, transparent px),
            linear-gradient(90deg, #000 1px, transparent 1px);
        background-size: 40px 40px;
        opacity: 0.3;
        pointer-events: none;
        `;
        this.el.appendChild(grid);
    }
}