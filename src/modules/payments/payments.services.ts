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
    const lower = method.toLowerCase().replace(/\s+/g, '_');

    // Handle specific mappings from frontend display strings
    if (lower === 'bank_transfer' || lower === 'bank') return PaymentMethod.bank_transfer;
    if (lower === 'check' || lower === 'cheque') return PaymentMethod.cheque;
    if (lower === 'upi') return PaymentMethod.UPI;
    if (lower === 'cash') return PaymentMethod.cash;
    if (lower === 'card') return PaymentMethod.card;
    if (lower === 'online') return PaymentMethod.online;

    return PaymentMethod.cash;
};

// Helper to validate referenceNumber based on paymentMethod
const validateReferenceNumber = (method: PaymentMethod, referenceNumber?: string | null, context = ""): void => {
    const prefix = context ? `${context}: ` : "";
    if (method === PaymentMethod.UPI || method === PaymentMethod.bank_transfer) {
        if (!referenceNumber || !/^\d{12}$/.test(referenceNumber)) {
            throw new Error(`${prefix}'${method}' requires an exactly 12-digit referenceNumber.`);
        }
    } else if (method === PaymentMethod.cheque) {
        if (!referenceNumber || !/^\d{6}$/.test(referenceNumber)) {
            throw new Error(`${prefix}'cheque' requires an exactly 6-digit referenceNumber.`);
        }
    }
    // cash and others: no validation required
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
    referenceNumber?: string | null,
    receivedBy?: string | null,
    recievedBy?: string | null,
    receivedby?: string | null,
    recievedby?: string | null,
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

        // Validate referenceNumber inside each breakup entry
        parsedBreakup.forEach((item: any, index: number) => {
            const itemMethod = normalizePaymentMethod(item.method || "");
            validateReferenceNumber(itemMethod, item.referenceNumber, `Breakup entry #${index + 1}`);
        });
    } else {
        // Standard mode - validate top-level referenceNumber
        validateReferenceNumber(pMethod, data.referenceNumber);
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
    const project = await projectService.getProjectById(data.projectId);

    // Generate Receipt Number
    const receiptNumber = await generateReceiptNumber(project);

    const newPayment = await prisma.payment.create({
        data: {
            amount: data.amount,
            project: { connect: { projectId: data.projectId } },
            paymentStatus: data.paymentStatus as PaymentStatus,
            paymentType: pType,
            paymentMethod: pMethod,
            paymentBreakup: parsedBreakup ? JSON.stringify(parsedBreakup) : Prisma.JsonNull,
            paymentDate: `${String(new Date(data.paymentDate).getDate()).padStart(2, '0')}-${String(new Date(data.paymentDate).getMonth() + 1).padStart(2, '0')}-${new Date(data.paymentDate).getFullYear()}`,
            receiptNumber: receiptNumber,
            referenceNumber: data.referenceNumber || null,
            receivedBy: data.receivedBy || data.recievedBy || data.receivedby || data.recievedby || null,
            remarks: data.remarks || null,
            fileUrl: fileUrl,
            fileId: fileId,
            fileName: file ? file.originalname : null,
            fileType: file ? file.mimetype : null,
            createdAt: new Date(),
            updatedAt: new Date(),
        }
    });

    // Notify Admins and Accountants
    try {
        const notifMessage = `New payment of ${data.amount} received for project ${project.projectName}`;
        SocketService.getInstance().emitToRole("admin", "payment_created", {
            message: notifMessage,
            paymentId: newPayment.paymentId
        });
        // Also emit to accountant role specifically for socket
        SocketService.getInstance().emitToRole("accountant", "payment_created", {
            message: notifMessage,
            paymentId: newPayment.paymentId
        });
        await notifyAdmins(notifMessage, "payment_received");
    } catch (e) {
        console.error("Failed to notify admins of new payment", e);
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
    referenceNumber?: string | null,
    receivedBy?: string | null,
    recievedBy?: string | null,
    receivedby?: string | null,
    recievedby?: string | null,
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

    // Validate referenceNumber if method is being updated
    if (updateData.paymentMethod !== undefined || updateData.referenceNumber !== undefined) {
        const methodToCheck = updateData.paymentMethod !== undefined ? normalizePaymentMethod(updateData.paymentMethod) : payment.paymentMethod;
        const refToCheck = updateData.referenceNumber !== undefined ? updateData.referenceNumber : payment.referenceNumber;
        if (pType !== PaymentType.MultiMode) {
            validateReferenceNumber(methodToCheck, refToCheck);
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
    if (updateData.paymentDate !== undefined) dataToUpdate.paymentDate = `${String(new Date(updateData.paymentDate).getDate()).padStart(2, '0')}-${String(new Date(updateData.paymentDate).getMonth() + 1).padStart(2, '0')}-${new Date(updateData.paymentDate).getFullYear()}`;
    if (updateData.remarks !== undefined) dataToUpdate.remarks = updateData.remarks;
    if (updateData.referenceNumber !== undefined) dataToUpdate.referenceNumber = updateData.referenceNumber;

    // Capture any spelling of receivedBy
    const anyReceivedByValue = updateData.receivedBy !== undefined ? updateData.receivedBy
        : updateData.recievedBy !== undefined ? updateData.recievedBy
            : updateData.receivedby !== undefined ? updateData.receivedby
                : updateData.recievedby !== undefined ? updateData.recievedby
                    : undefined;

    if (anyReceivedByValue !== undefined) dataToUpdate.receivedBy = anyReceivedByValue;

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

    // Notify Admins and Accountants
    try {
        const notifMessage = `Payment for project ${project?.projectName || 'Project'} has been updated`;
        SocketService.getInstance().emitToRole("admin", "payment_updated", {
            message: notifMessage,
            paymentId: updatedPayment.paymentId
        });
        SocketService.getInstance().emitToRole("accountant", "payment_updated", {
            message: notifMessage,
            paymentId: updatedPayment.paymentId
        });
        await notifyAdmins(notifMessage, "payment_updated");
    } catch (e) {
        console.error("Failed to notify admins of payment update", e);
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

    const parsedPayments = payments.map(payment => {
        let parsedBreakup = payment.paymentBreakup;
        let methodDisplay = payment.paymentMethod as string;

        if (payment.paymentType === 'MultiMode' && parsedBreakup) {
            try {
                const breakupArr = typeof parsedBreakup === 'string'
                    ? JSON.parse(parsedBreakup as string)
                    : parsedBreakup;

                parsedBreakup = breakupArr;

                if (Array.isArray(breakupArr) && breakupArr.length > 0) {
                    // Extract methods and join them (e.g. "Bank Transfer, UPI")
                    methodDisplay = breakupArr.map((b: any) => b.method).filter(Boolean).join(', ');
                }
            } catch (e) {
                // Ignore parsing errors
            }
        }

        // Attempt to convert DB format to DD-MM-YYYY if it's not already
        let displayDate = payment.paymentDate;
        if (displayDate && displayDate.includes('-')) {
            const parts = displayDate.split('-');
            const year = parts[0];
            const month = parts[1];
            const day = parts[2];
            if (year && month && day && year.length === 4) { // It's YYYY-MM-DD
                displayDate = `${day}-${month}-${year}`;
            }
        }

        return {
            ...payment,
            paymentBreakup: parsedBreakup,
            paymentMethod: methodDisplay,
            paymentDate: displayDate,
            recievedBy: payment.receivedBy, // Support frontend typo
            receivedby: payment.receivedBy,
            recievedby: payment.receivedBy
        };
    });

    return parsedPayments;
};

function amountToWords(amount: number): string {
    if (amount === 0) return "Zero Rupees Only";
    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const numToWords = (num: number, suffix: string): string => {
        if (num === 0) return '';
        if (num < 20) return a[num] + ' ' + suffix;
        return b[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + a[num % 10] : '') + ' ' + suffix;
    };

    let words = "";
    let val = Math.floor(Math.abs(amount));

    words += numToWords(Math.floor(val / 10000000), "Crore ");
    val %= 10000000;

    words += numToWords(Math.floor(val / 100000), "Lakh ");
    val %= 100000;

    words += numToWords(Math.floor(val / 1000), "Thousand ");
    val %= 1000;

    words += numToWords(Math.floor(val / 100), "Hundred ");
    val %= 100;

    if (val > 0) {
        if (words !== "") words += "and ";
        if (val < 20) words += a[val];
        else {
            words += b[Math.floor(val / 10)] + (val % 10 !== 0 ? ' ' + a[val % 10] : '');
        }
    }

    return words.trim() + " Rupees Only";
}

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
                    projectId: true,
                    customer: {
                        select: {
                            userName: true,
                            email: true,
                            contact: true,
                            address: true
                        }
                    }
                }
            }
        }
    });

    if (!payment) {
        throw new Error("Payment not found");
    }

    const companyDetails = {
        name: "SHR Homes",
        address: "123 Premium Construction Avenue, Hyderabad, Telangana, 500001",
        contact: "+91 9876543210",
        email: "info@shrhomes.com",
        gstin: "22AAAAA0000A1Z5" // Dummy GSTIN
    };

    const amountInWords = amountToWords(parseFloat(payment.amount.toString()));

    let parsedBreakup = payment.paymentBreakup;
    let methodDisplay = payment.paymentMethod as string;

    if (payment.paymentType === 'MultiMode' && parsedBreakup) {
        try {
            const breakupArr = typeof parsedBreakup === 'string'
                ? JSON.parse(parsedBreakup as string)
                : parsedBreakup;

            parsedBreakup = breakupArr;

            if (Array.isArray(breakupArr) && breakupArr.length > 0) {
                // Extract methods and join them (e.g. "Bank Transfer, UPI")
                methodDisplay = breakupArr.map((b: any) => b.method).filter(Boolean).join(', ');
            }
        } catch (e) {
            // Ignore parsing errors
        }
    }

    // Attempt to convert DB format to DD-MM-YYYY if it's not already
    let displayDate = payment.paymentDate;
    if (displayDate && displayDate.includes('-')) {
        const parts = displayDate.split('-');
        const year = parts[0];
        const month = parts[1];
        const day = parts[2];
        if (year && month && day && year.length === 4) { // It's YYYY-MM-DD
            displayDate = `${day}-${month}-${year}`;
        }
    }

    return {
        ...payment,
        paymentBreakup: parsedBreakup,
        paymentMethod: methodDisplay,
        paymentDate: displayDate,
        companyDetails,
        customerDetails: payment.project?.customer || null,
        amountInWords
    };
};


/**
 * Get budget summary, supports filtering by role
 * Calculates: Total Budget, Payment Received, Payment Pending
 */
export const getBudgetSummary = async (supervisorId?: string, customerId?: string) => {
    // If user is a customer, we prioritize their estimated investment from their profile
    // But the requirement says "the totalbuget has to be the investment that initially the customer provided OR it can be taken from the project"
    // Let's first try to get the customer's estimated investment if customerId is provided.

    let totalBudget = 0;

    if (customerId) {
        // Fetch customer details directly here or via a user service if strict decoupling is needed.
        // Importing prisma here is already done.
        const customer = await prisma.user.findUnique({
            where: { userId: customerId },
            select: { estimatedInvestment: true }
        });

        if (customer && customer.estimatedInvestment) {
            totalBudget = parseFloat(customer.estimatedInvestment.toString());
        }
    }

    // Get all relevant projects with their budgets (Decoupled)
    const projects = await projectService.getAllProjectsBudgets(supervisorId, customerId);

    // If totalBudget is still 0 (not a customer or customer has no investment set), sum up project budgets
    if (totalBudget === 0) {
        projects.forEach((project: any) => {
            totalBudget += parseFloat(project.totalBudget.toString()) || 0;
        });
    }

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

    // Calculate total payments received
    let totalPaymentReceived = 0;
    paymentsByProject.forEach((item: any) => {
        totalPaymentReceived += parseFloat(item._sum.amount?.toString() || "0");
    });

    const totalPaymentPending = totalBudget - totalPaymentReceived;

    // Calculate payment progress percentage
    // Use toFixed(2) for decimal precision then convert back to number
    const progressPercentage = totalBudget > 0
        ? Number(((totalPaymentReceived / totalBudget) * 100).toFixed(2))
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

    // Get total expenses for this project
    const expenses = await prisma.expense.aggregate({
        _sum: {
            amount: true
        },
        where: {
            projectId: projectId
        }
    });

    const totalExpense = parseFloat(expenses._sum.amount?.toString() || "0");
    const budgetConsumed = totalBudget > 0
        ? Math.round((totalExpense / totalBudget) * 100)
        : 0;

    // Calculate payment progress percentage
    const progressPercentage = totalBudget > 0
        ? Math.round((paidAmount / totalBudget) * 100)
        : 0;

    return {
        projectId: project.projectId,
        projectName: project.projectName,
        totalBudget: totalBudget,
        paidAmount: Math.round(paidAmount * 100) / 100,
        pendingAmount: Math.round((totalBudget - paidAmount) * 100) / 100,
        progressPercentage: progressPercentage,
        totalExpense: Math.round(totalExpense * 100) / 100,
        budgetConsumed: budgetConsumed
    };
};

/**
 * Generate the next receipt number for a project/customer
 * Format: SHR + [First 2 letters of Customer Name] + [Sequence Number]
 */
export const generateReceiptNumber = async (project: any) => {
    const customerName = project?.customer?.userName || "Customer";
    const namePrefix = customerName.substring(0, 2).toUpperCase();
    const receiptPrefix = `SHR${namePrefix}`;

    // Find the last payment with this prefix
    const lastPayment = await prisma.payment.findFirst({
        where: {
            receiptNumber: {
                startsWith: receiptPrefix
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    let nextSequence = 1;
    if (lastPayment && lastPayment.receiptNumber) {
        // Extract sequence number from the end
        const sequencePart = lastPayment.receiptNumber.substring(receiptPrefix.length);
        const lastSeq = parseInt(sequencePart);
        if (!isNaN(lastSeq)) {
            nextSequence = lastSeq + 1;
        }
    }

    return `${receiptPrefix}${String(nextSequence).padStart(3, '0')}`;
};

/**
 * Public service to get the next receipt number for a specific project
 */
export const getNextReceiptNumber = async (projectId: string) => {
    const project = await projectService.getProjectById(projectId);
    const receiptNumber = await generateReceiptNumber(project);
    return { receiptNumber };
};
