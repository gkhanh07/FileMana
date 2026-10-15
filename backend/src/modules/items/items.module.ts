import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';
import { fileStorage, filesDir, MAX_FILE_BYTES } from './upload';

@Module({
  imports: [
    // Used by this module's FileInterceptors only; the avatar upload keeps its own options.
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        storage: fileStorage(filesDir(config)),
        limits: { fileSize: MAX_FILE_BYTES, files: 1 },
        // Browsers send file names as UTF-8; Vietnamese names arrive garbled otherwise.
        defParamCharset: 'utf8',
      }),
    }),
  ],
  controllers: [ItemsController],
  providers: [ItemsService],
  exports: [ItemsService],
})
export class ItemsModule {}
