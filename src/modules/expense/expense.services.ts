import prisma from "../../config/prisma.client";
import { ExpenseCategory, ExpenseStatus, Prisma } from "@prisma/client";


export const createExpense = async (data: {
    projectId: string;
    category: any;
    amount: number;
    date: Date | string;
    description?: string | null;
    status?: string;
}) => {
    // Validate status if provided
    if (data.status !== undefined) {
        const validStatuses = ["pending", "approved", "rejected"];
        if (!validStatuses.includes(data.status)) {
            throw new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
        }
    }

    // Validate required fields
    if (!data.projectId) {
        throw new Error("Project ID is required");
    }

    if (!data.amount || data.amount <= 0) {
        throw new Error("Amount must be greater than 0");
    }

    if (!data.date) {
        throw new Error("Date is required");
    }

    // Format date as YYYY-MM-DD string
    const expenseDate = new Date(data.date);
    if (isNaN(expenseDate.getTime())) {
        throw new Error("Invalid date format. Expected ISO-8601 Date string.");
    }
    const dateString = expenseDate.toISOString().split('T')[0] ?? "";

    const newExpense = await prisma.expense.create({
        data: {
            projectId: data.projectId,
            category: data.category,
            amount: data.amount,
            date: dateString,
            description: data.description || null,
            status: data.status as ExpenseStatus || ExpenseStatus.pending,
            createdAt: new Date(),
            updatedAt: new Date(),
        }
    });

    return newExpense;
};

// Get expense by ID
export const getExpenseById = async (expenseId: string) => {
    const expense = await prisma.expense.findUnique({
        where: { expenseId },
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

    if (!expense) {
        throw new Error("Expense not found");
    }

    let parsedCategory = expense.category;
    if (typeof parsedCategory === 'string') {
        try {
            parsedCategory = JSON.parse(parsedCategory);
        } catch (e) {
            // Ignore parse error, return as is
        }
    }

    // Fetch all expenses for this particular project
    const projectExpensesParams = await prisma.expense.findMany({
        where: { projectId: expense.projectId },
        orderBy: { date: "desc" }
    });

    const projectExpenses = projectExpensesParams.map(pe => {
        let parsedCat = pe.category;
        if (typeof parsedCat === 'string') {
            try { parsedCat = JSON.parse(parsedCat); } catch (e) { }
        }
        return { ...pe, category: parsedCat };
    });

    // Total expenses for that project
    const totalProjectExpenses = projectExpenses.reduce((sum, e) => {
        return sum + parseFloat(e.amount.toString());
    }, 0);

    // Total for this particular expense
    const expenseTotal = parseFloat(expense.amount.toString());

    // Company Details (Dummy data, like in payment)
    const companyDetails = {
        name: "SHR Homes",
        address: "123 Premium Construction Avenue, Hyderabad, Telangana, 500001",
        contact: "+91 9876543210",
        email: "info@shrhomes.com",
        gstin: "22AAAAA0000A1Z5"
    };

    return {
        ...expense,
        category: parsedCategory,
        expenseTotal,
        totalProjectExpenses,
        projectExpenses,
        customerDetails: expense.project?.customer || null,
        companyDetails
    };
};

// Get all expenses with optional search
export const getAllExpenses = async (search?: string) => {
    const whereClause: Prisma.ExpenseWhereInput = {};

    if (search) {
        const orConditions: Prisma.ExpenseWhereInput[] = [
            { description: { contains: search, mode: 'insensitive' } },
            { project: { projectName: { contains: search, mode: 'insensitive' } } }
        ];

        // With array of objects, simple string search on JSON is complex. We'll skip category enum matching.

        whereClause.OR = orConditions;
    }

    const expenses = await prisma.expense.findMany({
        where: whereClause,
        include: {
            project: {
                select: {
                    projectName: true
                }
            }
        },
        orderBy: { date: "desc" }
    });
    const parsedExpenses = expenses.map(expense => {
        let parsedCategory = expense.category;
        if (typeof parsedCategory === 'string') {
            try {
                parsedCategory = JSON.parse(parsedCategory);
            } catch (e) { }
        }
        return { ...expense, category: parsedCategory };
    });

    return parsedExpenses;
};

// Get expenses only when a category is added, flattened
export const getCategoryWiseExpenses = async () => {
    const expenses = await prisma.expense.findMany({
        include: {
            project: { select: { projectName: true } }
        },
        orderBy: { date: "desc" }
    });

    const result: any[] = [];

    expenses.forEach(exp => {
        let parsedCategory = exp.category;
        if (typeof parsedCategory === 'string') {
            try {
                parsedCategory = JSON.parse(parsedCategory);
            } catch (e) {
                parsedCategory = [];
            }
        }

        if (Array.isArray(parsedCategory) && parsedCategory.length > 0) {
            parsedCategory.forEach((cat: any) => {
                if (cat && cat.category) {
                    result.push({
                        expenseId: exp.expenseId,
                        projectId: exp.projectId,
                        projectName: exp.project?.projectName || "",
                        categoryName: cat.category,
                        date: exp.date,
                        amount: cat.amount !== undefined ? parseFloat(cat.amount) : parseFloat(exp.amount.toString()),
                        workerName: cat.workerName || "",
                        paymentMode: cat.paymentMode || ""
                    });
                }
            });
        }
    });

    return result;
};

// Get expenses by project ID
export const getExpensesByProject = async (projectId: string) => {
    const expenses = await prisma.expense.findMany({
        where: { projectId },
        include: {
            project: {
                select: {
                    projectName: true
                }
            }
        },
        orderBy: { date: "desc" }
    });
    const parsedExpenses = expenses.map(expense => {
        let parsedCategory = expense.category;
        if (typeof parsedCategory === 'string') {
            try {
                parsedCategory = JSON.parse(parsedCategory);
            } catch (e) { }
        }
        return { ...expense, category: parsedCategory };
    });

    return parsedExpenses;
};

export const getExpensesByCategory = async (category: string) => {
    // With JSON arrays, direct prisma querying is complex across databases.
    // Fetch and filter in-memory since expenses per project are bounded.
    const expenses = await prisma.expense.findMany({
        include: {
            project: {
                select: {
                    projectName: true
                }
            }
        },
        orderBy: { date: "desc" }
    });

    const filtered = expenses.filter(exp => {
        try {
            const parsed = typeof exp.category === 'string' ? JSON.parse(exp.category) : exp.category;
            if (Array.isArray(parsed)) {
                return parsed.some(c => c.category && String(c.category).toLowerCase().includes(category.toLowerCase()));
            }
            return false;
        } catch (e) {
            return false;
        }
    });

    const parsedExpenses = filtered.map(expense => {
        let parsedCategory = expense.category;
        if (typeof parsedCategory === 'string') {
            try {
                parsedCategory = JSON.parse(parsedCategory);
            } catch (e) { }
        }
        return { ...expense, category: parsedCategory };
    });

    return parsedExpenses;
};

// Get total expense count
export const getTotalExpenseCount = async () => {
    const count = await prisma.expense.count();
    return { totalCount: count };
};

// Get total expense count by project
export const getTotalExpenseCountByProject = async (projectId: string) => {
    const count = await prisma.expense.count({
        where: { projectId }
    });
    return { projectId, totalCount: count };
};

// Get total expense amount by project
export const getTotalExpenseAmountByProject = async (projectId: string) => {
    const result = await prisma.expense.aggregate({
        where: { projectId },
        _sum: { amount: true },
        _count: { amount: true }
    });

    return {
        projectId,
        totalAmount: parseFloat(result._sum.amount?.toString() || "0"),
        count: result._count.amount
    };
};

// Update expense
export const updateExpense = async (expenseId: string, updateData: {
    category?: any;
    amount?: number;
    date?: Date | string;
    description?: string | null;
    projectId?: string;
    status?: string;
}) => {
    const expense = await prisma.expense.findUnique({
        where: { expenseId }
    });

    if (!expense) {
        throw new Error("Expense not found");
    }

    const dataToUpdate: Prisma.ExpenseUpdateInput = {
        updatedAt: new Date(),
    };

    if (updateData.category !== undefined) {
        dataToUpdate.category = updateData.category;
    }

    // Validate status if provided
    if (updateData.status !== undefined) {
        const validStatuses = ["pending", "approved", "rejected"];
        if (!validStatuses.includes(updateData.status)) {
            throw new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
        }
        dataToUpdate.status = updateData.status as ExpenseStatus;
    }

    if (updateData.amount !== undefined) {
        if (updateData.amount <= 0) {
            throw new Error("Amount must be greater than 0");
        }
        dataToUpdate.amount = updateData.amount;
    }

    if (updateData.date !== undefined) {
        const parsedDate = new Date(updateData.date);
        if (isNaN(parsedDate.getTime())) {
            throw new Error("Invalid date format. Expected ISO-8601 Date string.");
        }
        dataToUpdate.date = parsedDate.toISOString().split('T')[0] ?? "";
    }

    if (updateData.description !== undefined) {
        dataToUpdate.description = updateData.description;
    }

    if (updateData.projectId !== undefined) {
        dataToUpdate.project = { connect: { projectId: updateData.projectId } };
    }

    const updatedExpense = await prisma.expense.update({
        where: { expenseId },
        data: dataToUpdate,
    });
    return updatedExpense;
};

// Delete expense
export const deleteExpense = async (expenseId: string) => {
    const expense = await prisma.expense.findUnique({
        where: { expenseId }
    });

    if (!expense) {
        throw new Error("Expense not found");
    }

    await prisma.expense.delete({
        where: { expenseId }
    });
    return { success: true, message: "Expense deleted successfully" };
};

/**
 * Get expense summary for all projects
 * Returns: projectId, projectName, total expense, and expenses per month for each project
 */
export const getExpenseSummaryAllProjects = async () => {
    // Get all projects
    const projects = await prisma.project.findMany();

    if (!projects || projects.length === 0) {
        return [];
    }

    // Get all expenses
    const allExpenses = await prisma.expense.findMany({
        orderBy: { date: "asc" }
    });

    // Create maps to store expenses by project
    const projectExpenseMap = new Map<string, any[]>();

    // Group expenses by project
    allExpenses.forEach((expense: any) => {
        const projectId = expense.projectId;
        if (!projectExpenseMap.has(projectId)) {
            projectExpenseMap.set(projectId, []);
        }
        projectExpenseMap.get(projectId)!.push(expense);
    });

    // Build summary data for each project

    const summaryData = projects.map((project: any) => {
        const projectId = project.projectId;
        const projectExpenses = projectExpenseMap.get(projectId) || [];

        // Calculate total expense
        const totalExpense = projectExpenses.reduce((sum: number, expense: any) => {
            return sum + parseFloat(expense.amount);
        }, 0);

        // Group expenses by month
        const monthlyExpenseMap: { [key: string]: number } = {};
        projectExpenses.forEach((expense: any) => {
            const monthKey = expense.date.substring(0, 7); // Extracts "YYYY-MM" from "YYYY-MM-DD"

            if (!monthlyExpenseMap[monthKey]) {
                monthlyExpenseMap[monthKey] = 0;
            }
            monthlyExpenseMap[monthKey] += parseFloat(expense.amount);
        });

        // Convert monthly expenses to array format
        const expensesPerMonth = Object.keys(monthlyExpenseMap)
            .sort()
            .map(month => ({
                month: month,
                totalExpense: Math.round((monthlyExpenseMap[month] || 0) * 100) / 100
            }));

        return {
            projectId: projectId,
            projectName: project.projectName || "",
            totalExpense: Math.round(totalExpense * 100) / 100,
            expensesPerMonth: expensesPerMonth
        };
    });

    return summaryData;
};

/**
 * Get expense summary for a specific project
 * Returns: project details, total expenses, and expenses per month
 * @param projectId - Project ID to get expense summary for
 */
export const getExpenseSummaryByProject = async (projectId: string) => {
    if (!projectId) {
        throw new Error("Project ID is required");
    }

    // Get the project
    const project = await prisma.project.findUnique({ where: { projectId } });

    if (!project) {
        throw new Error("Project not found");
    }

    // Get all expenses for this project
    const expenses = await prisma.expense.findMany({
        where: { projectId },
        orderBy: { date: "asc" }
    });

    // Calculate total expense
    const totalExpense = expenses.reduce((sum: number, expense: any) => {
        return sum + parseFloat(expense.amount.toString());
    }, 0);

    // Group expenses by month
    const expensesPerMonth: { [key: string]: number } = {};

    expenses.forEach((expense: any) => {
        const monthKey = expense.date.substring(0, 7); // Extracts "YYYY-MM" from "YYYY-MM-DD"

        if (!expensesPerMonth[monthKey]) {
            expensesPerMonth[monthKey] = 0;
        }
        expensesPerMonth[monthKey] += parseFloat(expense.amount.toString());
    });

    // Convert to array format
    const monthlyExpenses = Object.keys(expensesPerMonth)
        .sort()
        .map(month => ({
            month: month,
            totalExpense: Math.round((expensesPerMonth[month] || 0) * 100) / 100
        }));

    return {
        projectId: project.projectId,
        projectName: project.projectName || "",
        projectType: project.projectType || "",
        location: project.location || "",
        totalBudget: parseFloat(project.totalBudget.toString()) || 0,
        startDate: project.startDate,
        expectedCompletion: project.expectedCompletion,
        totalExpense: Math.round(totalExpense * 100) / 100,
        expensesPerMonth: monthlyExpenses
    };
};
