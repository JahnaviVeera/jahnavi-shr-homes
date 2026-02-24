/**
 * Quick diagnostics: tests Resend API key and checks supervisor email
 * Run: npx ts-node test.ts
 */
import { Resend } from 'resend';
import prisma from './src/config/prisma.client';

const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_RrSA698n_JRsBgHj6aucRewmKVJppHcC4';
const EMAIL_FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';

async function main() {
    // ── 1. Check Resend can send at all (to Resend's own test sink) ──────────────
    console.log('\n[1] Testing Resend API key...');
    const resend = new Resend(RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
        from: EMAIL_FROM,
        to: 'delivered@resend.dev',         // Resend's official test sink — always succeeds
        subject: 'Diagnostic ping',
        html: '<p>API key works!</p>',
    });
    if (error) {
        console.error('❌ Resend API error:', error);
    } else {
        console.log('✅ Resend API key OK. Email ID:', data?.id);
    }

    // ── 2. List all supervisors and their emails ─────────────────────────────────
    console.log('\n[2] Supervisors in DB:');
    const supervisors = await prisma.supervisor.findMany({
        select: { supervisorId: true, fullName: true, email: true }
    });
    if (supervisors.length === 0) {
        console.log('⚠️  No supervisors found in DB!');
    } else {
        supervisors.forEach(s => {
            console.log(`  • ${s.fullName} (${s.supervisorId}) → email: "${s.email}"`);
        });
    }

    // ── 3. Check admin email ─────────────────────────────────────────────────────
    console.log('\n[3] Admin user in DB:');
    const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
    if (!admin) {
        console.log('⚠️  No admin user found!');
    } else {
        console.log(`  • ${admin.userName} → email: "${admin.email}"`);
    }

    // ── 4. Simulate sending to a real supervisor email ───────────────────────────
    if (supervisors.length > 0) {
        const sup = supervisors[0]!;
        console.log(`\n[4] Attempting to send test email to supervisor: ${sup.email}`);
        const result = await resend.emails.send({
            from: EMAIL_FROM,
            to: sup.email,
            subject: `[Test] Project Assignment Test – ShrHomies`,
            html: `<p>Hi ${sup.fullName}, this is a diagnostic test email.</p>`
        });
        if (result.error) {
            console.error('❌ Failed:', result.error);
            console.log('\n💡 LIKELY CAUSE: In development, Resend can only send to your verified email\n   OR to "delivered@resend.dev". All other recipients are blocked unless\n   you verify a domain. To fix:\n   → Option A: Verify a domain on resend.com and set a real FROM address\n   → Option B: Change supervisor email in DB to your own verified email for testing');
        } else {
            console.log('✅ Email sent! ID:', result.data?.id);
        }
    }

    await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
