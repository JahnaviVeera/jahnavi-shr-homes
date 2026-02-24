export function customerQuotationRejectedEmail(data: {
    customerName: string;
    projectName: string;
    reason?: string;
    frontendUrl: string;
}): string {
    return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:24px;border-radius:12px;">
      <h2 style="color:#7c3aed;">❌ Quotation Update</h2>
      <p>Hi ${data.customerName},</p>
      <p>Your quotation for project <strong>${data.projectName}</strong> has been <strong style="color:#ef4444;">rejected</strong> by Admin.</p>
      ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
      <p>Please contact the admin for more details or to request a revised quotation.</p>
      <a href="${data.frontendUrl}/customer/quotations"
         style="background:#7c3aed;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:16px;">
        View Quotations
      </a>
      <p style="color:#9ca3af;font-size:12px;margin-top:24px;">ShrHomies Construction Management</p>
    </div>
  `;
}
