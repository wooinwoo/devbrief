import { Module } from '@nestjs/common';
import { BrandColorService } from './brand-color.service';
import { OgImageService } from './og-image.service';

@Module({
  providers: [OgImageService, BrandColorService],
  exports: [OgImageService, BrandColorService],
})
export class CommonModule {}
