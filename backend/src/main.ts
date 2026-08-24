import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { WsAdapter } from '@nestjs/platform-ws';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Cookie Parser
  app.use(cookieParser());

  // WebSocket Adapter
  app.useWebSocketAdapter(new WsAdapter(app));

  // Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS Configuration
  app.enableCors({
    origin: [
      process.env.WEB_URL || 'http://localhost:3000',
      'http://127.0.0.1:3000',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Swagger OpenAPI Documentation
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

  const port = process.env.PORT || 4000;
  await app.listen(port);

  logger.log(`====================================================`);
  logger.log(`🚀 FutureX API is running on: http://localhost:${port}/api/v1`);
  logger.log(`📚 Swagger OpenAPI Documentation: http://localhost:${port}/api/docs`);
  logger.log(`====================================================`);
}

bootstrap();
