# GlyphLava on hand-written WebGL2, noise computed per cell

**GlyphLava** is drawn by our own WebGL2 code, with no rendering library. It uses two passes:

1. The noise is computed once per grid cell into a small texture.
2. A full-screen pass looks each cell up and draws its glyph from a glyph texture rasterised at the cell's exact size in device pixels, so glyphs stay as sharp as the surrounding SVG/DOM at any screen density.

Visitors who can't or shouldn't run it get a still frame instead. That covers reduced motion, Save-Data, no WebGL2, and the moment before the first frame. The still frame is an SVG rendered at build time from the same noise at t = 0 and applied as a CSS mask over `--accent`. The noise is anchored to the viewport centre so the still frame and the live canvas line up.

The choice came from a benchmark run on 2026-11-27, with rules fixed before the results were seen: hold 60 fps on the weakest device, then widest browser support, then smallest JS. Every candidate drew the chosen look full screen on an RX 6600 XT at 164 Hz, 2560×1333 real pixels:

| Candidate                           | GPU ms/frame | Headroom¹ |    JS (gz) |
| ----------------------------------- | -----------: | --------: | ---------: |
| WebGL2, noise per pixel (previous)  |         2.26 |        8× |     4.9 KB |
| **WebGL2, noise per cell (chosen)** |    **0.175** |  **128×** | **5.2 KB** |
| WebGL2 per cell in a Worker         |         0.17 |      128× |     7.6 KB |
| Hand-written WebGPU, per cell       |        0.214 |       64× |     7.4 KB |
| vgpu (WebGPU), per cell             |            — |       64× |    60.1 KB |
| three.js WebGLRenderer, per cell    |            — |      128× |   138.1 KB |
| three.js WebGPURenderer (TSL)       |            — |       16× |   234.6 KB |

¹ How many full frames fit in one refresh before frames drop.

## Considered Options

- **WebGPU, through vgpu, three.js or by hand**: rejected. For a single full-screen pass it was no faster than WebGL2: the hand-written version was slower and had half the headroom. It also reaches fewer visitors (about 89% against about 97% for WebGL2; disabled by Safari Lockdown Mode; https only) and ships more JS. vgpu has no WebGL2 fallback.
- **three.js on WebGL2**: matched the hand-written version's headroom, but shipped 26× the JS for one rectangle of pixels.
- **Rendering in a Web Worker (OffscreenCanvas)**: the only candidate unaffected by a simulated busy main thread (8 ms of JS per frame). It was rejected under the agreed rules. Every candidate still held 60 fps under that load, the Worker needs OffscreenCanvas on top of WebGL2, and it costs more JS. Revisit if the page around GlyphLava gains heavy main-thread work.
- **Video loop with a poster image**: rejected. A video is stretched to the viewport, which breaks the fixed, pixel-exact cell grid.
- **Inline SVG or CSS animation**: rejected. About 2,000 animated nodes per frame would cost far more than one shader pass.
