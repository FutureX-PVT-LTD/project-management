import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '@futurex/shared';

@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  constructor(private filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } })) // 25MB max
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('projectId') projectId: string,
    @Body('taskId') taskId: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.filesService.saveAttachment(file, actor, projectId, taskId);
  }

  @Get('project/:projectId')
  async findByProject(@Param('projectId') projectId: string, @CurrentUser() actor: AuthUser) {
    return this.filesService.findByProject(projectId, actor);
  }

  @Get('download/:fileKey')
  async download(@Param('fileKey') fileKey: string, @CurrentUser() actor: AuthUser, @Res() res: Response) {
    const { filePath, fileName } = await this.filesService.getAuthorizedFile(fileKey, actor);
    const safeName = fileName.replace(/["\r\n]/g, '_');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    return res.download(filePath, safeName);
  }
}
