import { resend } from './resendClient';
import prisma from '../config/prisma.client';

interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
    event?: string; // e.g. "project_assigned", "payment_verified"
}

export async function sendEmail({ to, subject, html, event }: SendEmailOptions): Promise<void> {
    let resendId: string | undefined;
    let status = 'sent';
    let errorMessage: string | undefined;

    // DEVELOPMENT OVERRIDE: 
    // If in development, force send to the verified testing email address
    // This bypasses the "Can only send testing emails to your own email address" restriction.
    const actualRecipient = process.env.NODE_ENV === 'development'
        ? 'jahnaviveeranala08@gmail.com'
        : to;

    if (process.env.NODE_ENV === 'development' && actualRecipient !== to) {
        console.log(`[Email] 👨‍💻 Dev Mode: Redirecting email from ${to} to verified tester ${actualRecipient}`);
    }

    try {
        const { data, error } = await resend.emails.send({
            from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
            to: actualRecipient,
            subject: `[DEV to: ${to}] ${subject}`, // Keep original destination in subject for tracking
            html,
        });

        if (error) {
            status = 'failed';
            errorMessage = typeof error === 'object' ? JSON.stringify(error) : String(error);
            console.error(`[Email] ❌ Resend API error for "${subject}" to ${to}:`, error);
        } else {
            resendId = data?.id;
            console.log(`[Email] ✅ Sent "${subject}" → ${to} (ID: ${resendId})`);
        }
    } catch (err) {
        status = 'failed';
        errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`[Email] ❌ Unexpected error sending "${subject}" to ${to}:`, err);
        // NEVER re-throw — email failure must never fail the HTTP response
    }

    // Always log to DB regardless of success/failure
    try {
        await prisma.emailLog.create({
            data: {
                to,
                subject,
                status,
                resendId: resendId ?? null,
                error: errorMessage ?? null,
                event: event ?? null,
            }
        });
    } catch (dbErr) {
        // DB logging failure must never propagate either
        console.error('[Email] ⚠️  Failed to write email log to DB:', dbErr);
    }
}
