'use strict';
const http = require('http');
function post(path, body) {
  return new Promise((resolve, reject) => {
    const req = http.request({hostname:'localhost',port:8080,path,method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','Content-Length':Buffer.byteLength(body)}}, res => {
      let d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve({s:res.statusCode,b:d}));
    });
    req.on('error',reject); req.write(body); req.end();
  });
}
function get(path, token) {
  return new Promise((resolve, reject) => {
    const req = http.request({hostname:'localhost',port:8080,path,method:'GET',headers:{Authorization:'Bearer '+token}}, res => {
      let d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve({s:res.statusCode,b:d}));
    });
    req.on('error',reject); req.end();
  });
}
function postToken(path, body, token) {
  return new Promise((resolve, reject) => {
    const req = http.request({hostname:'localhost',port:8080,path,method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','Content-Length':Buffer.byteLength(body),Authorization:'Bearer '+token}}, res => {
      let d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve({s:res.statusCode,b:d}));
    });
    req.on('error',reject); req.write(body); req.end();
  });
}
function gql(query) {
  const body = JSON.stringify({query});
  return new Promise((resolve, reject) => {
    const req = http.request({hostname:'localhost',port:4001,path:'/graphql',method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}}, res => {
      let d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve({s:res.statusCode,b:d}));
    });
    req.on('error',reject); req.write(body); req.end();
  });
}
function gqlAuth(query, token) {
  const body = JSON.stringify({query});
  return new Promise((resolve, reject) => {
    const req = http.request({hostname:'localhost',port:4001,path:'/graphql',method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body),'Authorization':'Bearer '+token}}, res => {
      let d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve({s:res.statusCode,b:d}));
    });
    req.on('error',reject); req.write(body); req.end();
  });
}
async function main() {
  // Step 1: Admin token
  const r1 = await post('/realms/master/protocol/openid-connect/token','client_id=admin-cli&username=admin&password=admin&grant_type=password');
  const data1 = JSON.parse(r1.b);
  const adminTok = data1.access_token;
  if (!adminTok) { console.log('FAIL admin token:', r1.b.slice(0,300)); return; }
  console.log('✅ Admin token OK');

  // Step 2: List users
  const r2 = await get('/admin/realms/edusphere/users?max=10', adminTok);
  const users = JSON.parse(r2.b);
  if (!Array.isArray(users)) { console.log('FAIL users:', r2.b.slice(0,300)); return; }
  console.log('\nKeycloak users:');
  users.forEach(u => console.log('  id:', u.id, '| email:', u.email));
  console.log('Total:', users.length);

  // Step 3: Get instructor token (password from reset script)
  const instructor = users.find(u => u.email === 'instructor@example.com');
  if (!instructor) { console.log('No instructor user found'); return; }
  console.log('\n✅ Instructor KC ID:', instructor.id);
  const idIsCorrect = instructor.id === '00000000-0000-0000-0000-000000000002';
  console.log(idIsCorrect ? '✅ UUID is CORRECT (00000000-...002)' : '❌ UUID WRONG, expected 00000000-0000-0000-0000-000000000002, got ' + instructor.id);

  // Step 4: Get user token for instructor
  const tokenBody = 'client_id=edusphere-web&username=instructor%40example.com&password=Instructor123%21&grant_type=password';
  const r3 = await post('/realms/edusphere/protocol/openid-connect/token', tokenBody);
  const userTokenData = JSON.parse(r3.b);
  const userTok = userTokenData.access_token;
  if (!userTok) { console.log('FAIL user token:', r3.b.slice(0,300)); return; }
  console.log('✅ Instructor user token obtained');

  // Decode JWT sub
  const payload = JSON.parse(Buffer.from(userTok.split('.')[1], 'base64').toString());
  console.log('JWT sub:', payload.sub, '| tenant_id:', payload.tenant_id, '| role:', payload.role);
  console.log(payload.sub === '00000000-0000-0000-0000-000000000002' ? '✅ JWT sub MATCHES DB id' : '❌ JWT sub MISMATCH');

  // Step 5: Test ME query on subgraph-core
  const r4 = await gqlAuth('{ me { id email role } }', userTok);
  const meData = JSON.parse(r4.b);
  console.log('\nME query result:', JSON.stringify(meData, null, 2));
  if (meData.data && meData.data.me) {
    console.log('✅ ME QUERY WORKS! User:', meData.data.me.email, '| Role:', meData.data.me.role);
  } else {
    console.log('❌ ME QUERY RETURNED NULL');
  }
}
main().catch(e => console.log('ERR:', e.message, e.stack));
