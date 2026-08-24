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
import { Public } from '../../common/decorators/public.decorator';

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
    @CurrentUser('id') uploaderId: string,
  ) {
    return this.filesService.saveAttachment(file, uploaderId, projectId, taskId);
  }

  @Get('project/:projectId')
  async findByProject(@Param('projectId') projectId: string) {
    return this.filesService.findByProject(projectId);
  }

  @Public()
  @Get('download/:fileKey')
  async download(@Param('fileKey') fileKey: string, @Res() res: Response) {
    const filePath = this.filesService.getFilePath(fileKey);
    return res.sendFile(filePath);
  }
}
