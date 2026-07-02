import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt-payload.interface';
import { ProfilesService } from './profiles.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePrivacyDto } from './dto/update-privacy.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import {
  MAX_DOCUMENT_SIZE_BYTES,
  MAX_PHOTOS,
  MAX_PHOTO_SIZE_BYTES,
  documentFileFilter,
  imageFileFilter,
} from './upload.constants';

@UseGuards(JwtAccessGuard)
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Post('me')
  createOwn(@CurrentUser() user: JwtPayload, @Body() dto: CreateProfileDto) {
    return this.profilesService.create(user.sub, dto);
  }

  @Get('me')
  getOwn(@CurrentUser() user: JwtPayload) {
    return this.profilesService.findByUserId(user.sub);
  }

  @Patch('me')
  updateOwn(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto) {
    return this.profilesService.updateOwn(user.sub, dto);
  }

  @Patch('me/privacy')
  updatePrivacy(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdatePrivacyDto,
  ) {
    return this.profilesService.updatePrivacy(user.sub, dto);
  }

  @Post('me/photos')
  @UseInterceptors(
    FilesInterceptor('files', MAX_PHOTOS, {
      storage: memoryStorage(),
      limits: { fileSize: MAX_PHOTO_SIZE_BYTES },
      fileFilter: imageFileFilter,
    }),
  )
  uploadPhotos(
    @CurrentUser() user: JwtPayload,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files?.length) {
      throw new BadRequestException('No files uploaded');
    }
    return this.profilesService.addPhotos(user.sub, files);
  }

  @Delete('me/photos/:photoId')
  deletePhoto(
    @CurrentUser() user: JwtPayload,
    @Param('photoId') photoId: string,
  ) {
    return this.profilesService.deletePhoto(user.sub, photoId);
  }

  @Patch('me/photos/:photoId/primary')
  setPrimaryPhoto(
    @CurrentUser() user: JwtPayload,
    @Param('photoId') photoId: string,
  ) {
    return this.profilesService.setPrimaryPhoto(user.sub, photoId);
  }

  @Post('me/documents')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_DOCUMENT_SIZE_BYTES },
      fileFilter: documentFileFilter,
    }),
  )
  uploadDocument(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.profilesService.addDocument(user.sub, file, dto.docType);
  }

  @Get('me/documents/:docId/file')
  async getOwnDocumentFile(
    @CurrentUser() user: JwtPayload,
    @Param('docId') docId: string,
    @Res() res: Response,
  ) {
    const filePath = await this.profilesService.getOwnDocumentFilePath(
      user.sub,
      docId,
    );
    res.sendFile(filePath);
  }

  // Must come before the :id route below, otherwise "by-users" would be
  // matched as a profile ID.
  @Get('by-users')
  getByUserIds(@Query('ids') ids: string, @CurrentUser() user: JwtPayload) {
    const userIds = (ids ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    return this.profilesService.findByUserIdsForViewer(userIds, {
      userId: user.sub,
      role: user.role,
    });
  }

  @Get(':id')
  getById(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.profilesService.findByIdForViewer(id, {
      userId: user.sub,
      role: user.role,
    });
  }
}
