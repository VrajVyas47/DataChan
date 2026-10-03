import { MongoClient, MongoClientOptions, Db } from 'mongodb';
import { config } from '../config';
import { logger } from '../logging/logger';

let client: MongoClient | null = null;

export async function connectMongo(): Promise<MongoClient> {
  if (client) {
    return client;
  }

  try {
    const options: MongoClientOptions = {
      maxPoolSize: 20,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
    };

    // If explicit user and password are provided and not already embedded in the URI
    if (config.mongodb.user && config.mongodb.password && !config.mongodb.uri.includes('@')) {
      options.auth = {
        username: config.mongodb.user,
        password: config.mongodb.password,
      };
      if (config.mongodb.authSource) {
        options.authSource = config.mongodb.authSource;
      }
    }

    logger.info('Connecting to MongoDB...', {
      uri: config.mongodb.uri.replace(/:([^:@]{1,})@/, ':****@'), // redact password in logs
      hasAuth: Boolean(config.mongodb.user || config.mongodb.uri.includes('@')),
    });

    client = new MongoClient(config.mongodb.uri, options);
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

let cachedServerVersion: string | null = null;
export async function getMongoServerVersion(): Promise<string> {
  if (cachedServerVersion) return cachedServerVersion;
  try {
    const adminDb = getMongoClient().db('admin');
    const info = await adminDb.command({ buildInfo: 1 });
    if (info && info.version) {
      cachedServerVersion = String(info.version);
      return cachedServerVersion;
    }
  } catch {
    try {
      const db = getPlatformDb();
      const status = await db.command({ serverStatus: 1 });
      if (status && status.version) {
        cachedServerVersion = String(status.version);
        return cachedServerVersion;
      }
    } catch {}
  }
  return '8.2.5';
}
