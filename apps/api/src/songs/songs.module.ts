import { Module } from '@nestjs/common';
import { SongsController } from './songs.controller';
import { SongsService } from './songs.service';

@Module({
  controllers: [SongsController],
  providers:   [SongsService],
  exports:     [SongsService],   // practice.service 에서 inject 가능하도록
})
export class SongsModule {}
