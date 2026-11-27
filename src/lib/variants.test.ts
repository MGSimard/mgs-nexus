import { describe, expect, test } from "vitest";
import { defineVariants } from "./variants";

const card = defineVariants({
  variants: { tone: ["plain", "alert"], density: ["tight", "loose"], cornerStyle: ["cut"] },
  defaults: { tone: "plain", density: "loose", cornerStyle: "cut" },
});

describe("defineVariants", () => {
  test("writes one data attribute per axis, filling unset axes from the defaults", () => {
    expect(card.data({ tone: "alert" })).toEqual({
      "data-tone": "alert",
      "data-density": "loose",
      "data-corner-style": "cut",
    });
  });

  test("lists every combination of the axes, in declared order", () => {
    expect(card.combos()).toEqual([
      { tone: "plain", density: "tight", cornerStyle: "cut" },
      { tone: "plain", density: "loose", cornerStyle: "cut" },
      { tone: "alert", density: "tight", cornerStyle: "cut" },
      { tone: "alert", density: "loose", cornerStyle: "cut" },
    ]);
  });
});
