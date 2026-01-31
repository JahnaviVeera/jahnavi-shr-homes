import prisma from "../../config/prisma.client";

// Get Customer Leads Stats
export const getCustomerLeadsStats = async () => {
    // New Leads: Unique customers with at least one Inprogress project
    const newLeadsCount = await prisma.project.findMany({
        where: { initialStatus: 'Inprogress' },
        distinct: ['customerId'],
        select: { customerId: true }
    }).then(res => res.length);

    // Closed Customers: Unique customers with at least one complete or Completed project
    const closedCustomersCount = await prisma.project.findMany({
        where: { initialStatus: { in: ['complete', 'Completed'] } },
        distinct: ['customerId'],
        select: { customerId: true }
    }).then(res => res.length);

    return {
        newLeads: newLeadsCount,
        closedCustomers: closedCustomersCount,
        total: newLeadsCount + closedCustomersCount
    };
};

// Get New Leads List (Users with Inprogress projects)
export const getNewLeadsList = async () => {
    const projects = await prisma.project.findMany({
        where: {
            initialStatus: 'Inprogress'
        },
        include: {
            customer: {
                select: {
                    userId: true,
                    userName: true,
                    contact: true
                }
            }
        },
        orderBy: {
            startDate: 'desc'
        }
    });

    // Flatten the results
    const flatLeads = projects.map(project => ({
        userId: project.customer.userId,
        projectId: project.projectId,
        customerName: project.customer.userName,
        projectName: project.projectName,
        mobileNumber: project.customer.contact,
        projectValue: project.totalBudget,
        date: project.startDate
    }));

    return flatLeads;
};

// Get Closed Customers List (Users with complete/Completed projects)
export const getClosedCustomersList = async () => {
    const projects = await prisma.project.findMany({
        where: {
            initialStatus: { in: ['complete', 'Completed'] }
        },
        include: {
            customer: {
                select: {
                    userId: true,
                    userName: true,
                    contact: true
                }
            }
        },
        orderBy: {
            startDate: 'desc'
        }
    });

    // Flatten the results
    const flatCustomers = projects.map(project => ({
        userId: project.customer.userId,
        projectId: project.projectId,
        customerName: project.customer.userName,
        projectName: project.projectName,
        mobileNumber: project.customer.contact,
        projectValue: project.totalBudget,
        date: project.startDate
    }));

    return flatCustomers;
};
