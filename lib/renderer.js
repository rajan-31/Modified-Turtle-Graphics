export class WebGLRenderer {
    constructor() {
        this.domElement = document.createElement("canvas");
        this.gl =
            this.domElement.getContext("webgl",{preserveDrawingBuffer: true}) ||
            this.domElement.getContext("experimental-webgl");

        if (!this.gl) throw new Error("WebGL is not supported");

        this.setSize(500, 500);
        this.clear(200, 200, 200, 100);
    }

    /**
     * Set canvas size
     * @param {number} width
     * @param {number} height
     */
    setSize(width, height) {
        this.domElement.width = width;
        this.domElement.height = height;
        // defines the area of the canvas where WebGL will draw
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
    }

    /**
     * Clears canvas before drawing
     * @param {number} r - 0 to 255
     * @param {number} g - 0 to 255
     * @param {number} b - 0 to 255
     * @param {number} a - 0 to 100
     */
    clear(r, g, b, a) {
        this.gl.clearColor(r/255, g/255, b/255, a/100);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    }

    setAnimationLoop(animation) {
        function renderLoop() {
            animation();
            window.requestAnimationFrame(renderLoop);
        }

        renderLoop();
    }

    render() {

    }

    // =====================================

    glContext() {
        return this.gl;
    }

    // =====================================

    enableTransparency() {
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    }
}
