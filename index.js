import {vec2, mat3} from "./vendor/gl-matrix";
import "./vendor/clipper.js";
import "./vendor/earcut.min.js";

import {vertexShaderSrc} from "./shaders/vertex.js";
import {fragmentShaderSrc} from "./shaders/fragment.js";
import {WebGLRenderer} from "./lib/renderer.js";
import {Shader} from "./lib/shader.js";
import {Scene} from "./lib/scene.js";
import {ModifiedTurtleGraphics} from "./lib/modifiedTurtleGraphics.js";

import {Test1} from "./test/test1.js";

// =====================================
//                  SETUP
// =====================================

const renderer = new WebGLRenderer(earcut);
document.body.prepend(renderer.domElement);
renderer.enableTransparency();


const shader = new Shader(renderer.glContext(), vertexShaderSrc, fragmentShaderSrc);
shader.use();

renderer.setSize(500, 500, shader);


const scene = new Scene(shader);


const modifiedTurtleGraphics = new ModifiedTurtleGraphics(scene, shader, renderer.domElement, vec2, mat3);
modifiedTurtleGraphics.addEventListeners();

// =====================================
//                  Test
// =====================================

/* Uncomment below lines to mock key presses */
const test1 = new Test1(modifiedTurtleGraphics);
test1.mockKeyPresses();

// =====================================
//          Animation Loop
// =====================================

function animation() {
    renderer.clear(200, 200, 200, 100);
    renderer.render(scene, shader, modifiedTurtleGraphics.ongoingShape);
}

renderer.setAnimationLoop(animation);