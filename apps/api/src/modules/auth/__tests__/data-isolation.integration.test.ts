import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  tenantStorage,
  TenantStore,
} from "../../../common/context/tenant.context";
import { PrismaService } from "../../../prisma/prisma.service";

/**
 * Data Isolation Integration Test
 *
 * Proves that User A (org-alpha) cannot read User B's (org-beta) widgets,
 * even when both have valid tenant contexts. The Prisma middleware
 * automatically scopes all queries by organizationId.
 *
 * Requires a running PostgreSQL database (DATABASE_URL in .env).
 */
describe("Multi-tenant data isolation", () => {
  let prisma: PrismaService;
  let rawPrisma: PrismaClient;

  let orgAlphaId: string;
  let orgBetaId: string;
  let userAlphaId: string;
  let userBetaId: string;
  let widgetAlphaId: string;
  let widgetBetaId: string;

  beforeAll(async () => {
    // Raw client for setup (no middleware)
    rawPrisma = new PrismaClient();
    await rawPrisma.$connect();

    // Tenant-scoped service
    prisma = new PrismaService();
    await prisma.onModuleInit();

    // Seed two orgs with one widget each
    const orgAlpha = await rawPrisma.organization.create({
      data: { name: "Org Alpha", slug: `org-alpha-test-${Date.now()}` },
    });
    const orgBeta = await rawPrisma.organization.create({
      data: { name: "Org Beta", slug: `org-beta-test-${Date.now()}` },
    });
    orgAlphaId = orgAlpha.id;
    orgBetaId = orgBeta.id;

    const userAlpha = await rawPrisma.user.create({
      data: {
        email: `alpha-${Date.now()}@test.local`,
        name: "Alpha User",
        role: "OWNER",
        organizationId: orgAlphaId,
      },
    });
    const userBeta = await rawPrisma.user.create({
      data: {
        email: `beta-${Date.now()}@test.local`,
        name: "Beta User",
        role: "OWNER",
        organizationId: orgBetaId,
      },
    });
    userAlphaId = userAlpha.id;
    userBetaId = userBeta.id;

    const widgetAlpha = await rawPrisma.widget.create({
      data: {
        organizationId: orgAlphaId,
        name: "Alpha Widget",
        domain: "alpha.test",
      },
    });
    const widgetBeta = await rawPrisma.widget.create({
      data: {
        organizationId: orgBetaId,
        name: "Beta Widget",
        domain: "beta.test",
      },
    });
    widgetAlphaId = widgetAlpha.id;
    widgetBetaId = widgetBeta.id;
  });

  afterAll(async () => {
    // Clean up test data
    await rawPrisma.widget.deleteMany({
      where: { id: { in: [widgetAlphaId, widgetBetaId] } },
    });
    await rawPrisma.user.deleteMany({
      where: { id: { in: [userAlphaId, userBetaId] } },
    });
    await rawPrisma.organization.deleteMany({
      where: { id: { in: [orgAlphaId, orgBetaId] } },
    });
    await rawPrisma.$disconnect();
    await prisma.$disconnect();
  });

  function runAsTenant<T>(
    store: TenantStore,
    fn: () => Promise<T>,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      tenantStorage.run(store, () => fn().then(resolve).catch(reject));
    });
  }

  it("Alpha can see only their own widgets", async () => {
    const widgets = await runAsTenant(
      { organizationId: orgAlphaId, userId: userAlphaId },
      () => prisma.widget.findMany(),
    );

    expect(widgets).toHaveLength(1);
    expect(widgets[0].id).toBe(widgetAlphaId);
    expect(widgets[0].name).toBe("Alpha Widget");
  });

  it("Beta can see only their own widgets", async () => {
    const widgets = await runAsTenant(
      { organizationId: orgBetaId, userId: userBetaId },
      () => prisma.widget.findMany(),
    );

    expect(widgets).toHaveLength(1);
    expect(widgets[0].id).toBe(widgetBetaId);
    expect(widgets[0].name).toBe("Beta Widget");
  });

  it("Alpha CANNOT read Beta's widget by ID", async () => {
    const widget = await runAsTenant(
      { organizationId: orgAlphaId, userId: userAlphaId },
      () => prisma.widget.findFirst({ where: { id: widgetBetaId } }),
    );

    expect(widget).toBeNull();
  });

  it("Beta CANNOT update Alpha's widget", async () => {
    const result = await runAsTenant(
      { organizationId: orgBetaId, userId: userBetaId },
      () =>
        prisma.widget.updateMany({
          where: { id: widgetAlphaId },
          data: { name: "Hacked by Beta" },
        }),
    );

    expect(result.count).toBe(0);

    // Verify Alpha's widget is untouched
    const widget = await rawPrisma.widget.findUnique({
      where: { id: widgetAlphaId },
    });
    expect(widget?.name).toBe("Alpha Widget");
  });

  it("Beta CANNOT delete Alpha's widget", async () => {
    const result = await runAsTenant(
      { organizationId: orgBetaId, userId: userBetaId },
      () =>
        prisma.widget.deleteMany({
          where: { id: widgetAlphaId },
        }),
    );

    expect(result.count).toBe(0);

    // Verify Alpha's widget still exists
    const widget = await rawPrisma.widget.findUnique({
      where: { id: widgetAlphaId },
    });
    expect(widget).not.toBeNull();
  });

  it("count is scoped to tenant", async () => {
    const alphaCount = await runAsTenant(
      { organizationId: orgAlphaId, userId: userAlphaId },
      () => prisma.widget.count(),
    );
    const betaCount = await runAsTenant(
      { organizationId: orgBetaId, userId: userBetaId },
      () => prisma.widget.count(),
    );

    expect(alphaCount).toBe(1);
    expect(betaCount).toBe(1);
  });
});
