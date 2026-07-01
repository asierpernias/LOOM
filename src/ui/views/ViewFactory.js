import { Timeline } from "../Timeline.js";
import { Sequencer } from "../Sequencer.js";
import { CameraPanel } from "../layout/CameraPanel.js";
import { GestureManager } from "../../gesture/GestureManager.js";
import { HandRenderer } from "../../gesture/HandRenderer.js";

export function createView(type, deps = {}) {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "width: 100%; height: 100%;";

    if (type === "timeline") {
        const t = new Timeline(wrapper);
        return { title: "Timeline", component: wrapper, timeline: t};
    }
    if (type === "sequencer") {
        const s = new Sequencer(wrapper);
        return { title: "Sequencer", component: wrapper};
    }
    if (type === "camera") {
        const c = new CameraPanel();
        wrapper.appendChild(c.container);
        const handRenderer = new HandRenderer(c.getCanvas());
        
        const gm = deps.gestureManager;

        if (gm) {
            gm.mount(c.container);
        }
        
        return { title: "Camera", component: wrapper, handRenderer};
    }
    return null;
}