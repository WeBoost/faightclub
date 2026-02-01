import { Resend } from 'resend';

// Initialize Resend client
// NOTE: Domain verification required before sending from custom domain
// See HANDOVER.md for DNS setup checklist
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

/**
 * Send an email via Resend
 * 
 * IMPORTANT: Until domain is verified, emails can only be sent from
 * onboarding@resend.dev (Resend's test domain)
 * 
 * After verifying faightclub.com (or subdomain), update the default 'from'
 */
export async function sendEmail({
  to,
  subject,
  html,
  from = 'onboarding@resend.dev', // Change after domain verification
}: EmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!resend) {
    console.error('[Resend] API key not configured');
    return { success: false, error: 'Resend not configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });

    if (error) {
      console.error('[Resend] Send error:', error);
      return { success: false, error: error.message };
    }

    console.log(`[Resend] Email sent successfully: ${data?.id}`);
    return { success: true, id: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Resend] Exception:', message);
    return { success: false, error: message };
  }
}

/**
 * Send a test email (for /api/test-email route)
 */
export async function sendTestEmail(to: string): Promise<{ success: boolean; id?: string; error?: string }> {
  return sendEmail({
    to,
    subject: '🥊 FAIghtClub Test Email',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #7c3aed;">FAIghtClub</h1>
        <p>This is a test email from FAIghtClub.</p>
        <p>If you received this, your Resend integration is working!</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #666; font-size: 12px;">
          Note: This email was sent from onboarding@resend.dev (Resend test domain).
          Once domain verification is complete, emails will come from your verified domain.
        </p>
      </div>
    `,
  });
}

export default resend;
