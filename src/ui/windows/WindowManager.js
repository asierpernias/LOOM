export class WindowManager  {
    constructor(root) {
        this.root = root;
        this.windows = [];
        this._zIndex = 10;
    }   

    createWindow({
        id,
        title, 
        component, 
        x = 100, 
        y = 100, 
        width = null, 
        height = null,
        minWidth = 200,
        minHeight = 140
    }) {
        const win = document.createElement("div");

        win.style.cssText = `
        position: absolute;
        top: ${y}px;
        left: ${x}px;
        width: ${width ?? 500}px;
        height: ${height ?? 300}px;
        min-width: ${minWidth}px;
        min-height: ${minHeight}px;
        background: #111;
        border: 1px solid #333;
        display: flex;
        flex-direction: column;
        resize: both;
        overflow: hidden;
        box-sizing: border-box;
        z-index: ${this._zIndex++};
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
        user-select: none;
        box-sizing: border-box;
        `;

        const titleEl = document.createElement("div");
        titleEl.textContent = title;
        titleEl.style.cssText = `
        flex: 1;
        overflow: hidden:
        white-space: nowrap;
        text-overflow: ellipsis;
        `;

        const closeBtn = document.createElement("button");
        closeBtn.textContent = "X";
        closeBtn.style.cssText = `
        width: 22px;
        height: 22px;
        border: 1px solid #444;
        background: #181818;
        color: white;
        cursor: pointer;
        font-family: monospace;
        line-height: 18px;
        padding: 0;
        `;

        closeBtn.addEventListener("mousedown", e => e.stopPropagation());
        closeBtn.addEventListener("click", e => {
            e.stopPropagation();
            this.closeWindow(win);
        });

        bar.appendChild(titleEl, closeBtn)

        const body = document.createElement("div");
        body.style.cssText = `
        flex: 1;
        overflow: hidden;
        position: relative;
        background: #090909;
        `;

        const scaler = document.createElement("div");
        scaler.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        transform-origin: top left;
        `;
        
        if (component instanceof HTMLElement) {
            scaler.appendChild(component);
        } else {
            console.warn("WindowManager: component invalido", component);
        }
        
        body.appendChild(scaler);

        win.appendChild(bar);
        win.appendChild(body);

        win.addEventListener("mousedown", () => {
            win.style.zIndex = this._zIndex++;
        });

        this._makeDraggable(win, bar);
        this.root.appendChild(win);
        this.windows.push(win);

        requestAnimationFrame(() => {
            const base = this._mesureContent(component, width, height);
            win._baseContentWidth = base.width;
            win._baseContentHeight = base.height;

            if (width === null) {
                win.style.width = `${Math.min(base.width, window.innerWidth - x - 20)}px`;
            }
            if (height === null) {
                win.style.height = `${Math.min(base.height, window.innerHeight - y - 20)}px`;
            }

            scaler.style.width = `${base.width}px`;
            scaler.style.height = `${base.height}px`;

            const observer = new ResizeObserver(() => {
                this._scaleContent(win, body, scaler);
            });

            observer.observe(body);
            win._cleanup = () => observer.disconnect();

            return win;
        })
              
        return win;
    }

        closeWindow(win) {
            if (win._cleanup) {
                win._cleanup();
            }

            this.windows = this.windows.filter(w => w != win);
            win.remove();
        }

        _mesureContent(component, fallbackWidth, fallBackHeight) {
            if (!(component instanceof HTMLElement)) {
                return {
                    width: fallbackWidth ?? 500,
                    height: fallBackHeight ?? 500,
                };
            }

            const rect = component.getBoundingClientRect();

            const measureWidth = Math.max(
                component.scrollWidth,
                rect.width,
                fallbackWidth ?? 0,
                320
            );
            
            const measureHeight = Math.max(
                component.scrollHeight,
                rect.height,
                fallBackHeight ? fallBackHeight - 28 : 0,
                180
            );

            return {
                width: measureWidth,
                height: measureHeight,
            };
        }

        _scaleContent(win, body, scaler) {
            const baseWidth = win._baseContentWidth ?? 500;
            const baseHeight = win._baseContentHeight ?? 500;

            const availableWidth = Math.max(1, body.clientWidth);
            const availableHeight = Math.max(1, body.clientHeight);

            const scale = Math.min(
                availableWidth / baseWidth,
                availableHeight / baseHeight
            );

            scaler.style.width = `${baseWidth}px`;
            scaler.style.height  = `${baseHeight}px`;
            scaler.style.transform = `scale(${scale})`;
        }
        
    _makeDraggable(win, bar) {
        bar.addEventListener("mousedown", (e) => {
            if (e.button !== 0) return;
            let startLeft, startTop;
            const startX = e.clientX;
            const startY = e.clientY;

            const rect = win.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;

            bar.style.cursor = "grabbing";

            const onMove = ev => {
                win.style.left = `${startLeft + ev.clientX - startX}px`;
                win.style.top = `${startTop + ev.clientY - startY}px`;
            };

            const onUp = () => {
                bar.style.cursor = "grab";
                window.removeEventListener("mousemove", onMove);
                window.removeEventListener("mouseup", onUp);
            };
            window.addEventListener("mousemove", onMove);
            window.addEventListener("mouseup", onUp);
        });
    }
}