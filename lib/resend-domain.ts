/**
 * Resend Domain API helpers
 * 
 * Manages domain verification for email sending
 */

const RESEND_API_BASE = 'https://api.resend.com';

export interface ResendDnsRecord {
  record: string;      // "SPF" | "DKIM" | "DKIM" | "DKIM"
  name: string;        // e.g., "mail" or "resend._domainkey.mail"
  type: string;        // "TXT" | "CNAME" | "MX"
  ttl: string;         // "Auto"
  status: string;      // "not_started" | "pending" | "verified"
  value: string;       // The actual DNS value
  priority?: number;   // For MX records
}

export interface ResendDomain {
  id: string;
  name: string;
  status: 'not_started' | 'pending' | 'verified' | 'failed' | 'temporary_failure';
  created_at: string;
  region: string;
  records: ResendDnsRecord[];
}

interface ResendDomainsListResponse {
  data: ResendDomain[];
}

function getHeaders(): HeadersInit {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY not configured');
  }
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

/**
 * List all domains in Resend account
 */
export async function listDomains(): Promise<ResendDomain[]> {
  const response = await fetch(`${RESEND_API_BASE}/domains`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to list Resend domains: ${response.status} - ${error}`);
  }

  const data: ResendDomainsListResponse = await response.json();
  return data.data || [];
}

/**
 * Get a specific domain by ID
 */
export async function getDomain(domainId: string): Promise<ResendDomain> {
  const response = await fetch(`${RESEND_API_BASE}/domains/${domainId}`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Resend domain: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Find domain by name
 */
export async function findDomainByName(name: string): Promise<ResendDomain | null> {
  const domains = await listDomains();
  return domains.find((d) => d.name === name) || null;
}

/**
 * Create a new domain for sending
 */
export async function createDomain(name: string): Promise<ResendDomain> {
  const response = await fetch(`${RESEND_API_BASE}/domains`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Resend domain: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Trigger domain verification
 */
export async function verifyDomain(domainId: string): Promise<ResendDomain> {
  const response = await fetch(`${RESEND_API_BASE}/domains/${domainId}/verify`, {
    method: 'POST',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to verify Resend domain: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Delete a domain
 */
export async function deleteDomain(domainId: string): Promise<void> {
  const response = await fetch(`${RESEND_API_BASE}/domains/${domainId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to delete Resend domain: ${response.status} - ${error}`);
  }
}

/**
 * Parse Resend DNS records into Vercel-compatible format
 * 
 * Resend returns record names already formatted correctly:
 * - For mail.faightclub.com, the record name "resend._domainkey.mail" is ready to use
 * - The name is relative to the apex domain (faightclub.com)
 * 
 * We just need to clean up trailing dots and any apex domain references.
 */
export function parseResendRecordsForVercel(
  resendRecords: ResendDnsRecord[],
  _sendingDomain: string,
  apexDomain: string
): { name: string; type: 'TXT' | 'CNAME' | 'MX'; value: string; priority?: number }[] {
  return resendRecords.map((record) => {
    let name = record.name;

    // Clean up - remove trailing dots and the apex domain if present
    name = name.replace(new RegExp(`\\.?${apexDomain}\\.?$`), '');
    name = name.replace(/\.$/, '');

    return {
      name,
      type: record.type as 'TXT' | 'CNAME' | 'MX',
      value: record.value,
      priority: record.priority,
    };
  });
}

/**
 * Create or get existing domain, returning DNS records needed
 */
export async function ensureDomain(
  sendingDomain: string
): Promise<{ domain: ResendDomain; isNew: boolean }> {
  // Check if domain already exists
  const existing = await findDomainByName(sendingDomain);
  
  if (existing) {
    return { domain: existing, isNew: false };
  }

  // Create new domain
  const domain = await createDomain(sendingDomain);
  return { domain, isNew: true };
}

/**
 * Poll domain verification status until verified or timeout
 */
export async function pollVerification(
  domainId: string,
  maxAttempts: number = 20,
  intervalMs: number = 30000
): Promise<{ verified: boolean; domain: ResendDomain }> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const domain = await getDomain(domainId);
    
    if (domain.status === 'verified') {
      return { verified: true, domain };
    }
    
    if (domain.status === 'failed') {
      return { verified: false, domain };
    }

    // Trigger verification check
    try {
      await verifyDomain(domainId);
    } catch {
      // Ignore - might fail if already verifying
    }

    // Wait before next check
    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  // Timeout - return current state
  const domain = await getDomain(domainId);
  return { verified: domain.status === 'verified', domain };
}
