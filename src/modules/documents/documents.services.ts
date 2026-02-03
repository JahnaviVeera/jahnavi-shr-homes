import prisma from "../../config/prisma.client";
import { DocumentType } from "@prisma/client";
import { fileUploadService } from "../../services/fileUpload.service";
import * as projectService from "../project/project.services";
import { notifyUser } from "../notifications/notifications.services";
import SocketService from "../../services/socket.service";

export const createDocument = async (
    data: {
        documentType: string;
        description?: string;
        projectId?: string;
        userId?: string;
        createdAt?: Date;
        updatedAt?: Date;
    },
    file: {
        buffer: Buffer;
        originalname: string;
        mimetype: string;
    }
) => {
    // Validate required fields
    if (!data.documentType) {
        throw new Error("Document type is required");
    }

    if (!file || !file.buffer) {
        throw new Error("File is required");
    }

    const validTypes = ["Agreement", "plans", "permit", "others"];
    if (!validTypes.includes(data.documentType)) {
        throw new Error(`Invalid document type. Must be one of: ${validTypes.join(", ")}`);
    }

    // Upload to Supabase
    let fileUrl: string;
    let fileId: string;
    try {
        const uploadResult = await fileUploadService.uploadFile({
            file: file as any,
            bucket: 'uploads', // Using 'documents' bucket
            folder: 'documents'
        });
        fileUrl = uploadResult.publicUrl;
        fileId = uploadResult.id;
    } catch (error) {
        console.error("Error uploading file to Supabase:", error);
        throw new Error("Failed to upload file to storage");
    }

    const createData: any = {
        documentType: data.documentType as DocumentType,
        description: data.description || null,
        fileData: Buffer.from([]), // Keeping empty buffer for compatibility if field is required
        fileName: file.originalname,
        fileType: file.mimetype,
        fileUrl: fileUrl,
        fileId: fileId,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    if (data.projectId) {
        // Optionally validate project existence here using service?
        // await projectService.getProjectById(data.projectId);
        createData.project = { connect: { projectId: data.projectId } };
    }

    if (data.userId) {
        createData.user = { connect: { userId: data.userId } };
    }

    const newDocument = await prisma.document.create({
        data: createData
    });

    // Notify Customer if linked to project
    if (data.projectId) {
        const project = await prisma.project.findUnique({
            where: { projectId: data.projectId },
            include: { customer: true }
        });

        if (project && project.customer) {
            const customerMsg = `New document (${data.documentType}) uploaded for project ${project.projectName}`;
            SocketService.getInstance().emitToUser(project.customer.userId, "notification", {
                type: "DOCUMENT_UPLOADED",
                message: customerMsg,
                documentId: newDocument.documentId
            });
            await notifyUser(project.customer.userId, customerMsg, "document_uploaded");
        }
    } else if (data.userId) {
        // Direct user upload
        const customerMsg = `New document (${data.documentType}) uploaded for you`;
        SocketService.getInstance().emitToUser(data.userId, "notification", {
            type: "DOCUMENT_UPLOADED",
            message: customerMsg,
            documentId: newDocument.documentId
        });
        await notifyUser(data.userId, customerMsg, "document_uploaded");
    }

    return newDocument;
};


export const getDocumentById = async (documentId: string, userContext?: { userId: string, role: string }) => {
    if (!documentId) {
        throw new Error("Document ID is required");
    }

    const document = await prisma.document.findUnique({
        where: { documentId },
        include: { project: true }
    });

    if (!document) {
        throw new Error("Document not found");
    }

    // Access Control Check
    if (userContext && userContext.role === 'customer') {
        let hasAccess = false;

        // 1. Check project ownership if linked to project
        if (document.project && document.project.customerId === userContext.userId) {
            hasAccess = true;
        }

        // 2. Check direct user link (Casting to any to handle stale Prisma types)
        if ((document as any).userId === userContext.userId) {
            hasAccess = true;
        }

        if (!hasAccess) {
            throw new Error("Access denied: You do not have permission to view this document.");
        }
    }

    return document;
};


export const getAllDocuments = async (
    filters?: {
        projectId?: string;
        search?: string;
    },
    userContext?: { userId: string, role: string }
) => {
    const where: any = {};


    // 1. PROJECT ID Filter
    if (filters?.projectId) {
        where.projectId = filters.projectId;
    }

    // 2. SEARCH Filter
    if (filters?.search) {
        where.OR = [
            { fileName: { contains: filters.search, mode: 'insensitive' } },
            { description: { contains: filters.search, mode: 'insensitive' } },
            { project: { projectName: { contains: filters.search, mode: 'insensitive' } } }
        ];
    }

    // 3. ROLE-BASED ACCESS CONTROL
    if (userContext && userContext.role === 'customer') {
        // Force filter: Only projects where customerId == userContext.userId OR direct userId link
        where.OR = [
            {
                project: {
                    customerId: userContext.userId
                }
            },
            {
                userId: userContext.userId
            }
        ];
    }

    const documents = await prisma.document.findMany({
        where,
        orderBy: {
            createdAt: "desc", // Most recent first
        },
        include: {
            project: true
        }
    });

    if (!documents) {
        return [];
    }

    return documents;
};


// export const getDocumentsByType = async (documentType: string, userContext?: { userId: string, role: string }) => {
//     const validTypes = ["Agreement", "plans", "permit", "others"];
//     if (!validTypes.includes(documentType)) {
//         throw new Error(`Invalid document type. Must be one of: ${validTypes.join(", ")}`);
//     }

//     const where: any = { documentType: documentType as DocumentType };

//     // Access Control
//     if (userContext && userContext.role === 'customer') {
//         where.project = {
//             customerId: userContext.userId
//         };
//     }

//     const documents = await prisma.document.findMany({
//         where,
//         include: { project: true },
//         orderBy: {
//             createdAt: "desc",
//         },
//     });

//     if (!documents) {
//         return [];
//     }

//     return documents;
// };


export const getDocumentsByProject = async (projectId: string, userContext?: { userId: string, role: string }) => {
    if (!projectId) {
        throw new Error("Project ID is required");
    }

    // Access Control Pre-check
    if (userContext && userContext.role === 'customer') {
        // Verify project ownership first
        const projectCheck = await prisma.project.findUnique({
            where: { projectId },
            select: { customerId: true }
        });

        if (!projectCheck) {
            throw new Error("Project not found");
        }

        if (projectCheck.customerId !== userContext.userId) {
            throw new Error("Access denied: You do not have permission to view documents for this project.");
        }
    }

    // Get the project details (Decoupled)
    const project = await projectService.getProjectById(projectId);

    // Get all documents for this project
    const documents = await prisma.document.findMany({
        where: { projectId },
        orderBy: {
            createdAt: "desc",
        },
    });

    // Reuse the mapping logic from original file
    const formattedDocuments = documents.map((doc: any) => ({
        documentId: doc.documentId,
        fileName: doc.fileName,
        documentType: doc.documentType,
        fileType: doc.fileType,
        fileUrl: doc.fileUrl,
        description: doc.description || null,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt
    }));

    return {
        project: {
            projectId: project.projectId,
            projectName: project.projectName || "",
            projectType: project.projectType || "",
            location: project.location || "",
            totalBudget: parseFloat(project.totalBudget.toString()) || 0,
            startDate: project.startDate,
            expectedCompletion: project.expectedCompletion,
        },
        documents: formattedDocuments
    };
};


export const updateDocument = async (
    documentId: string,
    updateData: {
        documentType?: string;
        description?: string;
        projectId?: string | null;
        userId?: string | null;
        updatedAt?: Date;
    },
    file?: {
        buffer: Buffer;
        originalname: string;
        mimetype: string;
    }
) => {
    const document = await prisma.document.findUnique({ where: { documentId } });

    if (!document) {
        throw new Error("Document not found");
    }

    const dataToUpdate: any = {
        updatedAt: new Date(),
    }

    // Update document type if provided
    if (updateData.documentType !== undefined) {
        const validTypes = ["Agreement", "plans", "permit", "others"];
        if (!validTypes.includes(updateData.documentType)) {
            throw new Error(`Invalid document type. Must be one of: ${validTypes.join(", ")}`);
        }
        dataToUpdate.documentType = updateData.documentType as DocumentType;
    }

    // Update description if provided
    if (updateData.description !== undefined) {
        dataToUpdate.description = updateData.description || null;
    }

    // Update project ID if provided
    if (updateData.projectId !== undefined) {
        if (updateData.projectId) {
            // Validate via service?
            await projectService.getProjectById(updateData.projectId);
            dataToUpdate.project = { connect: { projectId: updateData.projectId } };
        } else {
            dataToUpdate.project = { disconnect: true };
        }
    }

    // Update user ID if provided
    if (updateData.userId !== undefined) {
        if (updateData.userId) {
            dataToUpdate.user = { connect: { userId: updateData.userId } };
        } else {
            dataToUpdate.user = { disconnect: true };
        }
    }

    // Update file if provided
    if (file) {
        // Upload to Supabase
        try {
            const uploadResult = await fileUploadService.uploadFile({
                file: file as any,
                bucket: 'uploads',
                folder: 'documents'
            });
            dataToUpdate.fileData = Buffer.from([]); // keeping it compatible
            dataToUpdate.fileName = file.originalname;
            dataToUpdate.fileType = file.mimetype;
            dataToUpdate.fileUrl = uploadResult.publicUrl;
            dataToUpdate.fileId = uploadResult.id;
        } catch (error) {
            console.error("Error uploading file to Supabase:", error);
            throw new Error("Failed to upload file to storage");
        }
    }

    const updatedDocument = await prisma.document.update({
        where: { documentId },
        data: dataToUpdate,
    });

    return updatedDocument;
};


export const deleteDocument = async (documentId: string) => {
    if (!documentId) {
        throw new Error("Document ID is required");
    }

    const document = await prisma.document.findUnique({ where: { documentId } });

    if (!document) {
        throw new Error("Document not found");
    }

    await prisma.document.delete({ where: { documentId } });

    return { success: true, message: "Document deleted successfully" };
};


export const getDocumentFile = async (documentId: string) => {
    if (!documentId) {
        throw new Error("Document ID is required");
    }

    const document = await prisma.document.findUnique({
        where: { documentId },
        select: {
            documentId: true,
            fileName: true,
            fileType: true,
            fileData: true,
            fileUrl: true,
            documentType: true,
            createdAt: true,
        },
    });

    if (!document) {
        throw new Error("Document not found");
    }

    return {
        documentId: document.documentId,
        fileName: document.fileName,
        fileType: document.fileType,
        fileData: document.fileData,
        fileUrl: document.fileUrl,
        documentType: document.documentType,
        createdAt: document.createdAt,
    };
};


export const getDocumentCountsByType = async () => {
    // Get counts for each document type
    const counts = await prisma.document.groupBy({
        by: ['documentType'],
        _count: {
            documentId: true
        }
    });

    // Initialize all types with 0
    const result: any = {
        Agreement: 0,
        plans: 0,
        permit: 0,
        others: 0,
        total: 0
    };

    // Map the counts to result object
    counts.forEach((item: any) => {
        const type = item.documentType;
        const count = item._count.documentId;
        if (result.hasOwnProperty(type)) {
            result[type] = count;
            result.total += count;
        }
    });

    return result;
};
