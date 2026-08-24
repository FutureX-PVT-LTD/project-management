import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TaskActionType } from '@futurex/shared';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FilesService {
  constructor(private prisma: PrismaService) {}

  async saveAttachment(
    file: Express.Multer.File,
    uploaderId: string,
    projectId: string,
    taskId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Ensure uploads directory exists
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileKey = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(uploadDir, fileKey);
    fs.writeFileSync(filePath, file.buffer);

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

  async findByProject(projectId: string) {
    const attachments = await this.prisma.taskAttachment.findMany({
      where: { projectId },
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

  getFilePath(fileKey: string) {
    const uploadDir = path.join(process.cwd(), 'uploads');
    const filePath = path.join(uploadDir, fileKey);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }
    return filePath;
  }
}
