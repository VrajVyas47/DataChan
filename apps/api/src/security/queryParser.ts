import * as acorn from 'acorn';
import {
  NormalizedQuery,
  SupportedMqlOperation,
  QuerySyntaxBreakdownItem,
} from '@datachan/shared-types';
import { InvalidQueryError, UnsupportedOperationError } from '../errors';
import {
  ALLOWED_FILTER_OPERATORS,
  ALLOWED_UPDATE_OPERATORS,
  ALLOWED_AGGREGATION_STAGES,
  validateOperators,
  validateAggregationPipeline,
} from './operatorWhitelist';

const SUPPORTED_OPERATIONS = new Set<SupportedMqlOperation>([
  'find',
  'findOne',
  'insertOne',
  'insertMany',
  'updateOne',
  'updateMany',
  'deleteOne',
  'deleteMany',
  'aggregate',
  'countDocuments',
]);

/**
 * Safely evaluates an AST node into a JavaScript primitive, object, or array.
 * ONLY permits Literals, Arrays, and Objects.
 * Blocks all Functions, Identifiers (except undefined/NaN), MemberExpressions, NewExpressions.
 */
function evaluateAstNode(node: any): any {
  if (!node) return null;

  switch (node.type) {
    case 'Literal':
      return node.value;

    case 'UnaryExpression':
      if (node.operator === '-' && node.argument.type === 'Literal') {
        return -node.argument.value;
      }
      if (node.operator === '+' && node.argument.type === 'Literal') {
        return +node.argument.value;
      }
      throw new InvalidQueryError(`Unsupported unary operator in query: ${node.operator}`);

    case 'ArrayExpression':
      return node.elements.map((el: any) => evaluateAstNode(el));

    case 'ObjectExpression': {
      const obj: Record<string, any> = {};
      for (const prop of node.properties) {
        if (prop.type !== 'Property') {
          throw new InvalidQueryError('Spread and computed properties are not allowed in queries');
        }
        let key: string;
        if (prop.key.type === 'Identifier') {
          key = prop.key.name;
        } else if (prop.key.type === 'Literal') {
          key = String(prop.key.value);
        } else {
          throw new InvalidQueryError('Invalid object key expression in query');
        }
        obj[key] = evaluateAstNode(prop.value);
      }
      return obj;
    }

    case 'Identifier':
      if (node.name === 'undefined') return undefined;
      if (node.name === 'NaN') return NaN;
      if (node.name === 'null') return null;
      if (node.name === 'true') return true;
      if (node.name === 'false') return false;
      throw new InvalidQueryError(
        `Variable or identifier '${node.name}' is not allowed. All query parameters must be literals.`
      );

    default:
      throw new InvalidQueryError(
        `Disallowed AST expression '${node.type}'. Arbitrary code or function calls are strictly forbidden.`
      );
  }
}

/**
 * Parses user code like:
 * db.students.find({ age: { $gt: 18 } }).sort({ age: -1 }).limit(10)
 */
export function parseMqlQuery(
  rawCode: string,
  defaultDatabaseId: string,
  defaultCollection?: string
): { normalized: NormalizedQuery; breakdown: QuerySyntaxBreakdownItem[] } {
  const trimmed = rawCode.trim();

  // If the query is empty
  if (!trimmed) {
    throw new InvalidQueryError('Query is empty. Please enter a valid MongoDB operation.');
  }

  // Check if user submitted raw JSON directly
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsedJson = JSON.parse(trimmed);
      if (parsedJson.operation) {
        // Direct normalized query JSON
        return {
          normalized: parsedJson,
          breakdown: [
            { token: 'JSON Query', category: 'Operation', description: 'Direct normalized query structure' },
          ],
        };
      }
    } catch {
      // Not raw JSON, proceed to JS AST parser
    }
  }

  let ast: any;
  try {
    ast = acorn.parse(trimmed, { ecmaVersion: 2022 });
  } catch (err: any) {
    throw new InvalidQueryError(`Syntax error in MongoDB query: ${err.message}`);
  }

  if (!ast.body || ast.body.length === 0) {
    throw new InvalidQueryError('Query contains no executable statements.');
  }

  const statement = ast.body[0];
  if (statement.type !== 'ExpressionStatement') {
    throw new InvalidQueryError('Query must be a single MongoDB method call (e.g., db.collection.find(...)).');
  }

  // Deconstruct call chain (e.g., db.col.find().sort().limit())
  const callChain: { name: string; args: any[] }[] = [];
  let current = statement.expression;

  while (current && current.type === 'CallExpression') {
    const callee = current.callee;
    if (callee.type === 'MemberExpression') {
      const methodName = callee.property.name || callee.property.value;
      const evaluatedArgs = current.arguments.map((arg: any) => evaluateAstNode(arg));
      callChain.unshift({ name: methodName, args: evaluatedArgs });
      current = callee.object;
    } else {
      break;
    }
  }

  // Verify the base target is `db.<collection>`
  let collectionName = defaultCollection || '';
  if (current && current.type === 'MemberExpression') {
    const object = current.object;
    const property = current.property;

    if (object.type === 'Identifier' && object.name === 'db') {
      collectionName = property.name || property.value;
    } else {
      throw new InvalidQueryError("Query must begin with 'db.<collection>...'");
    }
  } else if (!collectionName) {
    throw new InvalidQueryError("Query must be in the format: 'db.<collection>.<operation>(...)'");
  }

  if (callChain.length === 0) {
    throw new InvalidQueryError("No MongoDB operation invoked on 'db." + collectionName + "'.");
  }

  const primaryOp = callChain[0];
  const operation = primaryOp.name as SupportedMqlOperation;

  if (!SUPPORTED_OPERATIONS.has(operation)) {
    throw new UnsupportedOperationError(primaryOp.name);
  }

  const normalized: NormalizedQuery = {
    operation,
    databaseId: defaultDatabaseId,
    collection: collectionName,
  };

  const breakdown: QuerySyntaxBreakdownItem[] = [
    { token: 'db', category: 'Target', description: 'Active database reference' },
    { token: collectionName, category: 'Target', description: `Target collection: '${collectionName}'` },
    { token: `${operation}()`, category: 'Operation', description: `MongoDB MQL method: ${operation}` },
  ];

  // Process primary operation arguments
  switch (operation) {
    case 'find':
    case 'findOne':
    case 'countDocuments': {
      normalized.filter = primaryOp.args[0] || {};
      validateOperators(normalized.filter, ALLOWED_FILTER_OPERATORS, 'find filter');
      if (primaryOp.args[1]) {
        normalized.projection = primaryOp.args[1];
      }
      break;
    }

    case 'insertOne': {
      if (!primaryOp.args[0] || typeof primaryOp.args[0] !== 'object') {
        throw new InvalidQueryError('insertOne requires a document object as first argument.');
      }
      normalized.document = primaryOp.args[0];
      break;
    }

    case 'insertMany': {
      if (!Array.isArray(primaryOp.args[0])) {
        throw new InvalidQueryError('insertMany requires an array of documents as first argument.');
      }
      normalized.documents = primaryOp.args[0];
      break;
    }

    case 'updateOne':
    case 'updateMany': {
      if (!primaryOp.args[0] || !primaryOp.args[1]) {
        throw new InvalidQueryError(`${operation} requires filter and update documents: ${operation}(filter, update).`);
      }
      normalized.filter = primaryOp.args[0];
      normalized.update = primaryOp.args[1];
      validateOperators(normalized.filter, ALLOWED_FILTER_OPERATORS, 'update filter');
      validateOperators(normalized.update, ALLOWED_UPDATE_OPERATORS, 'update document');
      break;
    }

    case 'deleteOne':
    case 'deleteMany': {
      if (!primaryOp.args[0] || typeof primaryOp.args[0] !== 'object') {
        throw new InvalidQueryError(`${operation} requires a filter object: ${operation}(filter).`);
      }
      normalized.filter = primaryOp.args[0];
      validateOperators(normalized.filter, ALLOWED_FILTER_OPERATORS, 'delete filter');
      break;
    }

    case 'aggregate': {
      if (!Array.isArray(primaryOp.args[0])) {
        throw new InvalidQueryError('aggregate requires a pipeline array: aggregate([ { $stage: ... }, ... ]).');
      }
      normalized.pipeline = primaryOp.args[0];
      validateAggregationPipeline(normalized.pipeline);
      break;
    }
  }

  // Process chained cursor operations (sort, limit, skip, project)
  for (let i = 1; i < callChain.length; i++) {
    const chainOp = callChain[i];
    switch (chainOp.name) {
      case 'sort':
        normalized.sort = chainOp.args[0] || {};
        break;
      case 'limit':
        normalized.limit = typeof chainOp.args[0] === 'number' ? chainOp.args[0] : 100;
        break;
      case 'skip':
        normalized.skip = typeof chainOp.args[0] === 'number' ? chainOp.args[0] : 0;
        break;
      case 'project':
        normalized.projection = chainOp.args[0] || {};
        break;
      default:
        throw new UnsupportedOperationError(`Chained method .${chainOp.name}()`);
    }
  }

  // Generate breakdown for beginner education
  if (normalized.filter && Object.keys(normalized.filter).length > 0) {
    for (const [k, v] of Object.entries(normalized.filter)) {
      if (typeof v === 'object' && v !== null) {
        for (const opKey of Object.keys(v)) {
          breakdown.push({
            token: opKey,
            category: 'Operator',
            description: `Filter operator '${opKey}' on field '${k}'`,
          });
        }
      } else {
        breakdown.push({
          token: k,
          category: 'Filter',
          description: `Exact match condition on field '${k}'`,
        });
      }
    }
  }

  if (normalized.projection && Object.keys(normalized.projection).length > 0) {
    breakdown.push({
      token: 'projection',
      category: 'Projection',
      description: `Field mask limiting returned fields (${Object.keys(normalized.projection).join(', ')})`,
    });
  }

  if (normalized.sort && Object.keys(normalized.sort).length > 0) {
    breakdown.push({
      token: '.sort()',
      category: 'Cursor',
      description: `Sort order specification (${Object.keys(normalized.sort).join(', ')})`,
    });
  }

  if (normalized.limit !== undefined) {
    breakdown.push({
      token: `.limit(${normalized.limit})`,
      category: 'Cursor',
      description: `Limits result set to maximum ${normalized.limit} documents`,
    });
  }

  if (normalized.pipeline && normalized.pipeline.length > 0) {
    for (const stage of normalized.pipeline) {
      const stageName = Object.keys(stage)[0];
      breakdown.push({
        token: stageName,
        category: 'Stage',
        description: `Aggregation pipeline stage: ${stageName}`,
      });
    }
  }

  return { normalized, breakdown };
}
