import { Module } from '@nestjs/common';
import { PracticeService }    from './practice.service';
import { PracticeController } from './practice.controller';
import { PrismaModule }       from '../prisma/prisma.module';
import { SongsModule }        from '../songs/songs.module';

@Module({
  imports:     [PrismaModule, SongsModule],
  controllers: [PracticeController],
  providers:   [PracticeService],
  exports:     [PracticeService],
})
export class PracticeModule {}
