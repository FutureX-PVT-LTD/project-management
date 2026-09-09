import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { WsAdapter } from '@nestjs/platform-ws';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';
import { allowedOrigins, csrfProtection, requestLimits, validateSecurityEnvironment } from './common/security/http-security';

async function bootstrap() {
  validateSecurityEnvironment();
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Cookie Parser
  app.use(cookieParser());
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  app.getHttpAdapter().getInstance().set('trust proxy', process.env.TRUST_PROXY === 'loopback' ? 'loopback' : false);
  app.use(csrfProtection);
  app.use(json({ limit: '256kb' }));
  app.use(urlencoded({ extended: false, limit: '256kb', parameterLimit: 100 }));
  app.use(requestLimits());

  app.use((_, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  // WebSocket Adapter
  app.useWebSocketAdapter(new WsAdapter(app));

  // Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
    }),
  );

  // CORS Configuration
  app.enableCors({
    origin: allowedOrigins(),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  const exposeDocs =
    process.env.NODE_ENV !== 'production' || process.env.ENABLE_API_DOCS === 'true';

  if (exposeDocs) {
    const config = new DocumentBuilder()
      .setTitle('FutureX Project Management Portal API')
      .setDescription(
        'Enterprise REST API for FutureX game and software delivery management, task tracking, and dependency automation.',
      )
      .setVersion('1.0.0')
      .addBearerAuth()
      .addCookieAuth('access_token')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 4000;
  await app.listen(port, process.env.HOST || '127.0.0.1');

  logger.log(`====================================================`);
  logger.log(`🚀 FutureX API is running on: http://localhost:${port}/api/v1`);
  if (exposeDocs) {
    logger.log(`Swagger OpenAPI Documentation: http://localhost:${port}/api/docs`);
  }
  logger.log(`====================================================`);
}

bootstrap();
