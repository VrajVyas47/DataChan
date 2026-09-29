import { InvalidQueryError } from '../errors';

// Allowed query operators
export const ALLOWED_FILTER_OPERATORS = new Set([
  // Comparison
  '$eq',
  '$ne',
  '$gt',
  '$gte',
  '$lt',
  '$lte',
  '$in',
  '$nin',
  // Logical
  '$and',
  '$or',
  '$nor',
  '$not',
  // Element
  '$exists',
  '$type',
  // Evaluation
  '$regex',
  '$options',
  '$mod',
  // Array
  '$all',
  '$elemMatch',
  '$size',
]);

// Allowed update operators
export const ALLOWED_UPDATE_OPERATORS = new Set([
  '$set',
  '$unset',
  '$inc',
  '$mul',
  '$min',
  '$max',
  '$rename',
  '$push',
  '$pull',
  '$pop',
  '$addToSet',
  '$currentDate',
]);

// Allowed aggregation stages
export const ALLOWED_AGGREGATION_STAGES = new Set([
  '$match',
  '$group',
  '$sort',
  '$project',
  '$unwind',
  '$limit',
  '$skip',
  '$count',
  '$addFields',
]);

// Allowed aggregation expression operators inside stages
export const ALLOWED_EXPRESSION_OPERATORS = new Set([
  '$sum',
  '$avg',
  '$min',
  '$max',
  '$first',
  '$last',
  '$push',
  '$addToSet',
  '$multiply',
  '$divide',
  '$add',
  '$subtract',
  '$concat',
  '$toLower',
  '$toUpper',
  '$substr',
  '$cond',
  '$ifNull',
]);

// Forbidden dangerous operators that could execute code or cause DOS
export const FORBIDDEN_OPERATORS = new Set([
  '$where',
  '$accumulator',
  '$function',
  '$exec',
  '$expr', // Restricted in basic sandbox to avoid arbitrary JS
  '$lookup', // Restricted in V1 to maintain single collection simplicity
  '$out', // Strictly forbidden: cannot write to arbitrary collections
  '$merge', // Strictly forbidden: cannot overwrite collections
]);

export function validateOperators(obj: any, allowedSet: Set<string>, context = 'Query'): void {
  if (!obj || typeof obj !== 'object') {
    return;
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      validateOperators(item, allowedSet, context);
    }
    return;
  }

  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('$')) {
      if (FORBIDDEN_OPERATORS.has(key)) {
        throw new InvalidQueryError(
          `Security violation: Operator '${key}' is strictly forbidden in the virtual database lab.`
        );
      }
      if (
        !allowedSet.has(key) &&
        !ALLOWED_FILTER_OPERATORS.has(key) &&
        !ALLOWED_EXPRESSION_OPERATORS.has(key)
      ) {
        throw new InvalidQueryError(
          `Unsupported operator '${key}' in ${context}. Allowed operators include: ${Array.from(
            allowedSet
          )
            .slice(0, 10)
            .join(', ')}...`
        );
      }
    }

    if (value && typeof value === 'object') {
      validateOperators(value, allowedSet, context);
    }
  }
}

export function validateAggregationPipeline(pipeline: any[]): void {
  if (!Array.isArray(pipeline)) {
    throw new InvalidQueryError('Aggregation pipeline must be an array of stages');
  }

  for (const stage of pipeline) {
    if (!stage || typeof stage !== 'object' || Array.isArray(stage)) {
      throw new InvalidQueryError('Each stage in aggregation pipeline must be an object');
    }

    const stageKeys = Object.keys(stage);
    if (stageKeys.length === 0) continue;
    const stageName = stageKeys[0];

    if (!ALLOWED_AGGREGATION_STAGES.has(stageName)) {
      throw new InvalidQueryError(
        `Unsupported aggregation stage '${stageName}'. Allowed stages: ${Array.from(
          ALLOWED_AGGREGATION_STAGES
        ).join(', ')}`
      );
    }

    if (stageName === '$match') {
      validateOperators(stage.$match, ALLOWED_FILTER_OPERATORS, '$match stage');
    } else {
      validateOperators(stage[stageName], ALLOWED_EXPRESSION_OPERATORS, `${stageName} stage`);
    }
  }
}
