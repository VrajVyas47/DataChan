import { Request, Response, NextFunction } from 'express';
import { getPlatformDb, getMongoClient } from '../../database/mongoClient';
import {
  ApiResponse,
  DataModel,
  DesignFeedbackItem,
  GeneratedMongoStructure,
} from '@datachan/shared-types';
import {
  InvalidRequestError,
  ResourceNotFoundError,
  AuthorizationError,
} from '../../errors';

/**
 * Deterministic rule-based evaluation of a MongoDB data model.
 */
export function validateDataModelRules(model: Partial<DataModel>): DesignFeedbackItem[] {
  const feedback: DesignFeedbackItem[] = [];
  const entities = model.entities || [];
  const relationships = model.relationships || [];

  if (entities.length === 0) {
    feedback.push({
      id: 'fb-empty',
      type: 'problem',
      message: 'Model contains no collections. Add at least one collection to design your MongoDB database.',
    });
    return feedback;
  }

  // Check collections & fields
  for (const entity of entities) {
    if (!entity.name || entity.name.trim().length === 0) {
      feedback.push({
        id: `fb-no-name-${entity.id}`,
        type: 'problem',
        message: 'A collection node is missing a name.',
      });
      continue;
    }

    if (!entity.fields || entity.fields.length === 0) {
      feedback.push({
        id: `fb-no-fields-${entity.id}`,
        type: 'problem',
        entityName: entity.name,
        message: `Collection '${entity.name}' has no fields defined. Add relevant attributes.`,
      });
      continue;
    }

    // Check for duplicate field names
    const fieldNames = new Set<string>();
    for (const f of entity.fields) {
      const lower = f.name.toLowerCase();
      if (fieldNames.has(lower)) {
        feedback.push({
          id: `fb-dup-${entity.id}-${f.name}`,
          type: 'problem',
          entityName: entity.name,
          message: `Duplicate field name '${f.name}' in collection '${entity.name}'.`,
        });
      }
      fieldNames.add(lower);
    }

    // Recommendation on _id
    const hasExplicitId = entity.fields.some((f) => f.name === '_id');
    if (!hasExplicitId) {
      feedback.push({
        id: `fb-id-${entity.id}`,
        type: 'correct',
        entityName: entity.name,
        message: `Default '_id' (ObjectId) primary key will be automatically managed by MongoDB for '${entity.name}'.`,
      });
    }

    // Check for large arrays / unbounded growth considerations
    const arrayFields = entity.fields.filter((f) => f.type === 'Array');
    if (arrayFields.length > 0) {
      feedback.push({
        id: `fb-array-${entity.id}`,
        type: 'consideration',
        entityName: entity.name,
        message: `Collection '${entity.name}' uses embedded array(s): ${arrayFields.map((f) => f.name).join(', ')}. Ensure array sizes remain bounded to prevent hitting MongoDB's 16MB document size limit.`,
      });
    }
  }

  // Check relationships
  for (const rel of relationships) {
    const src = entities.find((e) => e.id === rel.sourceEntityId);
    const tgt = entities.find((e) => e.id === rel.targetEntityId);

    if (!src || !tgt) continue;

    if (rel.strategy === 'embedded') {
      if (rel.cardinality === 'N:M') {
        feedback.push({
          id: `fb-embed-many-${rel.id}`,
          type: 'consideration',
          entityName: src.name,
          message: `Embedding with N:M cardinality between '${src.name}' and '${tgt.name}' can lead to significant data duplication. Consider referencing if '${tgt.name}' documents are updated frequently.`,
        });
      } else {
        feedback.push({
          id: `fb-embed-good-${rel.id}`,
          type: 'correct',
          entityName: src.name,
          message: `Embedding '${tgt.name}' inside '${src.name}' optimizes read queries by avoiding multi-collection lookups.`,
        });
      }
    } else if (rel.strategy === 'referenced') {
      feedback.push({
        id: `fb-ref-good-${rel.id}`,
        type: 'correct',
        entityName: src.name,
        message: `Referencing between '${src.name}' and '${tgt.name}' ensures normalized updates and accommodates unbounded relationships.`,
      });
    }
  }

  return feedback;
}

export async function listDataModels(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const db = getPlatformDb();
    const models = await db
      .collection('data_models')
      .find({ userId: req.user!.userId })
      .sort({ updatedAt: -1 })
      .toArray();

    const formatted: DataModel[] = models.map((m: any) => ({
      id: m.id,
      userId: m.userId,
      name: m.name,
      description: m.description,
      entities: m.entities || [],
      relationships: m.relationships || [],
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    }));

    const response: ApiResponse<DataModel[]> = {
      success: true,
      data: formatted,
      error: null,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
}

export async function getDataModel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params.id || '');
    const db = getPlatformDb();
    const model = await db.collection('data_models').findOne({ id });

    if (!model) {
      throw new ResourceNotFoundError('Data Model', id);
    }
    if (model.userId !== req.user!.userId) {
      throw new AuthorizationError('You do not own this data model');
    }

    const formatted: DataModel = {
      id: model.id,
      userId: model.userId,
      name: model.name,
      description: model.description,
      entities: model.entities || [],
      relationships: model.relationships || [],
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    };

    const response: ApiResponse<DataModel> = {
      success: true,
      data: formatted,
      error: null,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
}

export async function saveOrUpdateDataModel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id, name, description, entities, relationships } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new InvalidRequestError('Model name is required');
    }

    const db = getPlatformDb();
    const modelId = id || `dm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const modelRecord: DataModel = {
      id: modelId,
      userId: req.user!.userId,
      name: name.trim(),
      description: description || '',
      entities: entities || [],
      relationships: relationships || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.collection('data_models').updateOne(
      { id: modelId, userId: req.user!.userId },
      { $set: modelRecord },
      { upsert: true }
    );

    const response: ApiResponse<DataModel> = {
      success: true,
      data: modelRecord,
      error: null,
    };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
}

export async function validateModel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { entities, relationships } = req.body;
    const feedback = validateDataModelRules({ entities, relationships });

    const response: ApiResponse<DesignFeedbackItem[]> = {
      success: true,
      data: feedback,
      error: null,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
}

export async function generateMongoStructure(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = String(req.params.id || '');
    const { targetDatabaseId } = req.body;

    const platformDb = getPlatformDb();
    const model = await platformDb.collection('data_models').findOne({ id });

    if (!model) {
      throw new ResourceNotFoundError('Data Model', id);
    }

    const user = await platformDb.collection('users').findOne({ id: req.user!.userId });
    const dbId = targetDatabaseId || user?.activeDatabaseId;

    if (!dbId) {
      throw new InvalidRequestError('A target virtual database must be selected to apply the schema.');
    }

    const vdb = await platformDb.collection('virtual_databases').findOne({ id: dbId });
    if (!vdb) {
      throw new ResourceNotFoundError('Virtual Database', dbId);
    }
    if (vdb.userId !== req.user!.userId) {
      throw new AuthorizationError('You do not own the target database');
    }

    const client = getMongoClient();
    const userDb = client.db(vdb.physicalNamespace);

    const generatedCollections: any[] = [];

    for (const entity of model.entities || []) {
      const colName = entity.name.toLowerCase().replace(/\s+/g, '_');
      const sampleDoc: Record<string, any> = {};

      for (const field of entity.fields || []) {
        switch (field.type) {
          case 'String':
            sampleDoc[field.name] = `Sample ${field.name}`;
            break;
          case 'Number':
            sampleDoc[field.name] = 100;
            break;
          case 'Boolean':
            sampleDoc[field.name] = true;
            break;
          case 'Date':
            sampleDoc[field.name] = new Date().toISOString();
            break;
          case 'Array':
            sampleDoc[field.name] = ['item_1', 'item_2'];
            break;
          case 'Object':
            sampleDoc[field.name] = { key: 'value' };
            break;
          default:
            sampleDoc[field.name] = 'sample';
        }
      }

      try {
        await userDb.createCollection(colName);
      } catch {
        // already exists
      }

      await userDb.collection(colName).insertOne(sampleDoc);
      generatedCollections.push({
        name: colName,
        sampleDocument: sampleDoc,
      });
    }

    const response: ApiResponse<GeneratedMongoStructure> = {
      success: true,
      data: {
        collections: generatedCollections,
      },
      error: null,
    };
    res.json(response);
  } catch (err) {
    next(err);
  }
}
