export function supervisorProjectAssignedEmail(data: {
    supervisorName: string;
    projectName: string;
    customerName: string;
    startDate: string;
    frontendUrl: string;
}): string {
    return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:24px;border-radius:12px;">
      <h2 style="color:#7c3aed;">🏗️ New Project Assigned</h2>
      <p>Hi ${data.supervisorName},</p>
      <p>You have been assigned a new project by the Admin.</p>
      <table style="width:100%;border-collapse:collapse;margin-top:12px;">
        <tr><td style="padding:8px;color:#6b7280;">Project</td><td style="padding:8px;font-weight:bold;">${data.projectName}</td></tr>
        <tr><td style="padding:8px;color:#6b7280;">Customer</td><td style="padding:8px;">${data.customerName}</td></tr>
        <tr><td style="padding:8px;color:#6b7280;">Start Date</td><td style="padding:8px;">${data.startDate}</td></tr>
      </table>
      <a href="${data.frontendUrl}/supervisor/projects"
         style="background:#7c3aed;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:16px;">
        View Project
      </a>
      <p style="color:#9ca3af;font-size:12px;margin-top:24px;">ShrHomies Construction Management</p>
    </div>
  `;
}
