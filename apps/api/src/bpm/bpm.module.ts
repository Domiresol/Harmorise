import { Module } from '@nestjs/common';
import { BpmController } from './bpm.controller';
import { BpmService } from './bpm.service';
import { SongsModule }  from '../songs/songs.module';

@Module({
  imports:     [SongsModule],
  controllers: [BpmController],
  providers:   [BpmService],
})
export class BpmModule {}
