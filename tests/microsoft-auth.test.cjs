const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const crypto = require('node:crypto');
const jose = require('jose');
const { test } = require('node:test');
const ts = require('typescript');

function load(file, mocks = {}) {
  const filename = path.resolve(__dirname, '..', file);
  const loaded = new Module(filename, module);
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded.require = id => Object.prototype.hasOwnProperty.call(mocks, id) ? mocks[id] : module.require(id);
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText, filename);
  return loaded.exports;
}

const auth = load('src/lib/microsoft-auth.ts', { '@/lib/auth-urls': load('src/lib/auth-urls.ts') });
const production = 'https://portal.bcave.co.kr';
const testServerKey = 'mock-server-key-for-cryptographic-tests';
const cookieContext = Buffer.from('BCAVE EIS Microsoft SSO transaction:v1');
const now = 1_800_000_000_000;

function cookieKey() {
  return Buffer.from(crypto.hkdfSync('sha256', process.env.SUPABASE_SECRET_KEY, cookieContext, 'oauth-state-cookie:aes-256-gcm', 32));
}

function decryptCookie(cookie) {
  const [, iv, ciphertext, tag] = cookie.split('.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', cookieKey(), Buffer.from(iv, 'base64url'));
  decipher.setAAD(cookieContext);
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64url')), decipher.final()]).toString());
}

// Authenticated invalid payloads exercise schema checks after GCM authentication.
function encryptCookie(payload) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', cookieKey(), iv);
  cipher.setAAD(cookieContext);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload)), cipher.final()]);
  return ['v1', iv.toString('base64url'), ciphertext.toString('base64url'), cipher.getAuthTag().toString('base64url')].join('.');
}

function authTest(name, run) {
  test(name, async () => {
    const env = {
      MICROSOFT_TENANT_ID: undefined,
      MICROSOFT_CLIENT_ID: undefined,
      MICROSOFT_CLIENT_SECRET: 'mock-client-secret&=+',
      MICROSOFT_OIDC_PROVIDER_ID: undefined,
      SUPABASE_SECRET_KEY: testServerKey,
      NEXT_PUBLIC_BASE_URL: production,
      NEXT_PUBLIC_AUTH_LOCAL_ORIGINS: undefined,
    };
    const previous = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]));
    const originalFetch = global.fetch;
    const originalNow = Date.now;
    const calls = [];
    try {
      for (const [key, value] of Object.entries(env)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
      Date.now = () => now;
      global.fetch = async (url, options) => {
        calls.push({ url, options });
        return Response.json({ id_token: 'mock-id-token', access_token: 'mock-access-token' });
      };
      await run(calls);
    } finally {
      global.fetch = originalFetch;
      Date.now = originalNow;
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });
}

function callbackInput(request, origin = production) {
  return {
    code: 'one-time-code&=+',
    state: new URL(request.authorizationUrl).searchParams.get('state'),
    transactionCookie: request.transactionCookie,
    origin,
  };
}

authTest('default configuration targets the company tenant and custom Supabase provider', async () => {
  assert.deepEqual(auth.getMicrosoftAuthConfig(), {
    tenantId: '09cefcf6-a744-4cc2-a8ec-681fe0d1a85a',
    clientId: '6bda999f-ddc2-4411-bb66-9e5ece2a7bb2',
    clientSecret: 'mock-client-secret&=+',
    providerId: 'custom:bcave-entra',
  });
});

authTest('authorization uses PKCE, a hashed Supabase-compatible nonce, and the browser callback', async () => {
  for (const origin of [production, 'http://localhost:3000', 'http://127.0.0.1:3000']) {
    const request = auth.createMicrosoftAuthRequest(origin);
    const url = new URL(request.authorizationUrl);
    const transaction = decryptCookie(request.transactionCookie);
    assert.equal(url.origin, 'https://login.microsoftonline.com');
    assert.equal(url.pathname, '/09cefcf6-a744-4cc2-a8ec-681fe0d1a85a/oauth2/v2.0/authorize');
    assert.equal(url.searchParams.get('redirect_uri'), origin + '/auth/callback');
    assert.equal(url.searchParams.get('response_type'), 'code');
    assert.equal(url.searchParams.get('response_mode'), 'query');
    assert.equal(url.searchParams.get('scope'), 'openid profile email');
    assert.equal(url.searchParams.get('prompt'), 'select_account');
    assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
    assert.equal(url.searchParams.get('code_challenge'), crypto.createHash('sha256').update(transaction.verifier).digest('base64url'));
    assert.equal(url.searchParams.get('nonce'), crypto.createHash('sha256').update(transaction.nonce).digest('hex'));
    assert.equal(url.searchParams.get('state'), transaction.state);
    assert.equal(transaction.origin, origin);
    assert.equal(transaction.issuedAt, now / 1000);
    assert.equal(new Set([transaction.state, transaction.nonce, transaction.verifier]).size, 3);
    for (const random of [transaction.state, transaction.nonce, transaction.verifier]) assert.match(random, /^[A-Za-z0-9_-]{43}$/);
    assert.ok(request.transactionCookie.length < 4096);
    for (const secret of [transaction.verifier, transaction.nonce, process.env.MICROSOFT_CLIENT_SECRET, testServerKey]) {
      assert.equal(request.transactionCookie.includes(secret), false);
      assert.equal(request.authorizationUrl.includes(secret), false);
    }
  }
});

authTest('independent starts create distinct states, PKCE verifiers, and encrypted cookies', async () => {
  const a = auth.createMicrosoftAuthRequest(production);
  const b = auth.createMicrosoftAuthRequest(production);
  assert.notEqual(a.transactionCookie, b.transactionCookie);
  assert.notEqual(new URL(a.authorizationUrl).searchParams.get('state'), new URL(b.authorizationUrl).searchParams.get('state'));
  assert.notEqual(decryptCookie(a.transactionCookie).verifier, decryptCookie(b.transactionCookie).verifier);
});

authTest('exchange sends the exact confidential-client credentials and PKCE verifier to the fixed endpoint', async calls => {
  const request = auth.createMicrosoftAuthRequest('http://localhost:3000');
  const result = await auth.exchangeMicrosoftAuthCode(callbackInput(request, 'http://localhost:3000'));
  const transaction = decryptCookie(request.transactionCookie);
  assert.deepEqual(result, { idToken: 'mock-id-token', accessToken: 'mock-access-token', nonce: transaction.nonce, providerId: 'custom:bcave-entra' });
  assert.equal(calls.length, 1);
  const { url, options } = calls[0];
  assert.equal(url, 'https://login.microsoftonline.com/09cefcf6-a744-4cc2-a8ec-681fe0d1a85a/oauth2/v2.0/token');
  assert.equal(options.method, 'POST');
  assert.equal(options.headers['Content-Type'], 'application/x-www-form-urlencoded');
  assert.equal(options.cache, 'no-store');
  assert.equal(options.redirect, 'error');
  assert.ok(options.signal instanceof AbortSignal);
  assert.deepEqual(Object.fromEntries(options.body), {
    client_id: '6bda999f-ddc2-4411-bb66-9e5ece2a7bb2', client_secret: 'mock-client-secret&=+',
    grant_type: 'authorization_code', code: 'one-time-code&=+', redirect_uri: 'http://localhost:3000/auth/callback',
    code_verifier: transaction.verifier,
  });
});

authTest('missing, incorrect, and cross-transaction state never reach the token endpoint', async calls => {
  const request = auth.createMicrosoftAuthRequest(production);
  const other = auth.createMicrosoftAuthRequest(production);
  for (const state of ['', null, undefined, 'short', 'x'.repeat(1000), crypto.randomBytes(32).toString('base64url'), callbackInput(other).state]) {
    await assert.rejects(auth.exchangeMicrosoftAuthCode({ ...callbackInput(request), state }), /Invalid Microsoft authentication transaction/);
  }
  assert.equal(calls.length, 0);
});

authTest('missing, malformed, and tampered GCM cookies cannot exchange a code', async calls => {
  const request = auth.createMicrosoftAuthRequest(production);
  const parts = request.transactionCookie.split('.');
  const tampered = [1, 2, 3].map(index => {
    const copy = [...parts];
    copy[index] = (copy[index][0] === 'A' ? 'B' : 'A') + copy[index].slice(1);
    return copy.join('.');
  });
  for (const transactionCookie of [null, undefined, '', 'x'.repeat(4097), 'v2.' + parts.slice(1).join('.'), parts.slice(0, 3).join('.'), request.transactionCookie + '=', ...tampered]) {
    await assert.rejects(auth.exchangeMicrosoftAuthCode({ ...callbackInput(request), transactionCookie }), /Invalid Microsoft authentication transaction/);
  }
  assert.equal(calls.length, 0);
});

authTest('changing the server encryption key invalidates an outstanding transaction', async calls => {
  const request = auth.createMicrosoftAuthRequest(production);
  process.env.SUPABASE_SECRET_KEY = 'another-server-secret';
  await assert.rejects(auth.exchangeMicrosoftAuthCode(callbackInput(request)), /Invalid Microsoft authentication transaction/);
  assert.equal(calls.length, 0);
});

authTest('transactions cannot cross production/local origins or tenant/client/provider configuration', async calls => {
  const request = auth.createMicrosoftAuthRequest(production);
  for (const origin of ['http://localhost:3000', 'http://127.0.0.1:3000', 'https://attacker.example']) {
    await assert.rejects(auth.exchangeMicrosoftAuthCode(callbackInput(request, origin)));
  }
  for (const [key, changed] of [
    ['MICROSOFT_TENANT_ID', '11111111-2222-3333-4444-555555555555'],
    ['MICROSOFT_CLIENT_ID', '11111111-2222-3333-4444-555555555555'],
    ['MICROSOFT_OIDC_PROVIDER_ID', 'custom:other'],
  ]) {
    process.env[key] = changed;
    await assert.rejects(auth.exchangeMicrosoftAuthCode(callbackInput(request)), /Invalid Microsoft authentication transaction/);
    delete process.env[key];
  }
  assert.equal(calls.length, 0);
});

authTest('ten-minute expiry and future-issued cookies fail before network access', async calls => {
  const request = auth.createMicrosoftAuthRequest(production);
  for (const time of [now - 1000, now + 600_000, now + 601_000]) {
    Date.now = () => time;
    await assert.rejects(auth.exchangeMicrosoftAuthCode(callbackInput(request)), /Invalid Microsoft authentication transaction/);
  }
  assert.equal(calls.length, 0);
  Date.now = () => now + 599_000;
  await auth.exchangeMicrosoftAuthCode(callbackInput(request));
  assert.equal(calls.length, 1);
});

authTest('authenticated cookies with malformed payloads are rejected', async calls => {
  const request = auth.createMicrosoftAuthRequest(production);
  const transaction = decryptCookie(request.transactionCookie);
  const payloads = [null, [], {}, { ...transaction, issuedAt: 1.5 }, { ...transaction, issuedAt: '1800000000' },
    { ...transaction, state: 'short' }, { ...transaction, nonce: null }, { ...transaction, verifier: '' }];
  for (const payload of payloads) {
    await assert.rejects(auth.exchangeMicrosoftAuthCode({ ...callbackInput(request), transactionCookie: encryptCookie(payload) }), /Invalid Microsoft authentication transaction/);
  }
  assert.equal(calls.length, 0);
});

authTest('missing or oversized authorization codes fail before network access', async calls => {
  const request = auth.createMicrosoftAuthRequest(production);
  for (const code of ['', null, undefined, 'x'.repeat(8193)]) {
    await assert.rejects(auth.exchangeMicrosoftAuthCode({ ...callbackInput(request), code }), /Invalid Microsoft authentication transaction/);
  }
  assert.equal(calls.length, 0);
});

authTest('configuration rejects non-tenant endpoints, unsafe providers, and missing secrets', async calls => {
  for (const [key, invalid] of [
    ['MICROSOFT_TENANT_ID', 'common'], ['MICROSOFT_TENANT_ID', 'https://attacker.example'],
    ['MICROSOFT_CLIENT_ID', 'invalid'], ['MICROSOFT_OIDC_PROVIDER_ID', 'azure'],
    ['MICROSOFT_OIDC_PROVIDER_ID', 'custom:UPPER'], ['MICROSOFT_OIDC_PROVIDER_ID', 'custom:' + 'x'.repeat(44)],
    ['MICROSOFT_CLIENT_SECRET', ' '], ['SUPABASE_SECRET_KEY', ''],
  ]) {
    const previous = process.env[key];
    process.env[key] = invalid;
    assert.throws(() => auth.createMicrosoftAuthRequest(production));
    if (previous === undefined) delete process.env[key];
    else process.env[key] = previous;
  }
  assert.equal(calls.length, 0);
});

authTest('provider and network errors do not expose confidential request or response data', async () => {
  const request = auth.createMicrosoftAuthRequest(production);
  for (const reply of [
    async () => { throw new Error('Network failure with mock-client-secret&=+'); },
    async () => new Response('provider details with mock-client-secret&=+', { status: 400 }),
    async () => new Response('not-json with mock-client-secret&=+', { status: 200 }),
    async () => Response.json(null), async () => Response.json({}),
    async () => Response.json({ id_token: '' }), async () => Response.json({ id_token: 123 }),
    async () => Response.json({ id_token: 'id', access_token: null }),
  ]) {
    global.fetch = reply;
    await assert.rejects(auth.exchangeMicrosoftAuthCode(callbackInput(request)), { message: 'Microsoft token exchange failed' });
  }
});

authTest('a successful token response can omit the optional access token', async () => {
  const request = auth.createMicrosoftAuthRequest(production);
  global.fetch = async () => Response.json({ id_token: 'mock-id-token' });
  const result = await auth.exchangeMicrosoftAuthCode(callbackInput(request));
  assert.equal(result.idToken, 'mock-id-token');
  assert.equal(Object.hasOwn(result, 'accessToken'), false);
  assert.equal(result.nonce, decryptCookie(request.transactionCookie).nonce);
});

const testTenant = '09cefcf6-a744-4cc2-a8ec-681fe0d1a85a';
const testClient = '6bda999f-ddc2-4411-bb66-9e5ece2a7bb2';
const testObject = '11111111-2222-4333-8444-555555555555';
const testNonce = crypto.randomBytes(32).toString('base64url');
const testKey = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const testJwk = { ...testKey.publicKey.export({ format: 'jwk' }), kid: 'company-test-key', alg: 'RS256', use: 'sig' };

async function signedIdToken(overrides = {}, header = {}, key = testKey.privateKey) {
  const payload = {
    iss: `https://login.microsoftonline.com/${testTenant}/v2.0`, aud: testClient,
    sub: 'immutable-pairwise-subject', tid: testTenant, oid: testObject, ver: '2.0',
    iat: now / 1000, nbf: now / 1000, exp: now / 1000 + 3600,
    nonce: crypto.createHash('sha256').update(testNonce).digest('hex'),
    email: 'employee@bcave.co.kr', name: '회사 직원', xms_edov: true,
    ...overrides,
  };
  return new jose.SignJWT(payload).setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: 'company-test-key', ...header }).sign(key);
}

function jwksFixture(calls = []) {
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    assert.equal(String(url), `https://login.microsoftonline.com/${testTenant}/discovery/v2.0/keys`);
    return Response.json({ keys: [testJwk] });
  };
  // A fresh helper has an empty key cache while still using the actual jose verifier.
  return load('src/lib/microsoft-auth.ts', { '@/lib/auth-urls': load('src/lib/auth-urls.ts') });
}

authTest('a real RSA-signed company ID token yields only verified immutable identity and display fields', async () => {
  const calls = [];
  const verifier = jwksFixture(calls);
  const identity = await verifier.verifyMicrosoftIdToken({ idToken: await signedIdToken(), nonce: testNonce });
  assert.deepEqual(identity, { tenantId: testTenant, objectId: testObject, email: 'employee@bcave.co.kr', name: '회사 직원', companyDomainVerified: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.redirect, 'manual');
  assert.ok(calls[0].options.signal instanceof AbortSignal);
});

authTest('an attacker signature, modified payload, or non-RS256 algorithm cannot authenticate', async () => {
  const verifier = jwksFixture();
  const otherKey = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const valid = await signedIdToken();
  const parts = valid.split('.');
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url'));
  parts[1] = Buffer.from(JSON.stringify({ ...payload, oid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' })).toString('base64url');
  const hmac = await new jose.SignJWT(payload).setProtectedHeader({ alg: 'HS256', typ: 'JWT' }).sign(crypto.randomBytes(32));
  for (const idToken of [await signedIdToken({}, {}, otherKey.privateKey), parts.join('.'), hmac,
    await signedIdToken({}, { alg: 'RS512' }), 'not-a-token']) {
    await assert.rejects(verifier.verifyMicrosoftIdToken({ idToken, nonce: testNonce }), { message: 'Invalid Microsoft ID token' });
  }
});

authTest('signed tokens from another issuer, tenant, audience, or nonce cannot authenticate', async () => {
  const verifier = jwksFixture();
  for (const overrides of [
    { iss: 'https://attacker.example/v2.0' }, { iss: `https://login.microsoftonline.com/${testTenant}` },
    { tid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' }, { aud: 'another-application' },
    { nonce: crypto.createHash('sha256').update('different-nonce').digest('hex') },
    { nonce: testNonce }, { nonce: '' }, { ver: '1.0' },
  ]) {
    await assert.rejects(verifier.verifyMicrosoftIdToken({ idToken: await signedIdToken(overrides), nonce: testNonce }), { message: 'Invalid Microsoft ID token' });
  }
});

authTest('expired, premature, stale, non-integral, and missing time claims are rejected', async () => {
  const verifier = jwksFixture();
  for (const overrides of [
    { exp: now / 1000 - 60 }, { nbf: now / 1000 + 60 }, { iat: now / 1000 + 60 },
    { iat: now / 1000 - 631 }, { iat: now / 1000 + 0.5 }, { exp: 'tomorrow' },
    { exp: undefined }, { nbf: undefined }, { iat: undefined }, { exp: now / 1000 },
  ]) {
    await assert.rejects(verifier.verifyMicrosoftIdToken({ idToken: await signedIdToken(overrides), nonce: testNonce }), { message: 'Invalid Microsoft ID token' });
  }
});

authTest('missing or malformed immutable identity claims cannot create a Microsoft account', async () => {
  const verifier = jwksFixture();
  for (const overrides of [
    { tid: undefined }, { oid: undefined }, { oid: 'employee@bcave.co.kr' }, { oid: {} },
    { sub: undefined }, { sub: '' }, { nonce: undefined }, { ver: undefined },
  ]) {
    await assert.rejects(verifier.verifyMicrosoftIdToken({ idToken: await signedIdToken(overrides), nonce: testNonce }), { message: 'Invalid Microsoft ID token' });
  }
});

authTest('token headers cannot choose a different JWKS or inject a signing key', async () => {
  const calls = [];
  const verifier = jwksFixture(calls);
  const token = await signedIdToken({}, { jku: 'https://attacker.example/keys', x5u: 'https://attacker.example/cert', jwk: testJwk });
  assert.equal((await verifier.verifyMicrosoftIdToken({ idToken: token, nonce: testNonce })).objectId, testObject);
  assert.equal(calls.length, 1);
  assert.equal(String(calls[0].url), `https://login.microsoftonline.com/${testTenant}/discovery/v2.0/keys`);
});

authTest('only a verified exact bcave.co.kr email domain can authenticate', async () => {
  const verifier = jwksFixture();
  for (const overrides of [
    {email:'employee@example.com'}, {email:'employee@sub.bcave.co.kr'},
    {email:'employee@bcave.co.kr.attacker.test'}, {email:'employee@evilbcave.co.kr'},
    {email:undefined, preferred_username:'employee@bcave.co.kr'},
    {email:'wrong\n@bcave.co.kr'}, {xms_edov:false}, {xms_edov:undefined}, {xms_edov:'true'},
  ]) {
    await assert.rejects(verifier.verifyMicrosoftIdToken({idToken:await signedIdToken(overrides),nonce:testNonce}), {name:'MicrosoftDomainNotAllowedError'});
  }
  const allowed = await verifier.verifyMicrosoftIdToken({idToken:await signedIdToken({email:' Employee@BCAVE.CO.KR '}),nonce:testNonce});
  assert.equal(allowed.companyDomainVerified,true);
  assert.equal(allowed.email,'employee@bcave.co.kr');
});

authTest('Microsoft aliases are deterministic, tenant-scoped, non-deliverable, and independent of company email', async () => {
  const alias = auth.getMicrosoftAccountEmail(testTenant, testObject);
  assert.match(alias, /^[a-f0-9]{64}@microsoft-sso\.invalid$/);
  assert.equal(alias.split('@')[0].length, 64);
  assert.equal(auth.getMicrosoftAccountEmail(testTenant.toUpperCase(), testObject.toUpperCase()), alias);
  assert.notEqual(auth.getMicrosoftAccountEmail('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', testObject), alias);
  assert.notEqual(auth.getMicrosoftAccountEmail(testTenant, 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'), alias);
  for (const [tenantId, objectId] of [[testTenant, 'employee@bcave.co.kr'], ['common', testObject], ['', testObject], [testTenant, null]]) {
    assert.throws(() => auth.getMicrosoftAccountEmail(tenantId, objectId), /Invalid Microsoft account identity/);
  }
  const verifier = jwksFixture();
  const changedEmail = await verifier.verifyMicrosoftIdToken({ idToken: await signedIdToken({ email: 'renamed@bcave.co.kr' }), nonce: testNonce });
  assert.equal(auth.getMicrosoftAccountEmail(changedEmail.tenantId, changedEmail.objectId), alias);
});
