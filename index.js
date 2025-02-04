const canvas = document.getElementById("canvas");
const gl = canvas.getContext("webgl");

if (!gl) {
    alert("WebGL not supported");
}

function compileShader(gl, source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compile error:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

// Vertex Shader: Converts pixel coordinates to NDC
const vertexShaderSource = `
        attribute vec2 a_position;
        uniform vec2 u_resolution;
        void main() {
            vec2 ndc = (a_position / u_resolution) * 2.0 - 1.0;
            gl_Position = vec4(ndc.x, ndc.y, 0.0, 1.0);
            gl_PointSize = 10.0;
        }
    `;

// Fragment Shader: Uses uniform color
const fragmentShaderSource = `
        precision mediump float;
        uniform vec4 u_color;
        void main() {
            gl_FragColor = u_color;
        }
    `;

const vertexShader = compileShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
const fragmentShader = compileShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);

// Create and link shader program
const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);
gl.useProgram(program);

// Get uniform locations
const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
const colorLocation = gl.getUniformLocation(program, "u_color");

// Pass canvas size to shader
gl.uniform2f(resolutionLocation, canvas.width, canvas.height);

// Create and bind vertex buffer
const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

// Create and bind vertex buffer
const indexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

// Get attribute location and enable it
const positionLocation = gl.getAttribLocation(program, "a_position");
gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

// Clear canvas before drawing
gl.clearColor(0.8, 0.8, 0.8, 1);
gl.clear(gl.COLOR_BUFFER_BIT);

// =====================================

let scene = []
let displacement = 50;
let angle = 0;
let brushPos = [250,250];
let ongoingShape = [...brushPos]
let onGroundShapeOutlineColor = [0.0, 0.0, 0.0, 1.0];
let brushOn = true;
let fillColor = "ff0000";

function addTriangle(vertices, color) {
    scene.push({
        type: "triangle",
        vertices: vertices,
        color: color
    });
}

function addLine(vertices, color) {
    console.log(`(${vertices[0]}, ${vertices[1]})\n(${vertices[2]}, ${vertices[3]})`);
    scene.push({
        type: "line",
        vertices: vertices,
        color: color
    })
}

function drawTriangle(vertices, color) {
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.uniform4f(colorLocation, color[0], color[1], color[2], color[3]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
}

function drawLine(vertices, color) {
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.uniform4f(colorLocation, color[0], color[1], color[2], color[3]);
    gl.drawArrays(gl.LINES, 0, 2);
}

function drawLineStrip(vertices, color) {
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.uniform4f(colorLocation, color[0], color[1], color[2], color[3]);
    gl.drawArrays(gl.LINE_STRIP, 0, vertices.length/2);
}

function drawItem(vertices, color) {
    // vertices.push(vertices[0], vertices[1]);
    // console.log(vertices);
    // console.log(color);

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    const indices = earcut.default(vertices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    gl.uniform4f(colorLocation, ...color);
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
    // gl.drawArrays(gl.TRIANGLE_FAN, 0, vertices.length/2);

    // gl.uniform4f(colorLocation, 0, 0, 1, color[3]);
    // gl.drawArrays(gl.LINE_STRIP, 0, vertices.length/2);
}

// =====================================

function render() {
    // ongoing shape
    drawLineStrip(ongoingShape, onGroundShapeOutlineColor);

    scene.forEach((item, index) => {
        switch (item.type) {
            case "triangle":
                drawTriangle(item.vertices, item.color);
                break;
            case "line":
                drawLine(item.vertices, item.color);
                break;
            case "item":
                drawItem(item.vertices, item.color);
                break;
            case "lineStrip":
                drawLineStrip(item.vertices, item.color);
        }
    })
}

function clearSceneResetBrush() {
    scene = [scene[0]];
    brushPos = [250,250];
}

// =====================================

function animation() {
    gl.clearColor(0.8, 0.8, 0.8, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    render();
}

function renderLoop() {
    animation();
    window.requestAnimationFrame(renderLoop);
}

renderLoop();

// =====================================

function changeAngle(sign) {
    angle += (45*sign); angle = angle >=0 ? angle%360 : 0;
    document.querySelector("#angle").value = angle;

    // move cursor
    const thetaRadians = angle * Math.PI / 180;
    // Update cursor triangle vertices based on new position and angle
    const originalOffsets = [
        0, 5,   // Left vertex (relative to original position)
        0, -5,    // Right vertex (relative to original position)
        30, 0    // Tip of the triangle (relative to original position)
    ];

    const rotatedVertices = [];
    for (let i = 0; i < originalOffsets.length; i += 2) {
        const dx = originalOffsets[i];
        const dy = originalOffsets[i + 1];

        // Apply rotationsky
        const rotatedX = dx * Math.cos(thetaRadians) - dy * Math.sin(thetaRadians);
        const rotatedY = dx * Math.sin(thetaRadians) + dy * Math.cos(thetaRadians);

        // Translate to current brush position
        rotatedVertices.push(brushPos[0] + rotatedX, brushPos[1] + rotatedY);
    }

    // Update the cursor's vertices in the scene (assuming scene[0] is the cursor)
    scene[0].vertices = rotatedVertices;
}

function changeDisplacement(sign) {
    displacement += (50*sign); displacement = displacement > 0 ? displacement : 50;
    document.querySelector("#displacement").value = displacement;
}

function toggleBrushOn() {
    brushOn = !brushOn;
    document.querySelector("#brushOn").checked = brushOn;

    // push new done shape, ignore unwanted brush status changes
    if(!brushOn && ongoingShape.length > 2) {
        // =====================================
        let vertices = ongoingShape;
        vertices.push(vertices[0], vertices[1]);

        console.log(vertices);
        let subj_paths = new ClipperLib.Paths();
        let subj_path = new ClipperLib.Path();
        for (let i = 0; i < vertices.length; i += 2) {
            subj_path.push(
                new ClipperLib.IntPoint(vertices[i], vertices[i + 1]),
            );
        }
        subj_paths.push(subj_path);

        let paths = ClipperLib.Clipper.SimplifyPolygons(subj_paths, ClipperLib.PolyFillType.pftNonZero);
        console.log(paths);

        paths.forEach((path) => {
            scene.push({
                type: "item",
                vertices: [
                    path.map(v => [v.X, v.Y]),
                ].flat().flat(),
                color: [
                    parseInt(fillColor.substring(0, 2), 16)/255,
                    parseInt(fillColor.substring(2, 4), 16)/255,
                    parseInt(fillColor.substring(4, 6), 16)/255,
                    1
                ]
            });
        });

        scene.push({
            type: "lineStrip",
            vertices: ongoingShape,
            color: [0.0, 0.0, 0.0, 1.0]
        })

        ongoingShape = [...brushPos];
    }
}

function changeFillColor() {
    fillColor = document.querySelector("#fillColor").value.slice(1);
}

function moveBrush() {
    const x1 = brushPos[0];
    const y1 = brushPos[1];
    const thetaRadians = angle * Math.PI / 180;

    // Calculate new coordinates
    const x2 = x1 + displacement * Math.cos(thetaRadians);
    const y2 = y1 + displacement * Math.sin(thetaRadians);

    if(brushOn) {
            ongoingShape.push(x2, y2);
    } else {
        ongoingShape = [x2, y2]
    }

    // scene[0].vertices = scene[0].vertices.map((v, i) => i%2==1 ? v+displacement : v);
    brushPos[0] = x2; brushPos[1] = y2;

    // move cursor
    // Update cursor triangle vertices based on new position and angle
    const originalOffsets = [
        0, 5,   // Left vertex (relative to original position)
        0, -5,    // Right vertex (relative to original position)
        30, 0    // Tip of the triangle (relative to original position)
    ];

    const rotatedVertices = [];
    for (let i = 0; i < originalOffsets.length; i += 2) {
        const dx = originalOffsets[i];
        const dy = originalOffsets[i + 1];

        // Apply rotation
        const rotatedX = dx * Math.cos(thetaRadians) - dy * Math.sin(thetaRadians);
        const rotatedY = dx * Math.sin(thetaRadians) + dy * Math.cos(thetaRadians);

        // Translate to current brush position
        rotatedVertices.push(brushPos[0] + rotatedX, brushPos[1] + rotatedY);
    }

    // Update the cursor's vertices in the scene (assuming scene[0] is the cursor)
    scene[0].vertices = rotatedVertices;
}

function handleKeyPress(e) {
    const key = e.key.toLowerCase();
    if (key === "w") moveBrush();
    if (key === "b") toggleBrushOn();
    if (key === "arrowleft") changeAngle(-1);
    if (key === "arrowright") changeAngle(1);
    if (key === "arrowup") changeDisplacement(1);
    if (key === "arrowdown") changeDisplacement(-1);

    if (key === "c") clearSceneResetBrush();
}

// =====================================

document.addEventListener("keydown", handleKeyPress);

// Cursor
addTriangle([
        250, 255,
        250, 245,
        280, 250],
    [0.3, 0.6, 0.4, 1.0]
);

// =====================================

// [..."wLLwRRRRRRwLLwb"].forEach(k=>document.dispatchEvent(new KeyboardEvent('keydown',{key:{U:'ArrowUp',D:'ArrowDown',L:'ArrowLeft',R:'ArrowRight'}[k]||k.toLowerCase()})));

// [..."LLwRwRwRwRwRwRwRwb"].forEach(k=>document.dispatchEvent(new KeyboardEvent('keydown',{key:{U:'ArrowUp',D:'ArrowDown',L:'ArrowLeft',R:'ArrowRight'}[k]||k.toLowerCase()})));

// self intersecting
// [..."UwDLLwRRRRRUwb"].forEach(k=>document.dispatchEvent(new KeyboardEvent('keydown',{key:{U:'ArrowUp',D:'ArrowDown',L:'ArrowLeft',R:'ArrowRight'}[k]||k.toLowerCase()})));