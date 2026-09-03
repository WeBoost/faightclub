const TARGET_TEAM_ID = "team_TOzCszYHn6qVN5TmdX9GhjFD";
const TARGET_PROJECT_ID = "prj_a6qLmbQrhx34IBc2mnLl5Xuq9doW";
const TOKEN_EXCHANGE_CLIENT_ID = "cl_kyUx2zVvA4MGptBohkmtYHJly2XltXzD";

function log(result) {
  console.log(`[macia-protection-oidc] ${JSON.stringify(result)}`);
}

async function run() {
  if (process.env.VERCEL_ENV !== "production" || process.env.VERCEL_GIT_COMMIT_REF !== "main") {
    log({ ok: false, skipped: "not-production-main" });
    return;
  }

  const oidcToken = String(process.env.VERCEL_OIDC_TOKEN || "").trim();
  if (!oidcToken) {
    log({ ok: false, skipped: "oidc-token-unavailable", orgId: process.env.VERCEL_ORG_ID || null });
    return;
  }

  const form = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
    client_id: TOKEN_EXCHANGE_CLIENT_ID,
    subject_token_type: "urn:ietf:params:oauth:token-type:id_token",
    requested_token_type: "urn:ietf:params:oauth:token-type:access_token",
    team_id_or_slug: TARGET_TEAM_ID,
    subject_token: oidcToken,
  });

  const exchange = await fetch("https://api.vercel.com/login/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form,
    signal: AbortSignal.timeout(30_000),
  });

  const exchangeText = await exchange.text();
  let exchangeBody = {};
  try {
    exchangeBody = JSON.parse(exchangeText);
  } catch {
    exchangeBody = { text: exchangeText.slice(0, 250) };
  }

  if (!exchange.ok || !exchangeBody.access_token) {
    log({
      ok: false,
      skipped: "token-exchange-failed",
      orgId: process.env.VERCEL_ORG_ID || null,
      status: exchange.status,
      error: exchangeBody.error || null,
      errorDescription: exchangeBody.error_description || null,
    });
    return;
  }

  const accessToken = exchangeBody.access_token;
  const projectPath = `https://api.vercel.com/v9/projects/${TARGET_PROJECT_ID}?teamId=${TARGET_TEAM_ID}`;
  const headers = {
    authorization: `Bearer ${accessToken}`,
    "content-type": "application/json",
  };

  const beforeResponse = await fetch(projectPath, {
    headers,
    signal: AbortSignal.timeout(30_000),
  });
  const beforeText = await beforeResponse.text();
  let before = {};
  try {
    before = JSON.parse(beforeText);
  } catch {
    before = { text: beforeText.slice(0, 250) };
  }

  if (!beforeResponse.ok || before.id !== TARGET_PROJECT_ID) {
    log({
      ok: false,
      skipped: "project-access-failed",
      orgId: process.env.VERCEL_ORG_ID || null,
      status: beforeResponse.status,
      providerCode: before?.error?.code || null,
      providerMessage: before?.error?.message || null,
      exchangedTokenType: exchangeBody.token_type || null,
    });
    return;
  }

  const patchResponse = await fetch(projectPath, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ ssoProtection: null }),
    signal: AbortSignal.timeout(30_000),
  });
  const patchText = await patchResponse.text();
  let patchBody = {};
  try {
    patchBody = JSON.parse(patchText);
  } catch {
    patchBody = { text: patchText.slice(0, 250) };
  }

  if (!patchResponse.ok) {
    log({
      ok: false,
      skipped: "project-update-failed",
      orgId: process.env.VERCEL_ORG_ID || null,
      status: patchResponse.status,
      providerCode: patchBody?.error?.code || null,
      providerMessage: patchBody?.error?.message || null,
    });
    return;
  }

  const afterResponse = await fetch(projectPath, {
    headers,
    signal: AbortSignal.timeout(30_000),
  });
  const after = await afterResponse.json();

  log({
    ok: afterResponse.ok && after.id === TARGET_PROJECT_ID && after.ssoProtection == null,
    orgId: process.env.VERCEL_ORG_ID || null,
    projectId: TARGET_PROJECT_ID,
    projectName: after.name || patchBody.name || null,
    beforeSsoProtection: before.ssoProtection ?? null,
    afterSsoProtection: after.ssoProtection ?? null,
    patchStatus: patchResponse.status,
    verifyStatus: afterResponse.status,
  });
}

try {
  await run();
} catch (error) {
  log({
    ok: false,
    skipped: "unexpected-error",
    orgId: process.env.VERCEL_ORG_ID || null,
    message: error instanceof Error ? error.message : String(error),
  });
}
