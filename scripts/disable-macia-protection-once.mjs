const VERCEL_API = "https://api.vercel.com";
const TARGET_TEAM_ID = "team_TOzCszYHn6qVN5TmdX9GhjFD";
const TARGET_PROJECT_ID = "prj_a6qLmbQrhx34IBc2mnLl5Xuq9doW";

if (
  process.env.VERCEL_ENV !== "production"
  || process.env.VERCEL_GIT_COMMIT_REF !== "main"
) {
  console.log("[macia-protection] Skipped outside the production main build.");
  process.exit(0);
}

const token = String(process.env.VERCEL_TOKEN || "").trim();
if (!token) {
  throw new Error("[macia-protection] VERCEL_TOKEN is unavailable in the production build.");
}

async function request(path, init = {}) {
  const response = await fetch(`${VERCEL_API}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(30_000),
  });

  const text = await response.text();
  let body = {};
  try {
    body = JSON.parse(text);
  } catch {
    body = { text: text.slice(0, 300) };
  }

  if (!response.ok) {
    const providerError = body && typeof body === "object" ? body.error : null;
    const code = providerError && typeof providerError === "object" ? providerError.code : null;
    const message = providerError && typeof providerError === "object" ? providerError.message : null;
    throw new Error(
      `[macia-protection] Vercel API ${response.status}${code ? ` ${code}` : ""}${message ? `: ${message}` : ""}`,
    );
  }

  return body;
}

const projectPath = `/v9/projects/${TARGET_PROJECT_ID}?teamId=${TARGET_TEAM_ID}`;
const before = await request(projectPath);
if (before.id !== TARGET_PROJECT_ID) {
  throw new Error("[macia-protection] Target project identity check failed.");
}

await request(projectPath, {
  method: "PATCH",
  body: JSON.stringify({ ssoProtection: null }),
});

const after = await request(projectPath);
if (after.id !== TARGET_PROJECT_ID || after.ssoProtection != null) {
  throw new Error("[macia-protection] Project readback did not confirm ssoProtection=null.");
}

console.log(JSON.stringify({
  ok: true,
  projectId: TARGET_PROJECT_ID,
  projectName: after.name || null,
  beforeSsoProtection: before.ssoProtection ?? null,
  afterSsoProtection: after.ssoProtection ?? null,
}));
