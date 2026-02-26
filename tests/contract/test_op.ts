// ---- annotation.queries.ts
const ANNOTATIONS_QUERY_DOC = parse(`
  query Annotations($assetId: ID!) {
    annotations(assetId: $assetId) { id layer annotationType content }
  }
`);
