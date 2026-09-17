import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { ProjectStatus, UserRole } from "@futurex/shared";
import { ProjectsService } from "./projects.service";

describe("ProjectsService draft lifecycle", () => {
  const project = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
  };
  const user = { findMany: jest.fn() };
  const prisma = { project, user } as any;
  const marketing = {} as any;
  let service: ProjectsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProjectsService(prisma, marketing);
  });

  it("never returns drafts from the active Product directory", async () => {
    project.findMany.mockResolvedValue([]);

    await service.findAll({ id: "admin-1", globalRole: UserRole.ADMIN }, "ALL");

    expect(project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ lifecycleStatus: "ACTIVE" }),
      }),
    );
  });

  it("uses the archived lifecycle only for the archived directory", async () => {
    project.findMany.mockResolvedValue([]);

    await service.findAll(
      { id: "owner-1", globalRole: UserRole.OWNER },
      ProjectStatus.ARCHIVED,
    );

    expect(project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ lifecycleStatus: "ARCHIVED" }),
      }),
    );
  });

  it("scopes an Admin draft list to drafts they created", async () => {
    project.findMany.mockResolvedValue([]);

    await service.getDrafts("admin-1", UserRole.ADMIN);

    expect(project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          lifecycleStatus: "DRAFT",
          createdById: "admin-1",
        }),
      }),
    );
  });

  it("does not reveal another Admin's draft", async () => {
    project.findFirst.mockResolvedValue(null);

    await expect(
      service.getDraft("draft-1", "admin-1", UserRole.ADMIN),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(project.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ createdById: "admin-1" }),
      }),
    );
  });

  it("blocks a team member even if the service is called directly", async () => {
    await expect(
      service.saveDraft({ name: "Hidden draft" }, "member-1", UserRole.TEAM_MEMBER),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("refuses activation when a saved team member is no longer eligible", async () => {
    project.findFirst
      .mockResolvedValueOnce({
        id: "draft-1",
        key: "DFT1",
        name: "Delivery App",
        productType: "APP",
        lifecycleStatus: "DRAFT",
        deletedAt: null,
        startDate: new Date("2026-09-01"),
        targetDate: new Date("2026-10-01"),
        draftDataJson: JSON.stringify({
          selectedMemberIds: ["inactive-user"],
          developmentEnabled: true,
          marketingEnabled: false,
        }),
        members: [],
      })
      .mockResolvedValueOnce(null);
    user.findMany.mockResolvedValue([]);

    await expect(
      service.activateDraft("draft-1", "admin-1", UserRole.ADMIN),
    ).rejects.toThrow("Every selected team member must still be active");
  });
});
