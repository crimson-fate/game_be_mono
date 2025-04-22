import { INestApplication } from '@nestjs/common';
import {
  setupTestApp as baseSetupTestApp,
  teardownTestApp as baseTeardownTestApp,
} from '../../../test/setup';
import { InventoryModule } from '../inventory.module';
import { MongooseModule } from '@nestjs/mongoose';
import {
  InventoryUser,
  InventoryUserSchema,
} from '@app/shared/models/schema/inventory-user.schema';
import { getConnectionToken } from '@nestjs/mongoose';

export async function setupTestApp(): Promise<INestApplication> {
  const app = await baseSetupTestApp(InventoryModule);

  // Get the mongoose connection
  const connection = app.get(getConnectionToken());

  // Ensure the schema is registered
  if (!connection.models[InventoryUser.name]) {
    connection.model(InventoryUser.name, InventoryUserSchema);
  }

  // Wait for the connection to be ready
  await connection.readyState;

  return app;
}

export async function teardownTestApp(app: INestApplication) {
  if (app) {
    const connection = app.get(getConnectionToken());
    await connection.close();
    await baseTeardownTestApp(app);
  }
}
