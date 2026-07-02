export function showStartScreen(onStart) {
    const overlay = document.createElement("div");
    overlay.id = "startScreen";
    overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: #0a0a0a;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 24px;
    z-index: 9999;
    font-family: monospace;
    color: white;
    `;

    const title = document.createElement("div");
    title.textContent = "LOOM";
    title.style.cssText = `
    font-size: 2.5rem;
    font-weight: bold;
    letter-spacing: 10px;
    color: #C97A4A;
    `;

    const subtitle = document.createElement("div");
    subtitle.textContent = "Theremin gestual y mini-DAW";
    subtitle.style.cssText = `
    font-size: 0.85rem;
    color: #888;
    letter-spacing: 2px;
    `;

    const btn = document.createElement("button");
    btn.textContent = "Start";
    btn.style.cssText = `
    background: #C97A4A;
    color: white;
    border: none;
    font-family: monospace;
    font-weight: bold;
    font-size: 1rem;
    padding: 14px 32px;
    border-radius: 4px;
    cursor: pointer;
    letter-spacing: 1px;
    transition: background 0.15s;
    `;

    btn.onmouseenter = () => btn.style.background = "#C87b2A"; 
    btn.onmouseleave  = () => btn.style.background = "#C97A4A"   
    btn.addEventListener("click", async () => {
        btn.disabled = true;
        btn.textContent = "Staring...";
        try {
            await onStart();
        } finally {
            overlay.remove();
        }
    }, {pnce: true});

    overlay.append(title, subtitle, btn);
    document.body.appendChild(overlay);
}