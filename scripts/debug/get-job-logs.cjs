const https = require('https');
const TOKEN = process.env.GITHUB_TOKEN || '';

function apiCall(path) {
  return new Promise((res, rej) => {
    const opts = {
      hostname: 'api.github.com',
      path,
      headers: {
        'User-Agent': 'EduSphere-CI-Check',
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': 'token ' + TOKEN
      },
      rejectUnauthorized: false
    };
    https.get(opts, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => {
        try { res({ status: r.statusCode, body: JSON.parse(d) }); }
        catch(e) { res({ status: r.statusCode, body: d }); }
      });
    }).on('error', rej);
  });
}

function getJobLog(jobId) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.github.com',
      path: '/repos/TalWayn72/EduSphere/actions/jobs/' + jobId + '/logs',
      method: 'GET',
      headers: {
        'User-Agent': 'EduSphere-CI-Check',
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': 'token ' + TOKEN
      },
      rejectUnauthorized: false
    };
    const req = https.request(opts, function(r) {
      if (r.statusCode === 302 || r.statusCode === 301) {
        var redirectUrl = r.headers['location'];
        if (!redirectUrl) { resolve('No redirect URL'); return; }
        var urlObj = new URL(redirectUrl);
        var redirectOpts = {
          hostname: urlObj.hostname,
          path: urlObj.pathname + urlObj.search,
          method: 'GET',
          headers: { 'User-Agent': 'EduSphere-CI-Check' },
          rejectUnauthorized: false
        };
        https.get(redirectOpts, function(r2) {
          var chunks = [];
          r2.on('data', function(c) { chunks.push(c); });
          r2.on('end', function() { resolve(Buffer.concat(chunks).toString('utf8')); });
        }).on('error', reject);
      } else {
        var d = '';
        r.on('data', function(c) { d += c; });
        r.on('end', function() { resolve(d); });
      }
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  var CI_RUN_ID = 22568969274;
  var CD_RUN_ID = 22568969226;

  console.log('=== Fetching CI Run Jobs ===');
  var ciJobs = await apiCall('/repos/TalWayn72/EduSphere/actions/runs/' + CI_RUN_ID + '/jobs?per_page=50');
  var lintJobId = null;
  var lintJobName = null;
  if (ciJobs.body && ciJobs.body.jobs) {
    ciJobs.body.jobs.forEach(function(job) {
      var icon = job.conclusion === 'success' ? 'PASS' : job.conclusion === 'failure' ? 'FAIL' : job.status === 'in_progress' ? 'RUNNING' : job.conclusion === 'skipped' ? 'SKIP' : job.status;
      console.log('[' + icon + '] ' + job.name + ' (id=' + job.id + ')');
      if (job.conclusion === 'failure') {
        if (job.steps) {
          job.steps.forEach(function(step) {
            if (step.conclusion === 'failure') {
              console.log('  FAILED STEP: ' + step.name);
            }
          });
        }
        if (!lintJobId) {
          lintJobId = job.id;
          lintJobName = job.name;
        }
      }
    });
  } else {
    console.log('CI jobs response:', JSON.stringify(ciJobs.body).substring(0, 400));
  }

  if (lintJobId) {
    console.log('\n=== Logs for first failed CI job: ' + lintJobName + ' (id=' + lintJobId + ') ===');
    try {
      var log = await getJobLog(lintJobId);
      var lines = log.split('\n');
      // Focus on error context
      var relevantLines = [];
      for (var i = 0; i < lines.length; i++) {
        var l = lines[i].toLowerCase();
        if (l.indexOf('error') !== -1 || l.indexOf('prettier') !== -1 || l.indexOf('eslint') !== -1 ||
            l.indexOf('fail') !== -1 || l.indexOf('✗') !== -1 || l.indexOf('warning') !== -1) {
          for (var j = Math.max(0, i-1); j <= Math.min(lines.length-1, i+3); j++) {
            if (relevantLines.indexOf(j) === -1) relevantLines.push(j);
          }
        }
      }
      relevantLines.sort(function(a,b){return a-b;});
      if (relevantLines.length > 0 && relevantLines.length < 200) {
        relevantLines.forEach(function(idx) { console.log(lines[idx]); });
      } else {
        // Last 200 lines
        var start = Math.max(0, lines.length - 200);
        console.log(lines.slice(start).join('\n'));
      }
    } catch(e) {
      console.log('Error fetching lint logs:', e.message);
    }
  }

  console.log('\n=== Fetching CD Run Jobs ===');
  var cdJobs = await apiCall('/repos/TalWayn72/EduSphere/actions/runs/' + CD_RUN_ID + '/jobs?per_page=50');
  var firstFailedCdJobId = null;
  var firstFailedCdJobName = null;
  if (cdJobs.body && cdJobs.body.jobs) {
    cdJobs.body.jobs.forEach(function(job) {
      var icon = job.conclusion === 'success' ? 'PASS' : job.conclusion === 'failure' ? 'FAIL' : job.status === 'in_progress' ? 'RUNNING' : job.conclusion === 'skipped' ? 'SKIP' : job.status;
      console.log('[' + icon + '] ' + job.name + ' (id=' + job.id + ')');
      if (job.conclusion === 'failure') {
        if (job.steps) {
          job.steps.forEach(function(step) {
            console.log('  Step [' + (step.conclusion || step.status) + ']: ' + step.name);
          });
        }
        if (!firstFailedCdJobId) {
          firstFailedCdJobId = job.id;
          firstFailedCdJobName = job.name;
        }
      }
    });
  }

  if (firstFailedCdJobId) {
    console.log('\n=== Logs for first failed CD job: ' + firstFailedCdJobName + ' (id=' + firstFailedCdJobId + ') ===');
    try {
      var cdLog = await getJobLog(firstFailedCdJobId);
      var cdLines = cdLog.split('\n');
      // Find error context
      var errLines = [];
      for (var i = 0; i < cdLines.length; i++) {
        var l = cdLines[i];
        if (l.toLowerCase().indexOf('error') !== -1 ||
            l.indexOf('SARIF') !== -1 ||
            l.indexOf('403') !== -1 ||
            l.indexOf('401') !== -1 ||
            l.indexOf('denied') !== -1 ||
            l.indexOf('failed') !== -1 ||
            l.indexOf('upload') !== -1 ||
            l.indexOf('Upload') !== -1) {
          for (var j = Math.max(0, i-2); j <= Math.min(cdLines.length-1, i+4); j++) {
            if (errLines.indexOf(j) === -1) errLines.push(j);
          }
        }
      }
      errLines.sort(function(a,b){return a-b;});
      if (errLines.length > 0 && errLines.length < 300) {
        errLines.forEach(function(idx) { console.log(cdLines[idx]); });
      } else {
        var start = Math.max(0, cdLines.length - 150);
        console.log(cdLines.slice(start).join('\n'));
      }
    } catch(e) {
      console.log('Error fetching CD logs:', e.message);
    }
  }
}

main().catch(console.error);
