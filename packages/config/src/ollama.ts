export const ollamaConfig = {
  get url() { return process.env.OLLAMA_URL ?? 'http://localhost:11434'; },
  get embeddingModel() { return process.env.EMBEDDING_MODEL ?? 'nomic-embed-text'; },
  get embeddingDimension() { return parseInt(process.env.EMBEDDING_DIM ?? '768', 10); },
};
