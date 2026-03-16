import prisma from "../../config/prisma.client";

/**
 * Get unified consolidated expense report
 * @param projectId - Filter by project ID
 * @param startDate - Filter by start date (YYYY-MM-DD)
 * @param endDate - Filter by end date (YYYY-MM-DD)
 */
export const getConsolidatedExpenseReport = async (projectId?: string, startDate?: string, endDate?: string) => {
    const whereExpense: any = {};
    const wherePurchase: any = {};

    if (projectId) {
        whereExpense.projectId = projectId;
        wherePurchase.projectId = projectId;
    }

    if (startDate || endDate) {
        if (startDate && endDate) {
            whereExpense.date = { gte: startDate, lte: endDate };
            wherePurchase.dateOfPurchase = { gte: startDate, lte: endDate };
        } else if (startDate) {
            whereExpense.date = { gte: startDate };
            wherePurchase.dateOfPurchase = { gte: startDate };
        } else if (endDate) {
            whereExpense.date = { lte: endDate };
            wherePurchase.dateOfPurchase = { lte: endDate };
        }
    }

    const [expenses, purchases] = await Promise.all([
        prisma.expense.findMany({
            where: whereExpense,
            include: { project: { select: { projectName: true } } },
            orderBy: { date: "desc" }
        }),
        prisma.purchase.findMany({
            where: wherePurchase,
            include: { project: { select: { projectName: true } } },
            orderBy: { dateOfPurchase: "desc" }
        })
    ]);

    const report: any[] = [];

    // Process Expenses
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
            // Categorized Expenses (Mastri, Painter, etc.)
            parsedCategory.forEach((cat: any) => {
                report.push({
                    id: exp.expenseId,
                    date: exp.date,
                    type: "Categorized Expense",
                    category: cat.category || "General",
                    particulars: cat.workerName || exp.description || "Worker Payment",
                    quantity: null,
                    amount: cat.amount ? parseFloat(cat.amount.toString()) : parseFloat(exp.amount.toString()),
                    paymentMode: cat.paymentMode || "Other",
                    projectId: exp.projectId,
                    projectName: exp.project?.projectName || "Unknown",
                    source: "expense"
                });
            });
        } else {
            // General Expense
            report.push({
                id: exp.expenseId,
                date: exp.date,
                type: "General Expense",
                category: "General",
                particulars: exp.description || "Miscellaneous Expense",
                quantity: null,
                amount: parseFloat(exp.amount.toString()),
                paymentMode: "Other",
                projectId: exp.projectId,
                projectName: exp.project?.projectName || "Unknown",
                source: "expense"
            });
        }
    });

    // Process Purchases
    purchases.forEach(pur => {
        // Fallback to price if totalPrice is not present (legacy records)
        const finalAmount = pur.totalPrice != null ? parseFloat(pur.totalPrice.toString()) : parseFloat(pur.price.toString());
        
        report.push({
            id: pur.id,
            date: pur.dateOfPurchase || pur.createdAt.toISOString().split('T')[0],
            type: "Purchase",
            category: "Materials",
            particulars: pur.materialName,
            quantity: pur.quantity ? `${pur.quantity} ${pur.unit || ""}`.trim() : null,
            amount: finalAmount,
            paymentMode: "Vendor Pay",
            vendor: pur.vendorDetails || "Internal",
            projectId: pur.projectId,
            projectName: pur.project?.projectName || "Unknown",
            source: "purchase"
        });
    });

    // Sort by date desc, then by type
    report.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateB !== dateA) return dateB - dateA;
        return a.type.localeCompare(b.type);
    });

    return report;
};
