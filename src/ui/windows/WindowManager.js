export class WindowManager extends EventTarget  {
    constructor(root) {
        super();
        this.root = root;
        this.windows = [];
        this._windowsById = new Map();
        this._zIndex = 10;
    }  
    
    hasWindow(id) {
        return id != null && this._windowsById.has(id);
    }

    getWindow(id) {
        return this._windowsById.get(id) ?? null;
    }

    focusWindow(id) {
        const win = this._windowsById.get(id);
        if (!win) return false;
        if (win.style.display === "none"){
            win.style.display = "flex";
        }
        win.style.zIndex = this._zIndex++;
        if (typeof win._restore === "function") win._restore();
        return true;
    }

    restoreWindow(id) {
        return this.focusWindow(id);
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
        minHeight = 140,
        persistent = false
    }) {
        if (id != null && this._windowsById.has(id)) {
            this.focusWindow(id);
            return this._windowsById.get(id);
        }

        const win = document.createElement("div");
        win._id = id ?? null;
        win._persistent = persistent;

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
        height: 32px;
        background: linear-gradient(180deg, #262626, #1b1b1b);
        cursor: grab;
        display: flex;
        align-items: center;
        padding: 0 8px;
        font-family: monospace;
        color: white;
        user-select: none;
        box-sizing: border-box;
        border-bottom: 1px solid #333;
        gap: 6px;
        `;

        const titleEl = document.createElement("div");
        titleEl.textContent = title;
        titleEl.style.cssText = `
        flex: 1;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        font-size: 0.8rem;
        letter-spacing: 0.04em;
        color: #ddd;
        `;

        const makeTopButton = (label, title) => {
            const Btn = document.createElement("button");
            Btn.textContent = label;
            Btn.title = title;
            Btn.style.cssText = `
            width: 24px;
            height: 22px;
            border: 1px solid #3d3d3d;
            border-radius: 4px;
            background: #181818;
            color: #ddd;
            cursor: pointer;
            font-family: monospace;
            font-size: 0.75rem;
            line-height: 18px;
            padding: 0;
            `;

            Btn.addEventListener("mousedown", e => e.stopPropagation());
            Btn.addEventListener("mouseenter", () => {
                Btn.style.background = "#252525";
                Btn.style.borderColor = "#666";
            });
            Btn.addEventListener("mouseleave", () => {
                Btn.style.background = "#141414";
                Btn.style.borderColor = "#3d3d3d";
            });

            return Btn;
        };

        const fitBtn = makeTopButton("□", "Ajustar al contenido");
        const minimizeBtn = makeTopButton("_", "Minimizar");
        const closeBtn = makeTopButton("X", "Cerrar");

        fitBtn.addEventListener("click", e => {
            e.stopPropagation();

            const baseWidth = win._baseContentWidth ?? 500;
            const baseHeight = win._baseContentHeight ?? 300;

            win.style.width = `${baseWidth}px`;
            win.style.height = `${baseHeight + 32}px`;
        });

        let minimized = false;
        let previousHeight = null;

        const toggleMinimaze = () => {
            if (!minimized) {
                previousHeight = win.style.height;
                body.style.display = "none";
                win.style.height = "32px";
                win.style.resize = "none";
                minimizeBtn.textContent = "+";
                minimized = true;
                this.dispatchEvent(new CustomEvent("minimize", {detail: { id: win._id, minimized: true}}));
            } else {
                body.style.display = "block";
                win.style.height = previousHeight ?? "300px";
                win.style.resize = "both";
                minimizeBtn.textContent = "_";
                minimized = false;
                this.dispatchEvent(new CustomEvent("minimize", {detail: { id: win._id, minimized: false}}));
            }
        };

        minimizeBtn.addEventListener("click", e => {
            e.stopPropagation();
            toggleMinimaze();
        });

        win._restore = () => {
            if (minimized) toggleMinimaze();
        }

        bar.addEventListener("dblclick", e => {
            e.stopPropagation();
            toggleMinimaze();
        });

        closeBtn.addEventListener("click", e => {
            e.stopPropagation();
            this.closeWindow(win);
        });

        bar.append(titleEl, fitBtn, minimizeBtn, closeBtn)

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
        if (id != null) {
            this._windowsById.set(id, win);
        }

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
             if (win._persistent) {
                this.dispatchEvent(new CustomEvent("close", {
                    detail: {id: win._id}
                }));
                return;
            }
            
            if (win._cleanup) {
                win._cleanup();
            }

            this.windows = this.windows.filter(w => w != win);
            if (win._id != null) {
                this._windowsById.delete(win._id);
            }
            win.remove();

            this.dispatchEvent(new CustomEvent("close", {
                detail: {id: win._id}
            }));
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