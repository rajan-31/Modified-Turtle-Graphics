const canvas = document.getElementById("canvas");
canvas.width = "500"; canvas.height = "500";
const gl = canvas.getContext("webgl");

if (!gl) {
    alert("WebGL not supported");
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

function addTriangle(vertices, color) {
    scene.push({
        type: "triangle",
        vertices: vertices,
        color: color
    });
}

function drawTriangle(vertices, color) {
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.uniform4f(colorLocation, color[0], color[1], color[2], color[3]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
}

function drawItem(vertices, color) {
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    const indices = earcut.default(vertices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    gl.uniform4f(colorLocation, color[0], color[1], color[2], color[3]);
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
    // gl.drawArrays(gl.TRIANGLE_FAN, 0, vertices.length/2);

    gl.uniform4f(colorLocation, 0, 0, 1, color[3]);
    gl.drawArrays(gl.LINE_STRIP, 0, vertices.length/2);
}

// =====================================

function render() {
    scene.forEach((item, index) => {
        // REMOVE THIS LINE
        if(index === 0) return
        switch (item.type) {
            case "triangle":
                drawTriangle(item.vertices, item.color);
                break;
            case "line":
                drawLine(item.vertices, item.color);
                break;
            case "item":
                drawItem(item.vertices, item.color);
        }
    })
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

addTriangle(
    [
        245, 250,
        255, 250,
        250, 280],
    [0.0, 1.0, 0.0, 1.0]
);

function changeAngle() {
    angle = document.querySelector("#angle").value;
    console.log(angle);
}

function changeDisplacement() {
    displacement = document.querySelector("#displacement").value;
    console.log(displacement);
}

function toggleBrushOn() {
    brushOn = !brushOn;
    if(!brushOn) {
        let temp = scene.slice(1);
        temp = temp.map((l) => l.vertices);
        temp = temp.flat();

        if(temp[0] !== temp[temp.length-2] || temp[1] !== temp[temp.length-1]) {
            temp.push(temp[0], temp[1]);
        }

        // let temp2 = [];
        // for(let i=0; i<=temp.length-1; i+=4) {
        //     temp2.push(temp[i]);
        //     temp2.push(temp[i+1]);
        // }
        //
        // temp=temp2;

        console.log(temp);

        scene = [scene[0]];
        scene.push({
            type: "item",
            vertices: temp,
            color: [
                parseInt(fillColor.substring(0, 2), 16)/255,
                parseInt(fillColor.substring(2, 4), 16)/255,
                parseInt(fillColor.substring(4, 6), 16)/255,
                1
            ],
        });
    }
}

function changeFillColor() {
    fillColor = document.querySelector("#fillColor").value.slice(1);
}

function changeSelectedItem() {
    selectedItem = document.querySelector("#selectedItem").value;
    console.log(selectedItem);
}

function fillSelectedItem() {

}

// =====================================

let displacement = 50;
let angle = 90;
let brushPos = [250,250];
let brushOn = true;
let fillColor = "ff0000";
let selectedItem = 1;

function addLine(vertices, color) {
    console.log(`(${vertices[0]}, ${vertices[1]})\n(${vertices[2]}, ${vertices[3]})`);
    scene.push({
        type: "line",
        vertices: vertices,
        color: color
    })
}

function drawLine(vertices, color) {
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.uniform4f(colorLocation, color[0], color[1], color[2], color[3]);
    gl.drawArrays(gl.LINES, 0, 2);
}

// =====================================

function moveBrush() {
    const x1 = brushPos[0];
    const y1 = brushPos[1];
    const thetaRadians = angle * Math.PI / 180;

    // Calculate new coordinates
    const x2 = x1 + displacement * Math.cos(thetaRadians);
    const y2 = y1 + displacement * Math.sin(thetaRadians);

    if(brushOn) {
        addLine(
            [
                x1, y1,
                x2, y2
            ],
            [0.0, 0.0, 0.0, 1.0]
        );
    }

    // scene[0].vertices = scene[0].vertices.map((v, i) => i%2==1 ? v+displacement : v);
    brushPos[0] = x2; brushPos[1] = y2;
}