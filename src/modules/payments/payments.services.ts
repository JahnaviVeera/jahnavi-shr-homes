import prisma from "../../config/prisma.client";
import { PaymentMethod, PaymentStatus, PaymentType, Prisma } from "@prisma/client";
import { notifyAdmins, notifyUser } from "../notifications/notifications.services";
import { fileUploadService } from "../../services/fileUpload.service";
import SocketService from "../../services/socket.service";
import * as projectService from "../project/project.services";

// Helper to normalize PaymentType
const normalizePaymentType = (type?: string): PaymentType => {
    if (!type) return PaymentType.Standard;
    const lower = type.toLowerCase();
    if (lower === 'multimode') return PaymentType.MultiMode;
    return PaymentType.Standard;
};

// Helper to normalize PaymentMethod
const normalizePaymentMethod = (method?: string): PaymentMethod => {
    if (!method) return PaymentMethod.cash;
    const lower = method.toLowerCase();
    switch (lower) {
        case 'cash': return PaymentMethod.cash;
        case 'card': return PaymentMethod.card;
        case 'bank_transfer': return PaymentMethod.bank_transfer;
        case 'cheque': return PaymentMethod.cheque;
        case 'online': return PaymentMethod.online;
        case 'upi': return PaymentMethod.UPI;
        default: return PaymentMethod.cash;
    }
};

export const createPayment = async (data: {
    amount: number,
    projectId: string,
    paymentStatus: string,
    paymentType?: string,
    paymentMethod: string,
    paymentBreakup?: any[],
    paymentDate: Date | string,
    remarks?: string | null,
}, file?: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
}) => {
    // Parse paymentBreakup if it's a string
    let parsedBreakup = data.paymentBreakup;
    if (typeof data.paymentBreakup === 'string') {
        try {
            parsedBreakup = JSON.parse(data.paymentBreakup);
        } catch (e) {
            // If failed to parse, leave it as is or handle error
        }
    }

    // Normalize Inputs
    const pType = normalizePaymentType(data.paymentType);
    const pMethod = normalizePaymentMethod(data.paymentMethod);

    // Validate MultiMode payment
    if (pType === PaymentType.MultiMode) {
        if (!parsedBreakup || !Array.isArray(parsedBreakup) || parsedBreakup.length === 0) {
            throw new Error("Payment breakup is required for MultiMode payments");
        }

        const totalBreakup = parsedBreakup.reduce((sum: number, item: any) => sum + (parseFloat(item.amount) || 0), 0);

        if (Math.abs(totalBreakup - data.amount) > 0.01) {
            throw new Error(`Total breakup amount (${totalBreakup}) must match the payment amount (${data.amount})`);
        }
    }

    // Upload file if provided
    let fileUrl: string | null = null;
    let fileId: string | null = null;
    if (file) {
        try {
            const uploadResult = await fileUploadService.uploadFile({
                file: file as any,
                bucket: 'payments',
                folder: 'receipts'
            });
            fileUrl = uploadResult.publicUrl;
            fileId = uploadResult.id;
        } catch (error) {
            console.error("Error uploading payment file to Supabase:", error);
            throw new Error("Failed to upload payment receipt to storage");
        }
    }

    // Validate Project via Service (Decoupled)
    // data.projectId is required (string)
    const project = await projectService.getProjectById(data.projectId);

    // Check if customer exists for the project
    // project.customer is included in getProjectById

    const newPayment = await prisma.payment.create({
        data: {
            amount: data.amount,
            projectId: data.projectId,
            paymentStatus: data.paymentStatus as PaymentStatus,
            paymentType: pType,
            paymentMethod: pMethod,
            paymentBreakup: parsedBreakup ? JSON.stringify(parsedBreakup) : Prisma.JsonNull,
            paymentDate: new Date(data.paymentDate).toISOString().split('T')[0] ?? "",
            remarks: data.remarks || null,
            fileUrl: fileUrl,
            fileId: fileId,
            fileName: file ? file.originalname : null,
            fileType: file ? file.mimetype : null,
            createdAt: new Date(),
            updatedAt: new Date(),
        }
    });

    // Notify Admins
    try {
        const projectName = project?.projectName || "Unknown Project";

        SocketService.getInstance().emitToRole("admin", "payment_created", {
            message: `Payment of ${data.amount} received for ${projectName}`,
            paymentId: newPayment.paymentId
        });

        await notifyAdmins(`Payment of ${data.amount} received for ${projectName}`, "payment_received");
    } catch (error) {
        console.error("Failed to send notification:", error);
    }

    // Notify Customer
    if (project && project.customer && project.customer.userId) {
        SocketService.getInstance().emitToUser(project.customer.userId, "notification", {
            type: "PAYMENT_RECEIVED",
            message: `Payment of ${data.amount} received for your project ${project.projectName}`,
            paymentId: newPayment.paymentId
        });
        await notifyUser(project.customer.userId, `Payment of ${data.amount} received for your project ${project.projectName}`, "payment_received");
    }

    return newPayment;
}

export const updatePayment = async (paymentId: string, updateData: {
    amount?: number,
    projectId?: string,
    paymentStatus?: string,
    paymentType?: string,
    paymentMethod?: string,
    paymentBreakup?: any[],
    paymentDate?: Date | string,
    remarks?: string | null,
    updatedAt?: Date
}, file?: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
}) => {
    // 1. Fetch Payment without relations first (owned entity)
    const payment = await prisma.payment.findUnique({
        where: { paymentId },
    });

    if (!payment) {
        throw new Error("Payment not found");
    }

    // 2. Fetch Project Relation via Service (Handle nullable projectId)
    let project = null;
    if (payment.projectId) {
        project = await projectService.getProjectById(payment.projectId);
    }

    // Normalize update inputs if provided
    const pType = updateData.paymentType !== undefined ? normalizePaymentType(updateData.paymentType) : payment.paymentType;

    // Validate logic using `payment`
    const isMultiMode = pType === PaymentType.MultiMode;

    // Parse breakup if provided as string
    let parsedBreakup = updateData.paymentBreakup;
    if (typeof updateData.paymentBreakup === 'string') {
        try {
            parsedBreakup = JSON.parse(updateData.paymentBreakup);
        } catch (e) {
            // ignore
        }
    }

    if (isMultiMode && (updateData.amount !== undefined || parsedBreakup !== undefined)) {
        const amount = updateData.amount !== undefined ? updateData.amount : parseFloat(payment.amount.toString());
        // Use new breakup if provided, otherwise parse existing breakup from DB
        let breakup: any[] = [];

        if (parsedBreakup !== undefined) {
            breakup = parsedBreakup;
        } else if (payment.paymentBreakup) {
            // Handle existing DB value which might be JSON object or string
            const dbBreakup = payment.paymentBreakup;
            if (typeof dbBreakup === 'string') {
                try {
                    breakup = JSON.parse(dbBreakup);
                } catch (e) { breakup = [] }
            } else if (Array.isArray(dbBreakup)) {
                breakup = dbBreakup;
            }
        }

        if (!breakup || !Array.isArray(breakup) || breakup.length === 0) {
            // Only throw if switching to MultiMode without providing breakup, or if existing breakup is empty
            if (pType === PaymentType.MultiMode) {
                throw new Error("Payment breakup is required for MultiMode payments");
            }
        } else {
            const totalBreakup = breakup.reduce((sum: number, item: any) => sum + (parseFloat(item.amount) || 0), 0);
            if (Math.abs(totalBreakup - amount) > 0.01) {
                throw new Error(`Total breakup amount (${totalBreakup}) must match the payment amount (${amount})`);
            }
        }
    }


    const dataToUpdate: Prisma.PaymentUpdateInput = {
        updatedAt: new Date(),
    };

    if (updateData.amount !== undefined) dataToUpdate.amount = updateData.amount;
    if (updateData.projectId !== undefined) {
        // If updating project, validate new project
        await projectService.getProjectById(updateData.projectId);
        dataToUpdate.project = { connect: { projectId: updateData.projectId } };
    }
    if (updateData.paymentStatus !== undefined) dataToUpdate.paymentStatus = updateData.paymentStatus as PaymentStatus;
    if (updateData.paymentType !== undefined) dataToUpdate.paymentType = pType;
    if (updateData.paymentMethod !== undefined) dataToUpdate.paymentMethod = normalizePaymentMethod(updateData.paymentMethod);
    if (parsedBreakup !== undefined) dataToUpdate.paymentBreakup = JSON.stringify(parsedBreakup);
    if (updateData.paymentDate !== undefined) dataToUpdate.paymentDate = new Date(updateData.paymentDate).toISOString().split('T')[0] ?? "";
    if (updateData.remarks !== undefined) dataToUpdate.remarks = updateData.remarks;

    // Handle file update if provided
    if (file) {
        try {
            const uploadResult = await fileUploadService.uploadFile({
                file: file as any,
                bucket: 'payments',
                folder: 'receipts'
            });
            dataToUpdate.fileUrl = uploadResult.publicUrl;
            dataToUpdate.fileId = uploadResult.id;
            dataToUpdate.fileName = file.originalname;
            dataToUpdate.fileType = file.mimetype;
        } catch (error) {
            console.error("Error uploading payment file to Supabase:", error);
            throw new Error("Failed to upload payment receipt to storage");
        }
    }

    const updatedPayment = await prisma.payment.update({
        where: { paymentId },
        data: dataToUpdate,
        // Removed include
    });

    // Notify (using fetched project from start, or fetching new one if updated?)
    // If projectId changed, we should probably fetch new project.
    let notifyProject = project;
    if (updateData.projectId && updateData.projectId !== payment.projectId) {
        notifyProject = await projectService.getProjectById(updateData.projectId);
    }

    if (notifyProject && notifyProject.customer && notifyProject.customer.userId) {
        SocketService.getInstance().emitToUser(notifyProject.customer.userId, "notification", {
            type: "PAYMENT_UPDATED",
            message: `Payment updated for project ${notifyProject.projectName}`,
            paymentId: updatedPayment.paymentId
        });
        await notifyUser(notifyProject.customer.userId, `Payment updated for project ${notifyProject.projectName}`, "payment_updated");
    }

    return updatedPayment;
};

// Delete payment
export const deletePayment = async (paymentId: string) => {
    const payment = await prisma.payment.findUnique({ where: { paymentId } });

    if (!payment) {
        throw new Error("Payment not found");
    }

    await prisma.payment.delete({ where: { paymentId } });

    return { success: true, message: "Payment deleted successfully" };
};

export const getAllThePayments = async (search?: string, supervisorId?: string, customerId?: string) => {
    const where: Prisma.PaymentWhereInput = {};

    // 1. Search condition
    if (search) {
        where.OR = [
            { remarks: { contains: search, mode: Prisma.QueryMode.insensitive } },
            { project: { projectName: { contains: search, mode: Prisma.QueryMode.insensitive } } }
        ];
    }

    // 2. Role-based isolation
    if (supervisorId) {
        where.project = {
            ...(where.project as any || {}),
            supervisorId: supervisorId
        };
    } else if (customerId) {
        where.project = {
            ...(where.project as any || {}),
            customerId: customerId
        };
    }

    const payments = await prisma.payment.findMany({
        where: where,
        orderBy: { createdAt: "desc" },
        include: {
            project: {
                select: {
                    projectName: true,
                    projectId: true
                }
            }
        }
    });

    return payments;
};

export const getPaymentByPaymentId = async (paymentId: string) => {
    if (!paymentId) {
        throw new Error("Payment ID is required");
    }

    const payment = await prisma.payment.findUnique({
        where: { paymentId },
        include: {
            project: {
                select: {
                    projectName: true,
                    projectId: true
                }
            }
        }
    });

    if (!payment) {
        throw new Error("Payment not found");
    }

    return payment;
};


/**
 * Get budget summary, supports filtering by role
 * Calculates: Total Budget, Payment Received, Payment Pending
 */
export const getBudgetSummary = async (supervisorId?: string, customerId?: string) => {
    // Get all relevant projects with their budgets (Decoupled)
    const projects = await projectService.getAllProjectsBudgets(supervisorId, customerId);

    // Get project IDs for filtering payments
    const projectIds = projects.map(p => p.projectId);

    // Get all completed payments grouped by project
    const paymentsByProject = await prisma.payment.groupBy({
        by: ['projectId'],
        _sum: {
            amount: true
        },
        where: {
            paymentStatus: PaymentStatus.completed,
            projectId: {
                in: projectIds, // Filter payments by the projects the user has access to
                not: null
            }
        }
    });

    // Create a map for quick lookup
    const paymentMap = new Map();
    paymentsByProject.forEach((item: any) => {
        if (item.projectId) {
            paymentMap.set(item.projectId, parseFloat(item._sum.amount?.toString() || "0"));
        }
    });

    // Calculate totals
    let totalBudget = 0;
    let totalPaymentReceived = 0;

    projects.forEach((project: any) => {
        const budget = parseFloat(project.totalBudget.toString()) || 0;
        const received = paymentMap.get(project.projectId) || 0;
        totalBudget += budget;
        totalPaymentReceived += received;
    });

    const totalPaymentPending = totalBudget - totalPaymentReceived;

    // Calculate payment progress percentage
    const progressPercentage = totalBudget > 0
        ? Math.round((totalPaymentReceived / totalBudget) * 100)
        : 0;

    return {
        totalBudget: Math.round(totalBudget * 100) / 100,
        paymentReceived: Math.round(totalPaymentReceived * 100) / 100,
        paymentPending: Math.round(totalPaymentPending * 100) / 100,
        progressPercentage: progressPercentage
    };
};

/**
 * Get budget summary for a specific project
 * Calculates: Total Budget, Paid Amount, Pending Amount, Progress Percentage
 * @param projectId - Project ID to get budget summary for
 */
export const getBudgetSummaryByProject = async (projectId: string) => {
    if (!projectId) {
        throw new Error("Project ID is required");
    }

    // Get the project (Decoupled)
    const project = await projectService.getProjectById(projectId);

    const totalBudget = parseFloat(project.totalBudget.toString()) || 0;

    // Get completed payments for this project
    const completedPayments = await prisma.payment.aggregate({
        _sum: {
            amount: true
        },
        where: {
            projectId: projectId,
            paymentStatus: PaymentStatus.completed
        }
    });

    // Get pending payments for this project
    const pendingPayments = await prisma.payment.aggregate({
        _sum: {
            amount: true
        },
        where: {
            projectId: projectId,
            paymentStatus: PaymentStatus.pending
        }
    });

    const paidAmount = parseFloat(completedPayments._sum.amount?.toString() || "0");
    const pendingAmount = parseFloat(pendingPayments._sum.amount?.toString() || "0");

    // Calculate payment progress percentage
    const progressPercentage = totalBudget > 0
        ? Math.round((paidAmount / totalBudget) * 100)
        : 0;

    return {
        projectId: project.projectId,
        projectName: project.projectName || "",
        totalBudget: Math.round(totalBudget * 100) / 100,
        paidAmount: Math.round(paidAmount * 100) / 100,
        pendingAmount: Math.round(pendingAmount * 100) / 100,
        progressPercentage: progressPercentage
    };
};
