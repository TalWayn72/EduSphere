const https = require('https');
const fs = require('fs');
const path = require('path');

const LOGS = [
  {
    name: 'Lint',
    url: 'https://productionresultssa8.blob.core.windows.net/actions-results/e4084e04-6224-41fd-9593-879c8ddc0d9f/workflow-job-run-b547b2d8-0144-5edd-85cf-d5bf2e804693/logs/job/job-logs.txt?rsct=text%2Fplain&se=2026-03-02T07%3A18%3A11Z&sig=4QG%2BXLgTKYOruJhJx65Zx%2BmpufIIA51qeqzjskcYycw%3D&ske=2026-03-02T08%3A42%3A24Z&skoid=ca7593d4-ee42-46cd-af88-8b886a2f84eb&sks=b&skt=2026-03-02T04%3A42%3A24Z&sktid=398a6654-997b-47e9-b12b-9515b896b4de&skv=2025-11-05&sp=r&spr=https&sr=b&st=2026-03-02T07%3A08%3A06Z&sv=2025-11-05'
  },
  {
    name: 'Codegen',
    url: 'https://productionresultssa8.blob.core.windows.net/actions-results/e4084e04-6224-41fd-9593-879c8ddc0d9f/workflow-job-run-f9e4b91a-3b41-5730-8ff9-421a178bd80c/logs/job/job-logs.txt?rsct=text%2Fplain&se=2026-03-02T07%3A18%3A11Z&sig=fS4ujZOtqEbGbEjnEpZvgjF8d5T%2F5r7A5CkhySCXcF8%3D&ske=2026-03-02T10%3A30%3A04Z&skoid=ca7593d4-ee42-46cd-af88-8b886a2f84eb&sks=b&skt=2026-03-02T06%3A30%3A04Z&sktid=398a6654-997b-47e9-b12b-9515b896b4de&skv=2025-11-05&sp=r&spr=https&sr=b&st=2026-03-02T07%3A08%3A06Z&sv=2025-11-05'
  },
  {
    name: 'SchemaLinting',
    url: 'https://productionresultssa19.blob.core.windows.net/actions-results/a680e454-2895-4d3a-86c0-aafa3080c696/workflow-job-run-7d175fd5-36fd-5f04-a8f3-ad76989d0c5f/logs/job/job-logs.txt?rsct=text%2Fplain&se=2026-03-02T07%3A18%3A11Z&sig=NYBASCFoC1zNpBIKTuCIXGiArqwdhww7EIGRDX%2FqZ8M%3D&ske=2026-03-02T10%3A17%3A38Z&skoid=ca7593d4-ee42-46cd-af88-8b886a2f84eb&sks=b&skt=2026-03-02T06%3A17%3A38Z&sktid=398a6654-997b-47e9-b12b-9515b896b4de&skv=2025-11-05&sp=r&spr=https&sr=b&st=2026-03-02T07%3A08%3A06Z&sv=2025-11-05'
  },
  {
    name: 'BuildContent',
    url: 'https://productionresultssa19.blob.core.windows.net/actions-results/1da90e80-2a7c-4918-8b8c-0bfde418abb4/workflow-job-run-8acbd5a0-e4f0-557e-8dd7-1c96658a7378/logs/job/job-logs.txt?rsct=text%2Fplain&se=2026-03-02T07%3A18%3A11Z&sig=Mp75C27pkwkmIDett5qeD2yHWwQAUMRzGJSGbvSyKF4%3D&ske=2026-03-02T10%3A30%3A18Z&skoid=ca7593d4-ee42-46cd-af88-8b886a2f84eb&sks=b&skt=2026-03-02T06%3A30%3A18Z&sktid=398a6654-997b-47e9-b12b-9515b896b4de&skv=2025-11-05&sp=r&spr=https&sr=b&st=2026-03-02T07%3A08%3A06Z&sv=2025-11-05'
  }
];

function fetchLog(entry) {
  return new Promise((resolve) => {
    const urlObj = new URL(entry.url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      headers: { 'User-Agent': 'EduSphere-CI-Check' },
      rejectUnauthorized: false
    };
    https.get(options, (res) => {
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => {
        const data = Buffer.concat(chunks).toString('utf8');
        const outPath = path.join(__dirname, 'ci_log_' + entry.name + '.txt');
        fs.writeFileSync(outPath, data, 'utf8');
        console.log(entry.name + ': saved ' + data.length + ' bytes to ' + outPath);
        resolve({name: entry.name, size: data.length});
      });
    }).on('error', e => {
      console.log(entry.name + ': ERROR ' + e.message);
      resolve({name: entry.name, error: e.message});
    });
  });
}

Promise.all(LOGS.map(fetchLog)).then(() => console.log('Done'));
