import {vec2, mat3} from "./vendor/gl-matrix";
import "./vendor/clipper.js";
import "./vendor/earcut.min.js";

import {vertexShaderSrc} from "./shaders/vertex.js";
import {fragmentShaderSrc} from "./shaders/fragment.js";
import {WebGLRenderer} from "./lib/renderer.js";
import {Shader} from "./lib/shader.js";


const renderer = new WebGLRenderer();
document.body.prepend(renderer.domElement);
renderer.setSize(500, 500);
renderer.enableTransparency();


// REMOVE
const gl = renderer.gl;
const canvas = renderer.domElement;
// -----

const shader = new Shader(
    renderer.glContext(),
    vertexShaderSrc,
    fragmentShaderSrc
);
shader.use();
shader.setUniform2f("u_resolution", [canvas.width, canvas.height]);


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
let maxShapes = 6;

function addTriangle(vertices, color) {
    scene.push({
        type: "triangle",
        vertices: vertices,
        color: color,
        angle: 0,
    });
}


function drawTriangle(vertices, color) {
    shader.fillAttributeData("a_position", 2, 0, 0);

    shader.bindArrayBuffer(shader.vertexAttributesBuffer, new Float32Array(vertices));

    shader.setUniform4f("u_color", color);
    shader.drawArrays(3);

    shader.bindArrayBuffer(shader.vertexAttributesBuffer, new Float32Array([...vertices, vertices[0], vertices[1]]));

    shader.setUniform4f("u_color", [0, 0, 0, color[3]]);
    shader.drawArrays(vertices.length/2 + 1, gl.LINE_STRIP)

    shader.bindArrayBuffer(shader.vertexAttributesBuffer, new Float32Array(computeCentroid(vertices)));

    shader.drawArrays(1, gl.POINTS);
}

function drawLineStrip(vertices, color) {
    shader.fillAttributeData("a_position", 2, 0, 0);

    shader.bindArrayBuffer(shader.vertexAttributesBuffer, new Float32Array(vertices));

    shader.setUniform4f("u_color", color);
    shader.drawArrays(vertices.length/2, gl.LINE_STRIP)
}

function drawItem(vertices, color) {
    shader.fillAttributeData("a_position", 2, 0, 0);

    shader.bindArrayBuffer(shader.vertexAttributesBuffer,new Float32Array(vertices));

    const indices = earcut.default(vertices);
    shader.bindElementArrayBuffer(shader.indexBuffer, new Uint16Array(indices));

    shader.setUniform4f("u_color", color);
    shader.drawElements(indices.length)
}

// =====================================

function render() {
    for(let i = 1; i < scene.length; i++) {
        let item = scene[i];

        switch (item.type) {
            case "triangle":
                drawTriangle(item.vertices, item.color);
                break;
            case "item":
                drawItem(item.vertices, item.color);
                break;
            case "itemBorder":
                drawLineStrip(item.vertices, item.color);
                break;
        }
    }

    // ongoing shape
    drawLineStrip(ongoingShape, onGroundShapeOutlineColor);

    // cursor
    if(scene.length > 0)
        drawTriangle(scene[0].vertices, scene[0].color);
}

export function clearSceneResetBrush() {
    scene = [scene[0]];
    angle = 0;
    brushPos = [250,250];
    brushOn = true;
    scene[0].vertices = CURSOR.vertices;
    scene[0].angle = CURSOR.angle;
    ongoingShape = [...brushPos];
    shapeCount = -1;

    document.querySelector("#shape-index").innerHTML = "";
}


// =====================================

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
    displacement += 50*sign; displacement = displacement > 0 ? displacement : 50;
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

                // change selected item
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

// =====================================

document.querySelector("#brushOn").onchange = () => { toggleBrushOn(); };
document.querySelector("#brushVisible").onchange = () => { toggleBrushVisible(); };
document.querySelector("#fillColor").onchange = () => { changeFillColor(); };
document.querySelector("#displacement").onchange = (e) => { displacement = Number(e.target.value); };

document.querySelector("#btn-changeMaxShapes").onclick = () => { changeMaxShapes(); };
document.querySelector("#btn-handleTurnClick").onclick = () => { handleTurnClick(); };
document.querySelector("#btn-handleAngleResetClick").onclick = () => { handleAngleResetClick(); };
document.querySelector("#btn-handleRotateItemClick").onclick = () => { handleRotateItemClick(); };
document.querySelector("#btn-handleTranslateItemClick").onclick = () => { handleTranslateItemClick(); };
document.querySelector("#btn-handleScaleItemClick").onclick = () => { handleScaleItemClick(); };
document.querySelector("#btn-handleBringToFrontItemClick").onclick = () => { handleBringToFrontItemClick(); };
document.querySelector("#btn-handleBringToBackItemClick").onclick = () => { handleBringToBackItemClick(); };
document.querySelector("#btn-handleRecolorClick").onclick = () => { handleRecolorClick(); };
document.querySelector("#btn-handleRecolorClick-noColor").onclick = () => { handleRecolorClick(true); };
document.querySelector("#btn-rotateScene").onclick = () => { rotateScene(); };
document.querySelector("#btn-translateScene").onclick = () => { translateScene(); };
document.querySelector("#btn-clearSceneResetBrush").onclick = () => { clearSceneResetBrush(); };


// =====================================

function animation() {
    renderer.clear(200, 200, 200, 100);
    render();
}

renderer.setAnimationLoop(animation);