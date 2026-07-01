export class PanelManager {
    constructor(root) {
        this.root = root;

        this.panels = new Map();

        this.container = document.createElement("div");
        this.container.className = "app-shell";

        this.container.style.cssText = `
        display: grid;
        grid-template-columns: 280px 1fr 0px;
        grid-template-rows: 100%;
        height: 100vh;
        width: 100%;
        background: var(--bg, #0a0a0a);
        overflow: hidden;
        `;

        this.hosts = new Map();

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
        this.registerHost("sidebar", this.left);
        this.registerHost("timeline", this.center);
        this.registerHost("camera", this.right);
        root.appendChild(this.container);
    }

    _panelBaseStyle() {
        return `
        background: var(--panel, #111);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        min-width: 0;
        height: 100%;
        `;
    }

    registerHost(id, element) {
        this.hosts.set(id, {
            id, element, panels: []
        });
    }

    register(panel) {
        this.panels.set(panel.id, panel);

        const host = this.hosts.get(panel.host);
        if (!host) return;
        if (!host.panels.includes(panel)) {
            host.panels.push(panel);
        }
        host.element.appendChild(panel.component);
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
            host: p.host
        }));
    }

    loadLayout(layout) {
        for (const l of layout) {
            const panel = this.panels.get(l.id);
            if (!panel) continue;

            panel.visible = l.visible;
            panel.component.style.display = l.visible ? "flex" : "none";

            const host = this.hosts.get(l.host);
            if (host && panel.component.parentElement !== host.element) {
                host.panels.push(panel);
                host.element.appendChild(panel.component);
            }
        }
    }

    movePanel(id, newHost) {
        const panel = this.panels.get(id);
        if (!panel) return;

        const oldHost = this.hosts.get(panel.host);
        const nextHost = this.hosts.get(newHost);

        if (!nextHost) return;

        if (oldHost) {
            oldHost.panels = oldHost.panels.filter(p => p != panel);
        }

        nextHost.panels.push(panel);
        nextHost.element.appendChild(panel.component);

        panel.host = newHost;
    }
}