/**
 * DATA-CHAN V1 MongoDB Collection JSON Schema Validators ($jsonSchema)
 * 
 * Enforces BSON types, required fields, and structural enum invariants
 * directly inside MongoDB without constraining dynamic playground sandbox databases.
 */

export const COLLECTION_VALIDATORS: Record<string, { validator: { $jsonSchema: Record<string, any> }; validationLevel?: string; validationAction?: string }> = {
  // 1. Users Collection Validator
  users: {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['id', 'firebaseUid', 'email', 'role', 'status', 'createdAt', 'updatedAt'],
        properties: {
          id: { bsonType: 'string', description: 'Internal user identifier (usr_...)' },
          firebaseUid: { bsonType: 'string', description: 'Authoritative Firebase Authentication UID' },
          email: { bsonType: 'string', pattern: '^.+@.+$', description: 'Normalized user email address' },
          username: { bsonType: 'string', description: 'Normalized unique display username' },
          displayName: { bsonType: 'string', description: 'Human-readable full name' },
          role: {
            enum: ['student', 'faculty', 'admin'],
            description: 'Data-Chan application authorization role',
          },
          status: {
            enum: ['active', 'suspended', 'disabled'],
            description: 'Account state',
          },
          emailVerified: { bsonType: 'bool' },
          photoUrl: { bsonType: 'string' },
          activeWorkspaceId: { bsonType: ['string', 'null'] },
          activeDatabaseId: { bsonType: ['string', 'null'] },
          activeCollectionName: { bsonType: ['string', 'null'] },
          xp: { bsonType: ['int', 'double', 'long'] },
          level: { bsonType: ['int', 'double', 'long'] },
          streakDays: { bsonType: ['int', 'double', 'long'] },
          enrolledClassroomIds: { bsonType: 'array' },
          claimedRewardKeys: { bsonType: 'array', description: 'Idempotency ledger of applied reward keys for this user' },
          createdAt: { bsonType: ['string', 'date'] },
          updatedAt: { bsonType: ['string', 'date'] },
          lastLoginAt: { bsonType: ['string', 'date'] },
        },
      },
    },
    validationLevel: 'moderate',
    validationAction: 'error',
  },

  // 2. Workspaces Collection Validator
  workspaces: {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['id', 'userId', 'name', 'createdAt', 'updatedAt'],
        properties: {
          id: { bsonType: 'string', description: 'Workspace identifier (ws_...)' },
          userId: { bsonType: 'string', description: 'Owner user identifier (usr_...)' },
          name: { bsonType: 'string', description: 'User-provided workspace name' },
          description: { bsonType: 'string' },
          createdAt: { bsonType: ['string', 'date'] },
          updatedAt: { bsonType: ['string', 'date'] },
        },
      },
    },
    validationLevel: 'moderate',
    validationAction: 'error',
  },

  // 3. Virtual Databases Collection Validator
  virtual_databases: {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['id', 'workspaceId', 'userId', 'name', 'status', 'createdAt', 'updatedAt'],
        properties: {
          id: { bsonType: 'string', description: 'Virtual DB identifier (vdb_...)' },
          workspaceId: { bsonType: 'string', description: 'Parent workspace ID' },
          userId: { bsonType: 'string', description: 'Owner user ID' },
          name: { bsonType: 'string', description: 'Logical database name' },
          physicalDatabaseName: { bsonType: 'string', description: 'Isolated MongoDB physical database' },
          physicalNamespace: { bsonType: 'string', description: 'Backwards-compatible physical database name' },
          status: {
            enum: ['active', 'archived', 'deleted'],
            description: 'Lifecycle state of the virtual sandbox database',
          },
          description: { bsonType: 'string' },
          createdAt: { bsonType: ['string', 'date'] },
          updatedAt: { bsonType: ['string', 'date'] },
        },
      },
    },
    validationLevel: 'moderate',
    validationAction: 'error',
  },

  // 4. Classrooms Collection Validator
  classrooms: {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['id', 'facultyId', 'code', 'name', 'status', 'createdAt', 'updatedAt'],
        properties: {
          id: { bsonType: 'string', description: 'Classroom identifier (cls_...)' },
          facultyId: { bsonType: 'string', description: 'Faculty owner identifier (usr_...)' },
          code: { bsonType: 'string', minLength: 4, maxLength: 12, description: 'Unique cohort join code' },
          name: { bsonType: 'string', description: 'Course or cohort title' },
          description: { bsonType: 'string' },
          facultyName: { bsonType: 'string' },
          status: {
            enum: ['active', 'archived'],
            description: 'Classroom operational status',
          },
          enrolledStudentIds: { bsonType: 'array', description: 'Cached student ID array' },
          assignedChallengeIds: { bsonType: 'array' },
          createdAt: { bsonType: ['string', 'date'] },
          updatedAt: { bsonType: ['string', 'date'] },
        },
      },
    },
    validationLevel: 'moderate',
    validationAction: 'error',
  },

  // 5. Classroom Members Collection Validator
  classroom_members: {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['classroomId', 'userId', 'role', 'status', 'enrolledAt'],
        properties: {
          classroomId: { bsonType: 'string', description: 'Referenced classroom ID' },
          userId: { bsonType: 'string', description: 'Enrolled student ID' },
          role: {
            enum: ['student'],
            description: 'Role within this cohort',
          },
          status: {
            enum: ['active', 'removed'],
            description: 'Enrollment state',
          },
          enrolledAt: { bsonType: ['string', 'date'] },
        },
      },
    },
    validationLevel: 'moderate',
    validationAction: 'error',
  },

  // 5b. Cohort Assignments Collection Validator
  cohort_assignments: {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['id', 'classroomId', 'targetType', 'targetId', 'assignedBy', 'status', 'createdAt', 'updatedAt'],
        properties: {
          id: { bsonType: 'string', description: 'Canonical assignment identifier (asg_...)' },
          classroomId: { bsonType: 'string', description: 'Referenced classroom cohort ID' },
          targetType: {
            enum: ['lesson', 'challenge'],
            description: 'Assignable academic unit type',
          },
          targetId: { bsonType: 'string', description: 'Referenced lesson or challenge ID' },
          assignedBy: { bsonType: 'string', description: 'Faculty user ID who created the assignment' },
          dueDate: { bsonType: ['string', 'date', 'null'] },
          status: {
            enum: ['active', 'archived'],
            description: 'Assignment lifecycle status',
          },
          createdAt: { bsonType: ['string', 'date'] },
          updatedAt: { bsonType: ['string', 'date'] },
        },
      },
    },
    validationLevel: 'moderate',
    validationAction: 'error',
  },

  // 6. Practicals Collection Validator
  practicals: {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['id', 'number', 'title', 'category', 'description', 'xpReward', 'difficulty', 'published', 'createdAt', 'updatedAt'],
        properties: {
          id: { bsonType: 'string', description: 'Practical unique ID (e.g. practical_01)' },
          number: { bsonType: ['int', 'double', 'long'], description: 'Curriculum sequence number' },
          title: { bsonType: 'string', description: 'Practical title' },
          category: { bsonType: 'string', description: 'Curriculum category' },
          description: { bsonType: 'string' },
          xpReward: { bsonType: ['int', 'double', 'long'] },
          difficulty: {
            enum: ['beginner', 'intermediate', 'advanced'],
            description: 'Practical difficulty rating',
          },
          published: { bsonType: 'bool', description: 'Whether the practical is active in curriculum' },
          createdAt: { bsonType: ['string', 'date'] },
          updatedAt: { bsonType: ['string', 'date'] },
        },
      },
    },
    validationLevel: 'moderate',
    validationAction: 'error',
  },

  // 7a. Courses Collection Validator
  courses: {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['id', 'title', 'description', 'status', 'createdAt', 'updatedAt'],
        properties: {
          id: { bsonType: 'string', description: 'Course identifier (e.g. crs_mongodb_core)' },
          title: { bsonType: 'string', description: 'Course title' },
          description: { bsonType: 'string', description: 'Course description' },
          status: {
            enum: ['draft', 'published'],
            description: 'Publishing lifecycle state',
          },
          order: { bsonType: ['int', 'double', 'long'] },
          createdAt: { bsonType: ['string', 'date'] },
          updatedAt: { bsonType: ['string', 'date'] },
        },
      },
    },
    validationLevel: 'moderate',
    validationAction: 'error',
  },

  // 7b. Modules Collection Validator
  modules: {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['id', 'courseId', 'title', 'description', 'order', 'status', 'createdAt', 'updatedAt'],
        properties: {
          id: { bsonType: 'string', description: 'Module identifier (e.g. mod_foundations)' },
          courseId: { bsonType: 'string', description: 'Associated course identifier' },
          title: { bsonType: 'string', description: 'Module title' },
          description: { bsonType: 'string', description: 'Module description' },
          order: { bsonType: ['int', 'double', 'long'], description: 'Module sequence in course' },
          status: {
            enum: ['draft', 'published'],
            description: 'Publishing lifecycle state',
          },
          createdAt: { bsonType: ['string', 'date'] },
          updatedAt: { bsonType: ['string', 'date'] },
        },
      },
    },
    validationLevel: 'moderate',
    validationAction: 'error',
  },

  // 7c. Lessons Collection Validator
  lessons: {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['id', 'order', 'title', 'category', 'estimatedMinutes', 'xpReward', 'description', 'createdAt', 'updatedAt'],
        properties: {
          id: { bsonType: 'string', description: 'Lesson identifier (e.g. lesson-1-mongodb-basics)' },
          moduleId: { bsonType: 'string', description: 'Associated module reference' },
          courseId: { bsonType: 'string', description: 'Associated course reference' },
          practicalId: { bsonType: 'string', description: 'Associated practical reference' },
          challengeIds: { bsonType: 'array', description: 'Associated challenge IDs' },
          order: { bsonType: ['int', 'double', 'long'] },
          title: { bsonType: 'string' },
          category: { bsonType: 'string' },
          estimatedMinutes: { bsonType: ['int', 'double', 'long'] },
          xpReward: { bsonType: ['int', 'double', 'long'] },
          description: { bsonType: 'string' },
          conceptMarkdown: { bsonType: 'string' },
          exampleQuery: { bsonType: 'string' },
          starterPracticeQuery: { bsonType: 'string' },
          practiceCollection: { bsonType: 'string' },
          practiceExplanation: { bsonType: 'string' },
          status: {
            enum: ['draft', 'published'],
            description: 'Publishing lifecycle state',
          },
          createdAt: { bsonType: ['string', 'date'] },
          updatedAt: { bsonType: ['string', 'date'] },
        },
      },
    },
    validationLevel: 'moderate',
    validationAction: 'error',
  },

  // 7d. Lesson Sections Collection Validator
  lesson_sections: {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['id', 'lessonId', 'title', 'order', 'contentBlocks', 'status', 'createdAt', 'updatedAt'],
        properties: {
          id: { bsonType: 'string', description: 'Lesson section identifier (e.g. sec_...)' },
          lessonId: { bsonType: 'string', description: 'Associated lesson reference' },
          title: { bsonType: 'string', description: 'Section title' },
          description: { bsonType: 'string' },
          order: { bsonType: ['int', 'double', 'long'], description: 'Section sequence in lesson' },
          status: {
            enum: ['draft', 'published'],
            description: 'Publishing lifecycle state',
          },
          contentBlocks: {
            bsonType: 'array',
            description: 'Ordered array of embedded content blocks',
            items: {
              bsonType: 'object',
              required: ['type', 'order', 'content'],
              properties: {
                id: { bsonType: 'string' },
                type: {
                  enum: ['text', 'code', 'output', 'note', 'image', 'example', 'playground'],
                },
                order: { bsonType: ['int', 'double', 'long'] },
                content: { bsonType: 'string' },
                language: { bsonType: 'string' },
                caption: { bsonType: 'string' },
                altText: { bsonType: 'string' },
                playgroundQuery: { bsonType: 'string' },
                targetCollection: { bsonType: 'string' },
              },
            },
          },
          createdAt: { bsonType: ['string', 'date'] },
          updatedAt: { bsonType: ['string', 'date'] },
        },
      },
    },
    validationLevel: 'moderate',
    validationAction: 'error',
  },

  // 8. Learning Progress Collection Validator
  learning_progress: {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['userId', 'status', 'attempts', 'bestScore', 'xpEarned', 'updatedAt'],
        properties: {
          userId: { bsonType: 'string', description: 'Student user ID' },
          practicalId: { bsonType: 'string', description: 'Practical identifier' },
          lessonId: { bsonType: 'string', description: 'Lesson identifier' },
          status: {
            enum: ['not_started', 'in_progress', 'completed'],
            description: 'Progress state for this curriculum item',
          },
          completedSectionIds: { bsonType: 'array', description: 'IDs of completed sections' },
          progressPercent: { bsonType: ['int', 'double', 'long'], description: 'Progress percentage 0-100' },
          attempts: { bsonType: ['int', 'double', 'long'] },
          bestScore: { bsonType: ['int', 'double', 'long'] },
          xpEarned: { bsonType: ['int', 'double', 'long'] },
          startedAt: { bsonType: ['string', 'date', 'null'] },
          completedAt: { bsonType: ['string', 'date', 'null'] },
          updatedAt: { bsonType: ['string', 'date'] },
        },
      },
    },
    validationLevel: 'moderate',
    validationAction: 'error',
  },

  // 9. Challenges Collection Validator
  challenges: {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['id', 'title', 'description', 'xpReward', 'published', 'createdAt', 'updatedAt'],
        properties: {
          id: { bsonType: 'string', description: 'Challenge identifier' },
          title: { bsonType: 'string' },
          description: { bsonType: 'string' },
          difficulty: {
            enum: ['Easy', 'Medium', 'Hard', 'beginner', 'intermediate', 'advanced'],
          },
          type: { bsonType: 'string' },
          xpReward: { bsonType: ['int', 'double', 'long'] },
          estimatedMinutes: { bsonType: ['int', 'double', 'long'] },
          problemStatement: { bsonType: 'string' },
          contextDescription: { bsonType: 'string' },
          targetCollection: { bsonType: 'string' },
          starterQuery: { bsonType: 'string' },
          hints: { bsonType: 'array' },
          datasetDescription: { bsonType: 'string' },
          verificationType: { bsonType: 'string' },
          published: { bsonType: 'bool' },
          createdAt: { bsonType: ['string', 'date'] },
          updatedAt: { bsonType: ['string', 'date'] },
        },
      },
    },
    validationLevel: 'moderate',
    validationAction: 'error',
  },

  // 10. Challenge Attempts Collection Validator
  challenge_attempts: {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['userId', 'challengeId', 'passed', 'createdAt'],
        properties: {
          id: { bsonType: 'string' },
          userId: { bsonType: 'string' },
          challengeId: { bsonType: 'string' },
          query: { bsonType: 'string' },
          submission: { bsonType: 'object' },
          score: { bsonType: ['int', 'double', 'long'] },
          passed: { bsonType: 'bool' },
          feedback: { bsonType: ['string', 'array', 'object'] },
          attemptNumber: { bsonType: ['int', 'double', 'long'] },
          executionMs: { bsonType: ['int', 'double', 'long'] },
          createdAt: { bsonType: ['string', 'date'] },
        },
      },
    },
    validationLevel: 'moderate',
    validationAction: 'error',
  },

  // 11. Query History Collection Validator
  query_history: {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['userId', 'databaseId', 'operation', 'executionTimeMs', 'status', 'createdAt'],
        properties: {
          id: { bsonType: 'string' },
          userId: { bsonType: 'string' },
          workspaceId: { bsonType: 'string' },
          databaseId: { bsonType: 'string' },
          operation: { bsonType: 'string' },
          queryText: { bsonType: 'string' },
          rawQuery: { bsonType: 'string' },
          executionTimeMs: { bsonType: ['int', 'double', 'long'] },
          durationMs: { bsonType: ['int', 'double', 'long'] },
          resultCount: { bsonType: ['int', 'double', 'long'] },
          documentsReturned: { bsonType: ['int', 'double', 'long'] },
          documentsCount: { bsonType: ['int', 'double', 'long'] },
          documentsAffected: { bsonType: ['int', 'double', 'long'] },
          status: {
            enum: ['success', 'error', 'timeout'],
          },
          success: { bsonType: 'bool' },
          errorCode: { bsonType: ['string', 'null'] },
          errorMessage: { bsonType: ['string', 'null'] },
          collection: { bsonType: 'string' },
          collectionName: { bsonType: 'string' },
          createdAt: { bsonType: ['string', 'date'] },
          timestamp: { bsonType: ['string', 'date'] },
          executedAt: { bsonType: ['string', 'date'] },
        },
      },
    },
    validationLevel: 'moderate',
    validationAction: 'error',
  },

  // 12. Data Models Collection Validator
  data_models: {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['id', 'userId', 'name', 'createdAt', 'updatedAt'],
        properties: {
          id: { bsonType: 'string' },
          userId: { bsonType: 'string' },
          workspaceId: { bsonType: 'string' },
          databaseId: { bsonType: 'string' },
          name: { bsonType: 'string' },
          description: { bsonType: 'string' },
          nodes: { bsonType: 'array' },
          edges: { bsonType: 'array' },
          entities: { bsonType: 'array' },
          relationships: { bsonType: 'array' },
          createdAt: { bsonType: ['string', 'date'] },
          updatedAt: { bsonType: ['string', 'date'] },
        },
      },
    },
    validationLevel: 'moderate',
    validationAction: 'error',
  },

  // 13. Forum Posts Collection Validator
  forum_posts: {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['id', 'title', 'content', 'category', 'authorId', 'createdAt', 'updatedAt'],
        properties: {
          id: { bsonType: 'string' },
          title: { bsonType: 'string' },
          content: { bsonType: 'string' },
          category: { bsonType: 'string' },
          authorId: { bsonType: 'string' },
          authorName: { bsonType: 'string' },
          authorRole: { bsonType: 'string' },
          authorAvatar: { bsonType: 'string' },
          tags: { bsonType: 'array' },
          upvotes: { bsonType: ['int', 'double', 'long'] },
          upvotedBy: { bsonType: 'array' },
          replyCount: { bsonType: ['int', 'double', 'long'] },
          views: { bsonType: ['int', 'double', 'long'] },
          isPinned: { bsonType: 'bool' },
          isSolved: { bsonType: 'bool' },
          replies: { bsonType: 'array' },
          createdAt: { bsonType: ['string', 'date'] },
          updatedAt: { bsonType: ['string', 'date'] },
        },
      },
    },
    validationLevel: 'moderate',
    validationAction: 'error',
  },

  // 14. Security Audit Logs Collection Validator
  security_audit_logs: {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['userId', 'action', 'resourceType', 'outcome', 'createdAt'],
        properties: {
          userId: { bsonType: 'string' },
          action: { bsonType: 'string' },
          resourceType: { bsonType: 'string' },
          resourceId: { bsonType: ['string', 'null'] },
          method: { bsonType: 'string' },
          path: { bsonType: 'string' },
          outcome: {
            enum: ['success', 'denied', 'failure'],
          },
          ipAddress: { bsonType: 'string' },
          metadata: { bsonType: 'object' },
          createdAt: { bsonType: ['string', 'date'] },
          timestamp: { bsonType: ['string', 'date'] },
        },
      },
    },
    validationLevel: 'moderate',
    validationAction: 'error',
  },
};
