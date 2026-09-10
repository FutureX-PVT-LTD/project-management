import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TaskActionType, UserRole } from '@futurex/shared';
import { Actor, requireProject, requireTask, taskScope } from '../../common/security/access-policy';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FilesService {
  constructor(private prisma: PrismaService) {}

  async saveAttachment(
    file: Express.Multer.File,
    actor: Actor,
    projectId: string,
    taskId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const uploaderId = actor.id;
    await requireProject(this.prisma, projectId, actor);
    if (taskId) {
      const task = await requireTask(this.prisma, taskId, actor);
      if (task.projectId !== projectId) throw new BadRequestException('Task does not belong to project');
    }
    const extension = path.extname(file.originalname).toLowerCase();
    const signatures: Record<string, number[]> = {
      '.pdf': [0x25, 0x50, 0x44, 0x46, 0x2d], '.png': [137, 80, 78, 71, 13, 10, 26, 10],
      '.jpg': [255, 216, 255], '.jpeg': [255, 216, 255],
      '.zip': [80, 75], '.docx': [80, 75], '.xlsx': [80, 75], '.pptx': [80, 75],
    };
    const signature = signatures[extension];
    const textFile = ['.txt', '.csv', '.md', '.json'].includes(extension);
    if ((!signature && !textFile) || (signature && !signature.every((byte, i) => file.buffer[i] === byte)) ||
        (textFile && file.buffer.includes(0)) || file.size > 25 * 1024 * 1024) {
      throw new BadRequestException('Unsupported file type or invalid file content');
    }
    // Ensure uploads directory exists
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileKey = `${randomUUID()}${extension}`;
    const filePath = path.join(uploadDir, fileKey);
    await fs.promises.writeFile(filePath, file.buffer, { flag: 'wx', mode: 0o600 });

    const fileUrl = `/api/v1/files/download/${fileKey}`;

    const attachment = await this.prisma.taskAttachment.create({
      data: {
        fileName: file.originalname,
        fileKey,
        fileUrl,
        fileSize: file.size,
        mimeType: file.mimetype,
        projectId,
        taskId: taskId || undefined,
        uploaderId,
      },
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (taskId) {
      await this.prisma.taskActivity.create({
        data: {
          taskId,
          projectId,
          userId: uploaderId,
          actionType: TaskActionType.ATTACHMENT_ADDED,
          description: `Uploaded attachment: "${file.originalname}" (${(file.size / 1024).toFixed(1)} KB)`,
        },
      });
    }

    return {
      id: attachment.id,
      taskId: attachment.taskId,
      projectId: attachment.projectId,
      uploaderId: attachment.uploaderId,
      uploader: attachment.uploader,
      fileName: attachment.fileName,
      fileKey: attachment.fileKey,
      fileUrl: attachment.fileUrl,
      fileSize: attachment.fileSize,
      mimeType: attachment.mimeType,
      createdAt: attachment.createdAt.toISOString(),
    };
  }

  async findByProject(projectId: string, actor: Actor) {
    await requireProject(this.prisma, projectId, actor);
    const attachments = await this.prisma.taskAttachment.findMany({
      where: { projectId, ...(actor.globalRole === UserRole.TEAM_MEMBER
        ? { OR: [{ taskId: null }, { task: taskScope(actor), uploaderId: actor.id }] } : {}) },
      include: {
        uploader: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        task: {
          select: { id: true, humanId: true, title: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return attachments.map((a) => ({
      id: a.id,
      taskId: a.taskId,
      task: a.task,
      projectId: a.projectId,
      uploaderId: a.uploaderId,
      uploader: a.uploader,
      fileName: a.fileName,
      fileKey: a.fileKey,
      fileUrl: a.fileUrl,
      fileSize: a.fileSize,
      mimeType: a.mimeType,
      createdAt: a.createdAt.toISOString(),
    }));
  }

  async getAuthorizedFile(fileKey: string, actor: Actor) {
    if (!/^[a-zA-Z0-9_.-]+$/.test(fileKey) || fileKey.includes('..')) throw new NotFoundException('File not found');
    const attachment = await this.prisma.taskAttachment.findFirst({ where: { fileKey } });
    if (!attachment) throw new NotFoundException('File not found');
    await requireProject(this.prisma, attachment.projectId, actor);
    if (attachment.taskId) await requireTask(this.prisma, attachment.taskId, actor);
    if (attachment.taskId && actor.globalRole === UserRole.TEAM_MEMBER && attachment.uploaderId !== actor.id) {
      throw new NotFoundException('File not found');
    }
    const uploadDir = path.resolve(process.cwd(), 'uploads');
    const filePath = path.resolve(uploadDir, fileKey);
    if (path.dirname(filePath) !== uploadDir) throw new NotFoundException('File not found');
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }
    if (fs.lstatSync(filePath).isSymbolicLink()) throw new NotFoundException('File not found');
    return { filePath, fileName: path.basename(attachment.fileName).replace(/[\r\n]/g, '_') };
  }
}
