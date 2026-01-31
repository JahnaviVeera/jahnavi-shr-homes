import prisma from "../../config/prisma.client";
import { PaymentMethod, PaymentStatus, PaymentType, Prisma } from "@prisma/client";
import { notifyAdmins } from "../notifications/notifications.services";
import { fileUploadService } from "../../services/fileUpload.service";
import SocketService from "../../services/socket.service";

export const createPayment = async (data: {
    // ... args
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
    // ... (existing logic for parsing and validation)

    // Parse paymentBreakup if it's a string
    let parsedBreakup = data.paymentBreakup;
    if (typeof data.paymentBreakup === 'string') {
        try {
            parsedBreakup = JSON.parse(data.paymentBreakup);
        } catch (e) {
            // If failed to parse, leave it as is or handle error
        }
    }

    // Validate MultiMode payment
    if (data.paymentType === PaymentType.MultiMode) {
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

    const newPayment = await prisma.payment.create({
        data: {
            amount: data.amount,
            projectId: data.projectId,
            paymentStatus: data.paymentStatus as PaymentStatus,
            paymentType: (data.paymentType as PaymentType) || PaymentType.Standard,
            paymentMethod: data.paymentMethod as PaymentMethod,
            paymentBreakup: parsedBreakup ? JSON.stringify(parsedBreakup) : Prisma.JsonNull,
            paymentDate: new Date(data.paymentDate),
            remarks: data.remarks || null,
            fileUrl: fileUrl,
            fileId: fileId,
            fileName: file ? file.originalname : null,
            fileType: file ? file.mimetype : null,
            createdAt: new Date(),
            updatedAt: new Date(),
        }
    });

    // Get Project details for notification
    const project = await prisma.project.findUnique({
        where: { projectId: data.projectId },
        select: { projectName: true, customerId: true }
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
    if (project && project.customerId) {
        SocketService.getInstance().emitToUser(project.customerId, "notification", {
            type: "PAYMENT_RECEIVED",
            message: `Payment of ${data.amount} received for your project ${project.projectName}`,
            paymentId: newPayment.paymentId
        });
    }

    return newPayment;
}

// ... (get functions)

// Update payment
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
    const payment = await prisma.payment.findUnique({
        where: { paymentId },
        include: { project: { select: { customerId: true, projectName: true } } }
    });

    if (!payment) {
        throw new Error("Payment not found");
    }

    // ... (rest of validation logic)
    // Validate MultiMode if being updated
    const isMultiMode = updateData.paymentType === PaymentType.MultiMode || (updateData.paymentType === undefined && payment.paymentType === PaymentType.MultiMode);

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
            if (updateData.paymentType === PaymentType.MultiMode) {
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
    if (updateData.projectId !== undefined) dataToUpdate.project = { connect: { projectId: updateData.projectId } };
    if (updateData.paymentStatus !== undefined) dataToUpdate.paymentStatus = updateData.paymentStatus as PaymentStatus;
    if (updateData.paymentType !== undefined) dataToUpdate.paymentType = updateData.paymentType as PaymentType;
    if (updateData.paymentMethod !== undefined) dataToUpdate.paymentMethod = updateData.paymentMethod as PaymentMethod;
    if (parsedBreakup !== undefined) dataToUpdate.paymentBreakup = JSON.stringify(parsedBreakup);
    if (updateData.paymentDate !== undefined) dataToUpdate.paymentDate = new Date(updateData.paymentDate);
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
        include: { project: { select: { customerId: true, projectName: true } } }
    });

    if (updatedPayment.project && updatedPayment.project.customerId) {
        SocketService.getInstance().emitToUser(updatedPayment.project.customerId, "notification", {
            type: "PAYMENT_UPDATED",
            message: `Payment updated for project ${updatedPayment.project.projectName}`,
            paymentId: updatedPayment.paymentId
        });
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



/**
 * Get budget summary across all projects
 * Calculates: Total Budget, Payment Received, Payment Pending
 */
export const getBudgetSummary = async () => {
    // Get all projects with their budgets
    const projects = await prisma.project.findMany();

    // Get all completed payments grouped by project
    const paymentsByProject = await prisma.payment.groupBy({
        by: ['projectId'],
        _sum: {
            amount: true
        },
        where: {
            paymentStatus: PaymentStatus.completed,
            projectId: { not: null } // Ensure projectId is not null
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

    // Get the project
    const project = await prisma.project.findUnique({ where: { projectId } });

    if (!project) {
        throw new Error("Project not found");
    }

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
