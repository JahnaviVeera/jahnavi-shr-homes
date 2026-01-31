import prisma from "../../config/prisma.client";
import { DocumentType } from "@prisma/client";
import { fileUploadService } from "../../services/fileUpload.service";
import * as projectService from "../project/project.services";

export const createDocument = async (
    data: {
        documentType: string;
        description?: string;
        projectId?: string;
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
            bucket: 'documents', // Using 'documents' bucket
            folder: 'project_docs'
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

    const newDocument = await prisma.document.create({
        data: createData
    });

    return newDocument;
};


export const getDocumentById = async (documentId: string) => {
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

    return document;
};


export const getAllDocuments = async (filters?: {
    projectId?: string;
    search?: string;
}) => {
    const where: any = {};


    if (filters?.projectId) {
        where.projectId = filters.projectId;
    }

    if (filters?.search) {
        where.OR = [
            { fileName: { contains: filters.search, mode: 'insensitive' } },
            { description: { contains: filters.search, mode: 'insensitive' } },
            { project: { projectName: { contains: filters.search, mode: 'insensitive' } } }
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


export const getDocumentsByType = async (documentType: string) => {
    const validTypes = ["Agreement", "plans", "permit", "others"];
    if (!validTypes.includes(documentType)) {
        throw new Error(`Invalid document type. Must be one of: ${validTypes.join(", ")}`);
    }

    const documents = await prisma.document.findMany({
        where: { documentType: documentType as DocumentType },
        include: { project: true },
        orderBy: {
            createdAt: "desc",
        },
    });

    if (!documents) {
        return [];
    }

    return documents;
};


export const getDocumentsByProject = async (projectId: string) => {
    if (!projectId) {
        throw new Error("Project ID is required");
    }

    // Get the project details (Decoupled)
    const project = await projectService.getProjectById(projectId);
    // getProjectById throws if not found
    // If we want detailed fields not provided by getProjectById, we might technically need to ask project service for more,
    // but getProjectById usually returns full object or mostly full.
    // The previous code selected specific fields for `project` return object?
    // "project: { projectId: project.projectId, projectName: ... }"

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

    // Update file if provided
    if (file) {
        // Upload to Supabase
        try {
            const uploadResult = await fileUploadService.uploadFile({
                file: file as any,
                bucket: 'documents',
                folder: 'project_docs'
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
