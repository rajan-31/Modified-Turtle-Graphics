export class Shader {
    constructor(gl, vertexShaderSrc, fragmentShaderSrc) {
        this.gl = gl;
        this.vertexShaderSrc = vertexShaderSrc;
        this.fragmentShaderSrc = fragmentShaderSrc;

        this.program = this.link(
            this.compile(gl.VERTEX_SHADER, this.vertexShaderSrc),
            this.compile(gl.FRAGMENT_SHADER, this.fragmentShaderSrc)
        );

        this.vertexAttributesBuffer = this.createBuffer();
        this.indexBuffer = this.createBuffer();

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexAttributesBuffer);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    }

    compile(type, shaderSrc) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, shaderSrc);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            throw new Error(this.gl.getShaderInfoLog(shader));
        }

        return shader;
    }

    link(vertexShader, fragmentShader) {
        const program = this.gl.createProgram();
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);

        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            throw new Error(this.gl.getProgramInfoLog(program));
        }

        return program;
    }

    use() {
        this.gl.useProgram(this.program);
    }

    // =====================================

    attribute(attributeName) {
        return this.gl.getAttribLocation(this.program, attributeName);
    }

    uniform(uniformName) {
        return this.gl.getUniformLocation(this.program, uniformName);
    }

    setUniform2f(uniformName, vec2) {
        const uniformLocation = this.uniform(uniformName);
        this.gl.uniform2f(uniformLocation, vec2[0], vec2[1]);
    }

    setUniform4f(uniformName, vec4) {
        const uniformLocation = this.uniform(uniformName);
        this.gl.uniform4f(uniformLocation, vec4[0], vec4[1], vec4[2], vec4[3]);
    }

    createBuffer() {
        const buffer = this.gl.createBuffer();
        if (!buffer) {
            throw new Error("Buffer for vertex attributes could not be allocated");
        }
        return buffer;
    }

    fillAttributeData(attributeName, /*data,*/ elementPerAttribute, stride, offset) {
        // Get attribute location and enable it
        const index = this.attribute(attributeName);
        this.gl.enableVertexAttribArray(index);

        // this.gl.vertexAttribPointer(data, elementPerAttribute, this.gl.FLOAT, false, stride, offset);

        // preferred way - we can use the index provided by the graphics card instead of setting the index ourselves;
        // this avoids the re-linking of the shader program.
        this.gl.vertexAttribPointer(index, elementPerAttribute, this.gl.FLOAT, false, stride, offset);

    }

    bindArrayBuffer(buffer, data) {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, data, this.gl.DYNAMIC_DRAW);
    }

    bindElementArrayBuffer(buffer, data) {
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, data, this.gl.DYNAMIC_DRAW);
    }

    drawArrays(numberOfElements, mode=this.gl.TRIANGLES) {
        this.gl.drawArrays(mode, 0, numberOfElements);
    }

    drawElements(numberOfIndices, mode=this.gl.TRIANGLES) {
        this.gl.drawElements(mode, numberOfIndices, this.gl.UNSIGNED_SHORT, 0);
    }
}