const canvas = document.getElementById("window");

/** @type {WebGLRenderingContext} */
const gl = canvas.getContext("webgl2");

function compileShader(gl, type, shaderSource) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, shaderSource);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.log(gl.getShaderInfoLog(shader));
    }
    return shader;
}

const positions = [
    // Front face
    -1.0, -1.0,  1.0,
     1.0, -1.0,  1.0,
     1.0,  1.0,  1.0,
    -1.0,  1.0,  1.0,

    // Back face
    -1.0, -1.0, -1.0,
    -1.0,  1.0, -1.0,
     1.0,  1.0, -1.0,
     1.0, -1.0, -1.0,

     // Top face
    -1.0,  1.0, -1.0,
    -1.0,  1.0,  1.0,
     1.0,  1.0,  1.0,
     1.0,  1.0, -1.0,

     // Bottom face
    -1.0, -1.0, -1.0,
     1.0, -1.0, -1.0,
     1.0, -1.0,  1.0,
    -1.0, -1.0,  1.0,

    // Right face
     1.0, -1.0, -1.0,
     1.0,  1.0, -1.0,
     1.0,  1.0,  1.0,
     1.0, -1.0,  1.0,

     // Left face
    -1.0, -1.0, -1.0,
    -1.0, -1.0,  1.0,
    -1.0,  1.0,  1.0,
    -1.0,  1.0, -1.0,
];

const vsSource = `#version 300 es
in vec3 pos;
uniform mat4 modelMatrix;
uniform mat4 projectionMatrix;

out vec3 color;

void main() {
    color = pos;
    gl_Position = projectionMatrix * modelMatrix * vec4(pos, 1);
}
`;

const fsSource = `#version 300 es
precision mediump float;

in vec3 color;

out vec4 fragColor;

// Hash without sine: https://www.shadertoy.com/view/4djSRW
vec3 rand(vec3 p) {
    p = fract(p * vec3(.1031, .1030, .0973));
    p += dot(p, p.yxz+33.33);
    return fract((p.xxy + p.yxx)*p.zyx);
}

vec3 voronoi(vec3 pos, float scale) {
    float dist = 8.0;
    vec3 id = floor(pos * scale);
    vec3 grid = fract(pos * scale);
    vec3 out_col = vec3(0.0);
    for (int k = -2; k < 2; ++k) {
        for (int j = -2; j < 2; ++j) {
            for (int i = -2; i < 2; ++i) {
                vec3 off = vec3(i, j, k);
                vec3 r = grid - rand(id + off) - off;
                dist = min(dist, length(r));
            }
        }
    }
    return vec3(dist);
}

void main() {
    // vec3 col = vec3(length(max((abs(color) - 0.8)/0.8, 0.0)));
    vec3 col = voronoi(color, 5.0);
    fragColor = vec4(col, 1);
}
`;

const vs = compileShader(gl, gl.VERTEX_SHADER, vsSource);
const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSource);

const program = gl.createProgram();
gl.attachShader(program, vs);
gl.attachShader(program, fs);
gl.linkProgram(program);

const vertexPosition = gl.getAttribLocation(program, "pos");
const uProjectionMatrix = gl.getUniformLocation(program, "projectionMatrix");
const uModelMatrix = gl.getUniformLocation(program, "modelMatrix");
console.log("Hello there");
const posBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

const indexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

const indices = [
  0,  1,  2,      0,  2,  3,    // front
  4,  5,  6,      4,  6,  7,    // back
  8,  9,  10,     8,  10, 11,   // top
  12, 13, 14,     12, 14, 15,   // bottom
  16, 17, 18,     16, 18, 19,   // right
  20, 21, 22,     20, 22, 23,   // left
];

gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(indices), gl.STATIC_DRAW);

let lastTime = 0;
let cubeRotation = 0;
function update(time) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let deltaTime = time - lastTime;
    lastTime = time;
    const fieldOfView = 45 * Math.PI / 180;
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;
    const mat4 = glMatrix.mat4;
    const projectionMatrix = mat4.create();

    cubeRotation += (deltaTime * 0.001) % 360;

    mat4.perspective(projectionMatrix,
                     fieldOfView,
                     aspect,
                     zNear,
                     zFar);

    const modelViewMatrix = mat4.create();
    mat4.translate(modelViewMatrix, modelViewMatrix, [0.0, 0.0, -6.0]);
    mat4.rotate(modelViewMatrix, modelViewMatrix, cubeRotation, [0, 0, 1]);
    mat4.rotate(modelViewMatrix, modelViewMatrix, cubeRotation * 0.7, [0, 1, 0]);

    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.vertexAttribPointer(vertexPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vertexPosition);
    gl.useProgram(program);

    gl.uniformMatrix4fv(
        uProjectionMatrix,
        false,
        projectionMatrix);
    gl.uniformMatrix4fv(
        uModelMatrix,
        false,
        modelViewMatrix);

    gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
    requestAnimationFrame(update);
} update(0);
