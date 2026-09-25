import { NestFactory } from "@nestjs/core";
import { VersioningType, ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import compression from "compression";
import express from "express";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";
import { TenantInterceptor } from "./common/interceptors/tenant.interceptor";
import { AxiomLogger } from "./common/logger/axiom.logger";
import { initSentry } from "./common/monitoring/sentry.setup";

initSentry();

async function bootstrap() {
  const logger = new AxiomLogger();
  const app = await NestFactory.create(AppModule, { logger });

  // Raw body required for Stripe webhook signature verification
  app.use(
    "/api/v1/webhooks/stripe",
    express.raw({ type: "application/json" }),
  );

  // Security
  app.use(helmet());
  app.use(compression());
  app.enableCors();

  // API versioning
  app.setGlobalPrefix("api");
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: "1",
  });

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global filters & interceptors
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TenantInterceptor(),
    new TransformInterceptor(),
  );

  // Swagger / OpenAPI
  const swaggerConfig = new DocumentBuilder()
    .setTitle("YayChatbot API")
    .setDescription("Multi-tenant SaaS chatbot API")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}`);
  console.log(`Swagger docs at http://localhost:${port}/docs`);

  // Flush Axiom buffer on graceful shutdown
  const axiomLogger = app.get(AxiomLogger, { strict: false });
  for (const signal of ["SIGTERM", "SIGINT"]) {
    process.on(signal, async () => {
      await axiomLogger?.flush();
      await app.close();
      process.exit(0);
    });
  }
}
bootstrap();
