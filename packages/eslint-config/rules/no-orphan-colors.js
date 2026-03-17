/**
 * @fileoverview Detects Tailwind color classes in JSX className that lack a dark: counterpart.
 * Encourages consistent dark-mode support across the EduSphere Design System.
 */
'use strict';

// Semantic tokens that already adapt to dark mode — no dark: variant needed.
const SEMANTIC_TOKENS = new Set([
  'background', 'foreground', 'card', 'card-foreground',
  'popover', 'popover-foreground', 'primary', 'primary-foreground',
  'secondary', 'secondary-foreground', 'muted', 'muted-foreground',
  'accent', 'accent-foreground', 'destructive', 'destructive-foreground',
  'border', 'input', 'ring', 'sidebar', 'sidebar-foreground',
  'sidebar-border', 'sidebar-ring', 'sidebar-accent',
  'sidebar-accent-foreground', 'sidebar-primary', 'sidebar-primary-foreground',
  'chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5',
]);

// Prefixes that need a dark: counterpart when paired with raw color scales.
const COLOR_PREFIXES = ['bg', 'text', 'border'];

// Raw color families that are NOT semantic tokens.
const RAW_FAMILIES = ['white', 'black', 'gray', 'slate', 'zinc', 'neutral', 'stone',
  'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal',
  'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'];

/**
 * Return true when `cls` is a raw color class like `bg-white`, `text-gray-700`.
 * Returns { prefix, cls } or null.
 */
function parseColorClass(cls) {
  for (const prefix of COLOR_PREFIXES) {
    const pfx = prefix + '-';
    if (!cls.startsWith(pfx)) continue;
    const rest = cls.slice(pfx.length);
    // Semantic token — skip.
    if (SEMANTIC_TOKENS.has(rest)) return null;
    // Check against raw families (exact or with shade suffix).
    for (const fam of RAW_FAMILIES) {
      if (rest === fam || rest.startsWith(fam + '-')) {
        return { prefix, cls };
      }
    }
  }
  return null;
}

/**
 * Check whether `classes` (space-separated) contains a dark: variant for
 * the given prefix (e.g. dark:bg-*).
 */
function hasDarkVariant(classes, prefix) {
  return classes.some((c) => c.startsWith('dark:' + prefix + '-'));
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Require a dark: counterpart for raw Tailwind color classes in className',
      category: 'EduSphere Design System',
      recommended: true,
    },
    messages: {
      missingDark:
        '"{{ cls }}" has no dark: counterpart. Add a dark:{{ prefix }}-* class or use a semantic token (e.g. bg-background, text-foreground).',
    },
    schema: [],
  },

  create(context) {
    // Skip test files.
    const filename = context.filename || context.getFilename();
    if (/\.(test|spec)\.[jt]sx?$/.test(filename)) return {};

    /**
     * Analyse a raw className string value and report orphans.
     */
    function checkClassString(node, raw) {
      const classes = raw.split(/\s+/).filter(Boolean);
      for (const cls of classes) {
        // Ignore dark: variants themselves.
        if (cls.startsWith('dark:')) continue;
        const parsed = parseColorClass(cls);
        if (parsed && !hasDarkVariant(classes, parsed.prefix)) {
          context.report({
            node,
            messageId: 'missingDark',
            data: { cls: parsed.cls, prefix: parsed.prefix },
          });
        }
      }
    }

    return {
      JSXAttribute(node) {
        if (node.name.name !== 'className') return;
        const value = node.value;
        if (!value) return;

        // String literal: className="bg-white"
        if (value.type === 'Literal' && typeof value.value === 'string') {
          checkClassString(value, value.value);
          return;
        }

        // JSXExpressionContainer with template literal or string.
        if (value.type === 'JSXExpressionContainer') {
          const expr = value.expression;
          if (expr.type === 'Literal' && typeof expr.value === 'string') {
            checkClassString(expr, expr.value);
          }
          if (expr.type === 'TemplateLiteral') {
            // Best-effort: check each quasi (static part).
            for (const quasi of expr.quasis) {
              checkClassString(quasi, quasi.value.raw);
            }
          }
        }
      },
    };
  },
};
