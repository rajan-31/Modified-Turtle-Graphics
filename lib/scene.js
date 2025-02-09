export class Scene {
    constructor() {
        this.primitives = []
    }

    add(primitive) {
        this.primitives.push(primitive);
    }

    getPrimitives() {
        return this.primitives;
    }

    getPrimitive(index) {
        return this.primitives[index];
    }
}