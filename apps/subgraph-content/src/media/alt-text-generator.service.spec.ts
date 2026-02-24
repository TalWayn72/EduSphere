import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSubscribe, mockConnect, mockDrain, mockUnsubscribe, mockDbUpdate, mockDbSet, mockGenerateText, mockGetSignedUrl, mockS3Client } = vi.hoisted(() => {
  const mockUnsubscribe = vi.fn();
  const mockDrain = vi.fn().mockResolvedValue(undefined);
  const mockIter = { unsubscribe: undefined as unknown as ()=>void, [Symbol.asyncIterator]: async function* () {} };
  const mockSubscribeReturn = { ...mockIter };
  mockSubscribeReturn.unsubscribe = () => mockUnsubscribe();
  const mockSubscribe = vi.fn().mockReturnValue(mockSubscribeReturn);
  const mockConnect = vi.fn().mockResolvedValue({ subscribe: mockSubscribe, drain: mockDrain, close: vi.fn().mockResolvedValue(undefined) });
  const mockDbWhere = vi.fn().mockResolvedValue([{ id: "asset-1" }]);
  const mockDbSet = vi.fn().mockReturnValue({ where: mockDbWhere });
  const mockDbUpdate = vi.fn().mockReturnValue({ set: mockDbSet });
  const mockGenerateText = vi.fn().mockResolvedValue({ text: "A clear diagram" });
  const mockGetSignedUrl = vi.fn().mockResolvedValue("https://minio.example.com/presigned");
  const mockS3Client = vi.fn().mockImplementation(function() { return {}; });
  return { mockSubscribe, mockConnect, mockDrain, mockUnsubscribe, mockDbUpdate, mockDbSet, mockGenerateText, mockGetSignedUrl, mockS3Client };
});

vi.mock("nats", () => ({ connect: mockConnect, StringCodec: vi.fn().mockReturnValue({ decode: vi.fn((v: Uint8Array) => Buffer.from(v).toString()), encode: vi.fn((s: string) => Buffer.from(s)) }) }));
vi.mock("@edusphere/db", () => ({ createDatabaseConnection: vi.fn(() => ({ update: mockDbUpdate })), closeAllPools: vi.fn().mockResolvedValue(undefined), schema: { media_assets: {} } }));
vi.mock("@edusphere/config", () => ({ minioConfig: { useSSL: false, endpoint: "localhost", port: 9000, bucket: "tb", region: "us-east-1", accessKey: "k", secretKey: "s" } }));
vi.mock("@aws-sdk/client-s3", () => ({ S3Client: mockS3Client, GetObjectCommand: vi.fn().mockImplementation(function(a) { Object.assign(this, a); }) }));
vi.mock("@aws-sdk/s3-request-presigner", () => ({ getSignedUrl: mockGetSignedUrl }));
vi.mock("ai", () => ({ generateText: mockGenerateText }));
vi.mock("ollama-ai-provider", () => ({ createOllama: vi.fn().mockReturnValue((m: string) => m) }));
vi.mock("@ai-sdk/openai", () => ({ createOpenAI: vi.fn().mockReturnValue((m: string) => m) }));
vi.mock("drizzle-orm", () => ({ eq: vi.fn().mockReturnValue({}) }));

import { AltTextGeneratorService } from "./alt-text-generator.service.js";

type SvcPrivate = { handleMediaUploaded: (p: unknown) => Promise<void> };
const asP = (s: AltTextGeneratorService) => s as unknown as SvcPrivate;

const IMG = { assetId: "asset-1", fileKey: "t/c/i.png", courseId: "c1", tenantId: "t1", fileName: "i.png", contentType: "image/png" };

describe("AltTextGeneratorService", () => {
  let service: AltTextGeneratorService;
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnect.mockResolvedValue({ subscribe: mockSubscribe, drain: mockDrain, close: vi.fn().mockResolvedValue(undefined) });
    mockGenerateText.mockResolvedValue({ text: "A clear diagram" });
    service = new AltTextGeneratorService();
  });

  it("subscribes to EDUSPHERE.media.uploaded on init", async () => {
    await service.onModuleInit();
    expect(mockSubscribe).toHaveBeenCalledWith("EDUSPHERE.media.uploaded");
  });

  it("does not throw when NATS is unavailable", async () => {
    mockConnect.mockRejectedValueOnce(new Error("NATS unavailable"));
    await expect(service.onModuleInit()).resolves.toBeUndefined();
  });

  it("skips non-image content types", async () => {
    await asP(service).handleMediaUploaded({ ...IMG, contentType: "video/mp4" });
    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it("generates and saves alt-text for image/png", async () => {
    await asP(service).handleMediaUploaded(IMG);
    expect(mockGenerateText).toHaveBeenCalledTimes(1);
    expect(mockDbUpdate).toHaveBeenCalledTimes(1);
    expect(mockDbSet).toHaveBeenCalledWith({ alt_text: "A clear diagram" });
  });

  it("generates alt-text for image/jpeg", async () => {
    await asP(service).handleMediaUploaded({ ...IMG, contentType: "image/jpeg" });
    expect(mockGenerateText).toHaveBeenCalledTimes(1);
  });

  it("truncates alt-text to 125 characters", async () => {
    mockGenerateText.mockResolvedValueOnce({ text: "X".repeat(200) });
    await asP(service).handleMediaUploaded(IMG);
    const [arg] = mockDbSet.mock.calls[0] as [{ alt_text: string }][];
    expect(arg.alt_text.length).toBeLessThanOrEqual(125);
  });

  it("handles generateText failure gracefully (non-fatal)", async () => {
    mockGenerateText.mockRejectedValueOnce(new Error("LLM timeout"));
    await expect(asP(service).handleMediaUploaded(IMG)).resolves.toBeUndefined();
    expect(mockDbUpdate).not.toHaveBeenCalled();
  });

  it("passes presigned URL as image URL to generateText", async () => {
    await asP(service).handleMediaUploaded(IMG);
    const call = mockGenerateText.mock.calls[0][0];
    const imgContent = call.messages[0].content[0];
    expect(imgContent.type).toBe("image");
    expect(imgContent.image).toBeInstanceOf(URL);
  });

  it("unsubscribes and drains NATS on destroy", async () => {
    await service.onModuleInit();
    await service.onModuleDestroy();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    expect(mockDrain).toHaveBeenCalledTimes(1);
  });

  it("safe to destroy when init was never called", async () => {
    await expect(service.onModuleDestroy()).resolves.toBeUndefined();
  });
});
