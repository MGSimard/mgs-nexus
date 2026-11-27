type Axes = Record<string, readonly string[]>;

export type Selection<V extends Axes> = { [K in keyof V]: V[K][number] };

type Table<V extends Axes, S extends Record<string, Record<string, unknown>>> = {
  variants: V;
  defaults: Selection<V>;
  states?: S;
};

export type Variants<
  V extends Axes = Axes,
  S extends Record<string, Record<string, unknown>> = Record<string, Record<string, unknown>>,
> = {
  variants: V;
  defaults: Selection<V>;
  states: S;
  data(props: Partial<Selection<V>>): Record<`data-${string}`, string>;
  combos(): Selection<V>[];
};

export type VariantProps<T> =
  T extends Variants<infer V, Record<string, Record<string, unknown>>> ? Partial<Selection<V>> : never;

const kebab = (name: string) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

export function defineVariants<
  const V extends Axes,
  const S extends Record<string, Record<string, unknown>> = Record<never, never>,
>(table: Table<V, S>): Variants<V, S> {
  const axes = Object.keys(table.variants) as (keyof V & string)[];
  return {
    variants: table.variants,
    defaults: table.defaults,
    states: table.states ?? ({} as S),
    data(props) {
      return Object.fromEntries(
        axes.map((axis) => [`data-${kebab(axis)}`, props[axis] ?? table.defaults[axis]])
      ) as Record<`data-${string}`, string>;
    },
    combos() {
      return axes.reduce<Selection<V>[]>(
        (rows, axis) => rows.flatMap((row) => table.variants[axis]!.map((value) => ({ ...row, [axis]: value }))),
        [{} as Selection<V>]
      );
    },
  };
}
