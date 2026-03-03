const https = require('https');
const zlib = require('zlib');
const fs = require('fs');
const TOKEN = fs.readFileSync(__dirname + '/check-e2e-result.cjs', 'utf8').match(/TOKEN = '([^']+)'/)[1];
const SHA = 'dcdff27e26e858ee481d322a7ce309803afe66aa';

function get(path, raw) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.github.com', path, method: 'GET',
      headers: { 'Authorization': 'token ' + TOKEN, 'Accept': raw ? 'application/vnd.github.v3+json' : 'application/vnd.github.v3+json', 'User-Agent': 'EduSphere' },
      rejectUnauthorized: false,
    };
    const req = https.request(opts, res => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        resolve({ redirect: res.headers.location });
        return;
      }
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => {
        if (raw) { resolve(Buffer.concat(chunks)); return; }
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())); } catch(e) { resolve({}); }
      });
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

async function main() {
  const runs = await get('/repos/TalWayn72/EduSphere/actions/runs?head_sha=' + SHA + '&per_page=15');
  const ci = (runs.workflow_runs || []).find(r => r.name === 'Continuous Integration');
  if (!ci) { console.log('CI not found'); return; }

  const jobs = await get('/repos/TalWayn72/EduSphere/actions/runs/' + ci.id + '/jobs?per_page=50');
  const e2eJob = (jobs.jobs || []).find(j => j.name.includes('E2E'));
  if (!e2eJob) { console.log('E2E job not found'); return; }

  // Get log URL (returns redirect)
  const logResp = await get('/repos/TalWayn72/EduSphere/actions/jobs/' + e2eJob.id + '/logs');
  if (!logResp.redirect) { console.log('No redirect for log:', JSON.stringify(logResp).slice(0, 200)); return; }

  const log = await getRaw(logResp.redirect);
  const lines = log.split('\n');

  // Find FAILED lines and surrounding context
  const failLines = [];
  lines.forEach((line, i) => {
    if (line.includes('FAILED') || line.includes('failed') || line.includes('Error:') || line.includes('×') || line.includes('✕')) {
      failLines.push(line.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z /, ''));
    }
  });

  console.log('=== E2E FAILURES (first 60 lines) ===');
  failLines.slice(0, 60).forEach(l => console.log(l));

  // Also show summary at end
  const summaryStart = lines.findIndex(l => l.includes('failed') && l.includes('passed'));
  if (summaryStart >= 0) {
    console.log('\n=== SUMMARY ===');
    lines.slice(Math.max(0, summaryStart - 2), summaryStart + 10).forEach(l =>
      console.log(l.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z /, ''))
    );
  }
}
main().catch(e => console.error('Error:', e.message));
