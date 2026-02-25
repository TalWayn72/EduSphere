// Unit tests for LtiService -- F-018 LTI 1.3 Provider
// 8 tests covering platform CRUD, login initiation, and callback validation.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotFoundException, UnauthorizedException } from "@nestjs/common";

const closeAllPoolsMock = vi.fn().mockResolvedValue(undefined);
const mockReturning = vi.fn();
const mockSet = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockValues = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();

vi.mock("@edusphere/db", () => ({
  createDatabaseConnection: vi.fn(() => ({ insert: mockInsert, update: mockUpdate, select: mockSelect })),
  schema: { ltiPlatforms: {}, ltiLaunches: {} },
  closeAllPools: closeAllPoolsMock,
  eq: vi.fn((a, b) => ({ eq: [a, b] })),
  and: vi.fn((...args) => ({ and: args })),
}));

const jwtVerifyMock = vi.fn();
const createRemoteJWKSetMock = vi.fn().mockReturnValue("jwks-mock");
vi.mock("jose", () => ({ jwtVerify: jwtVerifyMock, createRemoteJWKSet: createRemoteJWKSetMock }));

const PLATFORM_ROW = {
  id: "platform-uuid",
  tenant_id: "tenant-uuid",
  platform_name: "Canvas LMS",
  platform_url: "https://canvas.example.com",
  client_id: "client-123",
  auth_login_url: "https://canvas.example.com/api/lti/authorize_redirect",
  auth_token_url: "https://canvas.example.com/login/oauth2/token",
  key_set_url: "https://canvas.example.com/api/lti/security/jwks",
  deployment_id: "dep-1",
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
};

function setupDbChain(returnValue: unknown) {
  const arr = Array.isArray(returnValue) ? returnValue : [returnValue];
  mockReturning.mockResolvedValue(arr);
  mockValues.mockReturnValue({ returning: mockReturning });
  mockInsert.mockReturnValue({ values: mockValues });
  mockSet.mockReturnValue({ where: mockWhere });
  const thenableWhere = Object.assign(Promise.resolve(arr), { returning: mockReturning, limit: mockLimit });
  mockWhere.mockReturnValue(thenableWhere);
  mockLimit.mockResolvedValue(arr);
  mockUpdate.mockReturnValue({ set: mockSet });
  mockFrom.mockReturnValue({ where: mockWhere });
  mockSelect.mockReturnValue({ from: mockFrom });
}

function makeValidJwt(payload: object): string {
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return header + "." + body + ".signature";
}

describe("LtiService", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("registerPlatform saves platform to DB and returns DTO", async () => {
    setupDbChain(PLATFORM_ROW);
    const { LtiService } = await import("./lti.service");
    const service = new LtiService();
    const dto = await service.registerPlatform("tenant-uuid", {
      platformName: "Canvas LMS", platformUrl: "https://canvas.example.com",
      clientId: "client-123", authLoginUrl: "https://canvas.example.com/api/lti/authorize_redirect",
      authTokenUrl: "https://canvas.example.com/login/oauth2/token",
      keySetUrl: "https://canvas.example.com/api/lti/security/jwks", deploymentId: "dep-1",
    });
    expect(dto.id).toBe("platform-uuid");
    expect(dto.platformName).toBe("Canvas LMS");
    expect(mockInsert).toHaveBeenCalledTimes(1);
  });

  it("getPlatforms returns only active platforms for tenant", async () => {
    setupDbChain([PLATFORM_ROW]);
    const { LtiService } = await import("./lti.service");
    const service = new LtiService();
    const platforms = await service.getPlatforms("tenant-uuid");
    expect(platforms).toHaveLength(1);
    expect(platforms[0].isActive).toBe(true);
  });

  it("initiateLogin generates valid redirect URL with all required params", async () => {
    setupDbChain(PLATFORM_ROW);
    const { LtiService } = await import("./lti.service");
    const service = new LtiService();
    const result = await service.initiateLogin({
      iss: "https://canvas.example.com", login_hint: "user123",
      target_link_uri: "https://edusphere.com/lti/launch", client_id: "client-123",
    });
    expect(result.redirectUrl).toContain("scope=openid");
    expect(result.redirectUrl).toContain("response_type=id_token");
    expect(result.redirectUrl).toContain("nonce=");
    expect(result.redirectUrl).toContain("state=");
    expect(result.redirectUrl).toContain("response_mode=form_post");
    expect(result.nonce).toBeTruthy();
    expect(result.state).toBeTruthy();
  });

  it("initiateLogin throws NotFoundException for unknown platform", async () => {
    setupDbChain([]);
    const { LtiService } = await import("./lti.service");
    const service = new LtiService();
    await expect(service.initiateLogin({ iss: "https://unknown.lms.com", login_hint: "u1", target_link_uri: "https://edusphere.com" })).rejects.toThrow(NotFoundException);
  });

  it("handleCallback rejects expired token when jwtVerify throws", async () => {
    setupDbChain(PLATFORM_ROW);
    jwtVerifyMock.mockRejectedValueOnce(new Error("token expired"));
    const { LtiService } = await import("./lti.service");
    const service = new LtiService();
    const token = makeValidJwt({ iss: "https://canvas.example.com", nonce: "n1", sub: "u1", exp: 0 });
    await expect(service.handleCallback(token, "state-1")).rejects.toThrow(UnauthorizedException);
  });

  it("handleCallback rejects mismatched nonce", async () => {
    setupDbChain(PLATFORM_ROW);
    const ltiClaims = { iss: "https://canvas.example.com", sub: "u1", aud: "client-123", exp: 9999, iat: 1, nonce: "correct-nonce" };
    jwtVerifyMock.mockResolvedValueOnce({ payload: ltiClaims });
    const { LtiService } = await import("./lti.service");
    const service = new LtiService();
    const token = makeValidJwt(ltiClaims);
    await expect(service.handleCallback(token, "wrong-state")).rejects.toThrow(UnauthorizedException);
  });

  it("handleCallback accepts valid token and returns session", async () => {
    setupDbChain(PLATFORM_ROW);
    const ltiClaims = {
      iss: "https://canvas.example.com", sub: "user-sub-1", aud: "client-123",
      exp: Math.floor(Date.now() / 1000) + 300, iat: Math.floor(Date.now() / 1000),
      nonce: "valid-nonce-001",
      'https://purl.imsglobal.org/spec/lti/claim/context': { id: 'course-ext-1', title: 'CS' },
    };
    jwtVerifyMock.mockResolvedValueOnce({ payload: ltiClaims });
    const launchInsertReturning = vi.fn().mockResolvedValue([{ id: "launch-id-1" }]);
    const launchInsertValues = vi.fn().mockReturnValue({ returning: launchInsertReturning });
    mockInsert.mockReturnValueOnce({ values: mockValues }).mockReturnValueOnce({ values: launchInsertValues });
    const { LtiService } = await import("./lti.service");
    const service = new LtiService();
    type WithStoreNonce = { storeNonce: (n: string, s: string) => void };
    (service as unknown as WithStoreNonce).storeNonce("valid-nonce-001", "state-for-test");
    const token = makeValidJwt(ltiClaims);
    const result = await service.handleCallback(token, "state-for-test");
    expect(result.userId).toBe("user-sub-1");
    expect(result.sessionToken).toBeTruthy();
    expect(result.courseId).toBe("course-ext-1");
  });

  it("toggleLtiPlatform updates isActive field", async () => {
    setupDbChain({ ...PLATFORM_ROW, is_active: false });
    const { LtiService } = await import("./lti.service");
    const service = new LtiService();
    const dto = await service.togglePlatform("platform-uuid", "tenant-uuid", false);
    expect(dto.isActive).toBe(false);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });
});
