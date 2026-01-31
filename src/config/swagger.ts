const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "SHR Homies API",
      version: "1.0.0",
      description: "API documentation for SHR Homies project management system",
      contact: {
        name: "API Support",
      },
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter your JWT token (you can get it from /api/auth/admin/login endpoint)"
        }
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            userId: {
              type: "string",
              format: "uuid",
              description: "Auto-generated user ID",
            },
            userName: {
              type: "string",
              maxLength: 255,
              example: "John Doe",
            },
            role: {
              type: "string",
              enum: ["admin", "user", "supervisor"],
              example: "user",
            },
            email: {
              type: "string",
              maxLength: 100,
              format: "email",
              example: "john.doe@example.com",
            },
            password: {
              type: "string",
              maxLength: 255,
              nullable: true,
              description: "Hashed password (nullable)",
              example: "$2b$10$...",
            },
            contact: {
              type: "string",
              maxLength: 15,
              example: "9876543210",
            },
            estimatedInvestment: {
              type: "number",
              format: "decimal",
              nullable: true,
              description: "Estimated investment amount",
              example: 500000.00,
            },
            notes: {
              type: "string",
              nullable: true,
              description: "Additional notes about the user",
              example: "VIP client, prefers email communication",
            },
            companyName: {
              type: "string",
              maxLength: 255,
              nullable: true,
              description: "Company name",
              example: "ABC Construction Ltd",
            },
            projects: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  projectId: { type: "string", format: "uuid" },
                  projectName: { type: "string" }
                }
              },
              description: "List of projects the user is associated with"
            },
            timezone: {
              type: "string",
              maxLength: 100,
              nullable: true,
              default: "UTC",
              description: "User timezone preference",
              example: "Asia/Kolkata",
            },
            currency: {
              type: "string",
              maxLength: 20,
              nullable: true,
              default: "USD",
              description: "User currency preference",
              example: "INR",
            },
            language: {
              type: "string",
              maxLength: 50,
              nullable: true,
              default: "English",
              description: "User language preference",
              example: "English",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Auto-generated creation timestamp",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Auto-generated update timestamp",
            },
          },
        },
        Project: {
          type: "object",
          properties: {
            projectId: {
              type: "string",
              format: "uuid",
              description: "Auto-generated project ID",
            },
            projectName: {
              type: "string",
              maxLength: 255,
              example: "Smart Home Project",
            },
            projectType: {
              type: "string",
              enum: ["villa", "apartment", "building"],
              example: "villa",
            },
            location: {
              type: "string",
              maxLength: 255,
              example: "123 Main St, City",
            },
            initialStatus: {
              type: "string",
              enum: ["Planning", "Inprogress", "OnHold", "Completed"],
              example: "Planning",
            },
            startDate: {
              type: "string",
              format: "date",
              example: "2024-01-15",
            },
            expectedCompletion: {
              type: "string",
              format: "date",
              example: "2024-12-31",
            },
            totalBudget: {
              type: "number",
              format: "decimal",
              example: 500000.00,
            },
            materialName: {
              type: "string",
              maxLength: 255,
              example: "Cement",
            },
            quantity: {
              type: "integer",
              example: 100,
            },
            notes: {
              type: "string",
              example: "Initial notes for the project",
            },
            members: {
              type: "array",
              items: {
                $ref: '#/components/schemas/User'
              },
              description: "Project members (returned when included)"
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
            },
          },
        },
        Supervisor: {
          type: "object",
          properties: {
            supervisorId: {
              type: "string",
              format: "uuid",
            },
            userId: {
              type: "string",
              format: "uuid",
              description: "Associated User ID for authentication",
            },
            fullName: {
              type: "string",
              maxLength: 255,
              example: "Robert Smith",
            },
            email: {
              type: "string",
              maxLength: 100,
              format: "email",
              example: "robert.s@example.com",
            },
            phoneNumber: {
              type: "string",
              maxLength: 15,
              example: "1234567890",
            },
            status: {
              type: "string",
              enum: ["Active", "Inactive", "reject"],
              example: "Active",
            },
            approve: {
              type: "string",
              nullable: true,
              example: "approved",
            },
            rating: {
              type: "number",
              format: "decimal",
              example: 4.5,
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
            },
            assignedProjectsCount: {
              type: "integer",
              description: "Number of projects assigned to this supervisor",
              example: 5,
            },
            projects: {
              type: "array",
              items: {
                $ref: '#/components/schemas/Project'
              },
              description: "List of projects assigned to this supervisor"
            },
          },
        },
        CreateUserRequest: {
          type: "object",
          required: ["userName", "role", "email", "contact"],
          properties: {
            userName: {
              type: "string",
              maxLength: 255,
              example: "John Doe",
            },
            role: {
              type: "string",
              enum: ["admin", "user", "supervisor"],
              example: "user",
            },
            email: {
              type: "string",
              format: "email",
              example: "john.doe@example.com",
            },
            password: {
              type: "string",
              maxLength: 255,
              description: "Password (will be hashed automatically)",
              example: "SecurePassword123!",
            },
            contact: {
              type: "string",
              maxLength: 15,
              example: "9876543210",
            },
            estimatedInvestment: {
              type: "number",
              format: "decimal",
              description: "Estimated investment amount (optional)",
              example: 500000.00,
            },
            notes: {
              type: "string",
              description: "Additional notes about the user (optional)",
              example: "VIP client, prefers email communication",
            },
            companyName: {
              type: "string",
              maxLength: 255,
              description: "Company name (optional)",
              example: "ABC Construction Ltd",
            },

            timezone: {
              type: "string",
              maxLength: 100,
              description: "User timezone preference (optional, defaults to UTC)",
              example: "Asia/Kolkata",
            },
            currency: {
              type: "string",
              maxLength: 20,
              description: "User currency preference (optional, defaults to USD)",
              example: "INR",
            },
            language: {
              type: "string",
              maxLength: 50,
              description: "User language preference (optional, defaults to English)",
              example: "English",
            },
          },
        },
        CreateProjectRequest: {
          type: "object",
          required: ["projectName", "projectType", "location", "initialStatus", "startDate", "expectedCompletion", "totalBudget", "customerId", "supervisorId"],
          properties: {
            projectName: {
              type: "string",
              maxLength: 255,
              example: "Smart Home Project",
            },
            projectType: {
              type: "string",
              enum: ["villa", "apartment", "building"],
              example: "villa",
            },
            location: {
              type: "string",
              maxLength: 255,
              example: "123 Main St, City",
            },
            initialStatus: {
              type: "string",
              enum: ["Planning", "Inprogress", "OnHold", "Completed"],
              example: "Planning",
            },
            startDate: {
              type: "string",
              format: "date",
              example: "2024-01-15",
            },
            expectedCompletion: {
              type: "string",
              format: "date",
              example: "2024-12-31",
            },
            totalBudget: {
              type: "number",
              format: "decimal",
              example: 500000.00,
            },
            materialName: {
              type: "string",
              maxLength: 255,
              example: "Cement",
              description: "Initial material name (optional)",
            },
            quantity: {
              type: "integer",
              example: 100,
              description: "Initial material quantity (optional)",
            },
            notes: {
              type: "string",
              example: "Project notes",
              description: "Additional project notes (optional)",
            },
            customerId: {
              type: "string",
              format: "uuid",
              example: "123e4567-e89b-12d3-a456-426614174000",
              description: "The ID of the customer user",
            },
            supervisorId: {
              type: "string",
              format: "uuid",
              example: "123e4567-e89b-12d3-a456-426614174001",
              description: "The ID of the supervisor",
            },
          },
        },
        UpdateProjectRequest: {
          type: "object",
          properties: {
            projectName: {
              type: "string",
              maxLength: 255,
              example: "Updated Home Project",
            },
            projectType: {
              type: "string",
              enum: ["villa", "apartment", "building"],
              example: "villa",
            },
            location: {
              type: "string",
              maxLength: 255,
              example: "456 Oak St, City",
            },
            initialStatus: {
              type: "string",
              enum: ["Planning", "Inprogress", "OnHold", "Completed"],
              example: "Inprogress",
            },
            startDate: {
              type: "string",
              format: "date",
              example: "2024-02-01",
            },
            expectedCompletion: {
              type: "string",
              format: "date",
              example: "2025-01-31",
            },
            totalBudget: {
              type: "number",
              format: "decimal",
              example: 650000.00,
            },
            materialName: {
              type: "string",
              maxLength: 255,
              example: "Steel",
            },
            quantity: {
              type: "integer",
              example: 250,
            },
            notes: {
              type: "string",
              example: "Updated project details",
            },
            customerId: {
              type: "string",
              format: "uuid",
              example: "123e4567-e89b-12d3-a456-426614174000",
            },
            supervisorId: {
              type: "string",
              format: "uuid",
              example: "123e4567-e89b-12d3-a456-426614174001",
            },
          },
        },
        SuccessResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: true,
            },
            message: {
              type: "string",
              example: "Operation completed successfully",
            },
            data: {
              type: "object",
            },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: false,
            },
            message: {
              type: "string",
              example: "Error message here",
            },
          },
        },
      },
    },
  },
  apis: ["./src/modules/**/*.routes.ts", "./src/modules/**/*.routes.js", "./src/modules/**/*.controller.ts"],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;


