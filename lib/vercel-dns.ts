/**
 * Vercel DNS API helpers
 * 
 * Manages DNS records for domain verification via Vercel's REST API
 */

const VERCEL_API_BASE = 'https://api.vercel.com';

interface VercelDnsRecord {
  id: string;
  slug: string;
  name: string;
  type: string;
  value: string;
  ttl?: number;
  priority?: number;
  creator: string;
  created: number;
  updated: number;
}

interface VercelDnsRecordsResponse {
  records: VercelDnsRecord[];
  pagination?: {
    count: number;
    next: number | null;
    prev: number | null;
  };
}

interface CreateRecordParams {
  name: string;  // e.g., "mail" for mail.faightclub.com or "" for apex
  type: 'A' | 'AAAA' | 'ALIAS' | 'CAA' | 'CNAME' | 'MX' | 'SRV' | 'TXT';
  value: string;
  ttl?: number;
  priority?: number;
}

function getHeaders(): HeadersInit {
  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    throw new Error('VERCEL_TOKEN not configured');
  }
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function getTeamParam(): string {
  const teamId = process.env.VERCEL_TEAM_ID;
  return teamId ? `?teamId=${teamId}` : '';
}

/**
 * List all DNS records for a domain
 */
export async function listDnsRecords(domain: string): Promise<VercelDnsRecord[]> {
  const url = `${VERCEL_API_BASE}/v4/domains/${domain}/records${getTeamParam()}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to list DNS records: ${response.status} - ${error}`);
  }

  const data: VercelDnsRecordsResponse = await response.json();
  return data.records || [];
}

/**
 * Create a DNS record
 */
export async function createDnsRecord(
  domain: string,
  record: CreateRecordParams
): Promise<VercelDnsRecord> {
  const url = `${VERCEL_API_BASE}/v2/domains/${domain}/records${getTeamParam()}`;

  const body: Record<string, unknown> = {
    name: record.name,
    type: record.type,
    value: record.value,
  };

  if (record.ttl) body.ttl = record.ttl;
  if (record.priority !== undefined) body.priority = record.priority;

  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create DNS record: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Delete a DNS record
 */
export async function deleteDnsRecord(
  domain: string,
  recordId: string
): Promise<void> {
  const url = `${VERCEL_API_BASE}/v2/domains/${domain}/records/${recordId}${getTeamParam()}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to delete DNS record: ${response.status} - ${error}`);
  }
}

/**
 * Check if a record exists matching type, name, and value
 */
export function findMatchingRecord(
  records: VercelDnsRecord[],
  type: string,
  name: string,
  value: string
): VercelDnsRecord | undefined {
  return records.find(
    (r) =>
      r.type === type &&
      r.name === name &&
      r.value === value
  );
}

/**
 * Check if domain uses Vercel nameservers
 */
export async function checkVercelNameservers(domain: string): Promise<boolean> {
  try {
    // Query Vercel for domain info
    const url = `${VERCEL_API_BASE}/v5/domains/${domain}${getTeamParam()}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    // If we can list records, Vercel manages DNS
    return data.verified === true || data.nameservers?.some((ns: string) => ns.includes('vercel'));
  } catch {
    return false;
  }
}

/**
 * Upsert DNS records (create if missing, skip if exists)
 */
export async function upsertDnsRecords(
  domain: string,
  requiredRecords: CreateRecordParams[]
): Promise<{ created: string[]; existing: string[]; failed: string[] }> {
  const existingRecords = await listDnsRecords(domain);
  const created: string[] = [];
  const existing: string[] = [];
  const failed: string[] = [];

  for (const record of requiredRecords) {
    const recordKey = `${record.type}:${record.name}`;
    
    // Check if record already exists
    const match = findMatchingRecord(
      existingRecords,
      record.type,
      record.name,
      record.value
    );

    if (match) {
      existing.push(recordKey);
      continue;
    }

    try {
      await createDnsRecord(domain, record);
      created.push(recordKey);
    } catch (error) {
      console.error(`Failed to create ${recordKey}:`, error);
      failed.push(recordKey);
    }
  }

  return { created, existing, failed };
}
