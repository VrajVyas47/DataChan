import { MongoClient, Db } from 'mongodb';
import { config } from '../config';
import { logger } from '../logging/logger';

let client: MongoClient | null = null;

export async function connectMongo(): Promise<MongoClient> {
  if (client) {
    return client;
  }

  try {
    logger.info('Connecting to MongoDB...', { uri: config.mongodb.uri });
    client = new MongoClient(config.mongodb.uri, {
      maxPoolSize: 20,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
    });

    await client.connect();
    logger.info('Connected to MongoDB successfully');
    return client;
  } catch (err) {
    logger.error('Failed to connect to MongoDB', err);
    throw err;
  }
}

export function getMongoClient(): MongoClient {
  if (!client) {
    throw new Error('MongoClient has not been initialized. Call connectMongo() first.');
  }
  return client;
}

export function getPlatformDb(): Db {
  return getMongoClient().db(config.mongodb.platformDb);
}

export function getNamespaceDb(namespace: string): Db {
  return getMongoClient().db(namespace);
}

export async function closeMongo(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    logger.info('MongoDB connection closed');
  }
}
