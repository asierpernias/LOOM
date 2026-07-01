import { PanelManager } from "./PanelManager";
import { Panel } from "./Panel";

export class AppShell {
    constructor(root) {
        this.root = root;
        this.panelManager = new PanelManager(root);

        this._initTheme();
        this._initKeyboard();
    }

    mountTimeline(timeline) {
        const panel = new Panel({
            id: "timeline",
            position: "center",
            component: timeline.container,
        });
        this.panelManager.register(panel);
        return panel;
    }

    mountTransport(transportContainer) {
        const bar = document.createElement("div");
        bar.style.cssText = `
        grid-column: 1 / -1;
        height: 40px;
        display: flex; 
        align-items: center;
        background: var(--panel, #111);
        border-bottom: 1px solid rgba(255,255,255,0.05);
        `;
        bar.appendChild(transportContainer);

        this.panelManager.container.style.gridTemplateRows = "40px 1fr";
        this.panelManager.container.style.gridTemplateAreas = `"top top top" "left center right"`;
        bar.style.gridArea = "top";
        this.panelManager.left.style.gridArea = "left";
        this.panelManager.center.style.gridArea = "center";
        this.panelManager.right.style.gridArea = "right";

        this.panelManager.container.prepend(bar);
    }

    registerPanel(options) {
        const panel = new Panel(options);
        this.panelManager.register(panel);
        return panel;
    }

    _initTheme() {
        const saved = localStorage.getItem("theme") || "dark";
        document.documentElement.dataset.theme = saved;
    }

    _initKeyboard() {
        window.addEventListener("keydown", (e) => {
            if (!(e.ctrlKey || e.metaKey)) return;
            if (e.key === "1") {
                e.preventDefault();
                this.panelManager.toggle("browser");
            }
            if (e.key === "2") {
                e.preventDefault();
                this.panelManager.toggle("inspector");
            }
        });
    }
}