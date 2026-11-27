import { defineVariants } from "@/lib/variants";

export default defineVariants({
  variants: {
    variant: ["display"],
    tone: ["primary", "secondary"],
    align: ["end", "center"],
  },
  defaults: { variant: "display", tone: "primary", align: "end" },
  states: {
    disabled: { disabled: true },
  },
});
