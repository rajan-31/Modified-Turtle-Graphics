export const vertexShaderSrc = `
    attribute vec3 a_position;
    uniform vec2 u_resolution;
    
    void main() {
        vec2 ndc = (a_position.xy / u_resolution) * 2.0 - 1.0;
        gl_Position = vec4(ndc.x, ndc.y, a_position.z, 1.0);
        gl_PointSize = 3.0;
    }
`