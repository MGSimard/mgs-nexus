import { createParts, wrappedButton, wrappedChild } from "@ui-sdk/web";
import { stage } from "./stage";

createParts(stage, {
  root: { tag: "schema-stage", display: "block", api: ["fit", "actualSize", "setWidth", "setSize"] },
  hruler: { tag: "schema-stage-hruler", target: wrappedChild("canvas"), display: "block" },
  vruler: { tag: "schema-stage-vruler", target: wrappedChild("canvas"), display: "block" },
  surface: { tag: "schema-stage-surface", display: "block" },
  world: { tag: "schema-stage-world", display: "block" },
  frame: { tag: "schema-stage-frame", display: "block" },
  handle: { tag: "schema-stage-handle", target: wrappedButton, display: "contents" },
});
