import { GraphQLError, type ValidationContext, type ASTVisitor } from 'graphql';

export const MAX_DEPTH = parseInt(process.env['GRAPHQL_MAX_DEPTH'] ?? '10', 10);
export const MAX_COMPLEXITY = parseInt(
  process.env['GRAPHQL_MAX_COMPLEXITY'] ?? '1000',
  10
);

// ── Internal tree-walk helpers ────────────────────────────────────────────────

type SelectableNode = {
  selectionSet?: { selections: readonly SelectableNode[] };
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
 * Returns true if a field name looks like a list-returning field.
 * Uses two heuristics:
 * 1. The name must end with 's' and have length > 1.
 * 2. The name must be a simple lowercase word (no camelCase uppercase letters).
 *    This excludes compound names like "emailNotifications", "updateUserPreferences",
 *    "userPreferences" — they end with 's' but are not list fields.
 *    Plain plural nouns like "users", "courses", "annotations" qualify.
 */
function isListField(name: string): boolean {
  if (!name.endsWith('s') || name.length <= 1) return false;
  // Reject camelCase names: if any character after position 0 is uppercase,
  // this is a compound name, not a simple plural noun.
  for (let i = 1; i < name.length; i++) {
    if (name[i] === name[i].toUpperCase() && name[i] !== name[i].toLowerCase()) {
      return false;
    }
  }
  return true;
}

/**
 * Estimate query complexity.
 * Each field costs 1 unit. Fields whose name is a simple plural noun ending
 * with 's' (e.g. "users", "courses") multiply their subtree cost by 10 to
 * reflect worst-case cardinality. CamelCase compound names (e.g.
 * "emailNotifications", "updateUserPreferences") are excluded from this
 * heuristic even when they end with 's'.
 */
export function estimateComplexity(
  node: SelectableNode,
  depth = 0,
  fieldName = ''
): number {
  if (depth > 20) return 1;
  const isList = isListField(fieldName);
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
