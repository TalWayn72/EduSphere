import { describe, it, expect, vi, beforeEach } from "vitest";

const mockTx = { select: vi.fn(), insert: vi.fn() };
const mockDbInsert = vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });
const mockDbInstance = { insert: mockDbInsert };

vi.mock("@edusphere/db", () => ({
  createDatabaseConnection: vi.fn(() => mockDbInstance),
  schema: {
    users: { id: "id" },
    annotations: { user_id: "user_id" },
    agentSessions: { userId: "userId" },
    userProgress: { userId: "userId" },
    userCourses: { userId: "userId" },
    auditLog: {},
  },
  withTenantContext: vi.fn(async (_db, _ctx, fn) => fn(mockTx)),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  eq: vi.fn((col, val) => ({ col, val })),
}));

import { UserExportService } from "./user-export.service.js";

const MOCK_USER = { id: "user-1", email: "user@test.com" };
const MOCK_ANNOTATION = { id: "ann-1", user_id: "user-1" };
const MOCK_SESSION = { id: "sess-1", userId: "user-1" };
const MOCK_PROGRESS = { id: "prog-1", userId: "user-1" };
const MOCK_ENROLLMENT = { id: "enr-1", courseId: "course-abc" };

describe("UserExportService — GDPR Art.20 Right to Data Portability", () => {
  let service: UserExportService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDbInsert.mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });
    let callCount = 0;
    const datasets = [[MOCK_USER], [MOCK_ANNOTATION], [MOCK_SESSION], [MOCK_PROGRESS], [MOCK_ENROLLMENT]];
    mockTx.select.mockImplementation(() => ({
      from: vi.fn().mockImplementation(() => ({
        where: vi.fn().mockResolvedValue(datasets[callCount++ % datasets.length]),
      })),
    }));
    mockTx.insert = vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });
    service = new UserExportService();
  });

  it("returns a structured export object with GDPR metadata", async () => {
    const result = await service.exportUserData("user-1", "tenant-1");
    expect(result.gdprArticle).toBe("20");
    expect(result.format).toBe("EduSphere-UserExport/1.0");
    expect(result.userId).toBe("user-1");
    expect(result.exportedAt).toBeDefined();
  });

  it("includes profile, annotations, agentSessions, learningProgress, enrollments", async () => {
    const result = await service.exportUserData("user-1", "tenant-1");
    expect(result.profile).toBeDefined();
    expect(Array.isArray(result.annotations)).toBe(true);
    expect(Array.isArray(result.agentSessions)).toBe(true);
    expect(Array.isArray(result.learningProgress)).toBe(true);
    expect(Array.isArray(result.enrollments)).toBe(true);
  });

  it("wraps all queries in withTenantContext for tenant isolation", async () => {
    const { withTenantContext } = await import("@edusphere/db");
    await service.exportUserData("user-1", "tenant-1");
    expect(withTenantContext).toHaveBeenCalledTimes(1);
    const [, ctx] = vi.mocked(withTenantContext).mock.calls[0];
    expect(ctx.tenantId).toBe("tenant-1");
    expect(ctx.userId).toBe("user-1");
  });

  it("writes an audit log entry after export for GDPR compliance", async () => {
    await service.exportUserData("user-1", "tenant-1");
    // writeAuditLog calls this.db.insert (not via withTenantContext)
    expect(mockDbInsert).toHaveBeenCalled();
  });

  it("returns profile as null when DB returns no user row", async () => {
    let callCount = 0;
    mockTx.select.mockImplementation(() => ({
      from: vi.fn().mockImplementation(() => ({
        where: vi.fn().mockResolvedValue(callCount++ === 0 ? [] : []),
      })),
    }));
    const result = await service.exportUserData("user-ghost", "tenant-1");
    expect(result.profile).toBeNull();
  });

  it("returns empty arrays when user has no activity data", async () => {
    mockTx.select.mockImplementation(() => ({
      from: vi.fn().mockImplementation(() => ({
        where: vi.fn().mockResolvedValue([]),
      })),
    }));
    const result = await service.exportUserData("user-new", "tenant-1");
    expect(result.annotations).toHaveLength(0);
    expect(result.agentSessions).toHaveLength(0);
    expect(result.learningProgress).toHaveLength(0);
    expect(result.enrollments).toHaveLength(0);
  });

  it("ctx.userId and ctx.tenantId enforce cross-tenant isolation", async () => {
    const { withTenantContext } = await import("@edusphere/db");
    await service.exportUserData("user-a", "tenant-x");
    const [, ctx] = vi.mocked(withTenantContext).mock.calls[0];
    expect(ctx.tenantId).toBe("tenant-x");
    expect(ctx.userId).toBe("user-a");
  });

  it("onModuleDestroy calls closeAllPools to release DB connections", async () => {
    const { closeAllPools } = await import("@edusphere/db");
    await service.onModuleDestroy();
    expect(closeAllPools).toHaveBeenCalledTimes(1);
  });
});