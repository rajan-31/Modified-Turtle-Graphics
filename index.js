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
        attribute vec3 a_position;
        uniform vec2 u_resolution;
        
        void main() {
            vec2 ndc = (a_position.xy / u_resolution) * 2.0 - 1.0;
            gl_Position = vec4(ndc.x, ndc.y, a_position.z, 1.0); // Now considers z
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

// enable transparency
gl.enable(gl.BLEND);
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

// use program
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
let MIN_DISPLACEMENT = 50;
let angle = 0;
let turn = 0;
let MIN_TURN = 45;
let brushPos = [250,250];
let ongoingShape = [...brushPos]
let onGroundShapeOutlineColor = [0.0, 0.0, 0.0, 1.0];
let brushOn = true;
let brushVisible = true;
let fillColor = "ff0000";
let shapeCount = -1;
let CURSOR = {
    vertices: [
        240, 255,
        240, 245,
        270, 250,
    ],
    color: [0.2, 0.5, 0.1, 1.0],
    angle: 0
}
let maxShapes = 5;

function addTriangle(vertices, color) {
    scene.push({
        type: "triangle",
        vertices: vertices,
        color: color,
        angle: 0,
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

function addLineStrip(vertices, color) {
    scene.push({
        type: "lineStrip",
        vertices: vertices,
        color: color
    })
}

function addLineStripLooped(vertices, color) {
    addLineStrip([...vertices, vertices[0], vertices[1]], color)
}

function drawTriangle(vertices, color) {
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.uniform4f(colorLocation, color[0], color[1], color[2], color[3]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([...vertices, vertices[0], vertices[1]]), gl.STATIC_DRAW);
    gl.uniform4f(colorLocation, 0,0,0, color[3]);
    gl.drawArrays(gl.LINE_STRIP, 0, vertices.length/2 + 1);
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
    for(let i = 1; i < scene.length; i++) {
        let item = scene[i];

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
            case "itemBorder":
                drawLineStrip(item.vertices, item.color);
                break;
            case "lineStrip":
                drawLineStrip(item.vertices, item.color);
                break;
            case "lineStripLooped":
                drawLineStrip(item.vertices, item.color);
                break;
        }
    }

    // scene.forEach((item, index) => {
    //     switch (item.type) {
    //         case "triangle":
    //             drawTriangle(item.vertices, item.color);
    //             break;
    //         case "line":
    //             drawLine(item.vertices, item.color);
    //             break;
    //         case "item":
    //             drawItem(item.vertices, item.color);
    //             break;
    //         case "itemBorder":
    //             drawLineStrip(item.vertices, item.color);
    //             break;
    //         case "lineStrip":
    //             drawLineStrip(item.vertices, item.color);
    //             break;
    //         case "lineStripLooped":
    //             drawLineStrip(item.vertices, item.color);
    //             break;
    //     }
    // });

    // ongoing shape
    drawLineStrip(ongoingShape, onGroundShapeOutlineColor);

    // cursor
    if(scene.length > 0)
        drawTriangle(scene[0].vertices, scene[0].color);
}

function clearSceneResetBrush() {
    scene = [scene[0]];
    angle = 0;
    brushPos = [250,250];
    brushOn = true;
    scene[0].vertices = CURSOR.vertices;
    scene[0].angle = CURSOR.angle;
    ongoingShape = [...brushPos];
    shapeCount = -1;
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

vec2 = glMatrix.vec2
mat2d = glMatrix.mat2d
mat3 = glMatrix.mat3

function computeCentroid(vertices) {
    let cx = 0, cy = 0, n = vertices.length / 2;

    for (let i = 0; i < vertices.length; i += 2) {
        cx += vertices[i];
        cy += vertices[i + 1];
    }

    // return vec2.fromValues(Math.round(cx / n), Math.round(cy / n));
    return vec2.fromValues(cx / n, cy / n);
}

function rotatePolygon(vertices, theta, centroid) {
    console.log(vertices);
    console.log(centroid);
    let transform = mat3.create();

    mat3.translate(transform, transform, vec2.fromValues(centroid[0], centroid[1])); // Move to origin
    mat3.rotate(transform, transform, theta); // Rotate around Z-axis
    mat3.translate(transform, transform, vec2.fromValues(-centroid[0], -centroid[1])); // Move back

    let rotatedVertices = [];
    for (let i = 0; i < vertices.length; i += 2) {
        let v = vec2.fromValues(vertices[i], vertices[i + 1]);
        vec2.transformMat3(v, v, transform);
        rotatedVertices.push(v[0], v[1]);
    }

    return rotatedVertices;
}

function translatePolygon(vertices, theta, distance) {
    let dx = Math.cos(theta) * distance;
    let dy = Math.sin(theta) * distance;

    let translatedVertices = [];
    for (let i = 0; i < vertices.length; i += 2) {
        translatedVertices.push(vertices[i] + dx, vertices[i + 1] + dy);
    }

    return translatedVertices;
}

function scalePolygon(vertices, scaleFactor, centroid) {
    let scaledVertices = [];

    for (let i = 0; i < vertices.length; i += 2) {
        let x = vertices[i], y = vertices[i + 1];

        // Scale relative to centroid
        let newX = centroid[0] + (x - centroid[0]) * scaleFactor;
        let newY = centroid[1] + (y - centroid[1]) * scaleFactor;

        scaledVertices.push(newX, newY);
    }

    return scaledVertices;
}
// =====================================

function rotateItem(index, theta) {
    let tempCount = -1;
    let indexInScene = -1;
    for(let i = 0; i < scene.length; i += 1) {
        if(scene[i].type === "itemBorder") {
            tempCount += 1;
            if(tempCount === index) {
                indexInScene = i;
                break;
            }
        }
    }
    console.log(indexInScene);

    let verticesForCentroid = scene[indexInScene].vertices;
    let centroid = computeCentroid(
            verticesForCentroid[0] === verticesForCentroid[verticesForCentroid.length - 2] &&
            verticesForCentroid[1] === verticesForCentroid[verticesForCentroid.length - 1]
            ? verticesForCentroid.slice(0, -2)  // remove dup to correct centroid calculation
            : verticesForCentroid
    );
    console.log(centroid);
    console.log(indexInScene+scene[indexInScene].relatedItemsCount);
    for (let i = indexInScene; i <= indexInScene+scene[indexInScene].relatedItemsCount; i += 1) {
        scene[i].vertices = rotatePolygon(scene[i].vertices, theta, centroid);
    }
}

function translateItem(index, theta, distance) {
    let tempCount = -1;
    let indexInScene = -1;
    for(let i = 0; i < scene.length; i += 1) {
        if(scene[i].type === "itemBorder") {
            tempCount += 1;
            if(tempCount === index) {
                indexInScene = i;
                break;
            }
        }
    }

    for (let i = indexInScene; i <= indexInScene+scene[indexInScene].relatedItemsCount; i += 1) {
        scene[i].vertices = translatePolygon(scene[i].vertices, theta, distance);
    }
}

function scaleItem(index, scaleFactor) {
    let tempCount = -1;
    let indexInScene = -1;
    for(let i = 0; i < scene.length; i += 1) {
        if(scene[i].type === "itemBorder") {
            tempCount += 1;
            if(tempCount === index) {
                indexInScene = i;
                break;
            }
        }
    }
    console.log(indexInScene);

    let verticesForCentroid = scene[indexInScene].vertices;
    let centroid = computeCentroid(
        verticesForCentroid[0] === verticesForCentroid[verticesForCentroid.length - 2] &&
        verticesForCentroid[1] === verticesForCentroid[verticesForCentroid.length - 1]
            ? verticesForCentroid.slice(0, -2)  // remove dup to correct centroid calculation
            : verticesForCentroid
    );
    console.log(centroid);
    console.log(indexInScene+scene[indexInScene].relatedItemsCount);
    for (let i = indexInScene; i <= indexInScene+scene[indexInScene].relatedItemsCount; i += 1) {
        scene[i].vertices = scalePolygon(scene[i].vertices, scaleFactor, centroid);
    }
}

function bringToFrontItem(index) {
    const selected = scene.splice(index, scene[index].relatedItemsCount+1);
    scene.push(...selected);
}

function bringToBackItem(index) {

    const selected = scene.splice(index, scene[index].relatedItemsCount+1);
    // scene.unshift(...selected);
    scene.splice(1, 0, ...selected);
}


function recolorItem(index, color) {
    console.log(index, color);
    for(let i = index+1; i <= index+scene[index].relatedItemsCount; i += 1) {
        scene[i].color = color;
    }
}

// =====================================
function handleTurnClick() {
    let newTurn =  document.querySelector('#turn-angle').value;
    changeAngle(1, newTurn);
    turn = newTurn;
}

function handleAngleResetClick() {
    changeAngle(1, (360-angle)%360);
}

function changeAngle(sign, _turn=MIN_TURN) {
    console.log(sign, _turn);
    document.querySelector('#turn-angle').value = sign * _turn;
    angle = (angle + sign*_turn + 360) % 360

    let theta = (angle-scene[0].angle) * Math.PI / 180;

    scene[0].vertices = rotatePolygon(scene[0].vertices, theta, computeCentroid(scene[0].vertices));
    scene[0].angle = angle;
}

function changeDisplacement(sign) {
    displacement += (50*sign); displacement = displacement > 0 ? displacement : 50;
    document.querySelector("#displacement").value = displacement;
}

function toggleBrushOn() {
    brushOn = !brushOn;
    document.querySelector("#brushOn").checked = brushOn;
    if(!brushOn)
        scene[0].color = [0.9, 0.2, 0.3, 1]
    else
        scene[0].color = CURSOR.color;

    // push new done shape, ignore unwanted brush status changes
    if(!brushOn && ongoingShape.length > 2) {
        // =====================================
        // make it looped shape
        let vertices = [...ongoingShape, ongoingShape[0], ongoingShape[1]];

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

        scene.push({
            type: "itemBorder",
            vertices: ongoingShape,
            color: [0.0, 0.0, 0.0, 1.0],
            relatedItemsCount: paths.length,
        });

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

        // add shape index
        shapeCount+=1;
        const newIndexOption = document.createElement("option");
        newIndexOption.value = shapeCount; newIndexOption.innerHTML = shapeCount;
        document.querySelector("#shape-index").appendChild(newIndexOption);

        ongoingShape = [...brushPos];
    }
}

function toggleBrushVisible() {
    brushVisible = !brushVisible;
    document.querySelector("#brushVisible").checked = brushVisible;

    if(brushVisible)
        scene[0].color = CURSOR.color;
    else
        scene[0].color = [0, 0, 0, 0];
}

function changeFillColor() {
    fillColor = document.querySelector("#fillColor").value.slice(1);
}

function changeMaxShapes() {
    if(shapeCount > -1) {
        return alert("Can't change max shapes when shapes are present, clear the canvas first!");
    }
    maxShapes = document.querySelector("#maxShapes").value;
}

function moveBrush() {
    if(shapeCount === maxShapes-1) {
        return alert("Max shapes reached! Can't draw anymore.")
    }
    const x1 = brushPos[0];
    const y1 = brushPos[1];
    const thetaRadians = angle * Math.PI / 180;

    const x2 = x1 + displacement * Math.cos(thetaRadians);
    const y2 = y1 + displacement * Math.sin(thetaRadians);

    if(brushOn) {
            ongoingShape.push(x2, y2);
    } else {
        ongoingShape = [x2, y2]
    }


    brushPos[0] = x2; brushPos[1] = y2;

    // move cursor
    scene[0].vertices = translatePolygon(scene[0].vertices, thetaRadians, displacement);
}

// =====================================

function handleRotateItemClick() {
    let index = document.querySelector("#shape-index").value;
    let rotationTranslationAngle = document.querySelector("#item-rotation-translation-angle").value;
    console.log(index);
    if(!index || !rotationTranslationAngle) console.error("something went wrong");
    rotateItem(Number(index), Number(rotationTranslationAngle)*Math.PI/180);
}

function handleTranslateItemClick() {
    let index = document.querySelector("#shape-index").value;
    let rotationTranslationAngle = document.querySelector("#item-rotation-translation-angle").value;
    let translationDistance = document.querySelector("#item-translation-distance").value;
    console.log(index);
    if(!index || !rotationTranslationAngle || !translationDistance) console.error("something went wrong");
    translateItem(Number(index), Number(rotationTranslationAngle)*Math.PI/180, translationDistance);
}

function handleScaleItemClick() {
    let index = document.querySelector("#shape-index").value;
    let scaleFactor = document.querySelector("#item-scale-factor").value;
    console.log(index);
    if(!index || !scaleFactor) console.error("something went wrong");
    scaleItem(Number(index), Number(scaleFactor));
}

function handleBringToFrontItemClick() {
    let index = document.querySelector("#shape-index").value;
    let tempCount = -1;
    for(let i = 0; i < scene.length; i++) {
        if(scene[i].type === "itemBorder") {
            tempCount++;
            if(tempCount === Number(index)) {
                bringToFrontItem(i);
                break;
            }
        }
    }

    document.querySelector("#shape-index").value = shapeCount;
}

function handleBringToBackItemClick() {
    let index = document.querySelector("#shape-index").value;
    let tempCount = -1;
    for(let i = 0; i < scene.length; i++) {
        if(scene[i].type === "itemBorder") {
            tempCount++;
            if(tempCount === Number(index)) {
                bringToBackItem(i);
                break;
            }
        }
    }

    document.querySelector("#shape-index").value = 0;
}

function handleRecolorClick(removeColor=false) {
    let index = document.querySelector("#shape-index").value;
    let tempCount = -1;
    for(let i = 0; i < scene.length; i++) {
        if(scene[i].type === "itemBorder") {
            tempCount++;
            if(tempCount === Number(index)) {
                // remove color or change color
                let color_ = !removeColor ? [
                    parseInt(fillColor.substring(0, 2), 16)/255,
                    parseInt(fillColor.substring(2, 4), 16)/255,
                    parseInt(fillColor.substring(4, 6), 16)/255,
                    1
                ] :
                    [1, 0.0, 0.0, 0.0];
                recolorItem(i, color_);
                break;
            }
        }
    }
}

// =====================================

function handleKeyPress(e) {
    const key = e.key.toLowerCase();
    if (key === "w") moveBrush();
    if (key === "b") toggleBrushOn();
    if (key === "arrowleft") changeAngle(1);
    if (key === "arrowright") changeAngle(-1);
    if (key === "arrowup") changeDisplacement(1);
    if (key === "arrowdown") changeDisplacement(-1);

    if (key === "c") clearSceneResetBrush();
}

// =====================================

document.addEventListener("keydown", handleKeyPress);

// Cursor
addTriangle(CURSOR.vertices, CURSOR.color);
// addLineStrip([250,0,250,500], [0,0,0,1]);
// addLineStrip([0,250,500,250], [0,0,0,1]);
// addLineStrip([0,0,500,500], [0,0,0,1]);
// addLineStrip([0,500,500,0], [0,0,0,1]);

// =====================================

// [..."UwDRRwRRRUwb"].forEach(k=>document.dispatchEvent(new KeyboardEvent('keydown',{key:{U:'ArrowUp',D:'ArrowDown',L:'ArrowLeft',R:'ArrowRight'}[k]||k.toLowerCase()})));

[..."UwDRRwRRRUwbDLwwb"].forEach(k=>document.dispatchEvent(new KeyboardEvent('keydown',{key:{U:'ArrowUp',D:'ArrowDown',L:'ArrowLeft',R:'ArrowRight'}[k]||k.toLowerCase()})));
fillColor = '00ff00';
[..."wRRwwwwRRwRRRLRwLLwRRwRRRRRRwRRwRRRRRRLwbwwRRRwwwb"].forEach(k=>document.dispatchEvent(new KeyboardEvent('keydown',{key:{U:'ArrowUp',D:'ArrowDown',L:'ArrowLeft',R:'ArrowRight'}[k]||k.toLowerCase()})));
fillColor='0000ff';
[..."wRRwLLLwwRRRRRRwwwwwwwLLwwLLLwwbwRRRwwwwwb"].forEach(k=>document.dispatchEvent(new KeyboardEvent('keydown',{key:{U:'ArrowUp',D:'ArrowDown',L:'ArrowLeft',R:'ArrowRight'}[k]||k.toLowerCase()})));
fillColor='9527a1';
[..."wwRRwwRRwwRRwwbwwb"].forEach(k=>document.dispatchEvent(new KeyboardEvent('keydown',{key:{U:'ArrowUp',D:'ArrowDown',L:'ArrowLeft',R:'ArrowRight'}[k]||k.toLowerCase()})));
fillColor='0faaaf';
[..."wwwLLwwwwLLwwwLLwwwwb"].forEach(k=>document.dispatchEvent(new KeyboardEvent('keydown',{key:{U:'ArrowUp',D:'ArrowDown',L:'ArrowLeft',R:'ArrowRight'}[k]||k.toLowerCase()})));
fillColor='ff0000'

// =====================================

canvas.addEventListener('click', function(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = rect.height - (event.clientY - rect.top); // Flip Y-axis for WebGL coordinates

    // Check shapes from top (last drawn) to bottom
    for (let i = scene.length - 1; i >= 0; i--) {
        const shape = scene[i];
        if (shape.type === 'item') {
            if (isPointInShape(x, y, shape.vertices)) {
                let j=i;
                for(; j>=0; j--)
                    if(scene[j].type === 'itemBorder')
                        break;
                //
                // Move shape to end of array to bring it to front
                // bringToFrontItem(j);
                //

                // instead just change selected item
                let itemIndex_ = -1;
                for(let k = 0; k<scene.length; k++){
                    if(scene[k].type === "itemBorder")
                        itemIndex_ += 1;
                    if(k===j) {
                        document.querySelector("#shape-index").value = itemIndex_;
                        console.log(itemIndex_);
                        break;
                    }
                }
                break;
            }
        }
    }
});

function isPointInShape(px, py, vertices) {
    let inside = false;
    for (let i = 0, j = vertices.length - 2; i < vertices.length; i += 2) {
        const xi = vertices[i], yi = vertices[i + 1];
        const xj = vertices[j], yj = vertices[j + 1];

        const intersect = ((yi > py) !== (yj > py)) &&
            (px < (xj - xi) * (py - yi) / (yj - yi) + xi);

        if (intersect) inside = !inside;
        j = i; // Update j to previous point
    }
    return inside;
}

// =====================================

// let isDragging = false;
// let startX = 0, startY = 0;
// let deltaX = 0, deltaY = 0;
//
// canvas.addEventListener("mousedown", (event) => {
//     isDragging = true;
//     startX = event.clientX;
//     startY = event.clientY;
// });
//
// canvas.addEventListener("mousemove", (event) => {
//     if (!isDragging) return;
//
//     deltaX = event.clientX - startX;
//     deltaY = -(event.clientY - startY); // Flip Y-axis for WebGL
//
//     let distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);
//     let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI); // Convert to degrees
//
//     if (angle < 0) angle += 360; // Ensure the range is [0, 360]
//
//     console.log(`Dragged: ${distance}px, Angle: ${angle}°`);
// });
//
// canvas.addEventListener("mouseup", () => {
//     isDragging = false;
// });


let startX = 0, startY = 0;
let endX = 0, endY = 0;
let isDragging = false;

canvas.addEventListener("mousedown", (event) => {
    isDragging = true;
    startX = event.clientX;
    startY = event.clientY;
});

canvas.addEventListener("mouseup", (event) => {
    if (!isDragging) return;

    isDragging = false;
    endX = event.clientX;
    endY = event.clientY;

    let deltaX = endX - startX;
    let deltaY = -(endY - startY); // Flip Y-axis for WebGL

    let distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);
    let angle_ = Math.atan2(deltaY, deltaX) * (180 / Math.PI); // Convert to degrees

    if (angle_ < 0) angle_ += 360; // Ensure the range is [0, 360]

    console.log(`Dragged: ${distance}px, Angle: ${angle_}°`);

    if(distance >= MIN_DISPLACEMENT ) {
        displacement = distance;
        angle = angle_;
        changeAngle(1, 0);
        moveBrush();
    }
});

// =====================================

function rotateScene() {
    let centroid = [250, 250];
    let rotationTranslationAngle = document.querySelector("#item-rotation-translation-angle").value;
    let theta = Number(rotationTranslationAngle)*Math.PI/180;
    for(let i=0; i<scene.length; i++) {
        if(scene[i].type === 'itemBorder') {
            for (let j = i; j <= i+scene[i].relatedItemsCount; j += 1) {
                scene[j].vertices = rotatePolygon(scene[j].vertices, theta, centroid);
            }
        }
    }
}

function translateScene() {
    let rotationTranslationAngle = document.querySelector("#item-rotation-translation-angle").value;
    let translationDistance = document.querySelector("#item-translation-distance").value;

    let theta = Number(rotationTranslationAngle)*Math.PI/180;

    for(let i=0; i<scene.length; i++) {
        if(scene[i].type === 'itemBorder') {
            for (let j = i; j <= i+scene[i].relatedItemsCount; j += 1) {
                scene[j].vertices = translatePolygon(scene[j].vertices, theta, translationDistance);
            }
        }
    }
}
