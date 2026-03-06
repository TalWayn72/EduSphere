/**
 * Fetch GitHub Actions job logs for failed Docker build jobs.
 * Usage: NODE_TLS_REJECT_UNAUTHORIZED=0 node scripts/fetch-job-logs.cjs
 */
'use strict';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const https = require('https');

function apiCall(path, token) {
  return new Promise((res, rej) => {
    const opts = {
      hostname: 'api.github.com',
      path: path,
      headers: {
        'User-Agent': 'EduSphere',
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': 'token ' + token,
      },
      rejectUnauthorized: false,
    };
    https.get(opts, function(r) {
      let d = '';
      r.on('data', function(c) { d += c; });
      r.on('end', function() {
        try { res(JSON.parse(d)); }
        catch(e) { res({ raw: d, status: r.statusCode }); }
      });
    }).on('error', rej);
  });
}

function getLogs(jobId, token) {
  return new Promise(function(res, rej) {
    const opts = {
      hostname: 'api.github.com',
      path: '/repos/TalWayn72/EduSphere/actions/jobs/' + jobId + '/logs',
      headers: {
        'User-Agent': 'EduSphere',
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': 'token ' + token,
      },
      rejectUnauthorized: false,
    };
    https.get(opts, function(r) {
      if (r.statusCode === 302 && r.headers.location) {
        // Follow the redirect to the actual log URL
        const location = r.headers.location;
        const urlObj = new URL(location);
        const followOpts = {
          hostname: urlObj.hostname,
          path: urlObj.pathname + urlObj.search,
          headers: { 'User-Agent': 'EduSphere' },
          rejectUnauthorized: false,
        };
        https.get(followOpts, function(r2) {
          const chunks = [];
          r2.on('data', function(c) { chunks.push(c); });
          r2.on('end', function() {
            const text = Buffer.concat(chunks).toString('utf8');
            res(text);
          });
        }).on('error', rej);
      } else {
        let d = '';
        r.on('data', function(c) { d += c; });
        r.on('end', function() { res(d); });
      }
    }).on('error', rej);
  });
}

function extractErrors(logText) {
  // Extract lines around ERROR/error/FAILED/failed patterns
  const lines = logText.split('\n');
  const errorLines = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/error|Error|ERROR|FAILED|failed|FAIL|denied|unauthorized|Unauthorized|no such|not found|Cannot find/i.test(line)) {
      // Include 2 lines before and 2 after for context
      const start = Math.max(0, i - 2);
      const end = Math.min(lines.length - 1, i + 2);
      for (let j = start; j <= end; j++) {
        errorLines.push(lines[j]);
      }
      errorLines.push('---');
    }
  }
  return errorLines.join('\n');
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.log('ERROR: No GITHUB_TOKEN environment variable set.');
    console.log('Set it with: export GITHUB_TOKEN=<your-token>');
    return;
  }

  const jobIds = [
    { id: '65358893230', name: 'subgraph-core' },
    { id: '65358893181', name: 'subgraph-annotation' },
  ];

  for (const job of jobIds) {
    console.log('\n' + '='.repeat(70));
    console.log('JOB: ' + job.name + ' (ID: ' + job.id + ')');
    console.log('='.repeat(70));

    // Get job metadata first
    const meta = await apiCall('/repos/TalWayn72/EduSphere/actions/jobs/' + job.id, token);
    if (meta.raw) {
      console.log('Job metadata fetch failed (status ' + meta.status + '):', meta.raw.slice(0, 200));
    } else if (meta.message) {
      console.log('API message:', meta.message);
    } else {
      console.log('Job name:', meta.name);
      console.log('Status:', meta.status, '|', 'Conclusion:', meta.conclusion);
      if (meta.steps) {
        console.log('\nFailed steps:');
        for (const step of meta.steps) {
          if (step.conclusion === 'failure') {
            console.log('  FAILED STEP [' + step.number + ']: ' + step.name);
          }
        }
      }
    }

    // Get the actual logs
    console.log('\nFetching logs...');
    try {
      const logs = await getLogs(job.id, token);
      if (logs.length === 0) {
        console.log('(empty log response)');
      } else {
        // Print last 8000 chars which usually has the error
        const tail = logs.slice(-8000);
        console.log('\n--- LAST 8000 chars of log ---');
        console.log(tail);
        console.log('\n--- EXTRACTED ERROR LINES ---');
        console.log(extractErrors(logs));
      }
    } catch(e) {
      console.log('Error fetching logs:', e.message);
    }
  }
}

main().catch(console.error);
