import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { resolveShader } from "@vgpu/wgsl/runtime";
import { prepareShader } from "@vgpu/wgsl/prepare";
import { effect, init, target } from "vgpu/node";

const OUTPUT_SIZE = 2048;
const SUPERSAMPLE = 2;

const params = {
  light: [-0.8, -0.45, 0.4],
  seed: 7,
  lime: 0.065,
  relief: 0.035,
  edge: 0.025,
  grain: 0.07,
  shatter: 1,
};

const output = process.argv[2] ?? fileURLToPath(new URL("../../public/assets/planet.webp", import.meta.url));
const entry = fileURLToPath(new URL("./planet.wgsl", import.meta.url));
const prepared = prepareShader(await resolveShader({ entry }), entry);

const size = OUTPUT_SIZE * SUPERSAMPLE;
const gpu = await init();
const idTarget = target(gpu, { size: [2, 1] });
const planet = effect(gpu, prepared, {
  set: { params: { ...params, size, mode: 1, idA: [0, 0, 0, 0], idB: [0, 0, 0, 0] } },
});
planet.draw(idTarget);
const ids = await idTarget.color.read({ mipLevel: 0, region: "all" });
const shardId = (offset: number) => [...ids.slice(offset, offset + 3)].map((v) => v - 128).concat(0);

const colorTarget = target(gpu, { size: [size, size] });
planet.set({ params: { mode: 0, idA: shardId(0), idB: shardId(4) } });
planet.draw(colorTarget);
const pixels = await colorTarget.color.read({ mipLevel: 0, region: "all" });
gpu.dispose();

await sharp(Buffer.from(pixels.buffer, pixels.byteOffset, pixels.byteLength), {
  raw: { width: size, height: size, channels: 4 },
})
  .resize(OUTPUT_SIZE, OUTPUT_SIZE, { kernel: "lanczos3" })
  .webp({ quality: 85, alphaQuality: 90 })
  .toFile(output);

console.log(output);
