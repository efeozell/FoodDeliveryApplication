import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { Logger, VersioningType } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());

  // Winston logger'ı kullan
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  // Exception filter'ı dependency injection ile al
  const logger = app.get<Logger>(WINSTON_MODULE_NEST_PROVIDER);
  app.useGlobalFilters(new AllExceptionsFilter(logger));

  app.enableVersioning({
    type: VersioningType.URI,
  });
  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();

bootstrap().catch((error) => {
  console.log(`Failed to bootstrap application: ${error}`);
  process.exit(1);
});
