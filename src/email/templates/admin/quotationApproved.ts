export function adminQuotationApprovedEmail(data: {
    customerName: string;
    projectName: string;
    quotationAmount: string;
    frontendUrl: string;
}): string {
    return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:24px;border-radius:12px;">
      <h2 style="color:#7c3aed;">✅ Quotation Approved</h2>
      <p>Hi Admin,</p>
      <p><strong>${data.customerName}</strong> has <strong style="color:green;">approved</strong> the quotation for project <strong>${data.projectName}</strong>.</p>
      <p><strong>Amount:</strong> ₹${data.quotationAmount}</p>
      <a href="${data.frontendUrl}/admin/quotations"
         style="background:#7c3aed;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:16px;">
        View Quotation
      </a>
      <p style="color:#9ca3af;font-size:12px;margin-top:24px;">ShrHomies Construction Management</p>
    </div>
  `;
}
