export function adminDailyUpdatePostedEmail(data: {
    supervisorName: string;
    projectName: string;
    constructionStage: string;
    frontendUrl: string;
}): string {
    return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:24px;border-radius:12px;">
      <h2 style="color:#7c3aed;">🏗️ New Daily Update Posted</h2>
      <p>Hi Admin,</p>
      <p>Supervisor <strong>${data.supervisorName}</strong> has posted a daily update for project <strong>${data.projectName}</strong>.</p>
      <p><strong>Construction Stage:</strong> ${data.constructionStage}</p>
      <a href="${data.frontendUrl}/admin/daily-updates"
         style="background:#7c3aed;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:16px;">
        View Daily Update
      </a>
      <p style="color:#9ca3af;font-size:12px;margin-top:24px;">ShrHomies Construction Management</p>
    </div>
  `;
}
