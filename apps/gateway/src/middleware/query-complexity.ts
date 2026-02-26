import { GraphQLError, type ValidationContext, type ASTVisitor } from 'graphql';

export const MAX_DEPTH = parseInt(process.env['GRAPHQL_MAX_DEPTH'] ?? '10', 10);
export const MAX_COMPLEXITY = parseInt(
  process.env['GRAPHQL_MAX_COMPLEXITY'] ?? '1000',
  10
);

// ── Internal tree-walk helpers ────────────────────────────────────────────────

type SelectableNode = {
  selectionSet?: { selections: SelectableNode[] };
  name?: { value?: string };
};

function measureDepth(node: SelectableNode, depth = 0): number {
  if (!node.selectionSet) return depth;
  const depths = node.selectionSet.selections.map((s) =>
    measureDepth(s, depth + 1)
  );
  return depths.length > 0 ? Math.max(...depths) : depth;
}

/**
 * Estimate query complexity.
 * Each field costs 1 unit. Fields whose name ends with 's' (heuristic for
 * list-returning fields) multiply their subtree cost by 10 to reflect worst-case
 * cardinality. The `fieldName` parameter carries the name of the *current* node
 * being costed so the parent can apply the list multiplier correctly.
 */
export function estimateComplexity(
  node: SelectableNode,
  depth = 0,
  fieldName = ''
): number {
  if (depth > 20) return 1;
  const isList = fieldName.endsWith('s') && fieldName.length > 1;
  if (!node.selectionSet) return isList ? 10 : 1;

  const childCost = node.selectionSet.selections.reduce((total, child) => {
    const name = child.name?.value ?? '';
    return total + estimateComplexity(child, depth + 1, name);
  }, 0);

  // Cost = self (1) + subtree, with list multiplier applied to the subtree
  return 1 + (isList ? childCost * 10 : childCost);
}

// ── Exported validation rules ─────────────────────────────────────────────────

/**
 * G-10: Query depth validation rule.
 * Rejects queries deeper than MAX_DEPTH (default 10).
 * Prevents DoS via deeply nested queries like:
 *   { user { posts { comments { author { posts { ... } } } } } }
 */
export function depthLimitRule(maxDepth: number = MAX_DEPTH) {
  return (context: ValidationContext): ASTVisitor => ({
    Document(node) {
      for (const def of node.definitions) {
        if (def.kind === 'OperationDefinition') {
          const depth = measureDepth(def as SelectableNode);
          if (depth > maxDepth) {
            context.reportError(
              new GraphQLError(
                `Query depth ${depth} exceeds maximum allowed depth of ${maxDepth}`,
                { nodes: [def] }
              )
            );
          }
        }
      }
    },
  });
}

/**
 * G-10: Query complexity validation rule.
 * Rejects queries with estimated field-cost > MAX_COMPLEXITY (default 1000).
 * List fields (names ending with 's') are weighted 10× their subtree cost.
 */
export function complexityLimitRule(maxComplexity: number = MAX_COMPLEXITY) {
  return (context: ValidationContext): ASTVisitor => ({
    Document(node) {
      for (const def of node.definitions) {
        if (def.kind === 'OperationDefinition') {
          const complexity = estimateComplexity(def as SelectableNode);
          if (complexity > maxComplexity) {
            context.reportError(
              new GraphQLError(
                `Query complexity ${complexity} exceeds maximum allowed complexity of ${maxComplexity}`,
                { nodes: [def] }
              )
            );
          }
        }
      }
    },
  });
}
