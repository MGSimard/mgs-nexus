import type { RuleTester } from "oxlint/plugins-dev";

export type Rule = Parameters<RuleTester["run"]>[1];
type CreateRule = Extract<Rule, { create: (...args: never[]) => unknown }>;
export type Context = Parameters<CreateRule["create"]>[0];
export type Visitor = ReturnType<CreateRule["create"]>;
export type NodeOf<K extends string> = Parameters<NonNullable<Visitor[K]>>[0];

type CallLike = NodeOf<"CallExpression">;
export type Expression = CallLike["callee"];
export type Argument = CallLike["arguments"][number];
type ObjectLike = NodeOf<"ObjectExpression">;
type ObjectMember = ObjectLike["properties"][number];
type AnyNode = CallLike["parent"];

const TEST_FILE = /\.(?:test|spec)\.[cm]?[jt]sx?$/;
const TEST_SUPPORT_FILE = /(?:\.test-utils|\.fixture|(?:^|\/)test-setup)\.[cm]?[jt]sx?$/;
const TEST_CONFIG_FILE = /(?:^|\/)(?:vite|vitest|playwright)(?:\.[\w-]+)*\.config\.[cm]?[jt]s$/;

export const normalizePath = (filename: string): string => filename.replaceAll("\\", "/");

export const isTestFile = (filename: string): boolean => TEST_FILE.test(normalizePath(filename));

export const isTestContext = (filename: string): boolean => {
  const path = normalizePath(filename);
  return TEST_FILE.test(path) || TEST_SUPPORT_FILE.test(path);
};

export const isTestConfigFile = (filename: string): boolean => TEST_CONFIG_FILE.test(normalizePath(filename));

export const calleeName = (node: { callee: Expression }): string | null => {
  const { callee } = node;
  if (callee.type === "Identifier") return callee.name;
  if (callee.type === "MemberExpression" && callee.property.type === "Identifier") return callee.property.name;
  return null;
};

export const isMemberCall = (node: { callee: Expression }, object: string, property: string): boolean => {
  const { callee } = node;
  return (
    callee.type === "MemberExpression" &&
    callee.object.type === "Identifier" &&
    callee.object.name === object &&
    callee.property.type === "Identifier" &&
    callee.property.name === property
  );
};

export const stringValue = (node: AnyNode | Argument | null | undefined): string | null => {
  if (!node) return null;
  if (node.type === "Literal" && typeof node.value === "string") return node.value;
  if (node.type === "TemplateLiteral" && node.expressions.length === 0) return node.quasis[0]?.value.cooked ?? null;
  return null;
};

export const propertyKeyName = (property: AnyNode | ObjectMember): string | null => {
  if (property.type !== "Property" || property.computed) return null;
  if (property.key.type === "Identifier") return property.key.name;
  return stringValue(property.key);
};

export const findProperty = (node: Argument | undefined, key: string): ObjectMember | null => {
  if (node?.type !== "ObjectExpression") return null;
  return node.properties.find((property) => propertyKeyName(property) === key) ?? null;
};
