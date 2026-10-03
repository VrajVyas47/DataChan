import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import * as dataModelController from '../src/modules/data-models/dataModelController';
import * as mongoClientModule from '../src/database/mongoClient';
import { InvalidRequestError, ResourceNotFoundError, AuthorizationError } from '../src/errors';
import { DataModel, ModelEntity, ModelRelationship } from '@datachan/shared-types';

describe('Data Modeler Save -> Reload Persistence & Authorization', () => {
  let mockDb: any;
  let dataModelsStore: any[];
  let usersStore: any[];
  let virtualDbsStore: any[];

  const studentA = {
    userId: 'usr_student_a',
    firebaseUid: 'fb_student_a',
    email: 'student.a@datachan.test',
    username: 'student_a',
    role: 'student' as const,
    status: 'active' as const,
  };

  const studentB = {
    userId: 'usr_student_b',
    firebaseUid: 'fb_student_b',
    email: 'student.b@datachan.test',
    username: 'student_b',
    role: 'student' as const,
    status: 'active' as const,
  };

  function matchFilter(item: any, filter: Record<string, any>): boolean {
    if (!filter || Object.keys(filter).length === 0) return true;
    return Object.entries(filter).every(([key, val]) => {
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        if ('$in' in val && Array.isArray(val.$in)) {
          return val.$in.includes(item[key]);
        }
      }
      return item[key] === val;
    });
  }

  function createMockCollection(getStore: () => any[]) {
    return {
      find: (filter: Record<string, any> = {}) => {
        let items = getStore().filter((item) => matchFilter(item, filter));
        return {
          sort: (sortSpec: Record<string, number>) => {
            const [field, order] = Object.entries(sortSpec)[0] || ['updatedAt', -1];
            items.sort((a, b) => {
              if (a[field] < b[field]) return order === 1 ? -1 : 1;
              if (a[field] > b[field]) return order === 1 ? 1 : -1;
              return 0;
            });
            return {
              toArray: async () => JSON.parse(JSON.stringify(items)),
            };
          },
          toArray: async () => JSON.parse(JSON.stringify(items)),
        };
      },
      findOne: async (filter: Record<string, any>) => {
        const item = getStore().find((i) => matchFilter(i, filter));
        return item ? JSON.parse(JSON.stringify(item)) : null;
      },
      updateOne: async (
        filter: Record<string, any>,
        update: Record<string, any>,
        options: { upsert?: boolean } = {}
      ) => {
        const store = getStore();
        const idx = store.findIndex((i) => matchFilter(i, filter));
        if (idx !== -1) {
          if (update.$set) {
            store[idx] = { ...store[idx], ...update.$set };
          }
          return { matchedCount: 1, modifiedCount: 1, upsertedCount: 0 };
        } else if (options.upsert) {
          const newDoc = { ...(update.$set || {}) };
          store.push(newDoc);
          return { matchedCount: 0, modifiedCount: 0, upsertedCount: 1 };
        }
        return { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
      },
      deleteOne: async (filter: Record<string, any>) => {
        const store = getStore();
        const idx = store.findIndex((i) => matchFilter(i, filter));
        if (idx !== -1) {
          store.splice(idx, 1);
          return { deletedCount: 1 };
        }
        return { deletedCount: 0 };
      },
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();

    dataModelsStore = [];
    usersStore = [
      { id: studentA.userId, email: studentA.email, activeDatabaseId: 'vdb_a' },
      { id: studentB.userId, email: studentB.email, activeDatabaseId: 'vdb_b' },
    ];
    virtualDbsStore = [
      { id: 'vdb_a', userId: studentA.userId, name: 'Student A DB', physicalNamespace: 'db_a_phys' },
      { id: 'vdb_b', userId: studentB.userId, name: 'Student B DB', physicalNamespace: 'db_b_phys' },
    ];

    mockDb = {
      collection: (name: string) => {
        switch (name) {
          case 'data_models':
            return createMockCollection(() => dataModelsStore);
          case 'users':
            return createMockCollection(() => usersStore);
          case 'virtual_databases':
            return createMockCollection(() => virtualDbsStore);
          default:
            return createMockCollection(() => []);
        }
      },
    };

    vi.spyOn(mongoClientModule, 'getPlatformDb').mockReturnValue(mockDb);
  });

  function mockReqRes(user: any, body: any = {}, params: any = {}, query: any = {}) {
    const req = {
      user,
      body,
      params,
      query,
    } as unknown as Request;

    const resObj: any = {
      statusCode: 200,
      jsonPayload: null,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(payload: any) {
        this.jsonPayload = payload;
        return this;
      },
    };

    const res = resObj as unknown as Response;
    const next = vi.fn();

    return { req, res, resObj, next };
  }

  describe('1. Model Save & Persistence', () => {
    it('persists a new data model for the authenticated user and returns authoritative record', async () => {
      const entities: ModelEntity[] = [
        {
          id: 'ent_products',
          name: 'products',
          position: { x: 120, y: 80 },
          width: 350,
          fields: [
            { id: 'f1', name: '_id', type: 'ObjectId', isRequired: true },
            { id: 'f2', name: 'sku', type: 'String', isRequired: true },
            { id: 'f3', name: 'price', type: 'Number', isRequired: true },
          ],
        },
        {
          id: 'ent_reviews',
          name: 'reviews',
          position: { x: 480, y: 150 },
          width: 320,
          fields: [
            { id: 'f4', name: '_id', type: 'ObjectId', isRequired: true },
            { id: 'f5', name: 'productId', type: 'ObjectId', isRequired: true },
            { id: 'f6', name: 'rating', type: 'Number', isRequired: true },
          ],
        },
      ];

      const relationships: ModelRelationship[] = [
        {
          id: 'rel_prod_rev',
          sourceEntityId: 'ent_products',
          targetEntityId: 'ent_reviews',
          cardinality: '1:N',
          strategy: 'referenced',
        },
      ];

      const { req, res, resObj, next } = mockReqRes(studentA, {
        name: 'Inventory & Reviews Architecture',
        description: 'E-commerce schema with customer feedback',
        entities,
        relationships,
      });

      await dataModelController.saveOrUpdateDataModel(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(resObj.statusCode).toBe(200);
      expect(resObj.jsonPayload.success).toBe(true);

      const savedData: DataModel = resObj.jsonPayload.data;
      expect(savedData.id).toMatch(/^dm_/);
      expect(savedData.userId).toBe(studentA.userId);
      expect(savedData.name).toBe('Inventory & Reviews Architecture');
      expect(savedData.entities).toHaveLength(2);
      expect(savedData.relationships).toHaveLength(1);
      expect(savedData.entities[0].name).toBe('products');
      expect(savedData.entities[0].position).toEqual({ x: 120, y: 80 });
      expect((savedData.entities[0] as any).width).toBe(350);

      // Verify persisted in mock MongoDB
      expect(dataModelsStore).toHaveLength(1);
      expect(dataModelsStore[0].id).toBe(savedData.id);
      expect(dataModelsStore[0].userId).toBe(studentA.userId);
    });

    it('updates an existing model by ID and preserves original createdAt timestamp', async () => {
      // Pre-seed model
      const originalCreatedAt = '2026-10-01T10:00:00.000Z';
      dataModelsStore.push({
        id: 'dm_existing_123',
        userId: studentA.userId,
        name: 'Original Model',
        description: 'Old description',
        entities: [],
        relationships: [],
        createdAt: originalCreatedAt,
        updatedAt: originalCreatedAt,
      });

      const updatedEntities: ModelEntity[] = [
        {
          id: 'ent_customers',
          name: 'customers',
          position: { x: 50, y: 50 },
          fields: [{ id: 'f1', name: '_id', type: 'ObjectId', isRequired: true }],
        },
      ];

      const { req, res, resObj, next } = mockReqRes(studentA, {
        id: 'dm_existing_123',
        name: 'Updated Model Title',
        description: 'New description',
        entities: updatedEntities,
        relationships: [],
      });

      await dataModelController.saveOrUpdateDataModel(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(resObj.jsonPayload.success).toBe(true);
      const updated: DataModel = resObj.jsonPayload.data;
      expect(updated.id).toBe('dm_existing_123');
      expect(updated.name).toBe('Updated Model Title');
      expect(updated.createdAt).toBe(originalCreatedAt);
      expect(updated.updatedAt).not.toBe(originalCreatedAt);

      // Check store
      expect(dataModelsStore).toHaveLength(1);
      expect(dataModelsStore[0].name).toBe('Updated Model Title');
      expect(dataModelsStore[0].createdAt).toBe(originalCreatedAt);
    });

    it('rejects model save when name is empty or whitespace with InvalidRequestError', async () => {
      const { req, res, next } = mockReqRes(studentA, {
        name: '   ',
        entities: [],
      });

      await dataModelController.saveOrUpdateDataModel(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(InvalidRequestError));
    });
  });

  describe('2. Model Read-Back & Canvas Restoration', () => {
    it('listDataModels returns only models belonging to the authenticated user sorted by updatedAt desc', async () => {
      dataModelsStore.push(
        {
          id: 'dm_a_old',
          userId: studentA.userId,
          name: 'Student A Older Model',
          entities: [{ id: 'e1', name: 'users', position: { x: 10, y: 10 }, fields: [] }],
          relationships: [],
          updatedAt: '2026-10-02T12:00:00.000Z',
        },
        {
          id: 'dm_a_new',
          userId: studentA.userId,
          name: 'Student A Latest Model',
          entities: [{ id: 'e2', name: 'orders', position: { x: 100, y: 100 }, fields: [] }],
          relationships: [],
          updatedAt: '2026-10-02T15:00:00.000Z',
        },
        {
          id: 'dm_b_model',
          userId: studentB.userId,
          name: 'Student B Secret Model',
          entities: [{ id: 'e3', name: 'classified', position: { x: 0, y: 0 }, fields: [] }],
          relationships: [],
          updatedAt: '2026-10-02T16:00:00.000Z',
        }
      );

      // Student A lists models
      const { req, res, resObj, next } = mockReqRes(studentA);
      await dataModelController.listDataModels(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(resObj.jsonPayload.success).toBe(true);
      const models: DataModel[] = resObj.jsonPayload.data;

      // Must only contain Student A's models
      expect(models).toHaveLength(2);
      expect(models[0].id).toBe('dm_a_new'); // Latest first
      expect(models[0].name).toBe('Student A Latest Model');
      expect(models[1].id).toBe('dm_a_old');
      expect(models.some((m) => m.userId === studentB.userId)).toBe(false);
    });

    it('getDataModel retrieves persisted model by ID with full entities, fields, and relationships', async () => {
      dataModelsStore.push({
        id: 'dm_canvas_complete',
        userId: studentA.userId,
        name: 'Full E-Commerce Model',
        description: 'Complete canvas state',
        entities: [
          {
            id: 'node-users',
            name: 'customers',
            position: { x: 50, y: 50 },
            fields: [
              { id: 'f1', name: '_id', type: 'ObjectId', isRequired: true },
              { id: 'f2', name: 'email', type: 'String', isRequired: true },
            ],
          },
          {
            id: 'node-orders',
            name: 'orders',
            position: { x: 440, y: 120 },
            fields: [
              { id: 'f3', name: '_id', type: 'ObjectId', isRequired: true },
              { id: 'f4', name: 'customerId', type: 'ObjectId', isRequired: true },
            ],
          },
        ],
        relationships: [
          {
            id: 'e-customers-orders',
            sourceEntityId: 'node-users',
            targetEntityId: 'node-orders',
            cardinality: '1:N',
            strategy: 'referenced',
          },
        ],
        createdAt: '2026-10-02T10:00:00.000Z',
        updatedAt: '2026-10-02T10:00:00.000Z',
      });

      const { req, res, resObj, next } = mockReqRes(studentA, {}, { id: 'dm_canvas_complete' });
      await dataModelController.getDataModel(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(resObj.jsonPayload.success).toBe(true);
      const model: DataModel = resObj.jsonPayload.data;
      expect(model.id).toBe('dm_canvas_complete');
      expect(model.entities).toHaveLength(2);
      expect(model.relationships).toHaveLength(1);
      expect(model.relationships[0].strategy).toBe('referenced');
    });

    it('throws ResourceNotFoundError when requesting non-existent model ID', async () => {
      const { req, res, next } = mockReqRes(studentA, {}, { id: 'dm_ghost_id' });
      await dataModelController.getDataModel(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ResourceNotFoundError));
    });
  });

  describe('3. Ownership & Security Invariants', () => {
    it('blocks User B from reading User A model with AuthorizationError (403)', async () => {
      dataModelsStore.push({
        id: 'dm_private_user_a',
        userId: studentA.userId,
        name: 'Private Architecture of Student A',
        entities: [],
        relationships: [],
      });

      // User B attempts to access User A's model
      const { req, res, next } = mockReqRes(studentB, {}, { id: 'dm_private_user_a' });
      await dataModelController.getDataModel(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthorizationError));
      const error = next.mock.calls[0][0];
      expect(error.message).toContain('You do not own this data model');
    });

    it('blocks User B from overwriting User A model ID with AuthorizationError (403)', async () => {
      dataModelsStore.push({
        id: 'dm_victim_model',
        userId: studentA.userId,
        name: 'Original Student A Model',
        entities: [],
        relationships: [],
      });

      // User B tries to update User A's model
      const { req, res, next } = mockReqRes(studentB, {
        id: 'dm_victim_model',
        name: 'Malicious Hijack Overwrite',
        entities: [],
        relationships: [],
      });

      await dataModelController.saveOrUpdateDataModel(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthorizationError));
      expect(dataModelsStore[0].name).toBe('Original Student A Model');
    });

    it('blocks User B from generating MongoDB structure from User A model with AuthorizationError (403)', async () => {
      dataModelsStore.push({
        id: 'dm_protected_model',
        userId: studentA.userId,
        name: 'Protected Model',
        entities: [],
        relationships: [],
      });

      const { req, res, next } = mockReqRes(studentB, { targetDatabaseId: 'vdb_b' }, { id: 'dm_protected_model' });
      await dataModelController.generateMongoStructure(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthorizationError));
      const error = next.mock.calls[0][0];
      expect(error.message).toContain('You do not own this data model');
    });
  });

  describe('4. Deterministic Model Rules Validation', () => {
    it('flags empty models with problem feedback', () => {
      const feedback = dataModelController.validateDataModelRules({ entities: [], relationships: [] });
      expect(feedback.some((f) => f.type === 'problem' && f.message.includes('contains no collections'))).toBe(true);
    });

    it('flags missing collection names and duplicate fields in collections', () => {
      const feedback = dataModelController.validateDataModelRules({
        entities: [
          {
            id: 'e1',
            name: 'inventory',
            position: { x: 0, y: 0 },
            fields: [
              { id: 'f1', name: 'itemCode', type: 'String', isRequired: true },
              { id: 'f2', name: 'itemCode', type: 'String', isRequired: false },
            ],
          },
        ],
        relationships: [],
      });

      expect(feedback.some((f) => f.type === 'problem' && f.message.includes("Duplicate field name 'itemCode'"))).toBe(true);
    });

    it('warns about unbounded embedded arrays hitting 16MB document size limit', () => {
      const feedback = dataModelController.validateDataModelRules({
        entities: [
          {
            id: 'e1',
            name: 'logs',
            position: { x: 0, y: 0 },
            fields: [
              { id: 'f1', name: '_id', type: 'ObjectId', isRequired: true },
              { id: 'f2', name: 'entries', type: 'Array', isRequired: true },
            ],
          },
        ],
        relationships: [],
      });

      expect(feedback.some((f) => f.type === 'consideration' && f.message.includes('16MB document size limit'))).toBe(true);
    });

    it('provides relationship feedback on embedding vs referencing strategies', () => {
      const feedback = dataModelController.validateDataModelRules({
        entities: [
          { id: 'e1', name: 'orders', position: { x: 0, y: 0 }, fields: [{ id: 'f1', name: '_id', type: 'ObjectId', isRequired: true }] },
          { id: 'e2', name: 'items', position: { x: 100, y: 0 }, fields: [{ id: 'f2', name: '_id', type: 'ObjectId', isRequired: true }] },
        ],
        relationships: [
          {
            id: 'r1',
            sourceEntityId: 'e1',
            targetEntityId: 'e2',
            cardinality: '1:N',
            strategy: 'embedded',
          },
        ],
      });

      expect(feedback.some((f) => f.type === 'correct' && f.message.includes("Embedding 'items' inside 'orders'"))).toBe(true);
    });
  });
});
