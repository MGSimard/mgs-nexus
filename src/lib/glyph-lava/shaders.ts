export const VERTEX_SHADER = `#version 300 es
void main() {
  vec2 corner = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}
`;

export const NOISE_SHADER = `#version 300 es
precision highp float;

uniform vec2 uOrigin;
uniform float uCellToNoise;
uniform float uTime;
uniform int uLayers;
uniform float uRemapMin;
uniform float uRemapMax;
uniform float uCount;

out vec4 outColor;

vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289((x * 34.0 + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 g0 = vec3(a0.xy, h.x);
  vec3 g1 = vec3(a0.zw, h.y);
  vec3 g2 = vec3(a1.xy, h.z);
  vec3 g3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(g0, g0), dot(g1, g1), dot(g2, g2), dot(g3, g3)));
  g0 *= norm.x; g1 *= norm.y; g2 *= norm.z; g3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(g0, x0), dot(g1, x1), dot(g2, x2), dot(g3, x3)));
}

void main() {
  vec2 cell = floor(gl_FragCoord.xy) + uOrigin;
  float sum = 0.0;
  for (int i = 0; i < 8; i++) {
    if (i >= uLayers) break;
    float span = exp2(float(i));
    vec2 block = (floor(cell / span) + 0.5) * span;
    sum += (snoise(vec3(block * uCellToNoise, uTime)) * 0.5 + 0.5) / float(uLayers);
  }
  float level = clamp((sum - uRemapMin) / (uRemapMax - uRemapMin), 0.0, 1.0);
  float index = min(floor(level * uCount), uCount - 1.0);
  outColor = vec4(index / 255.0, 0.0, 0.0, 1.0);
}
`;

export const GLYPH_SHADER = `#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform vec2 uCenter;
uniform vec2 uOrigin;
uniform float uCell;
uniform float uCols;
uniform float uRows;
uniform vec3 uColor;
uniform sampler2D uNoise;
uniform sampler2D uAtlas;

out vec4 outColor;

void main() {
  vec2 pixel = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y) - uCenter;
  vec2 cell = floor(pixel / uCell);
  float index = floor(texelFetch(uNoise, ivec2(cell - uOrigin), 0).r * 255.0 + 0.5);
  vec2 slot = vec2(mod(index, uCols), floor(index / uCols));
  vec2 uv = (slot + fract(pixel / uCell)) / vec2(uCols, uRows);
  float alpha = texture(uAtlas, uv).a;
  outColor = vec4(uColor * alpha, alpha);
}
`;
