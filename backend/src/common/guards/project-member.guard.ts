import { Injectable, CanActivate, ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@futurex/shared';
import { PrismaService } from '../../modules/prisma/prisma.service';

@Injectable()
export class ProjectMemberGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const projectId = request.params.projectId || request.params.id || request.body.projectId;

    if (!user) {
      throw new ForbiddenException('User context not found');
    }

    // Owner has global access to all projects
    if (user.globalRole === UserRole.OWNER) {
      return true;
    }

    if (!projectId) {
      return true; // No project context in this route
    }

    // Check project exists
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { members: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Managing Admin of this project or assigned member
    if (project.projectManagerId === user.id) {
      return true;
    }

    const isMember = project.members.some((m) => m.userId === user.id);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this project');
    }

    return true;
  }
}
