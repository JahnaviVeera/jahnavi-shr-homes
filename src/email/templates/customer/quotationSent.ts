export function customerQuotationSentEmail(data: {
    customerName: string;
    projectName: string;
    quotationAmount: string;
    frontendUrl: string;
}): string {
    return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:24px;border-radius:12px;">
      <h2 style="color:#7c3aed;">📄 Your Quotation is Ready</h2>
      <p>Hi ${data.customerName},</p>
      <p>Your quotation for project <strong>${data.projectName}</strong> has been sent by the Admin.</p>
      <p><strong>Quoted Amount:</strong> ₹${data.quotationAmount}</p>
      <a href="${data.frontendUrl}/customer/quotations"
         style="background:#7c3aed;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:16px;">
        Review Quotation
      </a>
      <p style="color:#9ca3af;font-size:12px;margin-top:24px;">ShrHomies Construction Management</p>
    </div>
  `;
}
