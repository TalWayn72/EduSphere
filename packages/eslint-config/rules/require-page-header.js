/**
 * @fileoverview Ensures every page component file contains an h1 heading (via <PageHeader> or raw <h1>).
 * Part of the EduSphere Design System accessibility rules.
 */
'use strict';

// Sub-component filename fragments that are exempt.
const EXEMPT_FRAGMENTS = ['Step', 'Card', 'Modal', 'Dialog', 'Banner', 'Section'];

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Require an h1 heading (<PageHeader> or <h1>) in page components',
      category: 'EduSphere Design System',
      recommended: true,
    },
    messages: {
      missingHeader:
        'Page component is missing an <h1> heading. Use <PageHeader> or a raw <h1> element for accessibility.',
    },
    schema: [],
  },

  create(context) {
    const filename = context.filename || context.getFilename();

    // Only apply to files inside a pages/ directory.
    if (!/[/\\]pages[/\\]/.test(filename)) return {};
    // Must be a .tsx file.
    if (!/\.tsx$/.test(filename)) return {};

    // Exempt sub-component files.
    const basename = filename.split(/[/\\]/).pop() || '';
    for (const frag of EXEMPT_FRAGMENTS) {
      if (basename.includes(frag)) return {};
    }

    let hasH1 = false;
    let hasPageHeader = false;
    let hasSrOnlyH1 = false;
    let defaultExportNode = null;

    return {
      // Detect <h1 ...>
      JSXOpeningElement(node) {
        const name = node.name;
        if (name.type === 'JSXIdentifier' && name.name === 'h1') {
          hasH1 = true;
        }
        if (name.type === 'JSXIdentifier' && name.name === 'PageHeader') {
          hasPageHeader = true;
        }
      },

      // Detect sr-only class near h1 (heuristic: any element with sr-only className).
      JSXAttribute(node) {
        if (node.name.name !== 'className') return;
        const val = node.value;
        if (val && val.type === 'Literal' && typeof val.value === 'string') {
          if (val.value.includes('sr-only')) {
            // Check if parent element is h1.
            const parent = node.parent;
            if (
              parent &&
              parent.type === 'JSXOpeningElement' &&
              parent.name.type === 'JSXIdentifier' &&
              parent.name.name === 'h1'
            ) {
              hasSrOnlyH1 = true;
            }
          }
        }
      },

      // Track default export for reporting location.
      ExportDefaultDeclaration(node) {
        defaultExportNode = node;
      },

      'Program:exit'() {
        if (hasH1 || hasPageHeader || hasSrOnlyH1) return;
        const sourceCode = context.sourceCode || context.getSourceCode();
        const reportNode = defaultExportNode || sourceCode.ast;
        context.report({
          node: reportNode,
          messageId: 'missingHeader',
        });
      },
    };
  },
};
