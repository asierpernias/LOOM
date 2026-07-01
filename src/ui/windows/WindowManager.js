export class WindowManager  {
    constructor(root) {
        this.root = root;
        this.windows = [];
    }   

    createWindow({id, title, component, x = 100, y = 100, width = 500, height = 300}) {
        const win = document.createElement("div");

        win.style.cssText = `
        position: absolute;
        top: ${y}px;
        left: ${x}px;
        width: ${width}px;
        height: ${height}px;
        background: #111;
        border: 1px solid #333;
        display: flex;
        flex-direction: column;
        `;

        const bar = document.createElement("div");
        bar.style.cssText = `
        height: 28px;
        background: #222;
        cursor: grab;
        display: flex;
        align-items: center;
        padding: 0 8px;
        font-family: monospace;
        color: white;
        `;

        bar.textContent = title;

        const body = document.createElement("div");
        body.style.cssText = `
        flex: 1;
        overflow: hidden;
        `;
        
        if (component instanceof HTMLElement) {
            body.appendChild(component);
        } else {
            console.warn("WindowManager: component invalido", component);
        }
        

        win.appendChild(bar);
        win.appendChild(body);

        this._makeDraggable(win, bar);

        this.root.appendChild(win);
        this.windows.push(win);
        
        return win;
    }

    _makeDraggable(win, bar) {
        let dragging = false;
        let startX, startY, startLeft, startTop;

        bar.addEventListener("mousedown", (e) => {
            dragging = true;
            startX = e.clientX;
            startY = e.clientY;

            const rect = win.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;

            bar.style.cursor = "grabbing";
        });

        window.addEventListener("mousemove", (e) => {
            if (!dragging) return;

            win.style.left = startLeft + (e.clientX - startX) + "px";
             win.style.top = startTop + (e.clientY - startY) + "px";
        });

        window.addEventListener("mouseup", () => {
            dragging = false;
            bar.style.cursor = "grab";
        });
    }
}