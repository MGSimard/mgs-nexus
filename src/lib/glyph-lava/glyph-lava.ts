import { GLYPHS } from "./glyphs";
import { CELL_TO_NOISE, GLYPH_COUNT, LOOK } from "./look";
import { GLYPH_SHADER, NOISE_SHADER, VERTEX_SHADER } from "./shaders";

type Gl = WebGL2RenderingContext;

const compile = (gl: Gl, type: GLenum, source: string) => {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("glyph-lava: createShader failed");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? "");
  return shader;
};

const createProgram = (gl: Gl, fragment: string) => {
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "");
  return { program, u: (name: string) => gl.getUniformLocation(program, name) };
};

const createTexture = (gl: Gl, filter: GLenum) => {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
};

const loadGlyph = async (svg: string) => {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  const image = new Image();
  image.src = url;
  try {
    await image.decode();
  } finally {
    URL.revokeObjectURL(url);
  }
  return image;
};

const drawAtlas = (images: HTMLImageElement[], cell: number) => {
  const cols = Math.ceil(Math.sqrt(images.length));
  const rows = Math.ceil(images.length / cols);
  const canvas = document.createElement("canvas");
  canvas.width = cols * cell;
  canvas.height = rows * cell;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("glyph-lava: 2d context unavailable");
  const pad = cell * LOOK.padding;
  images.forEach((image, i) => {
    ctx.drawImage(image, (i % cols) * cell + pad, Math.floor(i / cols) * cell + pad, cell - pad * 2, cell - pad * 2);
  });
  return { canvas, cols, rows };
};

const resolveColor = (css: string): [number, number, number] => {
  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!ctx) return [1, 1, 1];
  ctx.fillStyle = css;
  ctx.fillRect(0, 0, 1, 1);
  const [r = 255, g = 255, b = 255] = ctx.getImageData(0, 0, 1, 1).data;
  return [r / 255, g / 255, b / 255];
};

export interface GlyphLavaHandle {
  stop(): void;
}

export const mountGlyphLava = async (
  canvas: HTMLCanvasElement,
  events: { onFirstFrame(): void; onLost(): void }
): Promise<GlyphLavaHandle | null> => {
  const gl = canvas.getContext("webgl2", { antialias: false, premultipliedAlpha: true, alpha: true });
  if (!gl) return null;

  const noise = createProgram(gl, NOISE_SHADER);
  const glyph = createProgram(gl, GLYPH_SHADER);
  const images = await Promise.all(GLYPHS.map(loadGlyph));
  const atlasTexture = createTexture(gl, gl.LINEAR);
  const noiseTexture = createTexture(gl, gl.NEAREST);
  const framebuffer = gl.createFramebuffer();

  gl.useProgram(noise.program);
  gl.uniform1f(noise.u("uCellToNoise"), CELL_TO_NOISE);
  gl.uniform1i(noise.u("uLayers"), LOOK.layers);
  gl.uniform1f(noise.u("uRemapMin"), LOOK.remapMin);
  gl.uniform1f(noise.u("uRemapMax"), LOOK.remapMax);
  gl.uniform1f(noise.u("uCount"), GLYPH_COUNT);
  gl.useProgram(glyph.program);
  gl.uniform3fv(glyph.u("uColor"), resolveColor(getComputedStyle(canvas).color));
  gl.uniform1i(glyph.u("uNoise"), 0);
  gl.uniform1i(glyph.u("uAtlas"), 1);

  let atlasCell = 0;
  let cols = 1;
  let rows = 1;

  const layout = () => {
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    const cell = Math.max(4, Math.round(LOOK.cellSize * dpr));
    const cx = Math.floor(width / 2);
    const cy = Math.floor(height / 2);
    const left = Math.ceil(cx / cell);
    const top = Math.ceil(cy / cell);
    cols = left + Math.ceil((width - cx) / cell);
    rows = top + Math.ceil((height - cy) / cell);

    canvas.width = width;
    canvas.height = height;

    if (cell !== atlasCell) {
      atlasCell = cell;
      const atlas = drawAtlas(images, cell);
      gl.bindTexture(gl.TEXTURE_2D, atlasTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas.canvas);
      gl.useProgram(glyph.program);
      gl.uniform1f(glyph.u("uCols"), atlas.cols);
      gl.uniform1f(glyph.u("uRows"), atlas.rows);
    }

    gl.bindTexture(gl.TEXTURE_2D, noiseTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, cols, rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, noiseTexture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.useProgram(noise.program);
    gl.uniform2f(noise.u("uOrigin"), -left, -top);
    gl.useProgram(glyph.program);
    gl.uniform2f(glyph.u("uResolution"), width, height);
    gl.uniform2f(glyph.u("uCenter"), cx, cy);
    gl.uniform2f(glyph.u("uOrigin"), -left, -top);
    gl.uniform1f(glyph.u("uCell"), cell);
  };

  let time = 0;
  const draw = () => {
    gl.useProgram(noise.program);
    gl.uniform1f(noise.u("uTime"), time);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.viewport(0, 0, cols, rows);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.useProgram(glyph.program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, noiseTexture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, atlasTexture);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let frame = 0;
  let last = 0;
  let visible = true;
  let lost = false;
  let first = true;

  const loop = (now: number) => {
    if (last > 0) time += (Math.min(now - last, 100) / 1000) * LOOK.speed;
    last = now;
    draw();
    if (first) {
      first = false;
      events.onFirstFrame();
    }
    frame = requestAnimationFrame(loop);
  };

  const sync = () => {
    cancelAnimationFrame(frame);
    last = 0;
    if (!lost && visible && !document.hidden && !reducedMotion.matches) frame = requestAnimationFrame(loop);
  };

  const resizeObserver = new ResizeObserver(() => {
    if (lost) return;
    layout();
    draw();
  });
  const intersectionObserver = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? true;
    sync();
  });
  const onLost = (event: Event) => {
    event.preventDefault();
    lost = true;
    sync();
    events.onLost();
  };

  layout();
  resizeObserver.observe(canvas);
  intersectionObserver.observe(canvas);
  reducedMotion.addEventListener("change", sync);
  document.addEventListener("visibilitychange", sync);
  canvas.addEventListener("webglcontextlost", onLost);
  sync();

  return {
    stop: () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      reducedMotion.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
      canvas.removeEventListener("webglcontextlost", onLost);
    },
  };
};
