export class HistoryManager {
    constructor(limit = 30) {
        this._history = [];
        this._index = -1;
        this._limit = limit;
        this._listeners = [];
    }

    onChange(cb) {
        this._listeners.push(cb);
    }

    _notify() {
        for (const cb of this._listeners) cb();
    }

    execute(command) {  
        comand.execute();

        this._history = this._history.slice(0, this._index + 1);
        this._history.push(command);

        if ( this._history.length > this._limit) {
        this._history.shift();
        } else {
            this._index++;
        }

        this._notify();

    }

    undo() {
        if (!this.canUndo()) return;
        this._history[this._index].undo();
        this._index--;
        this._notify();
    }

    redo() {
        if (!this.canRedo()) return;
        this._index++;
        this._history[this._index].execute();
        this._notify();
    }

    canUndo() {
        return this._index >= 0;
    }

    canRedo() {
        return this._index + 1 < this._history.length;
    }
    
    clear() {
        this._history = [];
        this._index = -1;
        this._notify();
    }
}

export const historyManager = new HistoryManager(30);