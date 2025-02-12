export class ModifiedTurtleGraphics {
    Modes = {
        DRAW: 0,
        SHAPE: 1,
        SCENE: 2,
    };

    constructor(scene, shader, canvas, vec2, mat3) {
        this.scene = scene;
        this.canvas = canvas;
        this.vec2 = vec2;
        this.mat3 = mat3;

        this.displacement = 50;
        this.MIN_DISPLACEMENT = 50;
        this.angle = 0;
        // this.turn = 0;
        this.MIN_TURN = 45;
        this.brushPos = [this.canvas.width/2,this.canvas.height/2];
        this.ongoingShape = [...this.brushPos]
        this.brushOn = true;
        this.brushVisible = true;
        this.fillColor = "ff0000";
        this.shapeCount = -1;
        this.CURSOR = {
            vertices: [
                this.brushPos[0]-10, this.brushPos[1]+5,
                this.brushPos[0]-10, this.brushPos[1]-5,
                this.brushPos[0]+20, this.brushPos[1],
            ],
            color: [0.2, 0.6, 0.1, 1.0],
            angle: 0
        }
        this.maxShapes = 6;

        this.activeMode = 0;

        // =====================================

        this.startX = 0;
        this.startY = 0;
        this.endX = 0;
        this.endY = 0;
        this.isDragging = false;

        // =====================================

        // Cursor
        this.addTriangle(this.CURSOR.vertices, this.CURSOR.color);
        // this.addLineStrip([this.canvas.width/2,0,this.canvas.width/2,this.canvas.height], [0,0,0,1]);  // vertical
        // this.addLineStrip([0,this.canvas.height/2,this.canvas.width,this.canvas.height/2], [0,0,0,1]);  // horizontal
        // this.addLineStrip([0,0,this.canvas.width,this.canvas.height], [0,0,0,1]);    // bottom left to top right
        // this.addLineStrip([0,this.canvas.height,this.canvas.width,0], [0,0,0,1]);    // top left to bottom right
    }

    // =====================================

    addTriangle(vertices, color) {
        this.scene.add({
            type: "triangle",
            vertices: vertices,
            color: color,
            angle: 0,
            centroid: this.computeCentroid(vertices)
        });
    }

    addLineStrip(vertices, color) {
        this.scene.primitives.push({
            type: "lineStrip",
            vertices: vertices,
            color: color
        })
    }

    // =====================================

    clearSceneResetBrush() {
        this.scene.primitives = [this.scene.primitives[0]];
        this.angle = 0;
        this.brushPos = [this.canvas.width/2,this.canvas.height/2];
        this.brushOn = true;
        this.scene.primitives[0].vertices = this.CURSOR.vertices;
        this.scene.primitives[0].centroid = this.computeCentroid(this.CURSOR.vertices);
        this.scene.primitives[0].angle = this.CURSOR.angle;
        this.ongoingShape = [...this.brushPos];
        this.shapeCount = -1;

        document.querySelector("#shape-index").innerHTML = "";
    }


// =====================================

    computeCentroid(vertices) {
        let cx = 0, cy = 0, n = vertices.length / 2;

        for (let i = 0; i < vertices.length; i += 2) {
            cx += vertices[i];
            cy += vertices[i + 1];
        }

        // return this.vec2.fromValues(Math.round(cx / n), Math.round(cy / n));
        return this.vec2.fromValues(cx / n, cy / n);
    }

    rotatePolygon(vertices, theta, centroid) {
        let transform = this.mat3.create();

        this.mat3.translate(transform, transform, this.vec2.fromValues(centroid[0], centroid[1])); // Move to origin
        this.mat3.rotate(transform, transform, theta); // Rotate around Z-axis
        this.mat3.translate(transform, transform, this.vec2.fromValues(-centroid[0], -centroid[1])); // Move back

        let rotatedVertices = [];
        for (let i = 0; i < vertices.length; i += 2) {
            let v = this.vec2.fromValues(vertices[i], vertices[i + 1]);
            this.vec2.transformMat3(v, v, transform);
            rotatedVertices.push(v[0], v[1]);
        }

        return rotatedVertices;
    }

    translatePolygon(vertices, theta, distance) {
        let dx = Math.cos(theta) * distance;
        let dy = Math.sin(theta) * distance;

        let translatedVertices = [];
        for (let i = 0; i < vertices.length; i += 2) {
            translatedVertices.push(vertices[i] + dx, vertices[i + 1] + dy);
        }

        return translatedVertices;
    }

    scalePolygon(vertices, scaleFactor, centroid) {
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

    rotateItem(index, theta) {
        let tempCount = -1;
        let indexInScene = -1;
        for(let i = 0; i < this.scene.primitives.length; i += 1) {
            if(this.scene.primitives[i].type === "itemBorder") {
                tempCount += 1;
                if(tempCount === index) {
                    indexInScene = i;
                    break;
                }
            }
        }

        let verticesForCentroid = this.scene.primitives[indexInScene].vertices;
        let centroid = this.computeCentroid(
            verticesForCentroid[0] === verticesForCentroid[verticesForCentroid.length - 2] &&
            verticesForCentroid[1] === verticesForCentroid[verticesForCentroid.length - 1]
                ? verticesForCentroid.slice(0, -2)  // remove dup to correct centroid calculation
                : verticesForCentroid
        );

        for (let i = indexInScene; i <= indexInScene+this.scene.primitives[indexInScene].relatedItemsCount; i += 1) {
            this.scene.primitives[i].vertices = this.rotatePolygon(this.scene.primitives[i].vertices, theta, centroid);
        }
    }

    translateItem(index, theta, distance) {
        let tempCount = -1;
        let indexInScene = -1;
        for(let i = 0; i < this.scene.primitives.length; i += 1) {
            if(this.scene.primitives[i].type === "itemBorder") {
                tempCount += 1;
                if(tempCount === index) {
                    indexInScene = i;
                    break;
                }
            }
        }

        for (let i = indexInScene; i <= indexInScene+this.scene.primitives[indexInScene].relatedItemsCount; i += 1) {
            this.scene.primitives[i].vertices = this.translatePolygon(this.scene.primitives[i].vertices, theta, distance);
        }
    }

    scaleItem(index, scaleFactor) {
        let tempCount = -1;
        let indexInScene = -1;
        for(let i = 0; i < this.scene.primitives.length; i += 1) {
            if(this.scene.primitives[i].type === "itemBorder") {
                tempCount += 1;
                if(tempCount === index) {
                    indexInScene = i;
                    break;
                }
            }
        }

        let verticesForCentroid = this.scene.primitives[indexInScene].vertices;
        let centroid = this.computeCentroid(
            verticesForCentroid[0] === verticesForCentroid[verticesForCentroid.length - 2] &&
            verticesForCentroid[1] === verticesForCentroid[verticesForCentroid.length - 1]
                ? verticesForCentroid.slice(0, -2)  // remove dup to correct centroid calculation
                : verticesForCentroid
        );

        for (let i = indexInScene; i <= indexInScene+this.scene.primitives[indexInScene].relatedItemsCount; i += 1) {
            this.scene.primitives[i].vertices = this.scalePolygon(this.scene.primitives[i].vertices, scaleFactor, centroid);
        }
    }

    bringToFrontItem(index) {
        const selected = this.scene.primitives.splice(index, this.scene.primitives[index].relatedItemsCount+1);
        this.scene.primitives.push(...selected);
    }

    bringToBackItem(index) {

        const selected = this.scene.primitives.splice(index, this.scene.primitives[index].relatedItemsCount+1);
        // this.scene.primitives.unshift(...selected);
        this.scene.primitives.splice(1, 0, ...selected);
    }

    recolorItem(index, color) {
        for(let i = index+1; i <= index+this.scene.primitives[index].relatedItemsCount; i += 1) {
            this.scene.primitives[i].color = color;
        }
    }

// =====================================
    handleModeChange(index) {
        document.querySelector("#select-mode").value = index;
    }

    handleTurnClick() {
        let newTurn =  document.querySelector('#turn-angle').value;
        this.changeAngle(1, newTurn);
        // this.turn = newTurn;
    }

    handleAngleResetClick() {
        this.changeAngle(1, (360-this.angle)%360);
    }

    changeAngle(sign, _turn=this.MIN_TURN) {
        document.querySelector('#turn-angle').value = sign * _turn;
        this.angle = (this.angle + sign*_turn + 360) % 360

        let theta = (this.angle-this.scene.primitives[0].angle) * Math.PI / 180;

        this.scene.primitives[0].vertices = this.rotatePolygon(this.scene.primitives[0].vertices, theta, this.computeCentroid(this.scene.primitives[0].vertices));
        this.scene.primitives[0].centroid = this.computeCentroid(this.scene.primitives[0].vertices);
        this.scene.primitives[0].angle = this.angle;
    }

    changeDisplacement(sign) {
        this.displacement += 50*sign; this.displacement = this.displacement > 0 ? this.displacement : 50;
        document.querySelector("#displacement").value = this.displacement;
    }

    toggleBrushOn() {
        this.brushOn = !this.brushOn;
        document.querySelector("#brushOn").checked = this.brushOn;
        if(!this.brushOn)
            this.scene.primitives[0].color = [0.9, 0.2, 0.3, 1]
        else
            this.scene.primitives[0].color = this.CURSOR.color;

        // push new done shape, ignore unwanted brush status changes
        if(!this.brushOn && this.ongoingShape.length > 2) {
            // =====================================
            // make it looped shape
            let vertices = [...this.ongoingShape, this.ongoingShape[0], this.ongoingShape[1]];

            let subj_paths = new ClipperLib.Paths();
            let subj_path = new ClipperLib.Path();
            for (let i = 0; i < vertices.length; i += 2) {
                subj_path.push(
                    new ClipperLib.IntPoint(vertices[i], vertices[i + 1]),
                );
            }
            subj_paths.push(subj_path);

            let paths = ClipperLib.Clipper.SimplifyPolygons(subj_paths, ClipperLib.PolyFillType.pftNonZero);

            this.scene.add({
                type: "itemBorder",
                vertices: this.ongoingShape,
                color: [0.0, 0.0, 0.0, 1.0],
                relatedItemsCount: paths.length,
            });

            paths.forEach((path) => {
                this.scene.add({
                    type: "item",
                    vertices: [
                        path.map(v => [v.X, v.Y]),
                    ].flat().flat(),
                    color: [
                        parseInt(this.fillColor.substring(0, 2), 16)/255,
                        parseInt(this.fillColor.substring(2, 4), 16)/255,
                        parseInt(this.fillColor.substring(4, 6), 16)/255,
                        1
                    ]
                });
            });

            // add shape index
            this.shapeCount+=1;
            const newIndexOption = document.createElement("option");
            newIndexOption.value = this.shapeCount; newIndexOption.innerHTML = String(this.shapeCount+1);
            document.querySelector("#shape-index").appendChild(newIndexOption);

            this.ongoingShape = [...this.brushPos];
        }
    }

    toggleBrushVisible() {
        this.brushVisible = !this.brushVisible;
        document.querySelector("#brushVisible").checked = this.brushVisible;

        if(this.brushVisible)
            this.scene.primitives[0].color = this.CURSOR.color;
        else
            this.scene.primitives[0].color = [0, 0, 0, 0];
    }

    changeFillColor() {
        this.fillColor = document.querySelector("#fillColor").value.slice(1);
    }

    changeMaxShapes() {
        if(this.shapeCount > -1) {
            return alert("Can't change max shapes when shapes are present, clear the canvas first!");
        }
        this.maxShapes = document.querySelector("#maxShapes").value;
    }

    moveBrush() {
        if(this.shapeCount === this.maxShapes-1) {
            return alert("Max shapes reached! Can't draw anymore.")
        }
        const x1 = this.brushPos[0];
        const y1 = this.brushPos[1];
        const thetaRadians = this.angle * Math.PI / 180;

        const x2 = x1 + this.displacement * Math.cos(thetaRadians);
        const y2 = y1 + this.displacement * Math.sin(thetaRadians);

        if(this.brushOn) {
            this.ongoingShape.push(x2, y2);
        } else {
            this.ongoingShape = [x2, y2]
        }


        this.brushPos[0] = x2; this.brushPos[1] = y2;

        // move cursor
        this.scene.primitives[0].vertices = this.translatePolygon(this.scene.primitives[0].vertices, thetaRadians, this.displacement);
        this.scene.primitives[0].centroid = this.computeCentroid(this.scene.primitives[0].vertices);
    }

// =====================================

    handleRotateItemClick = () => {
        let index = document.querySelector("#shape-index").value;
        let rotationTranslationAngle = document.querySelector("#item-rotation-translation-angle").value;
        if(!index || !rotationTranslationAngle) console.error("something went wrong");
        this.rotateItem(Number(index), Number(rotationTranslationAngle)*Math.PI/180);
    }

    handleTranslateItemClick() {
        let index = document.querySelector("#shape-index").value;
        let rotationTranslationAngle = document.querySelector("#item-rotation-translation-angle").value;
        let translationDistance = document.querySelector("#item-translation-distance").value;
        if(!index || !rotationTranslationAngle || !translationDistance) console.error("something went wrong");
        this.translateItem(Number(index), Number(rotationTranslationAngle)*Math.PI/180, translationDistance);
    }

    handleScaleItemClick() {
        let index = document.querySelector("#shape-index").value;
        let scaleFactor = document.querySelector("#item-scale-factor").value;
        if(!index || !scaleFactor) console.error("something went wrong");
        this.scaleItem(Number(index), Number(scaleFactor));
    }

    handleBringToFrontItemClick() {
        let index = document.querySelector("#shape-index").value;
        let tempCount = -1;
        for(let i = 0; i < this.scene.primitives.length; i++) {
            if(this.scene.primitives[i].type === "itemBorder") {
                tempCount++;
                if(tempCount === Number(index)) {
                    this.bringToFrontItem(i);
                    break;
                }
            }
        }

        document.querySelector("#shape-index").value = this.shapeCount;
    }

    handleBringToBackItemClick() {
        let index = document.querySelector("#shape-index").value;
        let tempCount = -1;
        for(let i = 0; i < this.scene.primitives.length; i++) {
            if(this.scene.primitives[i].type === "itemBorder") {
                tempCount++;
                if(tempCount === Number(index)) {
                    this.bringToBackItem(i);
                    break;
                }
            }
        }

        document.querySelector("#shape-index").value = 0;
    }

    handleRecolorClick(removeColor=false) {
        let index = document.querySelector("#shape-index").value;
        let tempCount = -1;
        for(let i = 0; i < this.scene.primitives.length; i++) {
            if(this.scene.primitives[i].type === "itemBorder") {
                tempCount++;
                if(tempCount === Number(index)) {
                    // remove color or change color
                    let color_ = !removeColor ? [
                            parseInt(this.fillColor.substring(0, 2), 16)/255,
                            parseInt(this.fillColor.substring(2, 4), 16)/255,
                            parseInt(this.fillColor.substring(4, 6), 16)/255,
                            1
                        ] :
                        [1, 0.0, 0.0, 0.0];
                    this.recolorItem(i, color_);
                    break;
                }
            }
        }
    }

// =====================================

    isPointInShape(px, py, vertices) {
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

    rotateScene() {
        let centroid = [this.canvas.width/2,this.canvas.height/2];
        let rotationTranslationAngle = document.querySelector("#item-rotation-translation-angle").value;
        let theta = Number(rotationTranslationAngle)*Math.PI/180;
        for(let i=0; i<this.scene.primitives.length; i++) {
            if(this.scene.primitives[i].type === 'itemBorder') {
                for (let j = i; j <= i+this.scene.primitives[i].relatedItemsCount; j += 1) {
                    this.scene.primitives[j].vertices = this.rotatePolygon(this.scene.primitives[j].vertices, theta, centroid);
                }
            }
        }
    }

    translateScene() {
        let rotationTranslationAngle = document.querySelector("#item-rotation-translation-angle").value;
        let translationDistance = document.querySelector("#item-translation-distance").value;

        let theta = Number(rotationTranslationAngle)*Math.PI/180;

        for(let i=0; i<this.scene.primitives.length; i++) {
            if(this.scene.primitives[i].type === 'itemBorder') {
                for (let j = i; j <= i+this.scene.primitives[i].relatedItemsCount; j += 1) {
                    this.scene.primitives[j].vertices = this.translatePolygon(this.scene.primitives[j].vertices, theta, translationDistance);
                }
            }
        }
    }

// =====================================


    handleKeyPress = (event) => {
        const key = event.key.toLowerCase();
        const selectedMode = Number(document.querySelector("#select-mode").value);

        if (key === "m") {
            this.handleModeChange((selectedMode+1)%3);
        }

        if(selectedMode === this.Modes.DRAW) {
            switch (key) {
                case "b": this.toggleBrushOn(); break;
                case "v": this.toggleBrushVisible(); break;

                case "arrowleft": this.changeAngle(1); break;
                case "arrowright": this.changeAngle(-1); break;
                case "r": this.handleAngleResetClick(); break;

                case "arrowup": this.changeDisplacement(1); break;
                case "arrowdown": this.changeDisplacement(-1); break;

                case "w": this.moveBrush(); break;
            }
        } else if(selectedMode === this.Modes.SHAPE) {
            if(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].includes(key) &&
                Number(key) <= this.shapeCount
            ) {
                document.querySelector("#shape-index").value = key;
            }

            switch (key) {
                case "w": this.handleTranslateItemClick(); break;

                case "arrowright": this.handleRotateItemClick(); break;

                case "s": this.handleScaleItemClick(); break;

                case "f": this.handleBringToFrontItemClick(); break;
                case "b": this.handleBringToBackItemClick(); break;

                case "c": this.handleRecolorClick(); break;
                case "r": this.handleRecolorClick(true); break;
            }
        } else if(selectedMode === this.Modes.SCENE) {
            switch (key) {
                case "w": this.translateScene(); break;

                case "arrowright": this.rotateScene(); break;

                case "c": this.clearSceneResetBrush(); break;
            }
        }
    }


    // =====================================

    handleCanvasClick = (event) => {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = rect.height - (event.clientY - rect.top); // Flip Y-axis for WebGL coordinates

        // Check shapes from top (last drawn) to bottom
        for (let i = this.scene.primitives.length - 1; i >= 0; i--) {
            const shape = this.scene.primitives[i];
            if (shape.type === 'item') {
                if (this.isPointInShape(x, y, shape.vertices)) {
                    let j=i;
                    for(; j>=0; j--)
                        if(this.scene.primitives[j].type === 'itemBorder')
                            break;

                    // change selected item
                    let itemIndex_ = -1;
                    for(let k = 0; k<this.scene.primitives.length; k++){
                        if(this.scene.primitives[k].type === "itemBorder")
                            itemIndex_ += 1;
                        if(k===j) {
                            document.querySelector("#shape-index").value = itemIndex_;
                            break;
                        }
                    }
                    break;
                }
            }
        }
    }

    handleCanvasMouseDown = (event) => {
        this.isDragging = true;
        this.startX = event.clientX;
        this.startY = event.clientY;
    }

    handleCanvasMouseUp = (event) => {
        if (!this.isDragging) return;

        this.isDragging = false;
        this.endX = event.clientX;
        this.endY = event.clientY;

        let deltaX = this.endX - this.startX;
        let deltaY = -(this.endY - this.startY); // Flip Y-axis for WebGL

        let distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);
        let angle_ = Math.atan2(deltaY, deltaX) * (180 / Math.PI); // Convert to degrees

        if (angle_ < 0) angle_ += 360; // Ensure the range is [0, 360]

        if(distance >= this.MIN_DISPLACEMENT ) {
            this.displacement = distance;
            this.angle = angle_;
            this.changeAngle(1, 0);
            this.moveBrush();
        }
    }

    addEventListeners() {
        document.addEventListener("keydown", this.handleKeyPress);

        this.canvas.addEventListener('click', this.handleCanvasClick);

        this.canvas.addEventListener("mousedown", this.handleCanvasMouseDown);

        this.canvas.addEventListener("mouseup", this.handleCanvasMouseUp);

        document.querySelector("#brushOn").onchange = () => { this.toggleBrushOn(); };
        document.querySelector("#brushVisible").onchange = () => { this.toggleBrushVisible(); };
        document.querySelector("#fillColor").onchange = () => { this.changeFillColor(); };
        document.querySelector("#displacement").onchange = (e) => { this.displacement = Number(e.target.value); };

        document.querySelector("#btn-changeMaxShapes").onclick = () => { this.changeMaxShapes(); };
        document.querySelector("#btn-handleTurnClick").onclick = () => { this.handleTurnClick(); };
        document.querySelector("#btn-handleMoveClick").onclick = () => { this.moveBrush(); };
        document.querySelector("#btn-handleAngleResetClick").onclick = () => { this.handleAngleResetClick(); };
        document.querySelector("#btn-handleRotateItemClick").onclick = () => { this.handleRotateItemClick(); };
        document.querySelector("#btn-handleTranslateItemClick").onclick = () => { this.handleTranslateItemClick(); };
        document.querySelector("#btn-handleScaleItemClick").onclick = () => { this.handleScaleItemClick(); };
        document.querySelector("#btn-handleBringToFrontItemClick").onclick = () => { this.handleBringToFrontItemClick(); };
        document.querySelector("#btn-handleBringToBackItemClick").onclick = () => { this.handleBringToBackItemClick(); };
        document.querySelector("#btn-handleRecolorClick").onclick = () => { this.handleRecolorClick(); };
        document.querySelector("#btn-handleRecolorClick-noColor").onclick = () => { this.handleRecolorClick(true); };
        document.querySelector("#btn-rotateScene").onclick = () => { this.rotateScene(); };
        document.querySelector("#btn-translateScene").onclick = () => { this.translateScene(); };
        document.querySelector("#btn-clearSceneResetBrush").onclick = () => { this.clearSceneResetBrush(); };
    }

}