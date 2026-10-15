const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
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

const urls = load('src/lib/auth-urls.ts');
const production = 'https://portal.bcave.co.kr';
const defaults = {};
const resolve = (url, headers = {}, config = defaults) =>
  urls.resolveAuthRequestOrigin(new Request(url, { headers }), config);

test('Microsoft login preserves production and both default local browser origins', () => {
  for (const origin of [production, 'http://localhost:3000', 'http://127.0.0.1:3000']) {
    assert.equal(urls.getMicrosoftCallbackUrl(origin, defaults), origin + '/auth/callback');
    assert.equal(resolve(origin + '/auth/callback?code=one-time-code'), origin);
  }
});

test('a public host resolves to HTTPS behind an internal HTTP proxy', () => {
  for (const internalUrl of ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://next-server:3000']) {
    assert.equal(resolve(internalUrl + '/auth/callback', {
      host: 'next-server:3000', 'x-forwarded-host': 'portal.bcave.co.kr', 'x-forwarded-proto': 'https',
    }), production);
    assert.equal(resolve(internalUrl + '/auth/callback', { host: 'portal.bcave.co.kr' }), production);
  }
});

test('a default local proxy keeps the local browser origin instead of the production origin', () => {
  assert.equal(resolve('http://next-server:3000/auth/callback', {
    host: 'next-server:3000', 'x-forwarded-host': 'localhost:3000', 'x-forwarded-proto': 'http',
  }), 'http://localhost:3000');
});

test('alternate local ports require an explicit exact origin', () => {
  const config = { publicBaseUrl: production, localOrigins: 'http://localhost:3105,http://127.0.0.1:3105' };
  for (const origin of ['http://localhost:3105', 'http://127.0.0.1:3105']) {
    assert.throws(() => urls.getMicrosoftCallbackUrl(origin, defaults));
    assert.equal(resolve(origin + '/auth/callback'), null);
    assert.equal(urls.getMicrosoftCallbackUrl(origin, config), origin + '/auth/callback');
    assert.equal(resolve('http://next-server:3000/auth/callback', {
      'x-forwarded-host': new URL(origin).host, 'x-forwarded-proto': 'http',
    }, config), origin);
  }
  assert.equal(resolve('http://localhost:3106/auth/callback', {}, config), null);
});

test('a separately configured HTTPS public origin is explicitly allowlisted', () => {
  const config = { publicBaseUrl: 'https://staging.bcave.co.kr/' };
  assert.equal(urls.getMicrosoftCallbackUrl('https://staging.bcave.co.kr', config), 'https://staging.bcave.co.kr/auth/callback');
  assert.equal(resolve('http://next-server:3000/auth/callback', {
    'x-forwarded-host': 'staging.bcave.co.kr', 'x-forwarded-proto': 'https',
  }, config), 'https://staging.bcave.co.kr');
});

test('blank local configuration needs no alternate origins', () => {
  assert.deepEqual(urls.getAllowedAuthOrigins({ localOrigins: '  ' }), urls.getAllowedAuthOrigins(defaults));
});

test('unknown origins and insecure production HTTP cannot start or finish Microsoft login', () => {
  for (const origin of ['https://attacker.example', 'http://portal.bcave.co.kr', 'https://portal.bcave.co.kr.attacker.example', 'https://localhost:3000']) {
    assert.throws(() => urls.getMicrosoftCallbackUrl(origin, defaults));
    assert.equal(resolve(origin + '/auth/callback'), null);
  }
});

test('forwarded hosts must match a single exact allowed host', () => {
  for (const forwardedHost of [
    'attacker.example', 'portal.bcave.co.kr.attacker.example', 'portal.bcave.co.kr, attacker.example',
    'attacker.example, portal.bcave.co.kr', 'portal.bcave.co.kr:8443', 'portal.bcave.co.kr@attacker.example',
    'portal.bcave.co.kr/path', 'https://portal.bcave.co.kr', 'portal.bcave.co.kr.', 'localhost:3106', '',
  ]) {
    assert.equal(resolve('http://localhost:3000/auth/callback', {
      host: 'portal.bcave.co.kr', 'x-forwarded-host': forwardedHost, 'x-forwarded-proto': 'https',
    }), null, forwardedHost);
  }
});

test('unknown direct Host values cannot fall back to a loopback request URL', () => {
  assert.equal(resolve('http://localhost:3000/auth/callback', { host: 'attacker.example' }), null);
});

test('untrusted forwarded protocols and mismatched schemes fail closed', () => {
  for (const proto of ['https, http', 'ftp', 'https://attacker.example', '', 'http']) {
    assert.equal(resolve('http://localhost:3000/auth/callback', {
      'x-forwarded-host': 'portal.bcave.co.kr', 'x-forwarded-proto': proto,
    }), null, proto);
  }
  assert.equal(resolve('http://localhost:3000/auth/callback', {
    'x-forwarded-host': 'localhost:3000', 'x-forwarded-proto': 'https',
  }), null);
});

test('public configuration rejects credentials, paths, queries and remote HTTP', () => {
  for (const publicBaseUrl of [
    'http://portal.bcave.co.kr', 'https://user:password@portal.bcave.co.kr', 'https://portal.bcave.co.kr/dashboard',
    'https://portal.bcave.co.kr?next=evil', 'https://portal.bcave.co.kr#fragment', 'not-a-url',
  ]) assert.throws(() => urls.getAllowedAuthOrigins({ publicBaseUrl }));
});

test('additional local configuration cannot allow arbitrary external redirect targets', () => {
  for (const localOrigins of ['https://attacker.example', 'http://0.0.0.0:3105', 'http://localhost:3105/evil', 'http://localhost:3105,']) {
    assert.throws(() => urls.getAllowedAuthOrigins({ localOrigins }));
  }
});

function callbackFixture() {
  const state = { exchanges: [], grants: [], tokenChecks: [], accounts: [], otp: [] };
  const transactionCookie = 'test-encrypted-transaction';
  const identity = { tenantId: 'tenant-id', objectId: 'object-id', email: 'staff@example.test', name: 'Staff' };
  const account = { id: 'isolated-user-id', email: 'alias@microsoft-sso.invalid', app_metadata: { auth_source: 'microsoft', microsoft_access_approved: true } };
  const query = { select() { return query; }, eq() { return query; }, async maybeSingle() { return { data: { role: 'staff' }, error: null }; } };
  const callback = load('src/app/auth/callback/route.ts', {
    '@/lib/auth-urls': { resolveAuthRequestOrigin: request => urls.resolveAuthRequestOrigin(request, defaults) },
    '@/lib/auth-network': load('src/lib/auth-network.ts'),
    '@/lib/auth-policy': { isApprovedRole: role => role === 'staff' },
    '@/lib/microsoft-auth': {
      MICROSOFT_TRANSACTION_COOKIE: 'eis-microsoft-sso',
      async exchangeMicrosoftAuthCode(input) {
        state.exchanges.push(input);
        return { idToken: 'test-id-token', nonce: 'raw-nonce', accessToken: 'test-access-token' };
      },
      async verifyMicrosoftIdToken(input) { state.tokenChecks.push(input); return identity; },
    },
    '@/lib/microsoft-account': {
      async ensureMicrosoftAccount(value) { state.accounts.push(value); return account; },
    },
    '@/lib/account-source': load('src/lib/account-source.ts'),
    '@/lib/microsoft-session': {
      MICROSOFT_SESSION_COOKIE: 'eis-microsoft-session', MICROSOFT_SESSION_COOKIE_MAX_AGE: 400 * 24 * 60 * 60,
      getSessionId: () => 'supabase-session-id',
      createMicrosoftSessionProof: async () => 'signed-session-proof',
    },
    'next/headers': { cookies: () => ({ get: () => ({ value: transactionCookie }) }) },
    '@/lib/supabase': { supabaseAdmin: {
      from: () => query,
      auth: { admin: { async generateLink(input) {
        state.grants.push(input);
        return { data: { user: account, properties: { hashed_token: 'isolated-grant-hash' } }, error: null };
      } } },
    } },
    '@/lib/supabase-server': {
      createSupabaseServerClient: () => ({ auth: {
        async verifyOtp(input) {
          state.otp.push(input);
          return { data: { user: account, session: { access_token: 'supabase-access-token' } }, error: null };
        },
        signInWithIdToken() { assert.fail('Native OAuth must not be used for separate Microsoft accounts'); },
      } }),
    },
  }).GET;
  return { callback, state };
}

test('callback redirects to the public browser origin after successful code exchange behind a proxy', async () => {
  const original = process.env.NEXT_PUBLIC_MICROSOFT_SSO_ENABLED;
  process.env.NEXT_PUBLIC_MICROSOFT_SSO_ENABLED = 'true';
  try {
    const { callback, state } = callbackFixture();
    const response = await callback(new Request('http://localhost:3000/auth/callback?code=valid&state=test-state&next=https://attacker.example', {
      headers: { host: 'localhost:3000', 'x-forwarded-host': 'portal.bcave.co.kr', 'x-forwarded-proto': 'https' },
    }));
    assert.equal(response.headers.get('location'), production + '/login?auth_complete=1');
    assert.deepEqual(state.exchanges, [{
      code: 'valid', state: 'test-state', transactionCookie: 'test-encrypted-transaction', origin: production,
    }]);
    assert.deepEqual(state.tokenChecks, [{ idToken: 'test-id-token', nonce: 'raw-nonce' }]);
    assert.deepEqual(state.accounts, [{ tenantId: 'tenant-id', objectId: 'object-id', email: 'staff@example.test', name: 'Staff' }]);
    assert.deepEqual(state.grants, [{ type: 'magiclink', email: 'alias@microsoft-sso.invalid' }]);
    assert.deepEqual(state.otp, [{ type: 'magiclink', token_hash: 'isolated-grant-hash' }]);
  } finally {
    if (original === undefined) delete process.env.NEXT_PUBLIC_MICROSOFT_SSO_ENABLED;
    else process.env.NEXT_PUBLIC_MICROSOFT_SSO_ENABLED = original;
  }
});

test('callback rejects an untrusted forwarded origin before attempting PKCE code exchange', async () => {
  const { callback, state } = callbackFixture();
  const response = await callback(new Request('http://localhost:3000/auth/callback?code=valid', {
    headers: { 'x-forwarded-host': 'attacker.example', 'x-forwarded-proto': 'https' },
  }));
  assert.equal(response.status, 400);
  assert.equal(response.headers.get('location'), null);
  assert.deepEqual(state.exchanges, []);
});
