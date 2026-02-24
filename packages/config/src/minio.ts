export const minioConfig = {
  get endpoint() { return process.env.MINIO_ENDPOINT ?? 'localhost'; },
  get port() { return parseInt(process.env.MINIO_PORT ?? '9000', 10); },
  get useSSL() { return (process.env.MINIO_USE_SSL ?? 'false') === 'true'; },
  get accessKey() { return process.env.MINIO_ACCESS_KEY ?? 'minioadmin'; },
  get secretKey() { return process.env.MINIO_SECRET_KEY ?? 'minioadmin'; },
  get bucket() { return process.env.MINIO_BUCKET_NAME ?? 'edusphere'; },
  get region() { return process.env.MINIO_REGION ?? 'us-east-1'; },
};
