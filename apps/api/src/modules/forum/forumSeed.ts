import { ForumPost } from '@datachan/shared-types';

export const INITIAL_FORUM_POSTS: ForumPost[] = [
  {
    id: 'post-announcement-welcome',
    title: 'Welcome to DATA-CHAN Community Forums! Learn by Building, Learn by Querying',
    content:
      'Welcome to the official DATA-CHAN Discussion Forums! This community space is designed for learners, instructors, and developers exploring MongoDB document modeling, MQL queries, aggregation pipelines, and sandbox laboratory challenges.\n\nHere you can ask questions, discuss schema trade-offs (embedding vs referencing), debug complex aggregations, and collaborate with peers and faculty.\n\nFeel free to start a discussion or share query solutions!',
    category: 'announcements',
    tags: ['announcements', 'community', 'virtual-lab', 'welcome'],
    authorId: 'vraj-lead',
    authorName: 'Vraj',
    authorRole: 'Student / Lead Developer',
    authorAvatar: '👨‍💻',
    upvotes: 42,
    upvotedBy: ['sharma-eval', 'fresh-onboard'],
    replyCount: 2,
    views: 380,
    isPinned: true,
    isSolved: false,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    replies: [
      {
        id: 'reply-ann-1',
        postId: 'post-announcement-welcome',
        authorId: 'sharma-eval',
        authorName: 'Professor Sharma',
        authorRole: 'CS Faculty / Instructor',
        authorAvatar: '🎓',
        content:
          'Excited to have this forum open! We will be hosting weekly aggregation challenge discussions right here.',
        upvotes: 18,
        upvotedBy: ['vraj-lead'],
        createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      },
      {
        id: 'reply-ann-2',
        postId: 'post-announcement-welcome',
        authorId: 'fresh-onboard',
        authorName: 'Fresh Onboard',
        authorRole: 'Newly Onboarded Student',
        authorAvatar: '🌱',
        content: 'Super excited to start the MongoDB curriculum! The sandbox playground is so fast.',
        upvotes: 9,
        upvotedBy: ['vraj-lead', 'sharma-eval'],
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
    ],
  },
  {
    id: 'post-schema-embedding-vs-lookup',
    title: 'When should we use $lookup vs embedding sub-documents in MongoDB 6.0?',
    content:
      'In this week\'s data modeling lab, a common question was: "When does embedding hurt performance, and when should we normalize into referenced collections?"\n\nHere are core architectural guidelines for document databases:\n\n1. **1:Few (Bounded)**: Prefer Embedding. For example, a User with 2-3 contact addresses. Zero join overhead, single-seek reads.\n2. **1:Many (Bounded)**: Embedding works well if the array rarely grows beyond a few dozen items (e.g. line items in an Order).\n3. **1:Huge (Unbounded)**: Use Referencing. If comments on a post or sensor logs can scale to thousands, embedding will hit the 16MB document cap and trigger expensive memory reallocation during updates.\n\nUse `$lookup` pipelines when referencing to perform controlled left-outer joins:',
    codeSnippet: `// 1:Many Referencing Join Pipeline
db.orders.aggregate([
  { $match: { status: "COMPLETED" } },
  {
    $lookup: {
      from: "customers",
      localField: "customerId",
      foreignField: "_id",
      as: "customer"
    }
  },
  { $unwind: "$customer" },
  { $project: { "orderId": "$_id", "totalAmount": 1, "customerName": "$customer.name" } }
]);`,
    category: 'schema-design',
    tags: ['schema-design', 'embedding', 'lookup', 'performance', 'data-model'],
    authorId: 'sharma-eval',
    authorName: 'Professor Sharma',
    authorRole: 'CS Faculty / Instructor',
    authorAvatar: '🎓',
    upvotes: 35,
    upvotedBy: ['vraj-lead', 'fresh-onboard'],
    replyCount: 2,
    views: 295,
    isPinned: false,
    isSolved: true,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    replies: [
      {
        id: 'reply-schema-1',
        postId: 'post-schema-embedding-vs-lookup',
        authorId: 'vraj-lead',
        authorName: 'Vraj',
        authorRole: 'Student / Lead Developer',
        authorAvatar: '👨‍💻',
        content:
          'Great breakdown! In our ER / Data Model Builder, we added automatic warnings when arrays have no size constraint to remind students of this 16MB boundary.',
        upvotes: 14,
        upvotedBy: ['sharma-eval'],
        isAcceptedAnswer: true,
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: 'reply-schema-2',
        postId: 'post-schema-embedding-vs-lookup',
        authorId: 'fresh-onboard',
        authorName: 'Fresh Onboard',
        authorRole: 'Newly Onboarded Student',
        authorAvatar: '🌱',
        content: 'This saved me hours on the homework assignment. The 1:Few vs 1:Huge rule makes it so clear.',
        upvotes: 6,
        upvotedBy: [],
        createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
      },
    ],
  },
  {
    id: 'post-aggregation-facet-pagination',
    title: 'How to build a single-roundtrip pagination pipeline with $facet and $match',
    content:
      'Standard pagination using `skip()` and `limit()` requires two queries: one for count, and one for the slice. With `$facet`, you can calculate the total matching count and retrieve the paged documents in a single pipeline execution!\n\nNote: Place your selective `$match` first so it utilizes index boundaries before the `$facet` stage.',
    codeSnippet: `db.products.aggregate([
  // Stage 1: Filter using index
  { $match: { category: "Hardware", active: true } },

  // Stage 2: Faceted multi-branch execution
  {
    $facet: {
      metadata: [
        { $count: "totalMatches" },
        { $addFields: { page: 1, pageSize: 10 } }
      ],
      data: [
        { $sort: { price: -1 } },
        { $skip: 0 },
        { $limit: 10 }
      ]
    }
  }
]);`,
    category: 'aggregation',
    tags: ['aggregation', 'pagination', 'facet', 'pipeline', 'optimization'],
    authorId: 'vraj-lead',
    authorName: 'Vraj',
    authorRole: 'Student / Lead Developer',
    authorAvatar: '👨‍💻',
    upvotes: 28,
    upvotedBy: ['sharma-eval'],
    replyCount: 1,
    views: 210,
    isPinned: false,
    isSolved: false,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    replies: [
      {
        id: 'reply-facet-1',
        postId: 'post-aggregation-facet-pagination',
        authorId: 'sharma-eval',
        authorName: 'Professor Sharma',
        authorRole: 'CS Faculty / Instructor',
        authorAvatar: '🎓',
        content:
          'Spot on! Just be cautious if the $facet stage yields a massive intermediate result before limit, but here with $limit: 10 inside the branch it operates very cleanly.',
        upvotes: 11,
        upvotedBy: ['vraj-lead'],
        createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
      },
    ],
  },
  {
    id: 'post-indexing-esr-rule',
    title: 'The ESR (Equality, Sort, Range) Rule for High-Throughput Compound Indexes',
    content:
      'When indexing multiple fields in MongoDB collections, order is critical:\n\n1. **Equality (E)**: Fields queried with exact values (`status: "ACTIVE"`)\n2. **Sort (S)**: Field determining the sort order (`sort({ createdAt: -1 })`)\n3. **Range (R)**: Fields filtered with comparison operators (`$gt`, `$lt`, `$in`)\n\nIf you place the Range field before Sort, the query engine cannot use index scan keys to satisfy ordering and falls back to an in-memory sort!',
    codeSnippet: `// Query pattern:
// db.orders.find({ status: "PAID", totalAmount: { $gte: 100 } }).sort({ createdAt: -1 })

// Optimal ESR Index creation:
db.orders.createIndex({
  status: 1,       // E (Equality)
  createdAt: -1,   // S (Sort)
  totalAmount: 1   // R (Range)
});`,
    category: 'performance',
    tags: ['indexing', 'esr-rule', 'query-optimizer', 'performance', 'explain'],
    authorId: 'sharma-eval',
    authorName: 'Professor Sharma',
    authorRole: 'CS Faculty / Instructor',
    authorAvatar: '🎓',
    upvotes: 31,
    upvotedBy: ['vraj-lead', 'fresh-onboard'],
    replyCount: 1,
    views: 245,
    isPinned: false,
    isSolved: true,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    replies: [
      {
        id: 'reply-esr-1',
        postId: 'post-indexing-esr-rule',
        authorId: 'vraj-lead',
        authorName: 'Vraj',
        authorRole: 'Student / Lead Developer',
        authorAvatar: '👨‍💻',
        content:
          'We tested this in the Mongo Playground using .explain("executionStats")—totalKeysExamined dropped from 5,000 to only 12!',
        upvotes: 12,
        upvotedBy: ['sharma-eval'],
        createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
      },
    ],
  },
  {
    id: 'post-challenge-03-hint',
    title: 'Stuck on Challenge 03 (Aggregation Pipeline)? Here is a helpful tip',
    content:
      'If your Challenge 03 evaluation is returning `CHALLENGE_FAILED`, check whether your `$group` stage is accidentally grouping documents where the customer ID is null or missing.\n\nAdd a `$match` before `$group` to filter out corrupt or test records:',
    codeSnippet: `db.orders.aggregate([
  // Filter valid customer orders first
  { $match: { customerId: { $exists: true, $ne: null } } },

  // Group and compute revenue
  {
    $group: {
      _id: "$customerId",
      totalOrders: { $sum: 1 },
      totalRevenue: { $sum: "$totalAmount" }
    }
  },
  { $sort: { totalRevenue: -1 } }
]);`,
    category: 'challenges',
    tags: ['challenges', 'group', 'accumulator', 'debugging'],
    authorId: 'fresh-onboard',
    authorName: 'Fresh Onboard',
    authorRole: 'Newly Onboarded Student',
    authorAvatar: '🌱',
    upvotes: 19,
    upvotedBy: ['vraj-lead'],
    replyCount: 1,
    views: 180,
    isPinned: false,
    isSolved: true,
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    replies: [
      {
        id: 'reply-ch3-1',
        postId: 'post-challenge-03-hint',
        authorId: 'vraj-lead',
        authorName: 'Vraj',
        authorRole: 'Student / Lead Developer',
        authorAvatar: '👨‍💻',
        content: 'Exactly right! Good catch on the $exists filter.',
        upvotes: 5,
        upvotedBy: [],
        createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
      },
    ],
  },
];
