import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  // ── 보안 헤더 (Helmet 대체) ──────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.use((_req: any, res: any, next: () => void) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'microphone=(), camera=()');
    if (process.env['NODE_ENV'] === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });

  // ── DTO 유효성 검사 전역 적용 ────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:            true,  // 정의되지 않은 필드 제거
      forbidNonWhitelisted: true,
      transform:            true,  // 타입 자동 변환
    }),
  );

  // ── CORS ─────────────────────────────────────────────────────
  const allowedOrigins = process.env['NODE_ENV'] === 'production'
    ? [process.env['FRONTEND_URL'] ?? 'https://harmorise.app']
    : ['http://localhost:4200'];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  const port = process.env['PORT'] ?? 3000;
  await app.listen(port);
  Logger.log(`🚀 API running on: http://localhost:${port}/api`);
}

bootstrap();
