import { Module } from '@nestjs/common';
import { OgImageService } from './og-image.service';

@Module({
  providers: [OgImageService],
  exports: [OgImageService],
})
export class CommonModule {}
