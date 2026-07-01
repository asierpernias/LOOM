const VIEW_OPTIONS = [
    {type: "timeline", label: "Timeline"},
    {type: "camera", label: "Camera"},
    {type: "transport", label: "Transport / FX"},
    {type: "tracks", label: "Tracks"},
    {type: "thereminControls", label: "Theremin Controls"},
];

export class HUD{
    constructor(root, onAddView) {
        this.onAddView = onAddView;
        this.menuOpen = false;

        this.el = document.createElement("div");

        this.el.style.cssText = `
        position: absolute;
        top: 0;
        left:0;
        right: 0;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 0 14px;
        background: rgba(0,0,0,0.6);
        color: white;
        z-index: 1000;
        font-family: monospace;
        border-bottom: 1px solid rgba(255,255,255,0.08);
        `;

        const title = document.createElement("div");
        title.textContent = "LOOM";
        title.style.cssText =  `
        font-size: 0.95rem;
        font-weight: bold;
        letter-spacing: 4px;
        color: #00ff88;
        user-select: none;
        `

        const addWrapper = document.createElement("div");
        addWrapper.style.cssText = `position: relative;`;

        const btn = document.createElement("button");
        btn.textContent = "+ Add view";
        btn.style.cssText = `
        font-size: 0.8rem;
        cursor: pointer;
        padding: 6px 12px;
        background: rgba(0,0,0,0.6);
        color: white;
        border: 1px solid #444;
        font-family: monospace;
        border-radius: 4px;
        transition: background 0.15s, border-color 0.15s
        `;

        btn.onmouseenter = () => btn.style.borderColor = "#00ff88";
        btn.onmouseleave = () => btn.style.borderColor = "#444";

        const menu = document.createElement("div");
        menu.style.cssText = `
        position: absolute;
        top: calc(100% + 6px);
        right: 0;
        background: #161616;
        border: 1px solid #333;
        border-radius: 4px;
        min-width: 160px;
        display: none;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 8px 20px rgba(0,0,0,0.15);
        `;

        VIEW_OPTIONS.forEach(({type, label}) => {
            const item = document.createElement("button");
            item.textContent = label;
            item.dataset.type = type;
            item.style.cssText = `
            background: none;
            color: white;
            border: none;
            text-align: left;
            font-family: monospace;
            font-size: 0.85rem;
            padding: 9px 12px;
            cursor: pointer;
            `;
            item.onmouseenter = () => item.style.background = "#00ff88";
            item.onmouseleave = () => item.style.background = "none";
            item.onclick = () => {
                this.onAddView(type);
                this._closeMenu();
            };
            menu.appendChild(item);
        });

        btn.onclick = (e) => {
            e.stopPropagation();
            this._toggleMenu();
        };

        document.addEventListener("click", (e) => {
            if (this.menuOpen && !addWrapper.contains(e.target)) {
                this._closeMenu();
            }
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && this.menuOpen) {
                this._closeMenu();
            }
        });

        addWrapper.appendChild(btn);
        addWrapper.appendChild(menu);

        this.el.appendChild(title);
        root.appendChild(addWrapper);

        this._menuEl = menu;
        root.appendChild(this.el);
    }

    _toggleMenu() {
        this.menuOpen = !this.menuOpen;
        this._menuEl.style.display = this.menuOpen ? "flex" : "none";
    }

    _closeMenu() {
        this.menuOpen = false;
        this._menuEl.style.display = "none";
    }
}