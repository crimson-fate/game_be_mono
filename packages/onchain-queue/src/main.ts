import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import configuration from '@app/shared/configuration';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(configuration().PORTS.ONCHAIN_QUEUE_SERVICE, () => {
    console.log(
      `Onchain Queue is running on port ${configuration().PORTS.ONCHAIN_QUEUE_SERVICE}`,
    );
  });
}
bootstrap();
