import { NextRequest, NextResponse } from 'next/server';
import { findDomainByName, getDomain } from '@/lib/resend-domain';

/**
 * GET /api/admin/resend/status
 * 
 * Returns current Resend domain status and configuration
 */
export async function GET(request: NextRequest) {
  // Auth check
  const adminSecret = request.headers.get('x-admin-secret')?.trim();
  const expectedSecret = process.env.ADMIN_SECRET?.trim();
  if (!adminSecret || !expectedSecret || adminSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sendingDomain = process.env.RESEND_SENDING_DOMAIN || 'mail.faightclub.com';
  const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';
  const emailEnabled = process.env.EMAIL_ENABLED === 'true';
  const autoDnsEnabled = process.env.RESEND_AUTO_DNS_ENABLED === 'true';

  try {
    // Try to find the domain in Resend
    const domain = await findDomainByName(sendingDomain);

    if (!domain) {
      return NextResponse.json({
        configured: false,
        sendingDomain,
        fromEmail,
        emailEnabled,
        autoDnsEnabled,
        domain: null,
        message: 'Domain not found in Resend. Run setup-domain to configure.',
        nextSteps: [
          'POST /api/admin/resend/setup-domain with x-admin-secret header',
        ],
      });
    }

    // Get fresh domain status
    const freshDomain = await getDomain(domain.id);

    // Analyze DNS record status
    const records = freshDomain.records || [];
    const pendingRecords = records.filter((r) => r.status !== 'verified');
    const verifiedRecords = records.filter((r) => r.status === 'verified');

    const isFullyVerified = freshDomain.status === 'verified';
    const isUsingCustomDomain = !fromEmail.includes('resend.dev');

    return NextResponse.json({
      configured: true,
      sendingDomain,
      fromEmail,
      emailEnabled,
      autoDnsEnabled,
      domain: {
        id: freshDomain.id,
        name: freshDomain.name,
        status: freshDomain.status,
        region: freshDomain.region,
        createdAt: freshDomain.created_at,
      },
      dnsStatus: {
        total: records.length,
        verified: verifiedRecords.length,
        pending: pendingRecords.length,
        records: records.map((r) => ({
          type: r.type,
          name: r.name,
          status: r.status,
          record: r.record,
        })),
      },
      health: {
        domainVerified: isFullyVerified,
        usingCustomDomain: isUsingCustomDomain,
        emailsEnabled: emailEnabled,
        ready: isFullyVerified && isUsingCustomDomain && emailEnabled,
      },
      nextSteps: !isFullyVerified
        ? [
            'Wait for DNS propagation (usually <1 hour)',
            'Check Resend dashboard for detailed status',
            pendingRecords.length > 0
              ? `${pendingRecords.length} DNS records still pending verification`
              : 'All DNS records created',
          ]
        : isFullyVerified && !isUsingCustomDomain
          ? [
              'Domain verified! Update FROM_EMAIL env var to use your domain',
              `Suggested: keys@${sendingDomain}`,
            ]
          : ['Email system fully configured and ready!'],
    });
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      {
        configured: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        sendingDomain,
        fromEmail,
        emailEnabled,
      },
      { status: 500 }
    );
  }
}
