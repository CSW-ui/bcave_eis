const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createServerClient } = require('@supabase/ssr');
const { serializeCookieHeader: serialize } = require('@supabase/ssr');

const user = {
  id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated',
  email: 'a'.repeat(64) + '@microsoft-sso.invalid',
  app_metadata: { provider: 'email', providers: ['email'], auth_source: 'microsoft', microsoft_access_approved: true,
    microsoft_email: 'staff@bcave.co.kr', microsoft_tenant_id: '22222222-2222-4222-8222-222222222222',
    microsoft_object_id: '33333333-3333-4333-8333-333333333333' },
  user_metadata: { name: '테스트 사용자' }, identities: [{ provider: 'email', identity_data: { email: 'a'.repeat(64) + '@microsoft-sso.invalid' } }],
  created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-15T00:00:00Z',
};
function token(account, nonce = '') {
  return [Buffer.from(JSON.stringify({ alg: 'ES256', typ: 'JWT', kid: 'test-key' })).toString('base64url'),
    Buffer.from(JSON.stringify({ sub: account.id, aud: 'authenticated', role: 'authenticated', exp: Math.floor(Date.now()/1000)+3600,
      iat: Math.floor(Date.now()/1000), session_id: '44444444-4444-4444-8444-444444444444',
      aal: 'aal1', email: account.email, app_metadata: account.app_metadata, user_metadata: account.user_metadata, nonce })).toString('base64url'),
    Buffer.alloc(64).toString('base64url')].join('.');
}
function fixture(mode = 'tokens-only', account = user, jar = new Map()) {
  const writes = [], calls = [];
  let version = 0;
  const client = createServerClient('https://example.supabase.co', 'sb_publishable_test', {
    cookies: { encode: mode, getAll: () => [...jar].map(([name,value]) => ({name,value})),
      setAll(values) { for (const c of values) { writes.push(c); if (!c.value) jar.delete(c.name); else jar.set(c.name,c.value); } } },
    global: { fetch: async (url, init) => {
      const pathname = new URL(url).pathname; calls.push(pathname);
      if (pathname.endsWith('/user')) return Response.json(account);
      if (pathname.endsWith('/logout')) return new Response(null, {status:204});
      assert.ok(pathname.endsWith('/verify') || pathname.endsWith('/token'), pathname);
      return Response.json({access_token:token(account,String(version++)),refresh_token:'r'.repeat(24),token_type:'bearer',expires_in:3600,user:account});
    } },
  });
  return {client,jar,writes,calls};
}
function headerBytes(writes) {
  return writes.reduce((sum,c) => sum+Buffer.byteLength('Set-Cookie: '+serialize(c.name,c.value,c.options)+'\r\n'),0);
}

test('real SSR SDK stores tokens without a duplicated user and reduces Set-Cookie bytes', async () => {
  const full=fixture('user-and-tokens'), compact=fixture();
  for (const f of [full,compact]) {
    const {data,error}=await f.client.auth.verifyOtp({type:'magiclink',token_hash:'fixture-hash'});
    assert.equal(error,null); assert.equal(data.user.id,user.id);
  }
  const fullBytes=headerBytes(full.writes),compactBytes=headerBytes(compact.writes);
  assert.ok(compactBytes < fullBytes*0.8,`${compactBytes} vs ${fullBytes}`);
  const encoded=[...compact.jar.values()].join('');
  const decoded=JSON.parse(Buffer.from(encoded.replace(/^base64-/,''),'base64url').toString());
  assert.equal(decoded.user,undefined);assert.ok(decoded.access_token);assert.ok(decoded.refresh_token);
  console.info('Synthetic SSR cookie headers (bytes):', {full:fullBytes,tokensOnly:compactBytes});
});

test('MS and EIS token cookies survive a new server client, refresh, and signout', async () => {
  for (const account of [user,{...user,email:'staff@bcave.co.kr',app_metadata:{provider:'email',providers:['email']}}]) {
    const f=fixture('tokens-only',account);
    await f.client.auth.verifyOtp({type:'magiclink',token_hash:'fixture-hash'});
    const next=fixture('tokens-only',account,f.jar);
    assert.equal((await next.client.auth.getUser()).data.user.id,account.id);
    assert.ok((await next.client.auth.getSession()).data.session.access_token);
    const refreshed=await next.client.auth.refreshSession();
    assert.equal(refreshed.error,null);assert.equal(refreshed.data.user.id,account.id);
    assert.equal((await next.client.auth.signOut({scope:'local'})).error,null);
    assert.equal(f.jar.size,0);
  }
});

test('existing full session cookies remain readable and migrate on refresh', async () => {
  const old=fixture('user-and-tokens');await old.client.auth.verifyOtp({type:'magiclink',token_hash:'fixture-hash'});
  const next=fixture('tokens-only',user,old.jar);
  assert.equal((await next.client.auth.getUser()).data.user.id,user.id);
  assert.equal((await next.client.auth.refreshSession()).error,null);
  const encoded=[...next.jar.values()].join('');
  assert.equal(JSON.parse(Buffer.from(encoded.replace(/^base64-/,''),'base64url').toString()).user,undefined);
});


test('EIS OTP remains required with token-only cookies and verified TOTP factors', async () => {
 const account={...user,email:'staff@bcave.co.kr',app_metadata:{provider:'email',providers:['email']},
   factors:[{id:'totp-fixture',factor_type:'totp',status:'verified',created_at:user.created_at,updated_at:user.updated_at}]};
 const f=fixture('tokens-only',account);await f.client.auth.verifyOtp({type:'magiclink',token_hash:'fixture-hash'});
 const next=fixture('tokens-only',account,f.jar);
 const {data:{session}}=await next.client.auth.getSession();
 const result=await next.client.auth.mfa.getAuthenticatorAssuranceLevel(session.access_token);
 assert.equal(result.error,null);assert.equal(result.data.currentLevel,'aal1');assert.equal(result.data.nextLevel,'aal2');
});
