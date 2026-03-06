const https = require('https');
const zlib = require('zlib');
const fs = require('fs');
const TOKEN = fs.readFileSync(__dirname + '/check-e2e-result.cjs', 'utf8').match(/TOKEN = '([^']+)'/)[1];
const SHA = 'dcdff27e26e858ee481d322a7ce309803afe66aa';

function get(path) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.github.com', path, method: 'GET',
      headers: { 'Authorization': 'token ' + TOKEN, 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'EduSphere' },
      rejectUnauthorized: false,
    };
    const req = https.request(opts, res => {
      if (res.statusCode === 302 || res.statusCode === 301) { resolve({ redirect: res.headers.location }); return; }
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString())); } catch(e) { resolve({}); } });
    });
    req.on('error', reject);
    req.end();
  });
}

function getRaw(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const opts = {
      hostname: parsed.hostname, path: parsed.pathname + parsed.search, method: 'GET',
      headers: { 'User-Agent': 'EduSphere', 'Accept-Encoding': 'gzip' },
      rejectUnauthorized: false,
    };
    const req = https.request(opts, res => {
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        if (res.headers['content-encoding'] === 'gzip') {
          zlib.gunzip(buf, (err, out) => { if (err) resolve(buf.toString()); else resolve(out.toString()); });
        } else resolve(buf.toString());
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function strip(s) { return s.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z /, '').replace(/\x1B\[[0-9;]*m/g, ''); }

async function main() {
  const runs = await get('/repos/TalWayn72/EduSphere/actions/runs?head_sha=' + SHA + '&per_page=15');
  const ci = (runs.workflow_runs || []).find(r => r.name === 'Continuous Integration');
  if (!ci) { console.log('CI not found'); return; }

  const jobs = await get('/repos/TalWayn72/EduSphere/actions/runs/' + ci.id + '/jobs?per_page=50');
  const e2eJob = (jobs.jobs || []).find(j => j.name.includes('E2E'));
  if (!e2eJob) { console.log('E2E job not found'); return; }

  const logResp = await get('/repos/TalWayn72/EduSphere/actions/jobs/' + e2eJob.id + '/logs');
  if (!logResp.redirect) { console.log('No redirect'); return; }

  const log = await getRaw(logResp.redirect);
  const lines = log.split('\n').map(strip);

  // Save full log for inspection
  fs.writeFileSync(__dirname + '/ci_log_e2e_dcdff27.txt', lines.join('\n'));

  // Find test failure blocks: lines starting with ● (jest/playwright error format) or lines with "expect("
  const failureLines = [];
  let inFailure = false;
  let failCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    // Playwright failure markers
    if (/^\s+\d+\)\s/.test(l) || l.includes('● ') || l.includes('expect(')) {
      inFailure = true;
      failCount++;
      if (failCount <= 30) failureLines.push(l);
    } else if (inFailure) {
      if (failCount <= 30) failureLines.push(l);
      if (l.trim() === '' && failureLines[failureLines.length-2]?.trim() === '') inFailure = false;
    }
    // Summary line
    if (l.includes(' failed') && l.includes(' passed')) {
      console.log('SUMMARY:', l);
    }
    // Specific test names that failed
    if (l.includes('FAILED') && l.includes('spec')) {
      console.log('SPEC FAIL:', l.trim());
    }
  }

  // Print a useful section: look for lines with "Error:" or assertion failures
  console.log('\n=== KEY ERRORS ===');
  const keyErrors = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.match(/Error:|TimeoutError:|expect\(locator\)|Locator expected|to be visible|to have URL|Timeout exceeded/)) {
      keyErrors.push(lines.slice(Math.max(0, i-1), i+3).join('\n'));
    }
  }
  // Deduplicate and show first 20
  const seen = new Set();
  keyErrors.forEach(e => {
    const key = e.substring(0, 80);
    if (!seen.has(key)) { seen.add(key); console.log(e + '\n---'); }
    if (seen.size > 20) return;
  });

  console.log('\nFull log saved to scripts/ci_log_e2e_dcdff27.txt');
}
main().catch(e => console.error('Error:', e.message));
