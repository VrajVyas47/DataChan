import { Lesson } from '@datachan/shared-types';

export const CURRICULUM_LESSONS: Lesson[] = [
  {
    id: 'lesson-1-mongodb-basics',
    order: 1,
    title: 'MongoDB Basics & Document Model',
    category: 'Foundations',
    estimatedMinutes: 8,
    xpReward: 50,
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
    order: 2,
    title: 'Databases & Collections',
    category: 'Foundations',
    estimatedMinutes: 6,
    xpReward: 50,
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
    order: 3,
    title: 'Documents & Field Types',
    category: 'Foundations',
    estimatedMinutes: 7,
    xpReward: 50,
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
  {
    id: 'lesson-4-insert-one-many',
    order: 4,
    title: 'Inserting Documents: insertOne & insertMany',
    category: 'CRUD Operations',
    estimatedMinutes: 10,
    xpReward: 60,
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
    order: 5,
    title: 'Reading Documents: find() & Filters',
    category: 'CRUD Operations',
    estimatedMinutes: 10,
    xpReward: 60,
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
    id: 'lesson-6-comparison-operators',
    order: 6,
    title: 'Comparison Operators: $gt, $lt, $gte, $in',
    category: 'Querying',
    estimatedMinutes: 12,
    xpReward: 70,
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
    order: 7,
    title: 'Logical Operators: $and, $or, $nor',
    category: 'Querying',
    estimatedMinutes: 10,
    xpReward: 70,
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
    order: 8,
    title: 'Field Projections',
    category: 'Querying',
    estimatedMinutes: 8,
    xpReward: 60,
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
    id: 'lesson-9-updates',
    order: 9,
    title: 'Updating Documents: $set & $inc',
    category: 'CRUD Operations',
    estimatedMinutes: 12,
    xpReward: 75,
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
    order: 10,
    title: 'Deleting Documents: deleteOne & deleteMany',
    category: 'CRUD Operations',
    estimatedMinutes: 8,
    xpReward: 60,
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
  {
    id: 'lesson-11-sorting-paging',
    order: 11,
    title: 'Cursor Modifiers: sort(), limit(), skip()',
    category: 'Querying',
    estimatedMinutes: 10,
    xpReward: 65,
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
  {
    id: 'lesson-12-aggregation-basics',
    order: 12,
    title: 'Aggregation Pipelines: Overview',
    category: 'Aggregation',
    estimatedMinutes: 14,
    xpReward: 80,
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
    order: 13,
    title: 'The $match Stage',
    category: 'Aggregation',
    estimatedMinutes: 10,
    xpReward: 70,
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
    order: 14,
    title: 'The $group Stage & Accumulators',
    category: 'Aggregation',
    estimatedMinutes: 16,
    xpReward: 90,
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
    order: 15,
    title: 'Deconstructing Arrays: $unwind',
    category: 'Aggregation',
    estimatedMinutes: 15,
    xpReward: 90,
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
