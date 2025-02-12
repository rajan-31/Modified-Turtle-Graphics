export class WebGLRenderer {
    constructor(earcut) {
        this.domElement = document.createElement("canvas");
        this.domElement.id = "canvas";
        this.gl =
            this.domElement.getContext("webgl",{preserveDrawingBuffer: true}) ||
            this.domElement.getContext("experimental-webgl");

        if (!this.gl) throw new Error("WebGL is not supported");

        this.setSize(500, 500);
        this.clear(200, 200, 200, 100);

        this.earcut = earcut;
    }

    setSize(width, height, shader) {
        this.domElement.width = width;
        this.domElement.height = height;
        // defines the area of the canvas where WebGL will draw
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        if(shader) {
            shader.setUniform2f("u_resolution", [width, height]);
        }
    }

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

    // =====================================

    drawTriangle(vertices, color, centroid, shader) {
        shader.fillAttributeData("a_position", 2, 0, 0);

        shader.bindArrayBuffer(shader.vertexAttributesBuffer, new Float32Array(vertices));

        shader.setUniform4f("u_color", color);
        shader.drawArrays(3);

        shader.bindArrayBuffer(shader.vertexAttributesBuffer, new Float32Array([...vertices, vertices[0], vertices[1]]));

        shader.setUniform4f("u_color", [0, 0, 0, color[3]]);
        shader.drawArrays(vertices.length/2 + 1, this.gl.LINE_STRIP)

        shader.bindArrayBuffer(shader.vertexAttributesBuffer, new Float32Array(centroid));
        shader.drawArrays(1, this.gl.POINTS);
    }

    drawLineStrip(vertices, color, shader) {
        shader.fillAttributeData("a_position", 2, 0, 0);

        shader.bindArrayBuffer(shader.vertexAttributesBuffer, new Float32Array(vertices));

        shader.setUniform4f("u_color", color);
        shader.drawArrays(vertices.length/2, this.gl.LINE_STRIP)
    }

    drawItem(vertices, color, shader) {
        shader.fillAttributeData("a_position", 2, 0, 0);

        shader.bindArrayBuffer(shader.vertexAttributesBuffer,new Float32Array(vertices));

        const indices = this.earcut.default(vertices);
        shader.bindElementArrayBuffer(shader.indexBuffer, new Uint16Array(indices));

        shader.setUniform4f("u_color", color);
        shader.drawElements(indices.length)
    }

    render(scene, shader, ongoingShape) {
        for(let i = 1; i < scene.primitives.length; i++) {
        // for(let i = scene.primitives.length - 1; i>=0; i--) {
            let item = scene.primitives[i];

            switch (item.type) {
                case "triangle":
                    this.drawTriangle(item.vertices, item.color, item.centroid, shader);
                    break;
                case "item":
                    this.drawItem(item.vertices, item.color, shader);
                    break;
                case "itemBorder":
                    this.drawLineStrip(item.vertices, item.color, shader);
                    break;
                case "lineStrip":
                    this.drawLineStrip(item.vertices, item.color, shader);
            }
        }

        // ongoing shape
        this.drawLineStrip(ongoingShape, [0.0, 0.0, 0.0, 1.0], shader);

        // cursor
        if(scene.primitives.length > 0)
            this.drawTriangle(scene.primitives[0].vertices, scene.primitives[0].color, scene.primitives[0].centroid, shader);
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
