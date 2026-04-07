import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { getEnv } from "@libs/config";

async function bootstrap(): Promise<void> {
  const env = getEnv();
  const app = await NestFactory.create(AppModule);
  await app.listen(env.TRADING_API_PORT ?? env.APP_PORT);
}

void bootstrap();
