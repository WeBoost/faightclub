import { Resend } from 'resend';

// Initialize Resend client
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

/**
 * Get the FROM email address
 * Uses FROM_EMAIL env var if set, otherwise falls back to Resend test domain
 */
function getFromEmail(): string {
  return process.env.FROM_EMAIL || 'onboarding@resend.dev';
}

/**
 * Check if email sending is enabled
 */
function isEmailEnabled(): boolean {
  return process.env.EMAIL_ENABLED !== 'false';
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

/**
 * Send an email via Resend
 * 
 * Respects EMAIL_ENABLED kill switch
 * Uses FROM_EMAIL env var or falls back to onboarding@resend.dev
 */
export async function sendEmail({
  to,
  subject,
  html,
  from,
}: EmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
  // Check kill switch
  if (!isEmailEnabled()) {
    console.log('[Resend] Email sending disabled (EMAIL_ENABLED=false)');
    return { success: false, error: 'Email sending disabled' };
  }

  if (!resend) {
    console.error('[Resend] API key not configured');
    return { success: false, error: 'Resend not configured' };
  }

  const fromAddress = from || getFromEmail();

  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to,
      subject,
      html,
    });

    if (error) {
      console.error('[Resend] Send error:', error);
      return { success: false, error: error.message };
    }

    console.log(`[Resend] Email sent successfully: ${data?.id} from ${fromAddress}`);
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
  const fromEmail = getFromEmail();
  const isCustomDomain = !fromEmail.includes('resend.dev');

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
          ${isCustomDomain 
            ? `Sent from verified domain: ${fromEmail}`
            : 'Note: This email was sent from onboarding@resend.dev (Resend test domain). Once domain verification is complete, emails will come from your verified domain.'
          }
        </p>
      </div>
    `,
  });
}

export default resend;
