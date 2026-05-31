import { Module } from '@nestjs/common';
import { OgImageService } from './og-image.service';
import { BrandColorService } from './brand-color.service';

@Module({
  providers: [OgImageService, BrandColorService],
  exports: [OgImageService, BrandColorService],
})
export class CommonModule {}
