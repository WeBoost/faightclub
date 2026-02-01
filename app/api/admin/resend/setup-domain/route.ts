import { NextRequest, NextResponse } from 'next/server';
import {
  ensureDomain,
  getDomain,
  verifyDomain,
  parseResendRecordsForVercel,
} from '@/lib/resend-domain';
import {
  listDnsRecords,
  upsertDnsRecords,
  checkVercelNameservers,
} from '@/lib/vercel-dns';

export const maxDuration = 60;

/**
 * POST /api/admin/resend/setup-domain
 * 
 * One-click domain setup:
 * 1. Create/get Resend domain
 * 2. Get required DNS records
 * 3. Verify Vercel manages DNS
 * 4. Create missing DNS records
 * 5. Trigger verification
 */
export async function POST(request: NextRequest) {
  // Auth check
  const adminSecret = request.headers.get('x-admin-secret');
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if auto DNS is enabled
  if (process.env.RESEND_AUTO_DNS_ENABLED !== 'true') {
    return NextResponse.json(
      { error: 'RESEND_AUTO_DNS_ENABLED is not true' },
      { status: 400 }
    );
  }

  const sendingDomain = process.env.RESEND_SENDING_DOMAIN || 'mail.faightclub.com';
  const apexDomain = 'faightclub.com';

  try {
    const steps: string[] = [];
    const warnings: string[] = [];

    // Step 1: Create or get Resend domain
    steps.push(`Creating/getting Resend domain: ${sendingDomain}`);
    const { domain: resendDomain, isNew } = await ensureDomain(sendingDomain);
    steps.push(isNew ? 'Created new Resend domain' : 'Found existing Resend domain');

    // Step 2: Get DNS records needed
    const dnsRecords = resendDomain.records || [];
    steps.push(`Found ${dnsRecords.length} DNS records to configure`);

    if (dnsRecords.length === 0) {
      // Fetch fresh domain to get records
      const freshDomain = await getDomain(resendDomain.id);
      if (freshDomain.records && freshDomain.records.length > 0) {
        dnsRecords.push(...freshDomain.records);
        steps.push(`Fetched ${freshDomain.records.length} DNS records from domain`);
      }
    }

    // Step 3: Check if Vercel manages DNS
    if (!process.env.VERCEL_TOKEN) {
      // Can't do auto-DNS, return manual instructions
      return NextResponse.json({
        success: false,
        message: 'VERCEL_TOKEN not configured - manual DNS setup required',
        domain: resendDomain,
        dnsRecords: dnsRecords.map((r) => ({
          type: r.type,
          name: r.name,
          value: r.value,
          status: r.status,
        })),
        steps,
        manualSetup: true,
      });
    }

    const vercelManagesDns = await checkVercelNameservers(apexDomain);
    if (!vercelManagesDns) {
      warnings.push('Could not confirm Vercel DNS management - proceeding anyway');
    }
    steps.push(
      vercelManagesDns
        ? 'Confirmed Vercel manages DNS for apex domain'
        : 'Assuming Vercel manages DNS'
    );

    // Step 4: Parse and upsert DNS records
    const vercelRecords = parseResendRecordsForVercel(
      dnsRecords,
      sendingDomain,
      apexDomain
    );

    steps.push(`Upserting ${vercelRecords.length} DNS records to Vercel`);
    
    const upsertResult = await upsertDnsRecords(apexDomain, vercelRecords);
    steps.push(
      `DNS records: ${upsertResult.created.length} created, ${upsertResult.existing.length} existing, ${upsertResult.failed.length} failed`
    );

    if (upsertResult.failed.length > 0) {
      warnings.push(`Failed to create records: ${upsertResult.failed.join(', ')}`);
    }

    // Step 5: Trigger verification
    steps.push('Triggering domain verification');
    try {
      await verifyDomain(resendDomain.id);
      steps.push('Verification triggered');
    } catch (verifyError) {
      warnings.push(`Verification trigger failed: ${verifyError}`);
    }

    // Get final domain status
    const finalDomain = await getDomain(resendDomain.id);

    return NextResponse.json({
      success: true,
      message:
        finalDomain.status === 'verified'
          ? 'Domain verified!'
          : 'Domain setup complete - verification in progress',
      domain: {
        id: finalDomain.id,
        name: finalDomain.name,
        status: finalDomain.status,
        records: finalDomain.records?.map((r) => ({
          type: r.type,
          name: r.name,
          status: r.status,
        })),
      },
      dnsResult: upsertResult,
      steps,
      warnings,
      nextSteps:
        finalDomain.status !== 'verified'
          ? [
              'DNS propagation can take up to 48 hours (usually <1 hour)',
              'Check status at /api/admin/resend/status',
              'Once verified, emails will send from ' + process.env.FROM_EMAIL,
            ]
          : ['Domain is verified and ready to use!'],
    });
  } catch (error) {
    console.error('Domain setup error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
