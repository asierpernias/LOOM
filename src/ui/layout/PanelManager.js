export class PanelManager {
    constructor(root) {
        this.root = root;

        this.panels = new Map();

        this.container = document.createElement("div");
        this.container.className = "app-shell";

        this.container.style.cssText = `
        display: grid;
        grid-template-columns: auto 1fr auto;
        height: 100vh;
        width: 100%;
        background: var(--bg, #0a0a0a);
        overflow: hidden;
        `;

        this.left = document.createElement("div");
        this.right = document.createElement("div");
        this.center = document.createElement("div");

        this.left.style.cssText = this._panelBaseStyle();
        this.center.style.cssText = `
        position: relative;
        overflow: hidden;
        background: transparent;
        `;
        this.right.style.cssText = this._panelBaseStyle();

        this.container.append(this.left, this.center, this.right);
        root.appendChild(this.container);
    }

    _panelBaseStyle() {
        return `
        background: var(--panel, #111);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        min-width: 0;
        `;
    }

    register(panel) {
        this.panels.set(panel.id, panel);

        const host = this._getHost(panel.position);
        if (!host) return;

        host.appendChild(panel.component);
    }

    _getHost(position) {
        if (position === "left") return this.left;
        if (position === "right") return this.right;
        if (position === "center") return this.center;
        return null;
    }

    toggle(id) {
        const panel =  this.panels.get(id);
        if (!panel) return;
        panel.visible = !panel.visible;
        panel.component.style.display = panel.visible ? "flex" : "none";
    }

    setVisibility(id, visible) {
        const panel = this.panels.get(id);
        if (!panel) return;

        panel.visible = visible;
        panel.component.style.display = visible ? "flex" : "none";
    }

    getLayout() {
        return [...this.panels.values()].map(p => ({
            id: p.id,
            visible: p.visible,
            position: p.position
        }));
    }

    loadLayout(layout) {
        for (const l of layout) {
            const panel = this.panels.get(l.id);
            if (!panel) continue;

            panel.visible = l.visible;
            panel.component.style.display = l.visible ? "flex" : "none";

            const host = this._getHost(l.position);
            if (host && panel.component.parentElement !== host) {
                host.appendChild(panel.component);
            }
        }
    }
}