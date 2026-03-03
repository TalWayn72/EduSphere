const https = require('https');

const TOKEN = process.env.GITHUB_TOKEN || '';

function apiCall(method, path, body) {
  return new Promise((res, rej) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.github.com',
      path,
      method,
      headers: {
        'User-Agent': 'EduSphere',
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${TOKEN}`,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      }
    }, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => {
        try { res(JSON.parse(d)); } catch(e) { res(d); }
      });
    });
    req.on('error', rej);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  const body = `## Summary

- Wave 3–5 improvements: Open Badges 3.0, AI Chat UX, Admin UX, bundle splitting, lazy loading
- BUG-004/024/025/026/027 fixes with regression contract tests (100+ tests)
- E2E visual QA suite (43 spec files, full coverage across all roles/routes)
- CI fixes: Prettier, TypeScript, Docker builds all green
- E2E timeout fix: 20→40min + workers 1→4 for 43 spec files

## Test plan
- [ ] Full Test Suite passes ✅
- [ ] Docker Image Builds pass ✅
- [ ] CodeQL Security Analysis passes ✅
- [ ] GraphQL Federation Validation passes ✅
- [ ] E2E Tests (Playwright) pass with new timeout/workers settings
- [ ] Lint (ESLint + Prettier) passes ✅

🤖 Generated with [Claude Code](https://claude.com/claude-code)`;

  const result = await apiCall('POST', '/repos/TalWayn72/EduSphere/pulls', {
    title: 'feat(improvements-wave1): Wave 3-5 — Open Badges + AI Chat + Admin UX + CI fixes',
    body,
    head: 'feat/improvements-wave1',
    base: 'master',
    draft: false,
  });

  if (result.number) {
    console.log('Created PR #' + result.number, result.html_url);
  } else {
    console.log('Response:', JSON.stringify(result).substring(0, 500));
  }
}
main().catch(console.error);
