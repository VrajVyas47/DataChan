import { Challenge } from '@datachan/shared-types';

export interface ChallengeWithEvaluation extends Challenge {
  expectedFilter?: Record<string, any>;
  expectedCount?: number;
  expectedFields?: string[];
  expectedPipeline?: Record<string, any>[];
  evaluator: (results: any[]) => { passed: boolean; feedback: string };
}

export const LAB_CHALLENGES: ChallengeWithEvaluation[] = [
  {
    id: 'ch-find-cs-adults',
    title: 'CS Undergrads Older Than 18',
    difficulty: 'Easy',
    category: 'Filtering',
    xpReward: 100,
    estimatedMinutes: 10,
    problemStatement:
      'Write a query to retrieve all students enrolled in "Computer Science" whose age is strictly greater than 18.',
    contextDescription:
      'The university registrar needs a list of all adult Computer Science students. Target collection: students.',
    targetCollection: 'students',
    starterQuery: 'db.students.find({\n  major: "Computer Science",\n  age: { /* add operator here */ }\n})',
    hints: [
      'Use the $gt comparison operator on the age field.',
      'Check that major exactly matches "Computer Science".',
    ],
    datasetDescription: 'Sample students collection with studentId, name, age, major, and gpa.',
    verificationType: 'deterministic-documents',
    evaluator: (results: any[]) => {
      if (!Array.isArray(results) || results.length === 0) {
        return {
          passed: false,
          feedback: 'No documents returned. Ensure your filter matches students older than 18 with major "Computer Science".',
        };
      }
      for (const student of results) {
        if (student.major !== 'Computer Science') {
          return {
            passed: false,
            feedback: `Found student "${student.name}" whose major is "${student.major}", expected "Computer Science".`,
          };
        }
        if (typeof student.age !== 'number' || student.age <= 18) {
          return {
            passed: false,
            feedback: `Found student "${student.name}" aged ${student.age}, but condition requires age > 18.`,
          };
        }
      }
      return {
        passed: true,
        feedback: `Excellent work! Successfully identified ${results.length} adult Computer Science students.`,
      };
    },
  },
  {
    id: 'ch-high-achievers-projection',
    title: 'High Achievers with Projection',
    difficulty: 'Medium',
    category: 'Projections & Sorting',
    xpReward: 150,
    estimatedMinutes: 15,
    problemStatement:
      'Find all students with a GPA of 3.5 or higher. Project only their "name" and "gpa" (exclude "_id"), and sort the results by GPA in descending order.',
    contextDescription:
      'Academic Dean\'s Honor List: return name and gpa sorted highest first, omitting internal identifiers.',
    targetCollection: 'students',
    starterQuery:
      'db.students.find(\n  { gpa: { $gte: 3.5 } },\n  { /* projection */ }\n).sort({ /* sort order */ })',
    hints: [
      'Use { gpa: { $gte: 3.5 } } for the filter.',
      'Use { name: 1, gpa: 1, _id: 0 } to specify which fields appear in output.',
      'Use .sort({ gpa: -1 }) for descending sort.',
    ],
    datasetDescription: 'Students collection with GPA scores ranging from 2.0 to 4.0.',
    verificationType: 'deterministic-documents',
    evaluator: (results: any[]) => {
      if (!Array.isArray(results) || results.length === 0) {
        return {
          passed: false,
          feedback: 'No documents returned. Verify your gpa filter.',
        };
      }

      // Check projection: only name and gpa should exist, no _id
      for (const doc of results) {
        if (doc._id !== undefined) {
          return {
            passed: false,
            feedback: 'The _id field is present in the output. Explicitly set _id: 0 in your projection.',
          };
        }
        if (!doc.name || doc.gpa === undefined) {
          return {
            passed: false,
            feedback: 'Projection must include both "name" and "gpa".',
          };
        }
        if (Object.keys(doc).length > 2) {
          return {
            passed: false,
            feedback: `Unexpected field(s) found: ${Object.keys(doc).filter((k) => k !== 'name' && k !== 'gpa').join(', ')}. Project ONLY name and gpa.`,
          };
        }
      }

      // Check descending sort
      for (let i = 1; i < results.length; i++) {
        if (results[i].gpa > results[i - 1].gpa) {
          return {
            passed: false,
            feedback: `Sorting incorrect: found GPA ${results[i].gpa} after ${results[i - 1].gpa}. Use .sort({ gpa: -1 }).`,
          };
        }
      }

      return {
        passed: true,
        feedback: `Outstanding! Clean projection and proper descending sort validated on ${results.length} honors students.`,
      };
    },
  },
  {
    id: 'ch-avg-gpa-by-department',
    title: 'Department Average GPA Aggregation',
    difficulty: 'Hard',
    category: 'Aggregation',
    xpReward: 200,
    estimatedMinutes: 20,
    problemStatement:
      'Use the aggregation pipeline to calculate the average GPA for each major. Output documents should have _id set to the major and a field named "avgGpa" representing the calculated mean.',
    contextDescription:
      'Analytics report: Department performance metrics using $group and $avg accumulator.',
    targetCollection: 'students',
    starterQuery:
      'db.students.aggregate([\n  {\n    $group: {\n      _id: "$major",\n      avgGpa: { /* accumulator */ }\n    }\n  }\n])',
    hints: [
      'Group by "$major" for the _id field.',
      'Use the $avg accumulator on "$gpa" assigned to the field avgGpa.',
    ],
    datasetDescription: 'Students collection with diverse majors and grades.',
    verificationType: 'deterministic-documents',
    evaluator: (results: any[]) => {
      if (!Array.isArray(results) || results.length === 0) {
        return {
          passed: false,
          feedback: 'No aggregation groups returned. Check your $group syntax.',
        };
      }

      for (const group of results) {
        if (group._id === undefined) {
          return {
            passed: false,
            feedback: 'Group document missing _id field representing the major.',
          };
        }
        if (typeof group.avgGpa !== 'number') {
          return {
            passed: false,
            feedback: 'Calculated field "avgGpa" must be a numeric value created with { $avg: "$gpa" }.',
          };
        }
      }

      return {
        passed: true,
        feedback: `Superb! Successfully calculated average GPA across ${results.length} academic departments.`,
      };
    },
  },
];
