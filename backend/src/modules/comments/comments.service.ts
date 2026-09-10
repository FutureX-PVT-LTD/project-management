import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto, UpdateCommentDto, TaskActionType, NotificationType, UserRole } from '@futurex/shared';
import { requireTask } from '../../common/security/access-policy';

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCommentDto, authorId: string, globalRole: UserRole) {
    await requireTask(this.prisma, dto.taskId, { id: authorId, globalRole });
    const task = await this.prisma.task.findUnique({
      where: { id: dto.taskId },
      include: { assignee: true, creator: true },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const comment = await this.prisma.taskComment.create({
      data: {
        taskId: dto.taskId,
        authorId,
        content: dto.content.trim(),
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            jobTitle: true,
          },
        },
      },
    });

    // Notify task assignee if someone else commented
    if (task.assigneeId && task.assigneeId !== authorId) {
      await this.prisma.notification.create({
        data: {
          userId: task.assigneeId,
          type: NotificationType.MENTIONED_IN_COMMENT,
          title: 'New Comment on Your Task',
          message: `${comment.author.firstName} commented on "${task.title}" (${task.humanId})`,
          linkUrl: `/projects/${task.projectId}?taskId=${task.id}`,
        },
      });
    }

    await this.prisma.taskActivity.create({
      data: {
        taskId: task.id,
        projectId: task.projectId,
        userId: authorId,
        actionType: TaskActionType.COMMENT_ADDED,
        description: `Added a comment: "${dto.content.substring(0, 60)}${dto.content.length > 60 ? '...' : ''}"`,
      },
    });

    return {
      id: comment.id,
      taskId: comment.taskId,
      authorId: comment.authorId,
      author: comment.author,
      content: comment.content,
      isEdited: comment.isEdited,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    };
  }

  async update(id: string, dto: UpdateCommentDto, userId: string, userRole: UserRole) {
    const comment = await this.prisma.taskComment.findUnique({ where: { id } });
    if (!comment || comment.deletedAt) throw new NotFoundException('Comment not found');
    await requireTask(this.prisma, comment.taskId, { id: userId, globalRole: userRole });

    if (comment.authorId !== userId && userRole !== UserRole.OWNER && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    const updated = await this.prisma.taskComment.update({
      where: { id },
      data: {
        content: dto.content.trim(),
        isEdited: true,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            jobTitle: true,
          },
        },
      },
    });

    return {
      id: updated.id,
      taskId: updated.taskId,
      authorId: updated.authorId,
      author: updated.author,
      content: updated.content,
      isEdited: updated.isEdited,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async delete(id: string, userId: string, userRole: UserRole) {
    const comment = await this.prisma.taskComment.findUnique({ where: { id } });
    if (!comment || comment.deletedAt) throw new NotFoundException('Comment not found');
    await requireTask(this.prisma, comment.taskId, { id: userId, globalRole: userRole });

    if (comment.authorId !== userId && userRole !== UserRole.OWNER && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.taskComment.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'COMMENT_DELETED',
          entityType: 'TaskComment',
          entityId: id,
          detailsJson: JSON.stringify({ taskId: comment.taskId }),
        },
      });

      const task = await tx.task.findUnique({
        where: { id: comment.taskId },
        select: { projectId: true },
      });

      if (task) {
        await tx.taskActivity.create({
          data: {
            taskId: comment.taskId,
            projectId: task.projectId,
            userId,
            actionType: TaskActionType.UPDATED,
            description: 'Deleted a comment',
          },
        });
      }
    });

    return { success: true, message: 'Comment deleted' };
  }
}
