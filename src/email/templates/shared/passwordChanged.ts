// Shared password changed template — used for both supervisor and customer
export function passwordChangedEmail(data: { name: string }): string {
    return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:24px;border-radius:12px;">
      <h2 style="color:#7c3aed;">🔒 Password Changed Successfully</h2>
      <p>Hi ${data.name},</p>
      <p>Your ShrHomies account password was just changed successfully.</p>
      <p style="color:#ef4444;">If you did not make this change, please contact the admin immediately.</p>
      <p style="color:#9ca3af;font-size:12px;margin-top:24px;">ShrHomies Construction Management</p>
    </div>
  `;
}
