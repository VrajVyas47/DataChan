import { createApp } from './server/app';
import { connectMongo } from './database/mongoClient';
import { config } from './config';
import { logger } from './logging/logger';

async function bootstrap() {
  try {
    await connectMongo();

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
