const canvas = document.getElementById("canvas");
const gl = canvas.getContext("webgl");

if (!gl) {
    alert("WebGL not supported");
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

// Get attribute location and enable it
const positionLocation = gl.getAttribLocation(program, "a_position");
gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

function addTriangle(vertices, color) {
    if (vertices.length !== 6) {
        console.error("Invalid triangle vertices. Must have 6 values (x1, y1, x2, y2, x3, y3)");
        return;
    }

    if (color.length !== 4) {
        console.error("Invalid color. Must have 4 values (r, g, b, a)");
        return;
    }

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    // Set the uniform color
    gl.uniform4f(colorLocation, color[0], color[1], color[2], color[3]);

    // Draw the triangle
    gl.drawArrays(gl.TRIANGLES, 0, 3);
}


function getTriangleCentroid(vertices) {
    let x = (vertices[0] + vertices[2] + vertices[4]) / 3;
    let y = (vertices[1] + vertices[3] + vertices[5]) / 3;
    return [x, y];
}

function addTriangleWithAngle(vertices, color, angle, distance) {
    if (vertices.length !== 6) {
        console.error("Invalid triangle vertices. Must have 6 values (x1, y1, x2, y2, x3, y3)");
        return;
    }

    if (color.length !== 4) {
        console.error("Invalid color. Must have 4 values (r, g, b, a)");
        return;
    }

    if (angle < 0 || angle > 360) {
        console.error("Invalid angle. Must be in range 0 to 360");
    }

    // Convert angle to radians
    let rad = (angle * Math.PI) / 180;
    let dx = Math.cos(rad) * distance;
    let dy = Math.sin(rad) * distance;

    // Move each vertex
    let movedVertices = vertices.map((v, i) => v + (i % 2 === 0 ? dx : dy));

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(movedVertices), gl.STATIC_DRAW);

    // Set the uniform color
    gl.uniform4f(colorLocation, color[0], color[1], color[2], color[3]);

    // Draw the triangle
    gl.drawArrays(gl.TRIANGLES, 0, 3);
}

function addTriangleWithAngleWithRotation(vertices, color, angle, distance, rotation) {
    if (vertices.length !== 6) {
        console.error("Invalid triangle vertices. Must have 6 values (x1, y1, x2, y2, x3, y3)");
        return;
    }

    if (color.length !== 4) {
        console.error("Invalid color. Must have 4 values (r, g, b, a)");
        return;
    }

    if (angle < 0 || angle > 360) {
        console.error("Invalid angle. Must be in range 0 to 360");
    }

    if (rotation < 0 || rotation > 360) {
        console.error("Invalid rotation. Must be in range 0 to 360");
    }

    let [cx, cy] = getTriangleCentroid(vertices);

    // Convert angle to radians
    let rad = (angle * Math.PI) / 180;

    let dx = Math.cos(rad) * distance;
    let dy = Math.sin(rad) * distance;

    // Move each vertex
    let movedVertices = vertices.map((v, i) => v + (i % 2 === 0 ? dx : dy));

    // Rotate each vertex
    [cx, cy] = getTriangleCentroid(movedVertices);
    rad = (rotation * Math.PI) / 180;

    let rotatedVertices = [];
    for (let i = 0; i < movedVertices.length; i += 2) {
        let x = movedVertices[i] - cx;
        let y = movedVertices[i + 1] - cy;
        let newX = x * Math.cos(rad) - y * Math.sin(rad);
        let newY = x * Math.sin(rad) + y * Math.cos(rad);
        rotatedVertices.push(newX + cx, newY + cy);
    }

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(rotatedVertices), gl.STATIC_DRAW);

    // Set the uniform color
    gl.uniform4f(colorLocation, color[0], color[1], color[2], color[3]);

    // Draw the triangle
    gl.drawArrays(gl.TRIANGLES, 0, 3);
}

function addLine(vertices, color) {
    if (vertices.length !== 4) {
        console.error("Invalid line vertices. Must have 4 values (x1, y1, x2, y2)");
        return;
    }
    if (color.length !== 4) {
        console.error("Invalid color. Must have 4 values (r, g, b, a)");
    }

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.uniform4f(colorLocation, color[0], color[1], color[2], color[3]);
    gl.drawArrays(gl.LINES, 0, 2);
}

function getLineMidpoint(vertices) {
    let x = (vertices[0] + vertices[2])/2;
    let y = (vertices[1] + vertices[3])/2;
    return [x, y];
}

function addLineWithRotation(vertices, color, rotation) {
    if (vertices.length !== 4) {
        console.error("Invalid line vertices. Must have 4 values (x1, y1, x2, y2)");
        return;
    }
    if (color.length !== 4) {
        console.error("Invalid color. Must have 4 values (r, g, b, a)");
    }
    if (rotation < 0 || rotation > 360) {
        console.error("Invalid rotation. Must be in range 0 to 360");
    }

    [cx, cy] = getLineMidpoint(vertices);
    let rad = (rotation * Math.PI) / 180;

    let rotatedVertices = [];
    for (let i = 0; i < vertices.length; i += 2) {
        let x = vertices[i] - cx;
        let y = vertices[i + 1] - cy;
        let newX = x * Math.cos(rad) - y * Math.sin(rad);
        let newY = x * Math.sin(rad) + y * Math.cos(rad);
        rotatedVertices.push(newX + cx, newY + cy);
    }

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(rotatedVertices), gl.STATIC_DRAW);
    gl.uniform4f(colorLocation, color[0], color[1], color[2], color[3]);
    gl.drawArrays(gl.LINES, 0, 2);
}

// Clear canvas before drawing
gl.clearColor(0, 0, 0, 1);
gl.clear(gl.COLOR_BUFFER_BIT);


addTriangle(
    [225, 235.6, 275, 235.6, 250, 278.9], // Triangle 2 (Smaller)
    [0.0, 1.0, 0.0, 1.0]
);

addTriangleWithAngle(
    [225, 235.6, 275, 235.6, 250, 278.9], // Triangle 2 (Smaller)
    [0.0, 0.0, 1.0, 1.0],
    45,
    200
);

addTriangleWithAngle(
    [225, 235.6, 275, 235.6, 250, 278.9], // Triangle 2 (Smaller)
    [0.0, 0.0, 1.0, 1.0],
    360,
    200
);

addTriangleWithAngleWithRotation(
    [225, 235.6, 275, 235.6, 250, 278.9], // Triangle 2 (Smaller)
    [0.0, 0.0, 1.0, 1.0],
    45,
    325,
    75
);

// 1 to 7.375
// console.log(gl.getParameter(gl.ALIASED_LINE_WIDTH_RANGE))
// gl.lineWidth(6);

addLine(
    [0, 0, 500, 500],
    [1.0, 0, 0, 1.0]
);

addLine(
    [250, 0, 250, 500],
    [1.0, 0, 0, 1.0]
);

addLine(
    [0, 250, 500, 250],
    [1.0, 0, 0, 1.0]
);

// addLineWithRotation(
//     [0, 250, 500, 250],
//     [1.0, 0, 0, 1.0],
//     60
// );
//
// addLineWithRotation(
//     [0, 250, 500, 250],
//     [1.0, 0, 0, 1.0],
//     120
// );
//
// addLineWithRotation(
//     [0, 250, 500, 250],
//     [1.0, 0, 0, 1.0],
//     180
// );