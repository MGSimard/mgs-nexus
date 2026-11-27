import {
  createResize,
  createViewport,
  css,
  definePrimitive,
  live,
  type ResizeBox,
  type ResizeDraft,
  type Viewport,
} from "@ui-sdk/core";

export type FrameWidth = number | "full";

export type FrameChange = ResizeBox & { full: boolean };

type StageOptions = {
  onFrameChange?: (frame: FrameChange) => void;
  onZoomChange?: (zoom: number) => void;
};

type Point = { x: number; y: number };

const PADDING = 32;
const FRAME = "frame";

export const stage = definePrimitive({
  name: "schema-stage",
  options: { onFrameChange: "callback", onZoomChange: "callback" },
  state: (_options: StageOptions) => ({
    viewport: { x: PADDING, y: PADDING, zoom: 1 } as Viewport,
    frame: { x: 0, y: 0, width: 1440, height: 480 } as ResizeBox,
    resizing: null as ResizeDraft | null,
    pointer: null as Point | null,
    full: true,
    autoHeight: true,
  }),
  live: ["viewport", "resizing", "pointer"],
  api: (context) => {
    const surface = () => context.element("surface");

    const commit = (frame: ResizeBox, extra: { autoHeight?: boolean; full?: boolean } = {}) => {
      context.store.set({ frame, ...extra });
      context.options().onFrameChange?.({ ...frame, full: context.store.get().full });
    };

    const viewport = createViewport(context, {
      key: "viewport",
      surface,
      minZoom: () => 0.1,
      maxZoom: () => 4,
      set: (value) => {
        context.store.set({ viewport: value });
        context.options().onZoomChange?.(value.zoom);
        return true;
      },
    });

    const resize = createResize(context, {
      boxes: (state) => ({ [FRAME]: state.frame }),
      draft: "resizing",
      set: (value) => {
        const previous = context.store.get();
        const frame = value[FRAME]!;
        commit(frame, {
          full: false,
          autoHeight: previous.autoHeight && frame.height === previous.frame.height,
        });
        return true;
      },
      min: () => ({ width: 120, height: 80 }),
      step: () => 1,
      largeStep: () => 8,
      scale: () => context.store.get().viewport.zoom,
      label: () => "Frame",
    });

    const available = () => (surface()?.clientWidth ?? 0) - PADDING * 2;

    const place = (zoom: number) => {
      const el = surface();
      if (!el) return;
      const { width } = context.store.get().frame;
      viewport.setViewport({ x: (el.clientWidth - width * zoom) / 2, y: PADDING, zoom }, { reason: "imperative" });
    };

    const fit = () => place(Math.min(1, available() / context.store.get().frame.width));

    return {
      viewport,
      resize,
      fit,
      actualSize: () => place(1),
      setWidth(width: FrameWidth) {
        const { frame } = context.store.get();
        const full = width === "full";
        commit({ ...frame, width: full ? Math.max(available(), 120) : width }, { full, autoHeight: true });
        fit();
      },
      setSize(width: number, height: number) {
        const { frame } = context.store.get();
        commit(
          { ...frame, width, height },
          { full: false, autoHeight: height === frame.height && context.store.get().autoHeight }
        );
        fit();
      },
      measure(height: number) {
        const { frame, autoHeight } = context.store.get();
        if (!autoHeight || height === frame.height) return;
        commit({ ...frame, height });
      },
      follow() {
        if (!context.store.get().full) return;
        const { frame } = context.store.get();
        commit({ ...frame, width: Math.max(available(), 120) });
        fit();
      },
      point: (point: Point | null) => context.store.set({ pointer: point }),
    };
  },
  slots: (slot) => ({
    root: slot({}),
    hruler: slot({
      attrs: () => ({ "aria-hidden": "true" }),
      bind: (el, part) => drawRuler(el as HTMLCanvasElement, "x", part.store),
    }),
    vruler: slot({
      attrs: () => ({ "aria-hidden": "true" }),
      bind: (el, part) => drawRuler(el as HTMLCanvasElement, "y", part.store),
    }),
    surface: slot({
      role: "group",
      attrs: () => ({
        tabindex: "0",
        style: css({ position: "relative", overflow: "clip", "touch-action": "none" }),
      }),
      on: {
        wheel: (event, { api }) => api.viewport.wheel(event as WheelEvent),
        pointerdown: (event, { el, api }) => {
          if (event.target === el) api.viewport.pointerdown(event as PointerEvent);
        },
        keydown: (event, { api }) => {
          api.viewport.keydown(event as KeyboardEvent);
        },
        pointermove: (event, { api }) => {
          const { clientX, clientY } = event as PointerEvent;
          api.point(api.viewport.toCanvas(clientX, clientY));
        },
        pointerleave: (_event, { api }) => api.point(null),
      },
      bind: (el, part) => {
        part.api.follow();
        part.api.fit();
        const observer = new ResizeObserver(() => part.api.follow());
        observer.observe(el);
        return () => observer.disconnect();
      },
    }),
    world: slot({
      attrs: () => ({ style: css({ position: "absolute", left: "0", top: "0", "transform-origin": "0 0" }) }),
      live: live((state, { api }) => ({
        style: `${api.viewport.style(state)};--stage-zoom:${state.viewport.zoom}`,
      })),
    }),
    frame: slot({
      attrs: (state, { api }) => ({ style: api.resize.boxStyle(state, FRAME) }),
      live: live((state, { api }) => ({
        style: api.resize.style(state, FRAME),
        "data-resizing": api.resize.dragging(state, FRAME) ? "" : undefined,
      })),
      bind: (el, part) => bindFrame(el, part.api),
    }),
    handle: slot<{ value: string }>({
      props: { value: "string" },
      attrs: (_state, { props, api }) => api.resize.handleAttrs(props.value as "e" | "s" | "se"),
      on: {
        pointerdown: (event, { el, api, props }) =>
          api.resize.pointerdown(event as PointerEvent, FRAME, props.value as "e" | "s" | "se", el!),
        keydown: (event, { api, props }) => {
          api.resize.keydown(event as KeyboardEvent, FRAME, props.value as "e" | "s" | "se");
        },
      },
    }),
  }),
});

type StageApi = {
  viewport: ReturnType<typeof createViewport>;
  measure: (height: number) => void;
  point: (point: Point | null) => void;
};

function bindFrame(el: HTMLElement, api: StageApi) {
  const iframe = el.querySelector("iframe");
  if (!iframe) return;
  let detach = () => {};

  const attach = () => {
    detach();
    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    const content = doc?.querySelector("main");
    if (!doc || !win || !content) return;

    const toParent = (event: MouseEvent) => {
      const rect = iframe.getBoundingClientRect();
      const { zoom } = api.viewport.get();
      return { clientX: rect.left + event.clientX * zoom, clientY: rect.top + event.clientY * zoom };
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      api.viewport.wheel(
        new WheelEvent("wheel", {
          ...toParent(event),
          deltaX: event.deltaX,
          deltaY: event.deltaY,
          deltaMode: event.deltaMode,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          shiftKey: event.shiftKey,
          cancelable: true,
        })
      );
    };
    const onMove = (event: PointerEvent) => api.point({ x: event.clientX, y: event.clientY });
    const observer = new (win as Window & typeof globalThis).ResizeObserver(() =>
      api.measure(Math.ceil(content.getBoundingClientRect().height))
    );

    doc.addEventListener("wheel", onWheel, { passive: false });
    doc.addEventListener("pointermove", onMove);
    observer.observe(content);
    detach = () => {
      doc.removeEventListener("wheel", onWheel);
      doc.removeEventListener("pointermove", onMove);
      observer.disconnect();
    };
  };

  iframe.addEventListener("load", attach);
  if (iframe.contentDocument?.readyState === "complete") attach();
  return () => {
    iframe.removeEventListener("load", attach);
    detach();
  };
}

type Store = { get(): { viewport: Viewport; pointer: Point | null }; subscribe(listener: () => void): () => void };

const STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000];

function drawRuler(canvas: HTMLCanvasElement, axis: "x" | "y", store: Store) {
  const context = canvas.getContext("2d");
  if (!context) return;

  const draw = () => {
    const ratio = window.devicePixelRatio || 1;
    const length = axis === "x" ? canvas.clientWidth : canvas.clientHeight;
    const depth = axis === "x" ? canvas.clientHeight : canvas.clientWidth;
    canvas.width = canvas.clientWidth * ratio;
    canvas.height = canvas.clientHeight * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    const style = getComputedStyle(canvas);
    const { viewport, pointer } = store.get();
    const offset = axis === "x" ? viewport.x : viewport.y;
    const major = STEPS.find((step) => step * viewport.zoom >= 64) ?? STEPS.at(-1)!;
    const minor = major / (String(major).startsWith("25") ? 5 : 10);
    const first = Math.floor(-offset / viewport.zoom / minor) * minor;
    const last = (length - offset) / viewport.zoom;

    context.fillStyle = style.color;
    context.font = `10px ${style.fontFamily}`;
    context.textBaseline = "top";
    for (let unit = first; unit <= last; unit += minor) {
      const at = Math.round(offset + unit * viewport.zoom) + 0.5;
      const isMajor = Math.abs(unit / major - Math.round(unit / major)) < 1e-6;
      const size = isMajor ? depth : depth * 0.3;
      if (axis === "x") context.fillRect(at, depth - size, 1, size);
      else context.fillRect(depth - size, at, size, 1);
      if (!isMajor) continue;
      const label = String(Math.round(unit));
      if (axis === "x") context.fillText(label, at + 3, 2);
      else {
        context.save();
        context.translate(2, at - 3);
        context.rotate(-Math.PI / 2);
        context.textBaseline = "top";
        context.fillText(label, 0, 0);
        context.restore();
      }
    }

    if (pointer) {
      const at = Math.round(offset + (axis === "x" ? pointer.x : pointer.y) * viewport.zoom) + 0.5;
      context.fillStyle = style.getPropertyValue("--ruler-marker") || style.color;
      if (axis === "x") context.fillRect(at, 0, 1, depth);
      else context.fillRect(0, at, depth, 1);
    }
  };

  draw();
  const unsubscribe = store.subscribe(draw);
  const observer = new ResizeObserver(draw);
  observer.observe(canvas);
  return () => {
    unsubscribe();
    observer.disconnect();
  };
}
