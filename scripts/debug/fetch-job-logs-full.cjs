/**
 * Fetch full GitHub Actions job logs focused on the pnpm install failure.
 */
'use strict';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const https = require('https');

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
            res(Buffer.concat(chunks).toString('utf8'));
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

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const jobIds = [
    { id: '65358893230', name: 'subgraph-core' },
    { id: '65358893181', name: 'subgraph-annotation' },
  ];

  for (const job of jobIds) {
    console.log('\n' + '='.repeat(70));
    console.log('JOB: ' + job.name + ' (ID: ' + job.id + ')');
    console.log('='.repeat(70));

    const logs = await getLogs(job.id, token);
    const lines = logs.split('\n');

    // Find the pnpm install section - look for "deps 4/4" step
    let inPnpmSection = false;
    let pnpmLines = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Start capturing around the pnpm install step
      if (line.includes('[deps') && line.includes('pnpm install')) {
        inPnpmSection = true;
      }
      if (inPnpmSection) {
        pnpmLines.push(line);
        // Stop after we've captured the error and some context
        if (line.includes('ERROR: failed to build') || line.includes('buildx failed')) {
          // Capture 5 more lines for context
          for (let j = 1; j <= 5 && i + j < lines.length; j++) {
            pnpmLines.push(lines[i + j]);
          }
          break;
        }
      }
    }

    if (pnpmLines.length > 0) {
      console.log('\n--- pnpm install failure section ---');
      console.log(pnpmLines.join('\n'));
    }

    // Also look for the full step 6 output (Build and push Docker image)
    // Find all lines with #17 (the pnpm install docker layer)
    console.log('\n--- All #17 layer lines (pnpm install) ---');
    const layer17Lines = lines.filter(function(l) {
      return l.includes('#17') || l.includes('deps 4/4') || l.includes('frozen-lockfile');
    });
    console.log(layer17Lines.join('\n'));

    // Show 50 lines before the main error
    const errorIdx = lines.findIndex(function(l) {
      return l.includes('ERROR: failed to build: failed to solve');
    });
    if (errorIdx > 0) {
      const start = Math.max(0, errorIdx - 60);
      console.log('\n--- 60 lines before the main ERROR ---');
      console.log(lines.slice(start, errorIdx + 5).join('\n'));
    }
  }
}

main().catch(console.error);
