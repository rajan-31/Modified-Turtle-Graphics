export class Test1 {
    constructor(modifiedTurtleGraphics) {
        this.modifiedTurtleGraphics = modifiedTurtleGraphics;
    }
    mockKeyPresses() {
        // [..."UwDRRwRRRUwb"].forEach(k=>document.dispatchEvent(new KeyboardEvent('keydown',{key:{U:'ArrowUp',D:'ArrowDown',L:'ArrowLeft',R:'ArrowRight'}[k]||k.toLowerCase()})));

        [..."UwDRRwRRRUwbDLwwb"].forEach(k=>document.dispatchEvent(new KeyboardEvent('keydown',{key:{U:'ArrowUp',D:'ArrowDown',L:'ArrowLeft',R:'ArrowRight'}[k]||k.toLowerCase()})));
        this.modifiedTurtleGraphics.fillColor = '00ff00';
        [..."wRRwwwwRRwRRRLRwLLwRRwRRRRRRwRRwRRRRRRLwbwwRRRwwwb"].forEach(k=>document.dispatchEvent(new KeyboardEvent('keydown',{key:{U:'ArrowUp',D:'ArrowDown',L:'ArrowLeft',R:'ArrowRight'}[k]||k.toLowerCase()})));
        this.modifiedTurtleGraphics.fillColor='0000ff';
        [..."wRRwLLLwwRRRRRRwwwwwwwLLwwLLLwwbwRRRwwwwwb"].forEach(k=>document.dispatchEvent(new KeyboardEvent('keydown',{key:{U:'ArrowUp',D:'ArrowDown',L:'ArrowLeft',R:'ArrowRight'}[k]||k.toLowerCase()})));
        this.modifiedTurtleGraphics.fillColor='9527a1';
        [..."wwRRwwRRwwRRwwbwwb"].forEach(k=>document.dispatchEvent(new KeyboardEvent('keydown',{key:{U:'ArrowUp',D:'ArrowDown',L:'ArrowLeft',R:'ArrowRight'}[k]||k.toLowerCase()})));
        this.modifiedTurtleGraphics.fillColor='0faaaf';
        [..."wwwLLwwwwLLwwwLLwwwwb"].forEach(k=>document.dispatchEvent(new KeyboardEvent('keydown',{key:{U:'ArrowUp',D:'ArrowDown',L:'ArrowLeft',R:'ArrowRight'}[k]||k.toLowerCase()})));
        this.modifiedTurtleGraphics.fillColor='ff0000';
        [..."wwb"].forEach(k=>document.dispatchEvent(new KeyboardEvent('keydown',{key:{U:'ArrowUp',D:'ArrowDown',L:'ArrowLeft',R:'ArrowRight'}[k]||k.toLowerCase()})));
    }
}