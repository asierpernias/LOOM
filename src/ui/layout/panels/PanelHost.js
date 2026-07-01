export class PanelHost{
    constructor(id, element){
        this.id = id;
        this.element =element;
        this.panels = [];
    }

    add(panel) {
        this.panels.push(panel);
        this.element.appendChild(panel.component);
    }

    remove(panel) {
        this.panels = this.panels.filter(p=>p!==panel);
        panel.component.remove();
    }
}

