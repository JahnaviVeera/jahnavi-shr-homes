import type { Request, Response } from "express";
const DocumentServices = require("./documents.services");

interface MulterRequest extends Request {
    user?: {
        userId: string;
        email: string;
        role: string;
    };
    file?: Express.Multer.File;
    files?: {
        [fieldname: string]: Express.Multer.File[];
    } | Express.Multer.File[];
}

/**
 * @swagger
 * /api/documents:
 *   post:
 *     summary: Upload a new document (Admin only)
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: ["documentType", "file"]
 *             properties:
 *               documentType:
 *                 type: string
 *                 enum: ["Agreement", "Plans", "Permit", "Others"]
 *                 example: "Agreement"
 *                 description: Type of document
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Project agreement document"
 *                 description: Optional description of the document
 *               projectId:
 *                 type: string
 *                 format: uuid
 *                 example: "d1f8ac24-57c1-47aa-ae6a-092de6e55553"
 *                 description: Optional project ID to link document to a project
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 example: "d1f8ac24-57c1-47aa-ae6a-092de6e55553"
 *                 description: Optional user ID to link document directly to a user
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Document file to upload
 *     responses:
 *       201:
 *         description: Document uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         documentId:
 *                           type: string
 *                           format: uuid
 *                         documentType:
 *                           type: string
 *                           enum: ["Agreement", "Plans", "Permit", "Others"]
 *                         fileName:
 *                           type: string
 *                         fileType:
 *                           type: string
 *                         description:
 *                           type: string
 *                         projectId:
 *                           type: string
 *                           format: uuid
 *       400:
 *         description: Bad request - Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Access denied
 */
// POST - Create Document
exports.createDocument = async (req: MulterRequest, res: Response) => {
    try {
        // Handle file upload
        let file: any = undefined;
        if (req.file) {
            file = req.file;
        } else if (req.files) {
            if (Array.isArray(req.files)) {
                file = req.files.length > 0 ? req.files[0] : undefined;
            } else {
                file = (req.files['file'] && req.files['file'][0]) ||
                    (req.files['fileData'] && req.files['fileData'][0]) ||
                    undefined;
            }
        }

        if (!file) {
            return res.status(400).json({
                success: false,
                message: "File is required"
            });
        }

        const documentData = await DocumentServices.createDocument({
            ...req.body,
            userId: req.body.userId || null
        }, file);

        return res.status(201).json({
            success: true,
            message: "Document uploaded successfully",
            data: documentData,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error),
        });
    }
};

/**
 * @swagger
 * /api/documents/{documentId}:
 *   get:
 *     summary: Get a document by ID
 *     tags: [Documents]
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The document ID
 *     responses:
 *       200:
 *         description: Document fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         documentId:
 *                           type: string
 *                           format: uuid
 *                         documentType:
 *                           type: string
 *                           enum: ["Agreement", "Plans", "Permit", "Others"]
 *                         fileName:
 *                           type: string
 *                         fileType:
 *                           type: string
 *                         description:
 *                           type: string
 *                         projectId:
 *                           type: string
 *                           format: uuid
 *       400:
 *         description: Bad request - Document not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Access denied
 */
// GET - Get Document by ID
exports.getDocumentById = async (req: MulterRequest, res: Response) => {
    try {
        const documentId = req.params.documentId;
        const userContext = req.user ? { userId: req.user.userId, role: req.user.role } : undefined;

        const document = await DocumentServices.getDocumentById(documentId, userContext);

        return res.status(200).json({
            success: true,
            message: "Document fetched successfully",
            data: document,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error),
        });
    }
};

/**
 * @swagger
 * /api/documents:
 *   get:
 *     summary: Get all documents (Admin/User)
 *     description: Returns all relevant documents. Admins see all documents in the system. Regular users (Customers) only see documents linked to their projects or directly to their user ID.
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by project ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by file name, description, or project name
 *     responses:
 *       200:
 *         description: Documents fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           documentId:
 *                             type: string
 *                             format: uuid
 *                           fileName:
 *                             type: string
 *                           fileType:
 *                             type: string
 *                           description:
 *                             type: string
 *                           projectId:
 *                             type: string
 *                             format: uuid
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Access denied
 */
// GET - Get All Documents
exports.getAllDocuments = async (req: MulterRequest, res: Response) => {
    try {
        const filters: any = {};


        if (req.query.projectId) {
            filters.projectId = req.query.projectId as string;
        }

        if (req.query.search) {
            filters.search = req.query.search as string;
        }

        const userContext = req.user ? { userId: req.user.userId, role: req.user.role } : undefined;

        const documents = await DocumentServices.getAllDocuments(
            Object.keys(filters).length > 0 ? filters : undefined,
            userContext
        );

        return res.status(200).json({
            success: true,
            message: "Documents fetched successfully",
            data: documents,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error),
        });
    }
};

// /**
//  * @swagger
//  * /api/documents/type/{documentType}:
//  *   get:
//  *     summary: Get documents by type
//  *     tags: [Documents]
//  *     parameters:
//  *       - in: path
//  *         name: documentType
//  *         required: true
//  *         schema:
//  *           type: string
//  *           enum: ["Agreement", "Plans", "Permit", "Others"]
//  *         description: Type of document
//  *     responses:
//  *       200:
//  *         description: Documents fetched successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               allOf:
//  *                 - $ref: '#/components/schemas/SuccessResponse'
//  *                 - type: object
//  *                   properties:
//  *                     data:
//  *                       type: array
//  *                       items:
//  *                         type: object
//  *       400:
//  *         description: Bad request - Invalid document type
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/ErrorResponse'
//  *       403:
//  *         description: Access denied
//  */
// // GET - Get Documents by Type
// exports.getDocumentsByType = async (req: MulterRequest, res: Response) => {
//     try {
//         const documentType = req.params.documentType;
//         const userContext = req.user ? { userId: req.user.userId, role: req.user.role } : undefined;

//         const documents = await DocumentServices.getDocumentsByType(documentType, userContext);

//         return res.status(200).json({
//             success: true,
//             message: `Documents of type '${documentType}' fetched successfully`,
//             data: documents,
//         });
//     } catch (error) {
//         return res.status(400).json({
//             success: false,
//             message: error instanceof Error ? error.message : String(error),
//         });
//     }
// };

/**
 * @swagger
 * /api/documents/project/{projectId}:
 *   get:
 *     summary: Get documents by project ID with project details
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     description: Returns project details along with all documents for the specified project, including fileName and documentType
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Project ID
 *     responses:
 *       200:
 *         description: Documents fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         project:
 *                           type: object
 *                           description: Project details
 *                           properties:
 *                             projectId:
 *                               type: string
 *                               format: uuid
 *                               example: "d1f8ac24-57c1-47aa-ae6a-092de6e55553"
 *                             projectName:
 *                               type: string
 *                               example: "Luxury Villa Project"
 *                             projectType:
 *                               type: string
 *                               enum: ["villa", "apartment", "building"]
 *                               example: "villa"
 *                             location:
 *                               type: string
 *                               example: "Downtown"
 *                             totalBudget:
 *                               type: number
 *                               format: decimal
 *                               example: 1000000
 *                             startDate:
 *                               type: string
 *                               format: date
 *                             expectedCompletion:
 *                               type: string
 *                               format: date
 *                         documents:
 *                           type: array
 *                           description: Array of documents with fileName and documentType
 *                           items:
 *                             type: object
 *                             properties:
 *                               documentId:
 *                                 type: string
 *                                 format: uuid
 *                               fileName:
 *                                 type: string
 *                                 example: "agreement.pdf"
 *                                 description: Name of the document file
 *                               documentType:
 *                                 type: string
 *                                 enum: ["Agreement", "Plans", "Permit", "Others"]
 *                                 example: "Agreement"
 *                                 description: Type of the document
 *                               fileType:
 *                                 type: string
 *                                 example: "application/pdf"
 *                               description:
 *                                 type: string
 *                                 nullable: true
 *                                 example: "Project agreement document"
 *                               createdAt:
 *                                 type: string
 *                                 format: date-time
 *                               updatedAt:
 *                                 type: string
 *                                 format: date-time
 *       400:
 *         description: Bad request - Project not found or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Access denied
 */
// GET - Get Documents by Project
exports.getDocumentsByProject = async (req: MulterRequest, res: Response) => {
    try {
        const projectId = req.params.projectId;
        const userContext = req.user ? { userId: req.user.userId, role: req.user.role } : undefined;

        const documents = await DocumentServices.getDocumentsByProject(projectId, userContext);

        return res.status(200).json({
            success: true,
            message: `Documents for project '${projectId}' fetched successfully`,
            data: documents,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error),
        });
    }
};

/**
 * @swagger
 * /api/documents/{documentId}:
 *   put:
 *     summary: Update a document (Admin only)
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The document ID
 *     requestBody:
 *       required: false
 *       description: All fields are optional. Only include the fields you want to update.
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               documentType:
 *                 type: string
 *                 enum: ["Agreement", "Plans", "Permit", "Others"]
 *                 example: "Plans"
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Updated description"
 *               projectId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 example: "d1f8ac24-57c1-47aa-ae6a-092de6e55553"
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Optional new file to replace existing file
 *     responses:
 *       200:
 *         description: Document updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *       400:
 *         description: Bad request - Document not found or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// PUT - Update Document
exports.updateDocument = async (req: MulterRequest, res: Response) => {
    try {
        const documentId = req.params.documentId;

        // Prepare update data
        const updateData: any = {};

        if (req.body.documentType !== undefined && req.body.documentType !== null && req.body.documentType !== '') {
            updateData.documentType = req.body.documentType;
        }

        if (req.body.description !== undefined) {
            updateData.description = req.body.description || null;
        }

        if (req.body.projectId !== undefined) {
            updateData.projectId = req.body.projectId || null;
        }

        // Handle file upload
        let file: any = undefined;
        if (req.file) {
            file = req.file;
        } else if (req.files) {
            if (Array.isArray(req.files)) {
                file = req.files.length > 0 ? req.files[0] : undefined;
            } else {
                file = (req.files['file'] && req.files['file'][0]) ||
                    (req.files['fileData'] && req.files['fileData'][0]) ||
                    undefined;
            }
        }

        // Check if there's anything to update
        const hasUpdates = Object.keys(updateData).length > 0 || file !== undefined;

        if (!hasUpdates) {
            return res.status(400).json({
                success: false,
                message: "No fields provided to update"
            });
        }

        const updatedDocument = await DocumentServices.updateDocument(documentId, updateData, file || undefined);

        return res.status(200).json({
            success: true,
            message: "Document updated successfully",
            data: updatedDocument,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error),
        });
    }
};

/**
 * @swagger
 * /api/documents/{documentId}:
 *   delete:
 *     summary: Delete a document (Admin only)
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The document ID
 *     responses:
 *       200:
 *         description: Document deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         success:
 *                           type: boolean
 *                         message:
 *                           type: string
 *       400:
 *         description: Bad request - Document not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// DELETE - Delete Document
exports.deleteDocument = async (req: Request, res: Response) => {
    try {
        const documentId = req.params.documentId;
        const deletedData = await DocumentServices.deleteDocument(documentId);

        return res.status(200).json({
            success: true,
            message: "Document deleted successfully",
            data: deletedData,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error),
        });
    }
};

/**
 * @swagger
 * /api/documents/{documentId}/download:
 *   get:
 *     summary: Download a document file
 *     tags: [Documents]
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The document ID
 *     responses:
 *       200:
 *         description: File downloaded successfully
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Bad request - Document not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// GET - Download Document File
exports.downloadDocument = async (req: MulterRequest, res: Response) => {
    try {
        const documentId = req.params.documentId;

        // OPTIONAL: Add access control here if critical. 
        // Currently `getDocumentFile` does not check role.
        // It's safer to check first.
        const userContext = req.user ? { userId: req.user.userId, role: req.user.role } : undefined;
        // Reuse getDocumentById for permission check before download
        await DocumentServices.getDocumentById(documentId, userContext);

        const documentFile = await DocumentServices.getDocumentFile(documentId);

        // If we have a fileUrl (Supabase), redirect to it or return it
        if (documentFile.fileUrl) {
            return res.redirect(documentFile.fileUrl);
            // Alternatively, return JSON with URL:
            // return res.status(200).json({ success: true,  data: { fileUrl: documentFile.fileUrl } });
        }

        // Fallback for legacy files stored in DB (buffer)
        if (documentFile.fileData && documentFile.fileData.length > 0) {
            res.setHeader('Content-Type', documentFile.fileType);
            res.setHeader('Content-Disposition', `attachment; filename="${documentFile.fileName}"`);
            return res.status(200).send(documentFile.fileData);
        }

        return res.status(404).json({
            success: false,
            message: "File content not found"
        });

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error),
        });
    }
};

/**
 * @swagger
 * /api/documents/counts/by-type:
 *   get:
 *     summary: Get total count of documents by type
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     description: Returns the count of documents grouped by type (Agreement, Plans, Permit, Others) and total count
 *     responses:
 *       200:
 *         description: Document counts fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         Agreement:
 *                           type: integer
 *                           example: 15
 *                           description: Count of Agreement documents
 *                         Plans:
 *                           type: integer
 *                           example: 8
 *                           description: Count of Plans documents
 *                         Permit:
 *                           type: integer
 *                           example: 12
 *                           description: Count of Permit documents
 *                         Others:
 *                           type: integer
 *                           example: 5
 *                           description: Count of Others documents
 *                         total:
 *                           type: integer
 *                           example: 40
 *                           description: Total count of all documents
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// GET - Get Document Counts by Type
exports.getDocumentCountsByType = async (req: Request, res: Response) => {
    try {
        const counts = await DocumentServices.getDocumentCountsByType();

        return res.status(200).json({
            success: true,
            message: "Document counts by type fetched successfully",
            data: counts,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : String(error),
        });
    }
};


