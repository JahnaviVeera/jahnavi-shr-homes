import prisma from "../../config/prisma.client";
import { fileUploadService } from "../../services/fileUpload.service";
import { QuotationStatus, Prisma } from "@prisma/client";
import { notifyAdmins, notifyUser } from "../notifications/notifications.services";

import SocketService from "../../services/socket.service";

export const createQuotation = async (data:
    {
        totalAmount: number,
        status: string,
        lineItems?: Array<{ description: string; amount: number }> | null,
        date?: Date | null,
        projectId: string,
        userId?: string,
        customerName?: string | null,
        createdAt: Date,
        updatedAt: Date
    },
    file: {
        buffer: Buffer
        originalname: string
        mimetype: string
    }
) => {
    // Validate lineItems
    const lineItems = data.lineItems || [];

    // Calculate totalAmount from lineItems if not provided or if lineItems exist
    let calculatedTotalAmount = data.totalAmount;
    if (lineItems.length > 0) {
        calculatedTotalAmount = lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    }

    // If totalAmount was provided but doesn't match calculated, use provided (for backward compatibility)
    // Otherwise use calculated
    const finalTotalAmount = data.totalAmount || calculatedTotalAmount;

    // Upload file if provided
    let fileUrl: string | null = null;
    if (file) {
        try {
            const uploadResult = await fileUploadService.uploadFile({
                file: file as any,
                bucket: 'uploads',
                folder: 'quotations'
            });
            fileUrl = uploadResult.publicUrl;
            (data as any).fileId = uploadResult.id;
        } catch (error) {
            console.error("Error uploading file to Supabase:", error);
            throw new Error("Failed to upload file to storage");
        }
    }

    // Verify project exists
    const projectExists = await prisma.project.findUnique({
        where: { projectId: data.projectId },
        include: { customer: true }
    });

    if (!projectExists) {
        throw new Error(`Project with ID ${data.projectId} does not exist`);
    }

    // Determine User ID
    let userIdToUse = data.userId;
    if (!userIdToUse && projectExists.customer) {
        userIdToUse = projectExists.customer.userId;
    }

    let dateString: string | null = null;
    if (data.date) {
        dateString = (data.date instanceof Date ? data.date : new Date(data.date)).toISOString().split('T')[0];
    }

    const newQuotation = await prisma.quotation.create({
        data: {
            totalAmount: finalTotalAmount,
            status: data.status as QuotationStatus,
            lineItems: lineItems.length > 0 ? JSON.stringify(lineItems) : "[]",
            date: dateString,
            projectId: data.projectId,
            userId: userIdToUse ?? null,
            customerName: data.customerName ?? null,
            fileData: null,
            fileName: file ? file.originalname : null,
            fileType: file ? file.mimetype : null,
            fileUrl: fileUrl ?? null,
            fileId: (data as any).fileId ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
        }
    });

    // Notify Customer
    if (userIdToUse) {
        const msg = `New quotation received for project ${projectExists.projectName}`;
        SocketService.getInstance().emitToUser(userIdToUse, "notification", {
            type: "QUOTATION_RECEIVED",
            message: msg,
            quotationId: newQuotation.quotationId
        });
        await notifyUser(userIdToUse, msg, "quotation_received");
    }

    return newQuotation;
}

// ... (format functions)

// Helper function to format quotation ID (QU0001 format)
const formatQuotationId = (quotationId: string, index?: number): string => {
    // If index is provided, use it for sequential numbering
    if (index !== undefined) {
        return `QU${String(index + 1).padStart(4, '0')}`;
    }
    // Otherwise, extract number from UUID or use a hash
    // For now, we'll use a simple approach - extract first 4 chars and convert
    const hash = quotationId.split('-')[0] || quotationId.substring(0, 8);
    const num = parseInt(hash.substring(0, 4), 16) % 10000;
    return `QU${String(num).padStart(4, '0')}`;
};

// Helper function to format quotation response
const formatQuotationResponse = (quotation: any, index?: number) => {
    const formattedId = formatQuotationId(quotation.quotationId, index);

    // Prefer explicit relation if loaded, otherwise try nested project.customer
    const customer = quotation.user || quotation.project?.customer;

    return {
        id: formattedId,
        quotationId: quotation.quotationId,
        projectName: quotation.project?.projectName || null,
        customerName: quotation.customerName || customer?.userName || null,
        customerEmail: customer?.email || null,
        status: quotation.status,
        date: quotation.date || null,
        lineItems: quotation.lineItems || [],
        totalAmount: parseFloat(String(quotation.totalAmount || 0)),
        fileName: quotation.fileName || null,
        fileType: quotation.fileType || null,
        fileUrl: quotation.fileUrl || null,
        userId: quotation.userId || null,
        createdAt: quotation.createdAt,
        updatedAt: quotation.updatedAt
    };
};


// Get all quotations
export const getAllTheQuotations = async (supervisorId?: string, customerId?: string) => {
    const where: Prisma.QuotationWhereInput = {};

    if (supervisorId) {
        where.project = {
            supervisorId: supervisorId
        };
    } else if (customerId) {
        where.userId = customerId;
    }

    const quotations = await prisma.quotation.findMany({
        where,
        include: { project: { include: { customer: true } }, user: true },
        orderBy: { createdAt: "desc" }
    });

    if (!quotations || quotations.length === 0) {
        return [];
    }

    return quotations.map((quotation: any, index: number) => formatQuotationResponse(quotation, index));
};

// Get quotation by ID
export const getQuotationByQuotationId = async (quotationId: string) => {
    if (!quotationId) {
        throw new Error("Quotation ID is required");
    }

    const quotation = await prisma.quotation.findUnique({
        where: { quotationId },
        include: { project: { include: { customer: true } }, user: true }
    });

    if (!quotation) {
        throw new Error("Quotation not found");
    }

    return formatQuotationResponse(quotation);
};

// Get quotation total amount
export const getQuotationTotalAmount = async (quotationId: string) => {
    if (!quotationId) {
        throw new Error("Quotation ID is required");
    }

    const quotation = await prisma.quotation.findUnique({
        where: { quotationId },
        select: { totalAmount: true }
    });

    if (!quotation) {
        throw new Error("Quotation not found");
    }

    return quotation.totalAmount;
};


// Update quotation
export const updateQuotation = async (quotationId: string, updateData: {
    totalAmount?: number,
    status?: string,
    lineItems?: Array<{ description: string; amount: number }> | null,
    date?: Date | null,
    projectId?: string,
    userId?: string,
    customerName?: string | null,
    updatedAt?: Date
}, file?: {
    buffer: Buffer
    originalname: string
    mimetype: string
}) => {
    const quotation = await prisma.quotation.findUnique({ where: { quotationId } });

    if (!quotation) {
        throw new Error("Quotation not found");
    }

    const dataToUpdate: Prisma.QuotationUpdateInput = {
        updatedAt: new Date(),
    };

    if (updateData.totalAmount !== undefined) {
        dataToUpdate.totalAmount = updateData.totalAmount;
    }

    if (updateData.status !== undefined) {
        dataToUpdate.status = updateData.status as QuotationStatus;
    }

    if (updateData.customerName !== undefined) {
        dataToUpdate.customerName = updateData.customerName;
    }

    if (updateData.lineItems !== undefined) {
        const lineItems = updateData.lineItems || [];
        dataToUpdate.lineItems = JSON.stringify(lineItems);

        // Recalculate totalAmount from lineItems if lineItems are updated
        if (updateData.lineItems && updateData.lineItems.length > 0) {
            const calculatedTotal = updateData.lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
            dataToUpdate.totalAmount = calculatedTotal;
        }
    }

    if (updateData.date !== undefined) {
        let dateString: string | null = null;
        if (updateData.date) {
            dateString = (updateData.date instanceof Date ? updateData.date : new Date(updateData.date)).toISOString().split('T')[0];
        }
        dataToUpdate.date = dateString;
    }

    if (updateData.projectId !== undefined) {
        dataToUpdate.project = { connect: { projectId: updateData.projectId } };
    }

    if (updateData.userId !== undefined) {
        if (updateData.userId) {
            dataToUpdate.user = { connect: { userId: updateData.userId } };
        } else {
            dataToUpdate.user = { disconnect: true };
        }
    }

    // Update file fields only if file is provided
    if (file) {
        try {
            const uploadResult = await fileUploadService.uploadFile({
                file: file as any,
                bucket: 'uploads',
                folder: 'quotations'
            });

            dataToUpdate.fileData = null; // Clear buffer to save space
            dataToUpdate.fileName = file.originalname;
            dataToUpdate.fileType = file.mimetype;
            dataToUpdate.fileUrl = uploadResult.publicUrl;
            dataToUpdate.fileId = uploadResult.id;
        } catch (error) {
            console.error("Error uploading file to Supabase:", error);
            throw new Error("Failed to upload file to storage");
        }
    }

    const updatedQuotation = await prisma.quotation.update({
        where: { quotationId },
        data: dataToUpdate,
        include: { project: { include: { customer: true } }, user: true }
    });

    const targetUserId = updatedQuotation.userId || updatedQuotation.project?.customer?.userId;

    if (targetUserId) {
        const msg = `Quotation updated for project ${updatedQuotation.project?.projectName}`;
        SocketService.getInstance().emitToUser(targetUserId, "notification", {
            type: "QUOTATION_UPDATED",
            message: msg,
            quotationId: updatedQuotation.quotationId
        });
        await notifyUser(targetUserId, msg, "quotation_updated");
    }

    return updatedQuotation;
};

// Delete quotation
export const deleteQuotation = async (quotationId: string) => {
    const quotation = await prisma.quotation.findUnique({ where: { quotationId } });

    if (!quotation) {
        throw new Error("Quotation not found");
    }

    await prisma.quotation.delete({ where: { quotationId } });

    return { success: true, message: "Quotation deleted successfully" };
};

/**
 * Get quotations by User ID
 * @param userId - The user ID to filter by
 */
export const getQuotationsByUserId = async (userId: string) => {
    if (!userId) {
        throw new Error("User ID is required");
    }

    const quotations = await prisma.quotation.findMany({
        where: { userId },
        include: { project: { include: { customer: true } }, user: true },
        orderBy: { createdAt: "desc" }
    });

    return quotations.map((quotation: any, index: number) => formatQuotationResponse(quotation, index));
};

/**
 * Get quotations by status
 * @param status - The status to filter by (pending, approved, rejected, locked)
 */
export const getQuotationsByStatus = async (status: string) => {
    const validStatuses = ['pending', 'approved', 'rejected', 'locked'];

    if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const quotations = await prisma.quotation.findMany({
        where: { status: status as QuotationStatus },
        include: { project: { include: { customer: true } }, user: true },
        orderBy: { createdAt: "desc" }
    });

    return quotations.map((quotation: any, index: number) => formatQuotationResponse(quotation, index));
};

/**
 * Get pending quotations (for users to review)
 */
export const getPendingQuotations = async () => {
    const quotations = await prisma.quotation.findMany({
        where: { status: QuotationStatus.pending },
        include: { project: { include: { customer: true } }, user: true },
        orderBy: { createdAt: "desc" }
    });
    return quotations.map((quotation: any, index: number) => formatQuotationResponse(quotation, index));
};

/**
 * Get quotations by project ID
 * @param projectId - The project ID to filter by
 */
export const getQuotationsByProject = async (projectId: string) => {
    if (!projectId) {
        throw new Error("Project ID is required");
    }

    const quotations = await prisma.quotation.findMany({
        where: { projectId },
        include: { project: { include: { customer: true } }, user: true },
        orderBy: { createdAt: "desc" }
    });

    return quotations.map((quotation: any, index: number) => formatQuotationResponse(quotation, index));
};

/**
 * Approve a quotation (User only)
 * Changes status to "approved"
 * @param quotationId - The quotation ID to approve
 * @param userId - The user ID who is approving
 */
export const approveQuotation = async (quotationId: string, userId: string) => {
    // Find the quotation
    const quotation = await prisma.quotation.findUnique({
        where: { quotationId },
        include: { project: true }
    });

    if (!quotation) {
        throw new Error("Quotation not found");
    }

    // Check if quotation is already approved
    if (quotation.status === QuotationStatus.approved) {
        throw new Error("Quotation is already approved");
    }

    // Check if quotation is already rejected
    if (quotation.status === QuotationStatus.rejected) {
        throw new Error("Cannot approve a rejected quotation");
    }

    // Check if quotation is already locked
    if (quotation.status === QuotationStatus.locked) {
        throw new Error("Quotation is already locked");
    }

    // Only pending quotations can be approved
    if (quotation.status !== QuotationStatus.pending) {
        throw new Error("Only pending quotations can be approved");
    }

    // Approve the quotation
    await prisma.quotation.update({
        where: { quotationId },
        data: {
            status: QuotationStatus.approved,
            updatedAt: new Date(),
        }
    });

    // Return with relations and format response
    const updatedQuotation = await prisma.quotation.findUnique({
        where: { quotationId },
        include: { project: { include: { customer: true } }, user: true }
    });

    if (!updatedQuotation) {
        throw new Error("Quotation not found after update");
    }

    // Notify Admins
    try {
        const projectName = updatedQuotation.project?.projectName || "Unknown Project";
        // Prefer explicit relation if loaded, otherwise try nested project.customer
        const customer = updatedQuotation.user || updatedQuotation.project?.customer;
        const userName = customer?.userName || "Customer";

        SocketService.getInstance().emitToRole("admin", "quotation_status", {
            status: "APPROVED",
            message: `Quotation for ${projectName} has been APPROVED by ${userName}`,
            quotationId: updatedQuotation.quotationId
        });

        await notifyAdmins(`Quotation for ${projectName} has been APPROVED by ${userName}`, "quotation_approval");
    } catch (error) {
        console.error("Failed to send notification:", error);
    }

    return formatQuotationResponse(updatedQuotation);
};

/**
 * Reject a quotation (User only)
 * Changes status to "rejected"
 * Admin can resubmit rejected quotations by changing status back to "pending"
 * @param quotationId - The quotation ID to reject
 * @param userId - The user ID who is rejecting
 */
export const rejectQuotation = async (quotationId: string, userId: string) => {
    const quotation = await prisma.quotation.findUnique({
        where: { quotationId },
        include: { project: true }
    });

    if (!quotation) {
        throw new Error("Quotation not found");
    }

    // Check if quotation is already approved
    if (quotation.status === QuotationStatus.approved) {
        throw new Error("Cannot reject an approved quotation");
    }

    // Check if quotation is already rejected
    if (quotation.status === QuotationStatus.rejected) {
        throw new Error("Quotation is already rejected");
    }

    // Only pending quotations can be rejected
    if (quotation.status !== QuotationStatus.pending) {
        throw new Error("Only pending quotations can be rejected");
    }

    // Reject the quotation
    // This allows admin to resubmit the quotation later
    await prisma.quotation.update({
        where: { quotationId },
        data: {
            status: QuotationStatus.rejected,
            updatedAt: new Date(),
        }
    });

    // Return with relations and format response
    const updatedQuotation = await prisma.quotation.findUnique({
        where: { quotationId },
        include: { project: { include: { customer: true } }, user: true }
    });

    if (!updatedQuotation) {
        throw new Error("Quotation not found after update");
    }

    // Notify Admins
    try {
        const projectName = updatedQuotation.project?.projectName || "Unknown Project";
        const customer = updatedQuotation.user || updatedQuotation.project?.customer;
        const userName = customer?.userName || "Customer";

        SocketService.getInstance().emitToRole("admin", "quotation_status", {
            status: "REJECTED",
            message: `Quotation for ${projectName} has been REJECTED by ${userName}`,
            quotationId: updatedQuotation.quotationId
        });

        await notifyAdmins(`Quotation for ${projectName} has been REJECTED by ${userName}`, "quotation_rejection");
    } catch (error) {
        console.error("Failed to send notification:", error);
    }

    return formatQuotationResponse(updatedQuotation);
};

/**
 * Get quotation file details for download
 * @param quotationId - The quotation ID
 */
export const getQuotationFile = async (quotationId: string) => {
    const quotation = await prisma.quotation.findUnique({
        where: { quotationId },
        select: {
            fileName: true,
            fileType: true,
            fileUrl: true,
            fileData: true
        }
    });

    if (!quotation) {
        throw new Error("Quotation not found");
    }

    if (!quotation.fileUrl && !quotation.fileData) {
        throw new Error("No file associated with this quotation");
    }

    return quotation;
};

/**
 * Resend a quotation to the customer
 * Notifies the user/customer associated with the quotation
 * @param quotationId - The quotation ID to resend
 */
export const resendQuotation = async (quotationId: string) => {
    const quotation = await prisma.quotation.findUnique({
        where: { quotationId },
        include: {
            project: {
                include: {
                    customer: true
                }
            },
            user: true
        }
    });

    if (!quotation) {
        throw new Error("Quotation not found");
    }

    // Determine the customer to notify
    // 1. Check if userId is directly on the quotation
    // 2. Fallback to the project customer
    let customerId = quotation.userId;

    if (!customerId && quotation.project && quotation.project.customer) {
        customerId = quotation.project.customer.userId;
    }

    if (!customerId) {
        throw new Error("No customer associated with this quotation to notify");
    }

    const projectName = quotation.project?.projectName || "your project";
    const message = `Admin has resent the quotation for the project: ${projectName}. Please review it.`;

    // Notify Customer via socket
    SocketService.getInstance().emitToUser(customerId, "notification", {
        type: "QUOTATION_RESENT",
        message: message,
        quotationId: quotation.quotationId
    });

    // Create notification for the customer
    await notifyUser(customerId, message, "quotation_resend");

    return {
        success: true,
        message: "Quotation notification resent to customer successfully",
        quotationId
    };
};

