/**
 * Gitwork design rules, enforced in lint so reviews don't have to.
 *
 *  - no-raw-colours:      class strings must use semantic tokens, never hex/rgb/hsl/oklch
 *                         or arbitrary colour values like `bg-[#fff]`.
 *  - no-crescent-border:  a thick one-sided border on a rounded container renders as a
 *                         curved crescent. Square that side, or use an inner indicator bar.
 */

const CLASS_FNS = new Set(["cn", "clsx", "cva", "twMerge", "tv"]);
const RAW_COLOUR = /(#[0-9a-f]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|oklch|oklab|lab|lch)\()/i;
const ONE_SIDED_THICK = /(?:^|\s)(?:[a-z-]+:)*border-([lrtbse])-(?:[2-9]|\[\d+px\])(?:\s|$)/;
const ROUNDED = /(?:^|\s)(?:[a-z-]+:)*rounded(?:-(?:sm|md|lg|xl|2xl|3xl|full|pill|\[[^\]]+\]))?(?:\s|$)/;

function isClassContext(node) {
  let current = node.parent;
  for (let depth = 0; current && depth < 6; depth++, current = current.parent) {
    if (current.type === "JSXAttribute") {
      const name = current.name && current.name.name;
      return name === "className" || name === "class";
    }
    if (current.type === "CallExpression") {
      const callee = current.callee;
      const name = callee.type === "Identifier" ? callee.name : callee.property?.name;
      return CLASS_FNS.has(name);
    }
  }
  return false;
}

function stringsOf(node) {
  if (node.type === "Literal" && typeof node.value === "string") return [node.value];
  if (node.type === "TemplateLiteral") return node.quasis.map((q) => q.value.cooked ?? "");
  return [];
}

function makeRule(meta, check) {
  return {
    meta: { type: "problem", schema: [], ...meta },
    create(context) {
      const visit = (node) => {
        if (!isClassContext(node)) return;
        for (const value of stringsOf(node)) check(context, node, value);
      };
      return { Literal: visit, TemplateLiteral: visit };
    },
  };
}

export const designRules = {
  meta: { name: "gitwork-design" },
  rules: {
    "no-raw-colours": makeRule(
      {
        docs: { description: "Use semantic colour tokens (bg-surface, text-muted...) not raw colours" },
        messages: {
          raw: "Raw colour '{{match}}' in a class string. Use a semantic token class such as bg-surface, text-text-muted or border-border.",
        },
      },
      (context, node, value) => {
        const match = value.match(RAW_COLOUR);
        if (match) context.report({ node, messageId: "raw", data: { match: match[0] } });
      },
    ),
    "no-crescent-border": makeRule(
      {
        docs: { description: "No thick one-sided borders on rounded containers" },
        messages: {
          crescent:
            "Thick one-sided border on a rounded container renders as a crescent. Square that side (e.g. rounded-l-none) or use an inner indicator bar (<span className=\"indicator-bar\" />).",
        },
      },
      (context, node, value) => {
        const side = value.match(ONE_SIDED_THICK);
        if (!side || !ROUNDED.test(value)) return;
        const squared = new RegExp(`rounded-${side[1]}-none`);
        if (!squared.test(value)) context.report({ node, messageId: "crescent" });
      },
    ),
  },
};
