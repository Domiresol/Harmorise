import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule }   from '../prisma/prisma.module';
import { AuthModule }     from '../auth/auth.module';
import { UsersModule }    from '../users/users.module';
import { PracticeModule } from '../practice/practice.module';
import { AdminModule }    from '../admin/admin.module';
import { BpmModule }        from '../bpm/bpm.module';
import { SongsModule }      from '../songs/songs.module';
import { AuditLogModule }   from '../audit-log/audit-log.module';
import { AppController }    from './app.controller';
import { AppService }     from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    PracticeModule,
    AdminModule,
    BpmModule,
    SongsModule,
    AuditLogModule,
  ],
  controllers: [AppController],
  providers:   [AppService],
})
export class AppModule {}
