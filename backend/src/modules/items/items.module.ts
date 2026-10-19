import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';
import { fileStorage, filesDir, MAX_FILE_BYTES } from './upload';

@Module({
  imports: [
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        storage: fileStorage(filesDir(config)),
        limits: { fileSize: MAX_FILE_BYTES, files: 1 },
        defParamCharset: 'utf8',
      }),
    }),
  ],
  controllers: [ItemsController],
  providers: [ItemsService],
  exports: [ItemsService],
})
export class ItemsModule {}
