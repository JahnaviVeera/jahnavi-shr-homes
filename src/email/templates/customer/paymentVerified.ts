export function customerPaymentVerifiedEmail(data: {
    customerName: string;
    amount: string;
    projectName: string;
    frontendUrl: string;
}): string {
    return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:24px;border-radius:12px;">
      <h2 style="color:#7c3aed;">💰 Payment Confirmed</h2>
      <p>Hi ${data.customerName},</p>
      <p>Your payment for project <strong>${data.projectName}</strong> has been confirmed by Admin.</p>
      <p><strong>Amount:</strong> ₹${data.amount}</p>
      <a href="${data.frontendUrl}/customer/payments"
         style="background:#7c3aed;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:16px;">
        View Payment Details
      </a>
      <p style="color:#9ca3af;font-size:12px;margin-top:24px;">ShrHomies Construction Management</p>
    </div>
  `;
}
