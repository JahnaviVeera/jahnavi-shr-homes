export function adminCustomerMessageEmail(data: {
    customerName: string;
    message: string;
    frontendUrl: string;
}): string {
    return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:24px;border-radius:12px;">
      <h2 style="color:#7c3aed;">💬 New Message from Customer</h2>
      <p>Hi Admin,</p>
      <p><strong>${data.customerName}</strong> (Customer) has sent you a new message:</p>
      <div style="background:#fff;border-left:4px solid #7c3aed;padding:12px 16px;border-radius:6px;margin:16px 0;">
        <p style="margin:0;color:#374151;">${data.message}</p>
      </div>
      <a href="${data.frontendUrl}/admin/messages"
         style="background:#7c3aed;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:16px;">
        View Messages
      </a>
      <p style="color:#9ca3af;font-size:12px;margin-top:24px;">ShrHomies Construction Management</p>
    </div>
  `;
}
