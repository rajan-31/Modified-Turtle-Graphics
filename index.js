// Get the canvas element and GL context
const canvas = document.createElement('canvas');
canvas.width = 800;
canvas.height = 600;
document.body.appendChild(canvas);
const gl = canvas.getContext('webgl');

// Create info display
const infoDiv = document.createElement('div');
document.body.appendChild(infoDiv);

// Vertex shader
const vsSource = `
    attribute vec2 position;
    uniform vec2 translation;
    uniform float rotation;
    
    void main() {
        float cosR = cos(rotation);
        float sinR = sin(rotation);
        mat2 rotationMatrix = mat2(cosR, -sinR, sinR, cosR);
        vec2 rotatedPos = rotationMatrix * position;
        vec2 finalPos = rotatedPos + translation;
        gl_Position = vec4(finalPos * 2.0 - 1.0, 0.0, 1.0);
    }
`;

// Fragment shader
const fsSource = `
    precision mediump float;
    
    void main() {
        gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
    }
`;

// Compile shader
function compileShader(source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

// Create program
const vertexShader = compileShader(vsSource, gl.VERTEX_SHADER);
const fragmentShader = compileShader(fsSource, gl.FRAGMENT_SHADER);
const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
}

// Arrow vertices (hollow arrow pointing right)
const arrowVertices = new Float32Array([
    // Main body
    0.0, 0.02,   // top-left
    0.1, 0.02,   // top-right
    0.1, -0.02,  // bottom-right
    0.0, -0.02,  // bottom-left

    // Arrow head
    0.1, 0.04,   // top
    0.15, 0.0,   // tip
    0.1, -0.04   // bottom
]);

// Create vertex buffer
const vertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, arrowVertices, gl.STATIC_DRAW);

// Get attribute and uniform locations
const positionLocation = gl.getAttribLocation(program, 'position');
const translationLocation = gl.getUniformLocation(program, 'translation');
const rotationLocation = gl.getUniformLocation(program, 'rotation');

// Initialize state
let mode = 'rotate';  // 'rotate' or 'move'
let angle = 0;        // in radians
let moveDistance = 50;
let position = { x: 0.5, y: 0.5 }; // center of screen

// Update info display
function updateInfo() {
    infoDiv.innerHTML = `
        Mode: ${mode}<br>
        Angle: ${(angle * 180 / Math.PI).toFixed(1)}°<br>
        Move Distance: ${moveDistance}px<br>
        Position: (${(position.x * canvas.width).toFixed(1)}, ${(position.y * canvas.height).toFixed(1)})
    `;
}

// Draw function
function draw() {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);
    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2f(translationLocation, position.x, position.y);
    gl.uniform1f(rotationLocation, angle);

    // Draw the arrow body (4 vertices)
    gl.drawArrays(gl.LINE_LOOP, 0, 4);
    // Draw the arrow head (3 vertices)
    gl.drawArrays(gl.LINE_LOOP, 4, 3);

    updateInfo();
}

// Handle keyboard input
document.addEventListener('keydown', (event) => {
    switch(event.key.toLowerCase()) {
        case 'r':
            mode = 'rotate';
            break;
        case 'f':
            mode = 'move';
            break;
        case 'arrowup':
            if (mode === 'rotate') {
                angle += 10 * Math.PI / 180;  // Add 10 degrees
            } else {
                moveDistance = Math.min(moveDistance + 5, 200);  // Cap at 200px
            }
            break;
        case 'arrowdown':
            if (mode === 'rotate') {
                angle -= 10 * Math.PI / 180;  // Subtract 10 degrees
            } else {
                moveDistance = Math.max(moveDistance - 5, 0);  // Minimum 0px
            }
            break;
        case ' ':  // Spacebar to move forward
            if (mode === 'move') {
                const dx = Math.cos(angle) * (moveDistance / canvas.width);
                const dy = Math.sin(angle) * (moveDistance / canvas.height);
                position.x = Math.max(0, Math.min(1, position.x + dx));
                position.y = Math.max(0, Math.min(1, position.y + dy));
            }
            break;
    }
    draw();
});

// Initial draw
draw();