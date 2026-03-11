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
        where: { initialStatus: { in: ['Completed'] } },
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
            customer: true
        },
        orderBy: {
            startDate: 'desc'
        }
    });

    // Remove password from customer details
    return projects.map(project => {
        const { customer, ...projectDetails } = project;
        const { password, ...userDetails } = customer;
        return {
            ...projectDetails,
            customer: userDetails
        };
    });
};

// Get Closed Customers List (Users with complete/Completed projects)
export const getClosedCustomersList = async () => {
    const projects = await prisma.project.findMany({
        where: {
            initialStatus: { in: ['Completed'] }
        },
        include: {
            customer: true
        },
        orderBy: {
            startDate: 'desc'
        }
    });

    // Remove password from customer details
    return projects.map(project => {
        const { customer, ...projectDetails } = project;
        const { password, ...userDetails } = customer;
        return {
            ...projectDetails,
            customer: userDetails
        };
    });
};
