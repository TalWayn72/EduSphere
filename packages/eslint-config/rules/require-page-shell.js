/**
 * @fileoverview Warns when page files use inline max-width container patterns
 * instead of the <PageShell> component.
 */
'use strict';

// Inline container patterns that should be replaced with <PageShell>.
const INLINE_PATTERNS = [
  'max-w-4xl mx-auto',
  'max-w-5xl mx-auto',
  'max-w-6xl mx-auto',
  'max-w-7xl mx-auto',
  'max-w-screen-xl mx-auto',
  'mx-auto max-w-4xl',
  'mx-auto max-w-5xl',
  'mx-auto max-w-6xl',
  'mx-auto max-w-7xl',
  'mx-auto max-w-screen-xl',
];

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Prefer <PageShell> over inline max-width container patterns in pages',
      category: 'EduSphere Design System',
      recommended: true,
    },
    messages: {
      usePageShell:
        'Use <PageShell> instead of inline max-width containers ("{{ match }}"). Import PageShell from the design system.',
    },
    schema: [],
  },

  create(context) {
    const filename = context.filename || context.getFilename();

    // Only apply to files inside a pages/ directory.
    if (!/[/\\]pages[/\\]/.test(filename)) return {};
    if (!/\.tsx$/.test(filename)) return {};

    let importsPageShell = false;

    return {
      // Detect PageShell imports — if present, skip all checks.
      ImportDeclaration(node) {
        for (const spec of node.specifiers) {
          const name = spec.local ? spec.local.name : '';
          if (name === 'PageShell') {
            importsPageShell = true;
          }
        }
      },

      JSXAttribute(node) {
        if (importsPageShell) return;
        if (node.name.name !== 'className') return;

        const value = node.value;
        if (!value) return;

        const checkString = (astNode, raw) => {
          for (const pattern of INLINE_PATTERNS) {
            if (raw.includes(pattern)) {
              context.report({
                node: astNode,
                messageId: 'usePageShell',
                data: { match: pattern },
              });
              // Report once per className attribute.
              return;
            }
          }
        };

        if (value.type === 'Literal' && typeof value.value === 'string') {
          checkString(value, value.value);
          return;
        }

        if (value.type === 'JSXExpressionContainer') {
          const expr = value.expression;
          if (expr.type === 'Literal' && typeof expr.value === 'string') {
            checkString(expr, expr.value);
          }
          if (expr.type === 'TemplateLiteral') {
            for (const quasi of expr.quasis) {
              checkString(quasi, quasi.value.raw);
            }
          }
        }
      },
    };
  },
};
