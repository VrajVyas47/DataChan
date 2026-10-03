import { createApp } from './server/app';
import { connectMongo } from './database/mongoClient';
import { initializePlatformSchema } from './database/schema';
import { initFirebaseAdmin } from './security/firebaseAdmin';
import { config } from './config';
import { logger } from './logging/logger';

async function bootstrap() {
  try {
    await connectMongo();
    await initializePlatformSchema();
    initFirebaseAdmin();

    const app = createApp();
    app.listen(config.port, () => {
      logger.info(`DATA-CHAN Virtual Database Lab API running on http://localhost:${config.port}/api/v1`);
    });
  } catch (err) {
    logger.error('Failed to start DATA-CHAN API server', err);
    process.exit(1);
  }
}

bootstrap();
