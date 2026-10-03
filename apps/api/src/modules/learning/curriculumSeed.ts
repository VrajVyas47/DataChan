import { Course, Module, Lesson, LessonSection } from '@datachan/shared-types';

export const CANONICAL_COURSE: Course = {
  id: 'course-mongodb-core',
  title: 'Mastering Modern MongoDB: Fundamentals to Data Engineering',
  description:
    'A university-level virtual database laboratory curriculum. Master document architecture, CRUD operations, query operators, multi-stage aggregation pipelines, and indexing strategies.',
  status: 'published',
  order: 1,
  modulesCount: 5,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
};

export const CANONICAL_MODULES: Module[] = [
  {
    id: 'mod-1-foundations',
    courseId: 'course-mongodb-core',
    title: 'Foundations of Document Databases',
    description:
      'Explore the JSON/BSON document model, database namespaces, collections, and fundamental BSON data types.',
    order: 1,
    status: 'published',
    lessonsCount: 3,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  },
  {
    id: 'mod-2-crud',
    courseId: 'course-mongodb-core',
    title: 'CRUD Operations & Document Manipulation',
    description:
      'Master inserting records, finding documents, atomic updates with $set and $inc, and removing records.',
    order: 2,
    status: 'published',
    lessonsCount: 4,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  },
  {
    id: 'mod-3-querying',
    courseId: 'course-mongodb-core',
    title: 'Query Operators, Logic & Projections',
    description:
      'Filter data using comparison operators, combine logic with $and and $or, project specific fields, and sort/page cursors.',
    order: 3,
    status: 'published',
    lessonsCount: 4,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  },
  {
    id: 'mod-4-aggregation',
    courseId: 'course-mongodb-core',
    title: 'The Aggregation Framework & Multi-Stage Pipelines',
    description:
      'Construct data processing pipelines using $match, $group, accumulators, and array deconstruction with $unwind.',
    order: 4,
    status: 'published',
    lessonsCount: 4,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  },
  {
    id: 'mod-5-performance',
    courseId: 'course-mongodb-core',
    title: 'Indexing Strategies & Schema Architecture',
    description:
      'Optimize query execution plans with single-field, compound, and multikey indexes and schema design patterns.',
    order: 5,
    status: 'published',
    lessonsCount: 0,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  },
];

export const CURRICULUM_LESSONS: Lesson[] = [
  // Module 1: Foundations
  {
    id: 'lesson-1-mongodb-basics',
    moduleId: 'mod-1-foundations',
    courseId: 'course-mongodb-core',
    order: 1,
    title: 'MongoDB Basics & Document Model',
    category: 'Foundations',
    estimatedMinutes: 8,
    xpReward: 50,
    status: 'published',
    description: 'Understand how JSON and BSON organize data in flexible document structures compared to rigid SQL tables.',
    conceptMarkdown: `### The Document Model
MongoDB stores data as **documents** inside **collections**. Documents are JSON-like records composed of field-value pairs encoded as BSON (Binary JSON).

Unlike tabular relational rows where every row shares the exact same column schema, MongoDB documents in the same collection can have differing fields, nested subdocuments, and arrays.

#### Key Advantages:
- **Natural Data Mapping**: Objects in code map directly to document structures.
- **Embedded Hierarchies**: Reduce multi-table JOIN overhead by nesting related records.
- **Polymorphic Schemas**: Easily evolve applications without costly migration locks.`,
    exampleQuery: 'db.students.find()',
    starterPracticeQuery: 'db.students.find().limit(2)',
    practiceCollection: 'students',
    practiceExplanation: 'Query the first 2 documents from the students collection to inspect their BSON fields.',
  },
  {
    id: 'lesson-2-databases-and-collections',
    moduleId: 'mod-1-foundations',
    courseId: 'course-mongodb-core',
    order: 2,
    title: 'Databases & Collections',
    category: 'Foundations',
    estimatedMinutes: 6,
    xpReward: 50,
    status: 'published',
    description: 'Learn how databases group collections and how namespaces structure your lab data.',
    conceptMarkdown: `### Namespaces in MongoDB
In MongoDB, a **namespace** is the combination of the database name and collection name:
\`<database>.<collection>\`

For example: \`CollegeDB.students\` points to the \`students\` collection inside \`CollegeDB\`.

Collections are created lazily upon inserting the first document, but can also be explicitly provisioned with schema validation rules.`,
    exampleQuery: 'db.students.countDocuments()',
    starterPracticeQuery: 'db.students.countDocuments()',
    practiceCollection: 'students',
    practiceExplanation: 'Run countDocuments() to discover how many records currently reside in your collection.',
  },
  {
    id: 'lesson-3-documents-and-fields',
    moduleId: 'mod-1-foundations',
    courseId: 'course-mongodb-core',
    order: 3,
    title: 'Documents & Field Types',
    category: 'Foundations',
    estimatedMinutes: 7,
    xpReward: 50,
    status: 'published',
    description: 'Explore fundamental BSON types: String, Number, Boolean, Date, Array, Object, and the unique ObjectId.',
    conceptMarkdown: `### BSON Data Types
Every document has an immutable primary key \`_id\` which defaults to an \`ObjectId\` (a 12-byte identifier containing timestamp, machine, process, and increment counters).

Common types include:
- **String**: UTF-8 text (e.g. \`"Alice Johnson"\`)
- **Number**: Integers and IEEE 754 floating points (e.g. \`20\`, \`3.85\`)
- **Array**: Ordered list of values (e.g. \`["CS101", "CS204"]\`)
- **Object**: Embedded subdocuments (e.g. \`{ city: "Boston", state: "MA" }\`)`,
    exampleQuery: 'db.students.findOne({ major: "Computer Science" })',
    starterPracticeQuery: 'db.students.findOne()',
    practiceCollection: 'students',
    practiceExplanation: 'Fetch a single document using findOne() to observe its field types and _id.',
  },

  // Module 2: CRUD Operations
  {
    id: 'lesson-4-insert-one-many',
    moduleId: 'mod-2-crud',
    courseId: 'course-mongodb-core',
    order: 1,
    title: 'Inserting Documents: insertOne & insertMany',
    category: 'CRUD Operations',
    estimatedMinutes: 10,
    xpReward: 60,
    status: 'published',
    description: 'Master adding single records or batches of documents to your collection.',
    conceptMarkdown: `### Document Creation
To add data:
- \`insertOne(doc)\`: Inserts a single document and returns the generated \`insertedId\`.
- \`insertMany([doc1, doc2, ...])\`: Inserts an array of documents atomically per batch.

Example:
\`\`\`javascript
db.students.insertOne({
  name: "Hannah Abbott",
  age: 21,
  major: "Data Science"
})
\`\`\``,
    exampleQuery: 'db.students.insertOne({ name: "Jordan Bell", age: 22, major: "Physics", gpa: 3.5 })',
    starterPracticeQuery: 'db.students.insertOne({ name: "Jordan Bell", age: 22, major: "Physics", gpa: 3.5 })',
    practiceCollection: 'students',
    practiceExplanation: 'Insert a new student document into the collection.',
  },
  {
    id: 'lesson-5-find-querying',
    moduleId: 'mod-2-crud',
    courseId: 'course-mongodb-core',
    order: 2,
    title: 'Reading Documents: find() & Filters',
    category: 'CRUD Operations',
    estimatedMinutes: 10,
    xpReward: 60,
    status: 'published',
    description: 'Execute queries to retrieve documents matching specific criteria.',
    conceptMarkdown: `### The find() Method
The \`find()\` method accepts two optional arguments:
1. **Filter Query**: Specifies selection criteria.
2. **Projection**: Specifies fields to include or exclude.

Example:
\`\`\`javascript
// Find students where major is "Computer Science"
db.students.find({ major: "Computer Science" })
\`\`\``,
    exampleQuery: 'db.students.find({ major: "Computer Science" })',
    starterPracticeQuery: 'db.students.find({ major: "Computer Science" })',
    practiceCollection: 'students',
    practiceExplanation: 'Retrieve all students whose major is Computer Science.',
  },
  {
    id: 'lesson-9-updates',
    moduleId: 'mod-2-crud',
    courseId: 'course-mongodb-core',
    order: 3,
    title: 'Updating Documents: $set & $inc',
    category: 'CRUD Operations',
    estimatedMinutes: 12,
    xpReward: 75,
    status: 'published',
    description: 'Modify existing documents safely with atomic update operators.',
    conceptMarkdown: `### Atomic Update Operators
Always use update operators to prevent overwriting entire documents:
- \`$set\`: Replaces or creates field values.
- \`$inc\`: Increments a numeric field by a specified value.
- \`$unset\`: Deletes a field from a document.

Example:
\`\`\`javascript
db.students.updateOne(
  { studentId: "STU-101" },
  { $set: { status: "graduated" } }
)
\`\`\``,
    exampleQuery: 'db.students.updateOne({ studentId: "STU-101" }, { $set: { status: "active" } })',
    starterPracticeQuery: 'db.students.updateOne({ studentId: "STU-101" }, { $set: { status: "active" } })',
    practiceCollection: 'students',
    practiceExplanation: 'Update student STU-101 to set status to active.',
  },
  {
    id: 'lesson-10-deletions',
    moduleId: 'mod-2-crud',
    courseId: 'course-mongodb-core',
    order: 4,
    title: 'Deleting Documents: deleteOne & deleteMany',
    category: 'CRUD Operations',
    estimatedMinutes: 8,
    xpReward: 60,
    status: 'published',
    description: 'Remove records from collections using targeted criteria.',
    conceptMarkdown: `### Deleting Documents
- \`deleteOne(filter)\`: Deletes the first document that matches the criteria.
- \`deleteMany(filter)\`: Deletes all matching documents.

**Safety note**: An empty filter \`{}\` in \`deleteMany({})\` will wipe the entire collection!`,
    exampleQuery: 'db.students.deleteOne({ name: "Jordan Bell" })',
    starterPracticeQuery: 'db.students.deleteOne({ name: "Jordan Bell" })',
    practiceCollection: 'students',
    practiceExplanation: 'Delete the practice student record created earlier.',
  },

  // Module 3: Querying & Logic
  {
    id: 'lesson-6-comparison-operators',
    moduleId: 'mod-3-querying',
    courseId: 'course-mongodb-core',
    order: 1,
    title: 'Comparison Operators: $gt, $lt, $gte, $in',
    category: 'Querying',
    estimatedMinutes: 12,
    xpReward: 70,
    status: 'published',
    challengeIds: ['ch-find-cs-adults'],
    description: 'Filter numbers, dates, and values with range comparisons and set membership.',
    conceptMarkdown: `### Comparison Operators
- \`$eq\`: Equal to
- \`$ne\`: Not equal to
- \`$gt\`: Greater than (\`>\`)
- \`$gte\`: Greater than or equal to (\`>=\`)
- \`$lt\`: Less than (\`<\`)
- \`$lte\`: Less than or equal to (\`<=\`)
- \`$in\`: Matches any value in an array

Example:
\`\`\`javascript
db.students.find({ age: { $gte: 21 } })
\`\`\``,
    exampleQuery: 'db.students.find({ age: { $gt: 20 } })',
    starterPracticeQuery: 'db.students.find({ age: { $gt: 20 } })',
    practiceCollection: 'students',
    practiceExplanation: 'Find all students older than 20.',
  },
  {
    id: 'lesson-7-logical-operators',
    moduleId: 'mod-3-querying',
    courseId: 'course-mongodb-core',
    order: 2,
    title: 'Logical Operators: $and, $or, $nor',
    category: 'Querying',
    estimatedMinutes: 10,
    xpReward: 70,
    status: 'published',
    description: 'Combine multiple query conditions with Boolean logic.',
    conceptMarkdown: `### Logical Operators
- \`$and\`: Joins query clauses with a logical AND.
- \`$or\`: Joins query clauses with a logical OR.
- \`$not\`: Inverts the effect of a query expression.

Example:
\`\`\`javascript
db.students.find({
  $or: [
    { major: "Computer Science" },
    { gpa: { $gte: 3.8 } }
  ]
})
\`\`\``,
    exampleQuery: 'db.students.find({ $or: [{ major: "Computer Science" }, { gpa: { $gt: 3.8 } }] })',
    starterPracticeQuery: 'db.students.find({ $or: [{ major: "Computer Science" }, { gpa: { $gt: 3.8 } }] })',
    practiceCollection: 'students',
    practiceExplanation: 'Query students who are either in Computer Science OR have a GPA above 3.8.',
  },
  {
    id: 'lesson-8-projection',
    moduleId: 'mod-3-querying',
    courseId: 'course-mongodb-core',
    order: 3,
    title: 'Field Projections',
    category: 'Querying',
    estimatedMinutes: 8,
    xpReward: 60,
    status: 'published',
    challengeIds: ['ch-high-achievers-projection'],
    description: 'Control bandwidth by selecting only the specific fields your application needs.',
    conceptMarkdown: `### Projections
The second argument to \`find()\` is the **projection document**.
- \`{ fieldName: 1 }\`: Include field.
- \`{ fieldName: 0 }\`: Exclude field.
- \`_id\` is included by default unless explicitly excluded (\`{ _id: 0 }\`).

Example:
\`\`\`javascript
db.students.find({}, { name: 1, major: 1, _id: 0 })
\`\`\``,
    exampleQuery: 'db.students.find({}, { name: 1, gpa: 1, _id: 0 })',
    starterPracticeQuery: 'db.students.find({}, { name: 1, gpa: 1, _id: 0 })',
    practiceCollection: 'students',
    practiceExplanation: 'Return only student names and GPAs, omitting the _id field.',
  },
  {
    id: 'lesson-11-sorting-paging',
    moduleId: 'mod-3-querying',
    courseId: 'course-mongodb-core',
    order: 4,
    title: 'Cursor Modifiers: sort(), limit(), skip()',
    category: 'Querying',
    estimatedMinutes: 10,
    xpReward: 65,
    status: 'published',
    description: 'Order results and implement paginated views.',
    conceptMarkdown: `### Cursor Methods
- \`.sort({ field: 1 })\`: Ascending order (A-Z, 0-9).
- \`.sort({ field: -1 })\`: Descending order.
- \`.limit(n)\`: Maximum documents to return.
- \`.skip(n)\`: Number of documents to bypass (pagination).

Example:
\`\`\`javascript
// Get top 3 students by GPA
db.students.find().sort({ gpa: -1 }).limit(3)
\`\`\``,
    exampleQuery: 'db.students.find().sort({ gpa: -1 }).limit(3)',
    starterPracticeQuery: 'db.students.find().sort({ gpa: -1 }).limit(3)',
    practiceCollection: 'students',
    practiceExplanation: 'Order students by GPA descending and limit to top 3.',
  },

  // Module 4: Aggregation Framework
  {
    id: 'lesson-12-aggregation-basics',
    moduleId: 'mod-4-aggregation',
    courseId: 'course-mongodb-core',
    order: 1,
    title: 'Aggregation Pipelines: Overview',
    category: 'Aggregation',
    estimatedMinutes: 14,
    xpReward: 80,
    status: 'published',
    description: 'Introduction to data processing stages that transform and aggregate documents.',
    conceptMarkdown: `### The Aggregation Framework
Think of an aggregation pipeline as an assembly line where documents pass through a sequence of stages:

\`Documents → Stage 1 ($match) → Stage 2 ($group) → Stage 3 ($sort) → Output\`

Each stage receives input documents, performs a transformation, and outputs the result to the next stage.`,
    exampleQuery: 'db.students.aggregate([ { $match: { status: "active" } } ])',
    starterPracticeQuery: 'db.students.aggregate([ { $match: { status: "active" } } ])',
    practiceCollection: 'students',
    practiceExplanation: 'Run a simple single-stage pipeline using $match.',
  },
  {
    id: 'lesson-13-match-stage',
    moduleId: 'mod-4-aggregation',
    courseId: 'course-mongodb-core',
    order: 2,
    title: 'The $match Stage',
    category: 'Aggregation',
    estimatedMinutes: 10,
    xpReward: 70,
    status: 'published',
    description: 'Filter documents early in the pipeline to optimize performance.',
    conceptMarkdown: `### $match Best Practices
Always place \`$match\` as early as possible in your aggregation pipeline. Filtering out non-relevant documents early minimizes memory usage and takes advantage of database indexes.`,
    exampleQuery: 'db.students.aggregate([ { $match: { major: "Computer Science", age: { $gte: 19 } } } ])',
    starterPracticeQuery: 'db.students.aggregate([ { $match: { major: "Computer Science", age: { $gte: 19 } } } ])',
    practiceCollection: 'students',
    practiceExplanation: 'Filter Computer Science students aged 19 or older.',
  },
  {
    id: 'lesson-14-group-stage',
    moduleId: 'mod-4-aggregation',
    courseId: 'course-mongodb-core',
    order: 3,
    title: 'The $group Stage & Accumulators',
    category: 'Aggregation',
    estimatedMinutes: 16,
    xpReward: 90,
    status: 'published',
    challengeIds: ['ch-avg-gpa-by-department'],
    description: 'Group documents by a key and calculate sums, averages, minimums, and maximums.',
    conceptMarkdown: `### Grouping and Accumulators
The \`$group\` stage requires an \`_id\` expression specifying the grouping key.
- \`$sum: 1\`: Count occurrences.
- \`$avg: "$fieldName"\`: Calculate mean.
- \`$max\`, \`$min\`: Extreme values.

Example:
\`\`\`javascript
db.students.aggregate([
  {
    $group: {
      _id: "$major",
      totalStudents: { $sum: 1 },
      avgGpa: { $avg: "$gpa" }
    }
  }
])
\`\`\``,
    exampleQuery: 'db.students.aggregate([ { $group: { _id: "$major", count: { $sum: 1 }, averageGpa: { $avg: "$gpa" } } } ])',
    starterPracticeQuery: 'db.students.aggregate([ { $group: { _id: "$major", count: { $sum: 1 }, averageGpa: { $avg: "$gpa" } } } ])',
    practiceCollection: 'students',
    practiceExplanation: 'Group students by major and compute both total count and average GPA.',
  },
  {
    id: 'lesson-15-unwind-stage',
    moduleId: 'mod-4-aggregation',
    courseId: 'course-mongodb-core',
    order: 4,
    title: 'Deconstructing Arrays: $unwind',
    category: 'Aggregation',
    estimatedMinutes: 15,
    xpReward: 90,
    status: 'published',
    description: 'Deconstruct array fields to output a document for each element in the array.',
    conceptMarkdown: `### The $unwind Stage
When a document contains an array (such as \`enrolledCourses: ["CS101", "CS204"]\`), \`$unwind\` outputs one document for each item in the array.

This enables you to group and aggregate by individual array elements!

Example:
\`\`\`javascript
db.students.aggregate([
  { $unwind: "$enrolledCourses" },
  { $group: { _id: "$enrolledCourses", count: { $sum: 1 } } }
])
\`\`\``,
    exampleQuery: 'db.students.aggregate([ { $unwind: "$enrolledCourses" }, { $group: { _id: "$enrolledCourses", studentCount: { $sum: 1 } } } ])',
    starterPracticeQuery: 'db.students.aggregate([ { $unwind: "$enrolledCourses" }, { $group: { _id: "$enrolledCourses", studentCount: { $sum: 1 } } } ])',
    practiceCollection: 'students',
    practiceExplanation: 'Unwind enrolledCourses and count how many students are enrolled in each course.',
  },
];

/**
 * Builds canonical sections and content blocks for all curriculum lessons.
 */
export function generateCurriculumSections(): LessonSection[] {
  const sections: LessonSection[] = [];
  const now = '2026-10-01T00:00:00.000Z';

  for (const lesson of CURRICULUM_LESSONS) {
    // Section 1: Conceptual Foundations
    sections.push({
      id: `sec-${lesson.id}-1-concept`,
      lessonId: lesson.id,
      title: 'Conceptual Foundations',
      description: 'Core theoretical mechanics, advantages, and schema principles.',
      order: 1,
      status: 'published',
      contentBlocks: [
        {
          id: `blk-${lesson.id}-1-1`,
          type: 'text',
          order: 1,
          content: lesson.conceptMarkdown || lesson.description,
        },
        {
          id: `blk-${lesson.id}-1-2`,
          type: 'note',
          order: 2,
          content: `Key Takeaway: Understanding ${lesson.title} provides the basis for writing performant MongoDB queries and optimal schemas.`,
        },
      ],
      createdAt: now,
      updatedAt: now,
    });

    // Section 2: Code Walkthrough & Syntax Breakdown
    sections.push({
      id: `sec-${lesson.id}-2-syntax`,
      lessonId: lesson.id,
      title: 'Syntax Breakdown & Example Query',
      description: 'Explore the canonical MQL syntax, parameters, and expected execution behavior.',
      order: 2,
      status: 'published',
      contentBlocks: [
        {
          id: `blk-${lesson.id}-2-1`,
          type: 'code',
          order: 1,
          content: lesson.exampleQuery || 'db.students.find()',
          language: 'javascript',
          caption: 'Canonical query syntax',
        },
        {
          id: `blk-${lesson.id}-2-2`,
          type: 'output',
          order: 2,
          content: `// Evaluated against target namespace: ${lesson.practiceCollection || 'students'}\n// Status: Deterministic plan executed successfully`,
          caption: 'Expected result pattern',
        },
        {
          id: `blk-${lesson.id}-2-3`,
          type: 'example',
          order: 3,
          content: `When executing ${lesson.exampleQuery}, the database driver translates the method call into a wire protocol command targeting the collection.`,
        },
      ],
      createdAt: now,
      updatedAt: now,
    });

    // Section 3: Interactive Practice & Hands-On Experimentation
    sections.push({
      id: `sec-${lesson.id}-3-practice`,
      lessonId: lesson.id,
      title: 'Interactive Sandboxed Practice',
      description: 'Test your understanding with live queries directly in your isolated sandbox database.',
      order: 3,
      status: 'published',
      contentBlocks: [
        {
          id: `blk-${lesson.id}-3-1`,
          type: 'text',
          order: 1,
          content: lesson.practiceExplanation || 'Execute the starter query below in your sandbox database.',
        },
        {
          id: `blk-${lesson.id}-3-2`,
          type: 'playground',
          order: 2,
          content: lesson.starterPracticeQuery || lesson.exampleQuery || 'db.students.find()',
          playgroundQuery: lesson.starterPracticeQuery || lesson.exampleQuery || 'db.students.find()',
          targetCollection: lesson.practiceCollection || 'students',
        },
      ],
      createdAt: now,
      updatedAt: now,
    });
  }

  return sections;
}
