import { defineVariants } from "@/lib/variants";

export default defineVariants({
  variants: {
    variant: ["solid", "ghost", "display-primary", "display-secondary"],
    size: ["sm", "md"],
  },
  defaults: { variant: "solid", size: "md" },
  states: {
    disabled: { disabled: true },
  },
});
