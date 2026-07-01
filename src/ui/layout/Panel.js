export class Panel {
    constructor({
        id,
        title = "",
        host = "sidebar",
        width = 300,
        component = null,
    }) {
        this.id = id;
        this.title = title;
        this.width = width;
        this.visible = true;
        this.host = host;

        const content = component || this._createDefault();
        this.component = this._wrap(content);
    }

    _createDefault() {
        const el = document.createElement("div");
        el.textContent = this.title;
        el.style.cssText = `
        color:white;
        padding: 10px;
        font-family: monospace;
        `;
        return el;
    }

    _wrap(content) {
        const wrapper = document.createElement("div");
        const isSidepanel = this.host === "sidebar" || this.host === "camera";

        wrapper.style.cssText = isSidepanel ? `
        width : ${this.width}px;
        min-width: ${this.width}px;
        display: flex;
        flex-direction: column;
        border-right: 1px solid rgba(255,255,255,0.5);
        ` : `
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        `;

        if (this.title) {
            const header = document.createElement("div");
            header.textContent = this.title;
            header.style.cssText = `
            padding: 6px 10px;
            font-family: monospace;
            font-size: 0.75rem;
            color: rgba(255,255,255,0.7);
            border-bottom: 1px solid rgba(255,255,255,0.5);
            background: rgba(0,0,0,0.2);
            flex-shrink: 0;
            `;
            wrapper.appendChild(header);
        }

        const body = document.createElement("div");
        body.style.cssText = `
        flex: 1;
        overflow: auto;
        min-height: 0;
        `;

        body.appendChild(content);
        wrapper.appendChild(body);

        return wrapper;
    }
}