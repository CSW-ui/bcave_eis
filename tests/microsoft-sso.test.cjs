const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { test, before } = require('node:test');
const ts = require('typescript');
const { NextRequest } = require('next/server');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

// Exercise the real route and middleware logic without Supabase or a network.
function load(file, mocks = {}) {
  const filename = path.resolve(__dirname, '..', file);
  const loaded = new Module(filename, module);
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded.require = id => Object.prototype.hasOwnProperty.call(mocks, id)
    ? mocks[id]
    : module.require(id);
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText, filename);
  return loaded.exports;
}

const policy = load('src/lib/auth-policy.ts');
const authUrls = load('src/lib/auth-urls.ts');
const origin = 'https://eis.example.test';
const microsoftProvider = 'custom:bcave-entra';
const transactionCookieName = 'eis-microsoft-sso';
const approvedUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'staff@example.test',
  app_metadata: { provider: 'email', providers: ['email'] },
  identities: [{ provider: 'email' }],
};
const microsoftIdentity = {
  tenantId: '33333333-3333-4333-8333-333333333333',
  objectId: '44444444-4444-4444-8444-444444444444',
  email: approvedUser.email,
  name: 'Microsoft Staff',
};
const microsoftUser = {
  id: '22222222-2222-4222-8222-222222222222',
  email: 'a'.repeat(64) + '@microsoft-sso.invalid',
  app_metadata: {
    provider: 'email', providers: ['email'], auth_source: 'microsoft',
    microsoft_access_approved: true,
    microsoft_tenant_id: microsoftIdentity.tenantId,
    microsoft_object_id: microsoftIdentity.objectId,
    microsoft_email: microsoftIdentity.email,
  },
  identities: [{ provider: 'email' }],
};
const sessionId = '55555555-5555-4555-8555-555555555555';
function accessTokenFor(user = microsoftUser, sid = sessionId, methods = 'otp') {
  return [Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url'),
    Buffer.from(JSON.stringify({ sub: user.id, session_id: sid,
      amr: (Array.isArray(methods) ? methods : [methods]).map(method => ({ method })),
    })).toString('base64url'),
    'bW9jay1zaWduYXR1cmU'].join('.');
}
let microsoftSession;
before(async () => {
  microsoftSession = load('src/lib/microsoft-session.ts', {
    jose: await import('jose'),
    '@/lib/account-source': load('src/lib/account-source.ts'),
  });
});

function fixture(overrides = {}) {
  const state = {
    user: approvedUser,
    profile: { role: 'staff', brands: ['CO'] },
    profileError: null,
    profilesById: null,
    session: { access_token: accessTokenFor(approvedUser, sessionId, 'password') },
    sessionError: null,
    sessionProof: undefined,
    otpUser: microsoftUser,
    otpSession: { access_token: accessTokenFor() },
    otpError: null,
    otpThrows: false,
    accountUser: microsoftUser,
    accountThrows: false,
    identity: microsoftIdentity,
    identityThrows: false,
    linkError: null,
    linkUser: microsoftUser,
    linkToken: 'isolated-microsoft-magic-link-hash',
    signOutError: null,
    microsoftExchangeThrows: false,
    createAuthRequestThrows: false,
    transactionCookie: 'test-encrypted-transaction',
    authorizationUrl: 'https://login.microsoftonline.com/test-tenant/oauth2/v2.0/authorize?state=test-state',
    authorizationCookie: 'test-new-encrypted-transaction',
    microsoftTokens: {
      providerId: microsoftProvider,
      idToken: 'microsoft-id-token',
      accessToken: 'microsoft-access-token',
      nonce: 'raw-transaction-nonce',
    },
    aal: { currentLevel: 'aal1', nextLevel: 'aal1' },
    aalError: null,
    refreshCookies: [],
    updateThrows: false,
    auditThrows: false,
    ...overrides,
    calls: {
      serverClients: 0,
      middlewareClients: 0,
      getUser: 0,
      exchanges: [],
      idTokenSignIns: [],
      idTokenChecks: [],
      accounts: [],
      links: [],
      otpVerifications: [],
      getSession: 0,
      authRequests: [],
      cookieReads: [],
      signOut: 0,
      signOutOptions: [],
      mfa: 0,
      profiles: [],
      updates: [],
      events: [],
    },
  };
  let middlewareCookies;
  function from(table, source) {
    let selected;
    let updated;
    let queriedId;
    const query = {
      select(columns) { selected = columns; return query; },
      update(values) {
        if (state.updateThrows) throw new Error('Missing optional security migration');
        updated = values;
        return query;
      },
      eq(column, value) {
        queriedId = value;
        if (updated) {
          state.calls.updates.push({ source, table, values: updated, column, value });
          return Promise.resolve({ error: null });
        }
        state.calls.profiles.push({ source, table, selected, column, value });
        return query;
      },
      async maybeSingle() { return { data: state.profilesById ? state.profilesById[queriedId] ?? null : state.profile, error: state.profileError }; },
      async single() { return { data: state.profilesById ? state.profilesById[queriedId] ?? null : state.profile, error: state.profileError }; },
      async insert(values) {
        if (state.auditThrows) throw new Error('Missing optional audit migration');
        state.calls.events.push({ source, table, values });
        return { error: null };
      },
    };
    return query;
  }
  const auth = {
    async getUser() {
      state.calls.getUser++;
      if (middlewareCookies && state.refreshCookies.length) {
        middlewareCookies.setAll(state.refreshCookies);
      }
      return { data: { user: state.user }, error: state.userError ?? null };
    },
    async signInWithIdToken(input) {
      state.calls.idTokenSignIns.push(input);
      assert.fail('Native OAuth must not merge the Microsoft account with an existing email account');
    },
    async getSession() {
      state.calls.getSession++;
      return { data: { session: state.session }, error: state.sessionError };
    },
    async verifyOtp(input) {
      state.calls.otpVerifications.push(input);
      if (state.otpErrors?.length) return {data:{user:null,session:null},error:state.otpErrors.shift()};
      if (state.otpThrows) throw new Error('Supabase unavailable');
      return { data: { user: state.otpUser, session: state.otpSession }, error: state.otpError };
    },
    async signOut(options) {
      state.calls.signOut++;
      state.calls.signOutOptions.push(options);
      return { error: state.signOutError };
    },
    mfa: {
      async getAuthenticatorAssuranceLevel() {
        state.calls.mfa++;
        return { data: state.aal, error: state.aalError };
      },
    },
  };
  const client = { auth, from: table => from(table, 'user') };
  const mocks = {
    '@/lib/auth-network': { ...load('src/lib/auth-network.ts'), async waitForAuthRecovery() {} },
    '@/lib/auth-policy': policy,
    '@/lib/auth-urls': authUrls,
    '@/lib/microsoft-session': microsoftSession,
    '@/lib/account-source': load('src/lib/account-source.ts'),
    '@/lib/microsoft-account': {
      async ensureMicrosoftAccount(identity) {
        state.calls.accounts.push(identity);
        if (state.accountThrows) throw new Error('Microsoft account registration failed');
        return state.accountUser;
      },
    },
    '@/lib/microsoft-auth': {
      MICROSOFT_TRANSACTION_COOKIE: transactionCookieName,
      MICROSOFT_TRANSACTION_TTL_SECONDS: 600,
      async exchangeMicrosoftAuthCode(input) {
        state.calls.exchanges.push(input);
        if (state.microsoftExchangeThrows) throw new Error('Invalid Microsoft authentication transaction');
        return state.microsoftTokens;
      },
      async verifyMicrosoftIdToken(input) {
        state.calls.idTokenChecks.push(input);
        if (state.identityDomainDenied) {
          const error = new Error('Domain is not allowed');
          error.name = 'MicrosoftDomainNotAllowedError';
          throw error;
        }
        if (state.identityThrows) throw new Error('Invalid Microsoft ID token');
        return state.identity;
      },
      createMicrosoftAuthRequest(requestOrigin) {
        state.calls.authRequests.push(requestOrigin);
        if (state.createAuthRequestThrows) throw new Error('Microsoft SSO is not configured correctly');
        return { authorizationUrl: state.authorizationUrl, transactionCookie: state.authorizationCookie };
      },
    },
    'next/headers': {
      cookies: () => ({
        get(name) {
          state.calls.cookieReads.push(name);
          const value = name === transactionCookieName ? state.transactionCookie
            : name === microsoftSession.MICROSOFT_SESSION_COOKIE ? state.sessionProof : undefined;
          return value ? { name, value } : undefined;
        },
      }),
    },
    '@/lib/supabase-server': {
      createSupabaseServerClient() { state.calls.serverClients++; return client; },
    },
    '@/lib/supabase': { supabaseAdmin: {
      from: table => from(table, 'admin'),
      auth: { admin: {
        async generateLink(input) {
          state.calls.links.push(input);
          const hashed_token = state.freshGrants ? state.linkToken + state.calls.links.length : state.linkToken;
          return { data: { user: state.linkUser, properties: { hashed_token } }, error: state.linkError };
        },
      } },
    } },
    '@supabase/ssr': {
      createServerClient(_url, _key, options) {
        state.calls.middlewareClients++;
        middlewareCookies = options.cookies;
        return client;
      },
    },
  };
  mocks['@/lib/server-account-session'] = load('src/lib/server-account-session.ts', mocks);
  const helpers = load('src/lib/auth.ts', mocks);
  const sessionRoute = load('src/app/api/auth/session/route.ts', mocks);
  return {
    state,
    helpers,
    callback: load('src/app/auth/callback/route.ts', mocks).GET,
    microsoftStart: load('src/app/auth/microsoft/route.ts', mocks).GET,
    session: sessionRoute.POST,
    sessionGet: sessionRoute.GET,
    sessionDelete: sessionRoute.DELETE,
    middleware: load('src/middleware.ts', mocks).middleware,
    calculate: () => load('src/app/api/replenishment/calculate/route.ts', {
      ...mocks,
      '@/lib/auth': helpers,
      '@/lib/constants': { VALID_BRANDS: new Set(['CO']) },
      '@/lib/snowflake': {
        snowflakeQuery() { throw new Error('Authentication tests must not query data'); },
      },
    }).POST,
  };
}

async function withEnv(values, run) {
  const previous = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
  try {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    return await run();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function authTest(name, run, extraEnv = {}) {
  test(name, () => withEnv({
    NEXT_PUBLIC_MICROSOFT_SSO_ENABLED: 'true',
    NEXT_PUBLIC_BASE_URL: origin,
    NEXT_PUBLIC_AUTH_LOCAL_ORIGINS: undefined,
    REQUIRE_MFA: 'false',
    NEXT_PUBLIC_SUPABASE_URL: 'https://supabase.example.test',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'mock-public-key',
    SUPABASE_SECRET_KEY: 'mock-test-server-key-for-session-proof',
    ...extraEnv,
  }, run));
}

function expectRedirect(response, destination) {
  assert.equal(response.status, 307);
  assert.equal(response.headers.get('location'), origin + destination);
}

async function expectRejected(response, status, message) {
  assert.equal(response.status, status);
  assert.deepEqual(await response.json(), { error: message });
}

function request(destination, headers) {
  return new NextRequest(origin + destination, { headers });
}

function sessionRequest(headers) {
  return new Request(origin + '/api/auth/session', { method: 'POST', headers });
}

authTest('callback is disabled until explicitly configured', async () => {
  const { callback, state } = fixture();
  expectRedirect(await callback(request('/auth/callback?code=valid')), '/login?error=sso_disabled');
  assert.equal(state.calls.serverClients, 0);
}, { NEXT_PUBLIC_MICROSOFT_SSO_ENABLED: 'false' });

authTest('callback without a code does not create a session', async () => {
  const { callback, state } = fixture();
  expectRedirect(await callback(request('/auth/callback')), '/login?error=sso_failed');
  assert.equal(state.calls.serverClients, 0);
});

authTest('callback distinguishes cancellation and other provider errors', async () => {
  for (const [providerError, loginError] of [
    ['access_denied', 'sso_cancelled'],
    ['invalid_request', 'sso_failed'],
  ]) {
    const { callback, state } = fixture();
    expectRedirect(await callback(request('/auth/callback?error=' + providerError)), '/login?error=' + loginError);
    assert.equal(state.calls.serverClients, 0);
  }
});

authTest('callback rejects failed OTP grants and absent independent users', async () => {
  for (const overrides of [{ otpError: { message: 'Invalid token hash' } }, { otpUser: null }, { otpSession: null }]) {
    const { callback, state } = fixture(overrides);
    const response = await callback(request('/auth/callback?code=one-time-code'));
    expectRedirect(response, '/login?error=sso_failed');
    assert.deepEqual(state.calls.exchanges, [{ code: 'one-time-code', state: '', transactionCookie: state.transactionCookie, origin }]);
    assert.deepEqual(state.calls.otpVerifications, [{ type: 'magiclink', token_hash: state.linkToken }]);
    assert.equal(state.calls.signOut, 1);
    assert.deepEqual(state.calls.idTokenSignIns, []);
    assert.equal(responseHasProof(response), false);
  }
});

authTest('callback blocks invalid Microsoft transactions before creating a Supabase client', async () => {
  const { callback, state } = fixture({ microsoftExchangeThrows: true });
  expectRedirect(await callback(request('/auth/callback?code=valid')), '/login?error=auth_unavailable');
  assert.equal(state.calls.exchanges.length, 1);
  assert.equal(state.calls.serverClients, 0);
  assert.deepEqual(state.calls.idTokenSignIns, []);
  assert.deepEqual(state.calls.profiles, []);
});

authTest('callback reports unavailable authentication when OTP exchange throws', async () => {
  const { callback, state } = fixture({ otpThrows: true });
  expectRedirect(await callback(request('/auth/callback?code=valid')), '/login?error=auth_unavailable');
  assert.equal(state.calls.otpVerifications.length, 1);
  assert.deepEqual(state.calls.idTokenSignIns, []);
});

authTest('callback refuses OTP exchange into an existing EIS identity or another Microsoft user', async () => {
  for (const otpUser of [approvedUser, { ...microsoftUser, id: approvedUser.id }, { ...microsoftUser, app_metadata: {} }]) {
    const { callback, state } = fixture({ otpUser });
    expectRedirect(await callback(request('/auth/callback?code=valid')), '/login?error=sso_failed');
    assert.equal(state.calls.signOut, 1);
    assert.deepEqual(state.calls.idTokenSignIns, []);
  }
});

authTest('callback requires separate approval of the Microsoft UUID and does not use the same-email EIS profile', async () => {
  for (const profile of [null, { role: 'pending' }, { role: null }]) {
    const { callback, state } = fixture({ profile });
    expectRedirect(await callback(request('/auth/callback?code=valid')), '/login?error=sso_not_approved');
    assert.equal(state.calls.serverClients, 0);
    assert.deepEqual(state.calls.links, []);
    assert.deepEqual(state.calls.otpVerifications, []);
    assert.deepEqual(state.calls.accounts, [microsoftIdentity]);
    assert.deepEqual(state.calls.profiles, [{
      source: 'admin', table: 'profiles', selected: 'role', column: 'id', value: microsoftUser.id,
    }]);
  }
});

authTest('automatically created Microsoft staff profiles cannot bypass explicit account approval or inherit same-email EIS admin access', async () => {
  for (const approval of [false, undefined, 'true', 1]) {
    const pending = { ...microsoftUser,
      app_metadata: { ...microsoftUser.app_metadata, microsoft_access_approved: approval },
      user_metadata: { microsoft_access_approved: true },
    };
    const { callback, state } = fixture({ accountUser: pending, profilesById: {
      [approvedUser.id]: { role: 'admin', brands: [] },
      [microsoftUser.id]: { role: 'staff', brands: [] },
    } });
    const response = await callback(request('/auth/callback?code=valid'));
    expectRedirect(response, '/login?error=sso_not_approved');
    assert.deepEqual(state.calls.accounts, [microsoftIdentity]);
    assert.deepEqual(state.calls.profiles, []);
    assert.deepEqual(state.calls.links, []);
    assert.deepEqual(state.calls.otpVerifications, []);
    assert.deepEqual(state.calls.idTokenSignIns, []);
    assert.equal(state.calls.serverClients, 0);
    assert.equal(responseHasProof(response), false);
  }
});

authTest('callback never issues a session when separate account approval cannot be checked', async () => {
  const { callback, state } = fixture({ profileError: { message: 'Database unavailable' } });
  expectRedirect(await callback(request('/auth/callback?code=valid')), '/login?error=auth_unavailable');
  assert.equal(state.calls.serverClients, 0);
  assert.deepEqual(state.calls.links, []);
});

authTest('approved Microsoft accounts return to the shared login completion flow', async () => {
  for (const role of ['admin', 'manager', 'staff', 'vendor']) {
    const { callback, state } = fixture({ profile: { role, brands: [] } });
    expectRedirect(await callback(request('/auth/callback?code=valid')), '/login?auth_complete=1');
    assert.equal(state.calls.signOut, 0);
    assert.equal(state.calls.updates.length, 0);
    assert.equal(state.calls.events.length, 0);
  }
});

authTest('callback validates the Microsoft token and issues a grant for the independent alias only', async () => {
  const { callback, state } = fixture();
  const response = await callback(request('/auth/callback?code=one-time-code&state=transaction-state'));
  expectRedirect(response, '/login?auth_complete=1');
  assert.deepEqual(state.calls.cookieReads, [transactionCookieName]);
  assert.deepEqual(state.calls.exchanges, [{
    code: 'one-time-code', state: 'transaction-state', transactionCookie: state.transactionCookie, origin,
  }]);
  assert.deepEqual(state.calls.idTokenChecks, [{ idToken: 'microsoft-id-token', nonce: 'raw-transaction-nonce' }]);
  assert.deepEqual(state.calls.accounts, [microsoftIdentity]);
  assert.deepEqual(state.calls.links, [{ type: 'magiclink', email: microsoftUser.email }]);
  assert.notEqual(state.calls.links[0].email, approvedUser.email);
  assert.deepEqual(state.calls.otpVerifications, [{ type: 'magiclink', token_hash: state.linkToken }]);
  assert.deepEqual(state.calls.idTokenSignIns, []);
});

authTest('callback can issue an independent session without the optional Microsoft access token', async () => {
  const { callback, state } = fixture({ microsoftTokens: {
    providerId: microsoftProvider, idToken: 'microsoft-id-token', nonce: 'raw-transaction-nonce',
  } });
  expectRedirect(await callback(request('/auth/callback?code=valid')), '/login?auth_complete=1');
  assert.deepEqual(state.calls.idTokenChecks, [{ idToken: 'microsoft-id-token', nonce: 'raw-transaction-nonce' }]);
  assert.deepEqual(state.calls.idTokenSignIns, []);
});

function responseHasProof(response) {
  return Boolean(response.cookies.get(microsoftSession.MICROSOFT_SESSION_COOKIE)?.value);
}

authTest('callback creates a signed proof bound to the independent user and Supabase session', async () => {
  const { callback, state } = fixture();
  const response = await callback(request('/auth/callback?code=valid'));
  expectRedirect(response, '/login?auth_complete=1');
  const proofCookie = response.cookies.get(microsoftSession.MICROSOFT_SESSION_COOKIE);
  assert.equal(proofCookie.httpOnly, true);
  assert.equal(proofCookie.secure, true);
  assert.equal(proofCookie.sameSite, 'lax');
  assert.equal(proofCookie.path, '/');
  assert.equal(proofCookie.maxAge, 400 * 24 * 60 * 60);
  assert.equal(await microsoftSession.isAccountSessionAllowed(state.otpUser, state.otpSession, proofCookie.value), true);
  const differentSession = { access_token: accessTokenFor(microsoftUser, '66666666-6666-4666-8666-666666666666') };
  assert.equal(await microsoftSession.isAccountSessionAllowed(state.otpUser, differentSession, proofCookie.value), false);
  assert.deepEqual(state.calls.idTokenSignIns, []);
});

authTest('callback rejects invalid Microsoft signatures and failed account registration before generating a grant', async () => {
  for (const overrides of [{ identityThrows: true }, { accountThrows: true }]) {
    const { callback, state } = fixture(overrides);
    expectRedirect(await callback(request('/auth/callback?code=valid')), '/login?error=auth_unavailable');
    assert.equal(state.calls.serverClients, 0);
    assert.deepEqual(state.calls.links, []);
    assert.deepEqual(state.calls.profiles, []);
  }
});

authTest('callback rejects a failed or mismatched alias grant before creating a browser session', async () => {
  for (const overrides of [
    { linkError: { code: 'invalid_request' } }, { linkUser: approvedUser },
    { linkUser: { ...microsoftUser, app_metadata: {} } }, { linkToken: '' },
  ]) {
    const { callback, state } = fixture(overrides);
    expectRedirect(await callback(request('/auth/callback?code=valid')), '/login?error=sso_failed');
    assert.equal(state.calls.serverClients, 0);
    assert.deepEqual(state.calls.otpVerifications, []);
    assert.deepEqual(state.calls.idTokenSignIns, []);
  }
});

authTest('callback rejects approval revoked after account lookup but before grant creation', async () => {
  const { callback, state } = fixture({
    linkUser: { ...microsoftUser, app_metadata: { ...microsoftUser.app_metadata, microsoft_access_approved: false } },
  });
  assert.equal(state.accountUser.app_metadata.microsoft_access_approved, true);
  const response = await callback(request('/auth/callback?code=valid'));
  expectRedirect(response, '/login?error=sso_failed');
  assert.equal(state.calls.links.length, 1);
  assert.equal(state.calls.serverClients, 0);
  assert.deepEqual(state.calls.otpVerifications, []);
  assert.equal(responseHasProof(response), false);
});

authTest('callback signs out when approval is revoked while exchanging the grant', async () => {
  const { callback, state } = fixture({
    otpUser: { ...microsoftUser, app_metadata: { ...microsoftUser.app_metadata, microsoft_access_approved: false } },
  });
  assert.equal(state.accountUser.app_metadata.microsoft_access_approved, true);
  assert.equal(state.linkUser.app_metadata.microsoft_access_approved, true);
  const response = await callback(request('/auth/callback?code=valid'));
  expectRedirect(response, '/login?error=sso_failed');
  assert.equal(state.calls.otpVerifications.length, 1);
  assert.deepEqual(state.calls.signOutOptions, [{ scope: 'local' }]);
  assert.equal(responseHasProof(response), false);
});

authTest('callback clears the transaction cookie and disables caching after success and failure', async () => {
  for (const destination of ['/auth/callback?code=valid', '/auth/callback?error=access_denied', '/auth/callback']) {
    const { callback } = fixture();
    const response = await callback(request(destination));
    const cleared = response.cookies.get(transactionCookieName);
    assert.equal(cleared.value, '');
    assert.equal(cleared.maxAge, 0);
    assert.equal(cleared.path, '/auth');
    assert.equal(cleared.httpOnly, true);
    assert.equal(cleared.sameSite, 'lax');
    assert.equal(cleared.secure, true);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
});

authTest('callback cannot be used as an external redirect', async () => {
  for (const next of ['https://attacker.example/steal', '//attacker.example/steal', '/\\attacker.example/steal']) {
    const { callback } = fixture();
    const url = new URL(origin + '/auth/callback?code=valid');
    url.searchParams.set('next', next);
    const response = await callback(new Request(url));
    expectRedirect(response, '/login?auth_complete=1');
    assert.equal(new URL(response.headers.get('location')).origin, origin);
  }
});

authTest('callback rejects an unallowlisted host without exchanging the authentication code', async () => {
  const { callback, state } = fixture();
  const response = await callback(new Request('https://unapproved.example.test/auth/callback?code=valid'));
  assert.equal(response.status, 400);
  assert.equal(response.headers.get('location'), null);
  assert.equal(typeof (await response.json()).error, 'string');
  assert.equal(state.calls.serverClients, 0);
  assert.deepEqual(state.calls.exchanges, []);
  assert.equal(state.calls.profiles.length, 0);
});

authTest('Microsoft start route requires the explicit SSO feature flag', async () => {
  const { microsoftStart, state } = fixture();
  const response = await microsoftStart(request('/auth/microsoft'));
  expectRedirect(response, '/login?error=sso_disabled');
  assert.deepEqual(state.calls.authRequests, []);
  assert.equal(response.cookies.get(transactionCookieName), undefined);
}, { NEXT_PUBLIC_MICROSOFT_SSO_ENABLED: 'false' });

authTest('Microsoft start route returns a login error when configuration is missing', async () => {
  const { microsoftStart, state } = fixture({ createAuthRequestThrows: true });
  const response = await microsoftStart(request('/auth/microsoft'));
  expectRedirect(response, '/login?error=sso_disabled');
  assert.deepEqual(state.calls.authRequests, [origin]);
  assert.equal(response.cookies.get(transactionCookieName), undefined);
});

authTest('Microsoft start route rejects unknown origins before creating a transaction', async () => {
  const { microsoftStart, state } = fixture();
  const response = await microsoftStart(new Request('https://unapproved.example.test/auth/microsoft'));
  assert.equal(response.status, 400);
  assert.equal(response.headers.get('location'), null);
  assert.deepEqual(state.calls.authRequests, []);
  assert.equal(response.cookies.get(transactionCookieName), undefined);
});

authTest('Microsoft start route stops account switching when the existing local session cannot be signed out', async () => {
  const { microsoftStart, state } = fixture({ signOutError: { code: 'request_failed' } });
  const response = await microsoftStart(request('/auth/microsoft'));
  expectRedirect(response, '/login?error=sso_disabled');
  assert.deepEqual(state.calls.signOutOptions, [{ scope: 'local' }]);
  assert.equal(response.cookies.get(transactionCookieName), undefined);
  assert.equal(response.cookies.get(microsoftSession.MICROSOFT_SESSION_COOKIE), undefined);
  assert.deepEqual(state.calls.otpVerifications, []);
});

authTest('Microsoft start route redirects to Entra and stores a short-lived protected transaction cookie', async () => {
  for (const browserOrigin of [origin, 'http://localhost:3000', 'http://127.0.0.1:3000']) {
    const { microsoftStart, state } = fixture();
    const response = await microsoftStart(new Request(browserOrigin + '/auth/microsoft'));
    assert.equal(response.status, 307);
    assert.equal(response.headers.get('location'), state.authorizationUrl);
    assert.deepEqual(state.calls.authRequests, [browserOrigin]);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const stored = response.cookies.get(transactionCookieName);
    assert.equal(stored.value, state.authorizationCookie);
    assert.equal(stored.httpOnly, true);
    assert.equal(stored.sameSite, 'lax');
    assert.equal(stored.path, '/auth');
    assert.equal(stored.maxAge, 600);
    assert.equal(stored.secure === true, browserOrigin.startsWith('https:'));
    assert.deepEqual(state.calls.signOutOptions, [{ scope: 'local' }]);
    const oldProof = response.cookies.get(microsoftSession.MICROSOFT_SESSION_COOKIE);
    assert.equal(oldProof.value, '');
    assert.equal(oldProof.path, '/');
    assert.equal(oldProof.maxAge, 0);
  }
});

authTest('session completion requires an authenticated user', async () => {
  const { session, state } = fixture({ user: null });
  await expectRejected(await session(sessionRequest()), 401, '로그인이 필요합니다.');
  assert.equal(state.calls.profiles.length, 0);
  assert.equal(state.calls.updates.length, 0);
  assert.equal(state.calls.events.length, 0);
});

authTest('session completion rejects missing or unapproved profiles before issuing a token', async () => {
  for (const profile of [null, { role: 'pending' }]) {
    const { session, state } = fixture({ profile });
    await expectRejected(await session(sessionRequest()), 403, policy.LOGIN_ERROR_MESSAGES.not_approved);
    assert.equal(state.calls.mfa, 0);
    assert.equal(state.calls.updates.length, 0);
    assert.equal(state.calls.events.length, 0);
  }
});

authTest('session completion fails closed when profile or MFA lookup fails', async () => {
  for (const overrides of [
    { profileError: { message: 'Database unavailable' } },
    { aalError: { message: 'MFA unavailable' } },
    { aal: null },
  ]) {
    const { session, state } = fixture(overrides);
    await expectRejected(await session(sessionRequest()), 503, policy.LOGIN_ERROR_MESSAGES.auth_unavailable);
    assert.equal(state.calls.updates.length, 0);
    assert.equal(state.calls.events.length, 0);
  }
});

authTest('session completion requires configured OTP even when MFA enrollment is optional', async () => {
  const { session, state } = fixture({ aal: { currentLevel: 'aal1', nextLevel: 'aal2' } });
  await expectRejected(await session(sessionRequest()), 403, '인증 앱의 OTP 확인이 필요합니다.');
  assert.equal(state.calls.updates.length, 0);
  assert.equal(state.calls.events.length, 0);
});

authTest('successful sessions issue one token, audit the login, and redirect by existing role', async () => {
  for (const role of ['admin', 'manager', 'staff', 'vendor']) {
    const { session, state } = fixture({ profile: { role, brands: [] } });
    const response = await session(sessionRequest({
      'x-forwarded-for': '203.0.113.10, 203.0.113.11',
      'x-real-ip': '203.0.113.12',
      'user-agent': 'SSO regression test',
    }));
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.match(body.sessionToken, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    assert.equal(body.redirectTo, role === 'vendor' ? '/vendor' : '/dashboard');
    assert.deepEqual(state.calls.updates, [{
      source: 'admin', table: 'profiles', values: { session_token: body.sessionToken },
      column: 'id', value: approvedUser.id,
    }]);
    assert.deepEqual(state.calls.events, [{
      source: 'admin', table: 'login_events',
      values: {
        user_id: approvedUser.id, email: approvedUser.email,
        ip: '203.0.113.10', user_agent: 'SSO regression test',
      },
    }]);
  }
});

authTest('audit uses the direct IP fallback when the proxy header is absent', async () => {
  const { session, state } = fixture();
  assert.equal((await session(sessionRequest({ 'x-real-ip': '203.0.113.12' }))).status, 200);
  assert.equal(state.calls.events[0].values.ip, '203.0.113.12');
  assert.equal(state.calls.events[0].values.user_agent, null);
});

authTest('required MFA enrollment directs approved logins to security settings', async () => {
  const { session, state } = fixture();
  const response = await session(sessionRequest());
  assert.equal(response.status, 200);
  assert.equal((await response.json()).redirectTo, '/settings/security');
  assert.equal(state.calls.updates.length, 1);
  assert.equal(state.calls.events.length, 1);
}, { REQUIRE_MFA: 'true' });

authTest('verified MFA sessions can finish with the normal role destination', async () => {
  const { session } = fixture({ aal: { currentLevel: 'aal2', nextLevel: 'aal2' } });
  assert.equal((await (await session(sessionRequest())).json()).redirectTo, '/dashboard');
}, { REQUIRE_MFA: 'true' });

authTest('optional token or audit migrations do not prevent approved logins', async () => {
  const { session } = fixture({ updateThrows: true, auditThrows: true });
  const response = await session(sessionRequest());
  assert.equal(response.status, 200);
  assert.equal((await response.json()).redirectTo, '/dashboard');
});

authTest('middleware permits exactly the Microsoft start and callback paths before authentication', async () => {
  for (const destination of ['/auth/callback?code=valid', '/auth/microsoft']) {
    const { middleware, state } = fixture({ user: null });
    const response = await middleware(request(destination));
    assert.equal(response.headers.get('x-middleware-next'), '1');
    assert.equal(state.calls.middlewareClients, 0);
    assert.equal(state.calls.getUser, 0);
  }
});

authTest('middleware does not exempt other auth paths or descendants of the Microsoft routes', async () => {
  for (const destination of ['/auth/other', '/auth/callback/other', '/auth/microsoft/other', '/auth/microsoft-evil']) {
    const { middleware, state } = fixture({ user: null });
    expectRedirect(await middleware(request(destination)), '/login');
    assert.equal(state.calls.middlewareClients, 1);
    assert.equal(state.calls.getUser, 1);
  }
});

authTest('middleware permits the shared login page for signed-in and anonymous users', async () => {
  for (const user of [null, approvedUser]) {
    const { middleware, state } = fixture({ user, profile: null });
    assert.equal((await middleware(request('/login'))).headers.get('x-middleware-next'), '1');
    assert.equal(state.calls.profiles.length, 0);
  }
});

authTest('middleware requires authentication for data APIs and protected pages', async () => {
  const { middleware } = fixture({ user: null });
  await expectRejected(await middleware(request('/api/sales?brand=all')), 401, '로그인이 필요합니다.');
  expectRedirect(await middleware(request('/dashboard')), '/login');
});

authTest('middleware blocks missing and unapproved profiles on data APIs and pages', async () => {
  for (const profile of [null, { role: 'pending', brands: [] }]) {
    const { middleware, state } = fixture({ profile });
    await expectRejected(await middleware(request('/api/sales?brand=all')), 403, policy.LOGIN_ERROR_MESSAGES.not_approved);
    expectRedirect(await middleware(request('/dashboard')), '/login?error=not_approved');
    assert.equal(state.calls.mfa, 0);
  }
});

authTest('middleware fails closed when profile or assurance lookup fails', async () => {
  for (const overrides of [
    { profileError: { message: 'Database unavailable' } },
    { aalError: { message: 'MFA unavailable' } },
    { aal: null },
  ]) {
    const { middleware } = fixture(overrides);
    await expectRejected(await middleware(request('/api/sales')), 503, policy.LOGIN_ERROR_MESSAGES.auth_unavailable);
    expectRedirect(await middleware(request('/dashboard')), '/login?error=auth_unavailable');
  }
});

authTest('middleware preserves the full-brand access of approved empty-brand profiles', async () => {
  const { middleware } = fixture({ profile: { role: 'staff', brands: [] } });
  for (const brand of ['all', 'CO', 'LE']) {
    const response = await middleware(request('/api/sales?brand=' + brand));
    assert.equal(response.headers.get('x-middleware-next'), '1');
    assert.equal(response.headers.get('x-middleware-rewrite'), null);
  }
});

authTest('middleware narrows requested brands to the approved set', async () => {
  const { middleware } = fixture({ profile: { role: 'staff', brands: ['CO', 'LE'] } });
  for (const [requested, expected] of [['all', 'CO,LE'], ['CO,XX', 'CO']]) {
    const response = await middleware(request('/api/sales?brand=' + requested + '&year=2026'));
    const rewritten = new URL(response.headers.get('x-middleware-rewrite'));
    assert.equal(rewritten.origin, origin);
    assert.equal(rewritten.pathname, '/api/sales');
    assert.equal(rewritten.searchParams.get('brand'), expected);
    assert.equal(rewritten.searchParams.get('year'), '2026');
  }
});

authTest('middleware denies a brand outside the approved set', async () => {
  const { middleware } = fixture();
  await expectRejected(await middleware(request('/api/sales?brand=XX')), 403, '해당 브랜드 조회 권한이 없습니다.');
});

authTest('middleware preserves allowed brand requests and administrator access', async () => {
  for (const [role, brands, brand] of [['staff', ['CO'], 'CO'], ['admin', ['CO'], 'all']]) {
    const { middleware } = fixture({ profile: { role, brands } });
    const response = await middleware(request('/api/sales?brand=' + brand));
    assert.equal(response.headers.get('x-middleware-next'), '1');
    assert.equal(response.headers.get('x-middleware-rewrite'), null);
  }
});

authTest('middleware blocks incomplete optional OTP on APIs and protected pages', async () => {
  const { middleware } = fixture({ aal: { currentLevel: 'aal1', nextLevel: 'aal2' } });
  await expectRejected(await middleware(request('/api/sales')), 403, '인증 앱의 OTP 확인이 필요합니다.');
  await expectRejected(await middleware(new NextRequest(origin + '/api/auth/session', { method: 'POST' })), 403, '인증 앱의 OTP 확인이 필요합니다.');
  expectRedirect(await middleware(request('/dashboard')), '/login');
  expectRedirect(await middleware(request('/settings/security')), '/login');
});

authTest('required enrollment permits session completion and security settings only', async () => {
  const { middleware } = fixture();
  for (const destination of ['/api/auth/session', '/settings/security', '/settings/security/setup']) {
    assert.equal((await middleware(request(destination))).headers.get('x-middleware-next'), '1');
  }
  for (const destination of ['/api/sales', '/api/auth/session/other', '/api/admin/users']) {
    await expectRejected(await middleware(request(destination)), 403, '2단계 인증 등록이 필요합니다.');
  }
  for (const destination of ['/dashboard', '/settings', '/settings/security-other']) {
    expectRedirect(await middleware(request(destination)), '/settings/security');
  }
}, { REQUIRE_MFA: 'true' });

authTest('middleware permits protected data after MFA is verified', async () => {
  const { middleware } = fixture({ aal: { currentLevel: 'aal2', nextLevel: 'aal2' } });
  assert.equal((await middleware(request('/api/sales?brand=CO'))).headers.get('x-middleware-next'), '1');
  assert.equal((await middleware(request('/dashboard'))).headers.get('x-middleware-next'), '1');
}, { REQUIRE_MFA: 'true' });

authTest('refresh cookies survive rewrites and reach the rewritten request', async () => {
  const refreshed = { name: 'sb-refresh-test', value: 'fresh-session', options: { path: '/', httpOnly: true, sameSite: 'lax' } };
  const { middleware } = fixture({ refreshCookies: [refreshed] });
  const incoming = request('/api/sales?brand=all', { cookie: 'sb-refresh-test=old-session; untouched=keep' });
  const response = await middleware(incoming);
  assert.equal(incoming.cookies.get(refreshed.name).value, refreshed.value);
  const returned = response.cookies.get(refreshed.name);
  assert.equal(returned.value, refreshed.value);
  assert.equal(returned.httpOnly, true);
  assert.equal(returned.path, '/');
  assert.ok(response.headers.get('x-middleware-override-headers').split(',').includes('cookie'));
  assert.match(response.headers.get('x-middleware-request-cookie'), /sb-refresh-test=fresh-session/);
  assert.match(response.headers.get('x-middleware-request-cookie'), /untouched=keep/);
  assert.equal(new URL(response.headers.get('x-middleware-rewrite')).searchParams.get('brand'), 'CO');
});

authTest('refresh cookies survive redirects and rejected API responses', async () => {
  const refreshed = { name: 'sb-refresh-test', value: 'fresh-session', options: { path: '/', httpOnly: true } };
  const { middleware } = fixture({ profile: null, refreshCookies: [refreshed] });
  const pageRequest = request('/dashboard');
  const pageResponse = await middleware(pageRequest);
  expectRedirect(pageResponse, '/login?error=not_approved');
  assert.equal(pageRequest.cookies.get(refreshed.name).value, refreshed.value);
  assert.equal(pageResponse.cookies.get(refreshed.name).value, refreshed.value);
  const apiRequest = request('/api/sales');
  const apiResponse = await middleware(apiRequest);
  await expectRejected(apiResponse, 403, policy.LOGIN_ERROR_MESSAGES.not_approved);
  assert.equal(apiRequest.cookies.get(refreshed.name).value, refreshed.value);
  assert.equal(apiResponse.cookies.get(refreshed.name).value, refreshed.value);
});

authTest('server profile helper rejects anonymous, missing-profile, and unapproved users', async () => {
  for (const overrides of [{ user: null }, { profile: null }, { profile: { role: 'pending' } }]) {
    const { helpers } = fixture(overrides);
    assert.equal(await helpers.getServerProfile(), null);
    await expectRejected(await helpers.requireAdmin(), 401, '로그인이 필요합니다.');
  }
});

authTest('server profile helper requires configured OTP when enrollment is optional', async () => {
  const { helpers, state } = fixture({
    profile: { role: 'admin', brands: [] },
    aal: { currentLevel: 'aal1', nextLevel: 'aal2' },
  });
  assert.equal(await helpers.getServerProfile(), null);
  assert.equal(state.calls.profiles.length, 0);
  await expectRejected(await helpers.requireAdmin(), 401, '로그인이 필요합니다.');
});

authTest('server profile helper rejects unenrolled users when MFA is required', async () => {
  const { helpers, state } = fixture({ profile: { role: 'admin', brands: [] } });
  assert.equal(await helpers.getServerProfile(), null);
  assert.equal(state.calls.profiles.length, 0);
  await expectRejected(await helpers.requireAdmin(), 401, '로그인이 필요합니다.');
}, { REQUIRE_MFA: 'true' });

authTest('server profile helper fails closed when assurance cannot be checked', async () => {
  for (const overrides of [{ aalError: { message: 'MFA unavailable' } }, { aal: null }]) {
    const { helpers, state } = fixture(overrides);
    assert.equal(await helpers.getServerProfile(), null);
    assert.equal(state.calls.profiles.length, 0);
    await expectRejected(await helpers.requireAdmin(), 401, '로그인이 필요합니다.');
  }
});

authTest('server profile helper and admin gate accept a verified administrator', async () => {
  const profile = { id: approvedUser.id, email: approvedUser.email, name: 'Admin', role: 'admin', brands: [] };
  const { helpers, state } = fixture({ profile, aal: { currentLevel: 'aal2', nextLevel: 'aal2' } });
  assert.deepEqual(await helpers.getServerProfile(), profile);
  assert.deepEqual(await helpers.requireAdmin(), profile);
  assert.deepEqual(state.calls.profiles, [1, 2].map(() => ({
    source: 'admin', table: 'profiles', selected: 'id, email, name, role, brands',
    column: 'id', value: approvedUser.id,
  })));
}, { REQUIRE_MFA: 'true' });

authTest('server admin gate preserves role restrictions after successful MFA', async () => {
  const { helpers } = fixture({ aal: { currentLevel: 'aal2', nextLevel: 'aal2' } });
  assert.equal((await helpers.getServerProfile()).role, 'staff');
  await expectRejected(await helpers.requireAdmin(), 403, '관리자 권한이 필요합니다.');
});

authTest('cron secret validation preserves exact match and an unset-secret denial', async () => {
  const { helpers } = fixture();
  assert.equal(helpers.verifyCronSecret('test-cron-secret'), true);
  for (const supplied of [null, '', 'wrong', ' test-cron-secret', 'test-cron-secret ']) {
    assert.equal(helpers.verifyCronSecret(supplied), false);
  }
  await withEnv({ CRON_SECRET: undefined }, async () => {
    assert.equal(helpers.verifyCronSecret(null), false);
    assert.equal(helpers.verifyCronSecret('test-cron-secret'), false);
  });
}, { CRON_SECRET: 'test-cron-secret' });

authTest('calculate user authorization rejects administrators with incomplete OTP', async () => {
  const { calculate, state } = fixture({
    profile: { role: 'admin', brands: [] },
    aal: { currentLevel: 'aal1', nextLevel: 'aal2' },
  });
  const response = await calculate()(new Request(origin + '/api/replenishment/calculate', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-cron-secret': 'wrong' },
    body: JSON.stringify({ brand: 'INVALID' }),
  }));
  await expectRejected(response, 401, '권한이 없습니다.');
  assert.equal(state.calls.mfa, 1);
  assert.equal(state.calls.profiles.length, 0);
}, { CRON_SECRET: 'test-cron-secret' });

authTest('a valid cron secret authorizes calculate without user authentication or OTP', async () => {
  const { calculate, middleware, state } = fixture({ user: null, profile: null });
  const destination = '/api/replenishment/calculate';
  assert.equal((await middleware(request(destination))).headers.get('x-middleware-next'), '1');
  const response = await calculate()(new Request(origin + destination, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-cron-secret': 'test-cron-secret' },
    body: JSON.stringify({ brand: 'INVALID' }),
  }));
  // Invalid brand is rejected after the route's authorization guard, avoiding all data/network work.
  await expectRejected(response, 400, 'Invalid brand');
  assert.equal(state.calls.middlewareClients, 0);
  assert.equal(state.calls.serverClients, 0);
  assert.equal(state.calls.getUser, 0);
  assert.equal(state.calls.mfa, 0);
}, { CRON_SECRET: 'test-cron-secret', REQUIRE_MFA: 'true' });

function accountRequest(destination, proof, method = 'GET') {
  return new NextRequest(origin + destination, {
    method,
    headers: proof ? { cookie: microsoftSession.MICROSOFT_SESSION_COOKIE + '=' + proof } : undefined,
  });
}

function makeSessionProof(overrides = {}) {
  return microsoftSession.createMicrosoftSessionProof({
    userId: microsoftUser.id, sessionId,
    tenantId: microsoftIdentity.tenantId, objectId: microsoftIdentity.objectId,
    ...overrides,
  });
}

authTest('Microsoft accounts require a valid session-bound proof at every protected boundary', async () => {
  const validProof = await makeSessionProof();
  const tamperedParts = validProof.split('.');
  // Alter a full signature byte; the last base64url character can differ only in unused padding bits.
  tamperedParts[2] = (tamperedParts[2][0] === 'A' ? 'B' : 'A') + tamperedParts[2].slice(1);
  const otherUuid = '66666666-6666-4666-8666-666666666666';
  const otherKeyProof = await withEnv({ SUPABASE_SECRET_KEY: 'different-test-server-key' }, makeSessionProof);
  const cases = [
    { sessionProof: validProof, user: { ...microsoftUser, app_metadata: { ...microsoftUser.app_metadata, microsoft_access_approved: false } } },
    { sessionProof: validProof, user: { ...microsoftUser, app_metadata: { ...microsoftUser.app_metadata, microsoft_access_approved: undefined } } },
    { sessionProof: undefined }, { sessionProof: 'forged' },
    { sessionProof: tamperedParts.join('.') },
    { sessionProof: await makeSessionProof({ sessionId: otherUuid }) },
    { sessionProof: await makeSessionProof({ userId: otherUuid }) },
    { sessionProof: await makeSessionProof({ tenantId: otherUuid }) },
    { sessionProof: await makeSessionProof({ objectId: otherUuid }) },
    { sessionProof: otherKeyProof },
    { sessionProof: validProof, session: null },
    { sessionProof: validProof, sessionError: { message: 'Session unavailable' } },
    { sessionProof: validProof, session: { access_token: 'not-a-jwt' } },
    { sessionProof: validProof, session: { access_token: accessTokenFor(approvedUser) } },
  ];
  for (const invalid of cases) {
    const { session, sessionGet, helpers, middleware, state } = fixture({
      user: microsoftUser, session: { access_token: accessTokenFor() }, ...invalid,
    });
    await expectRejected(await session(sessionRequest()), 401, policy.LOGIN_ERROR_MESSAGES.sso_session_required);
    await expectRejected(await sessionGet(), 401, policy.LOGIN_ERROR_MESSAGES.sso_session_required);
    assert.equal(await helpers.getServerProfile(), null);
    await expectRejected(await middleware(accountRequest('/api/sales', state.sessionProof)), 401, policy.LOGIN_ERROR_MESSAGES.sso_session_required);
    expectRedirect(await middleware(accountRequest('/dashboard', state.sessionProof)), '/login?error=sso_session_required');
    assert.deepEqual(state.calls.profiles, []);
    assert.equal(state.calls.mfa, 0);
    assert.deepEqual(state.calls.updates, []);
    assert.deepEqual(state.calls.events, []);
  }
});

authTest('a proven Microsoft login retains its own UUID for authorization, session tokens, and audit', async () => {
  const proof = await makeSessionProof();
  const profile = { id: microsoftUser.id, role: 'admin', brands: [], email: microsoftUser.email, name: 'MS Admin' };
  const { session, sessionGet, helpers, middleware, state } = fixture({
    user: microsoftUser, session: { access_token: accessTokenFor() }, sessionProof: proof, profile,
    aal: { currentLevel: 'aal2', nextLevel: 'aal2' },
  });
  const checked = await sessionGet();
  assert.deepEqual(await checked.json(), { valid: true, role: 'admin', authSource: 'microsoft', skipOtp: false, legacyMicrosoftLinked: false });
  assert.equal(checked.headers.get('cache-control'), 'no-store');
  const completed = await session(sessionRequest());
  assert.equal(completed.status, 200);
  assert.equal((await completed.json()).redirectTo, '/dashboard');
  assert.equal((await helpers.requireAdmin()).id, microsoftUser.id);
  assert.equal((await helpers.getServerProfile()).email, microsoftIdentity.email);
  assert.equal((await middleware(accountRequest('/api/sales?brand=all', proof))).headers.get('x-middleware-next'), '1');
  assert.ok(state.calls.profiles.every(query => query.column === 'id' && query.value === microsoftUser.id));
  assert.ok(state.calls.updates.every(update => update.value === microsoftUser.id));
  assert.equal(state.calls.events[0].values.user_id, microsoftUser.id);
  assert.equal(state.calls.events[0].values.email, microsoftIdentity.email);
  assert.notEqual(state.calls.events[0].values.user_id, approvedUser.id);
}, { REQUIRE_MFA: 'true' });

authTest('read-only session checks permit pending OTP after validating the account proof', async () => {
  const proof = await makeSessionProof();
  const { session, sessionGet, middleware, state } = fixture({
    user: microsoftUser, session: { access_token: accessTokenFor() }, sessionProof: proof,
    aal: { currentLevel: 'aal1', nextLevel: 'aal2' },
  });
  assert.deepEqual(await (await sessionGet()).json(), { valid: true, role: 'staff', authSource: 'microsoft', skipOtp: false, legacyMicrosoftLinked: false });
  assert.equal((await middleware(accountRequest('/api/auth/session', proof))).headers.get('x-middleware-next'), '1');
  assert.equal(state.calls.mfa, 0);
  assert.deepEqual(state.calls.updates, []);
  assert.deepEqual(state.calls.events, []);
  await expectRejected(await session(sessionRequest()), 403, '인증 앱의 OTP 확인이 필요합니다.');
  await expectRejected(await middleware(accountRequest('/api/auth/session', proof, 'POST')), 403, '인증 앱의 OTP 확인이 필요합니다.');
});

authTest('read-only session checks deny anonymous users and missing or unavailable profiles', async () => {
  const anonymous = fixture({ user: null });
  await expectRejected(await anonymous.sessionGet(), 401, policy.LOGIN_ERROR_MESSAGES.sso_session_required);
  for (const [overrides, status, message] of [
    [{ profile: null }, 403, policy.LOGIN_ERROR_MESSAGES.not_approved],
    [{ profileError: { message: 'Unavailable' } }, 503, policy.LOGIN_ERROR_MESSAGES.auth_unavailable],
  ]) {
    const { sessionGet } = fixture(overrides);
    await expectRejected(await sessionGet(), status, message);
  }
});

authTest('previously linked native Microsoft OAuth cannot reuse an existing EIS profile', async () => {
  const linkedEisUser = { ...approvedUser,
    app_metadata: { provider: 'email', providers: ['email', microsoftProvider] },
    identities: [{ provider: 'email' }, { provider: microsoftProvider }],
  };
  const { session, sessionGet, helpers, middleware, state } = fixture({
    user: linkedEisUser, session: { access_token: accessTokenFor(linkedEisUser, sessionId, 'oauth') },
  });
  await expectRejected(await session(sessionRequest()), 401, policy.LOGIN_ERROR_MESSAGES.sso_session_required);
  await expectRejected(await sessionGet(), 401, policy.LOGIN_ERROR_MESSAGES.sso_session_required);
  assert.equal(await helpers.getServerProfile(), null);
  await expectRejected(await middleware(request('/api/sales')), 401, policy.LOGIN_ERROR_MESSAGES.sso_session_required);
  assert.deepEqual(state.calls.profiles, []);
  assert.deepEqual(state.calls.updates, []);
});

authTest('an old OAuth JWT stays blocked after its Microsoft identity and provider metadata were removed', async () => {
  const { session, sessionGet, helpers, middleware, state } = fixture({
    // This is the post-unlink getUser response; the older JWT still records OAuth authentication.
    user: approvedUser,
    session: { access_token: accessTokenFor(approvedUser, sessionId, 'oauth') },
    profile: { role: 'admin', brands: [] },
  });
  assert.deepEqual(state.user.identities, [{ provider: 'email' }]);
  assert.deepEqual(state.user.app_metadata.providers, ['email']);
  await expectRejected(await session(sessionRequest()), 401, policy.LOGIN_ERROR_MESSAGES.sso_session_required);
  await expectRejected(await sessionGet(), 401, policy.LOGIN_ERROR_MESSAGES.sso_session_required);
  assert.equal(await helpers.getServerProfile(), null);
  await expectRejected(await helpers.requireAdmin(), 401, '로그인이 필요합니다.');
  await expectRejected(await middleware(request('/api/sales')), 401, policy.LOGIN_ERROR_MESSAGES.sso_session_required);
  expectRedirect(await middleware(request('/dashboard')), '/login?error=sso_session_required');
  assert.deepEqual(state.calls.profiles, []);
  assert.deepEqual(state.calls.updates, []);
  assert.deepEqual(state.calls.events, []);
  assert.equal(state.calls.mfa, 0);
});

authTest('every existing EIS password session is checked against its authenticated user before retaining access', async () => {
  const { session, sessionGet, helpers, middleware, state } = fixture();
  assert.equal((await session(sessionRequest())).status, 200);
  assert.deepEqual(await (await sessionGet()).json(), { valid: true, role: 'staff', authSource: 'email', skipOtp: false, legacyMicrosoftLinked: false });
  assert.equal((await helpers.getServerProfile()).role, 'staff');
  assert.equal((await middleware(request('/api/sales?brand=CO'))).headers.get('x-middleware-next'), '1');
  assert.equal(state.calls.getSession, 4);
  assert.equal(state.calls.getUser, 4);
}, { SUPABASE_SECRET_KEY: undefined });

authTest('password account session checks require password AMR and the matching EIS user', async () => {
  assert.equal(await microsoftSession.isPasswordAccountSession(approvedUser, { access_token: accessTokenFor(approvedUser, sessionId, 'password') }), true);
  assert.equal(await microsoftSession.isPasswordAccountSession(approvedUser, { access_token: accessTokenFor(approvedUser, sessionId, ['password', 'totp']) }), true);
  for (const [user, session] of [
    [approvedUser, null],
    [approvedUser, { access_token: 'not-a-jwt' }],
    [approvedUser, { access_token: accessTokenFor(approvedUser, sessionId, 'oauth') }],
    [approvedUser, { access_token: accessTokenFor(approvedUser, sessionId, 'otp') }],
    [approvedUser, { access_token: accessTokenFor(approvedUser, sessionId, ['password', 'oauth']) }],
    [approvedUser, { access_token: accessTokenFor(microsoftUser, sessionId, 'password') }],
    [microsoftUser, { access_token: accessTokenFor(microsoftUser, sessionId, 'password') }],
  ]) {
    assert.equal(await microsoftSession.isPasswordAccountSession(user, session), false);
  }
});

authTest('existing EIS password sessions retain access even if a previous Microsoft identity was linked', async () => {
  const linkedEisUser = { ...approvedUser,
    app_metadata: { provider: 'email', providers: ['email', microsoftProvider] },
    identities: [{ provider: 'email' }, { provider: microsoftProvider }],
  };
  const { session, sessionGet, helpers, middleware } = fixture({
    user: linkedEisUser, session: { access_token: accessTokenFor(linkedEisUser, sessionId, 'password') },
  });
  assert.equal((await session(sessionRequest())).status, 200);
  assert.deepEqual(await (await sessionGet()).json(), { valid: true, role: 'staff', authSource: 'email', skipOtp: false, legacyMicrosoftLinked: true });
  assert.equal((await helpers.getServerProfile()).role, 'staff');
  assert.equal((await middleware(request('/api/sales?brand=CO'))).headers.get('x-middleware-next'), '1');
});

authTest('self-authenticated calculate does not bypass Microsoft session proof for user administrators', async () => {
  const { calculate, state } = fixture({
    user: microsoftUser, session: { access_token: accessTokenFor() }, profile: { role: 'admin', brands: [] },
  });
  const response = await calculate()(new Request(origin + '/api/replenishment/calculate', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ brand: 'INVALID' }),
  }));
  await expectRejected(response, 401, '권한이 없습니다.');
  assert.deepEqual(state.calls.profiles, []);
  assert.equal(state.calls.mfa, 0);
});

function renderDashboard(profile, pathname, loading = false) {
  const DashboardLayout = load('src/app/(dashboard)/layout.tsx', {
    'next/navigation': {
      usePathname: () => pathname,
      useRouter: () => ({ replace() {} }),
    },
    '@/contexts/AuthContext': {
      useAuth: () => ({ profile, loading, signOut() {} }),
      AuthProvider: ({ children }) => React.createElement(React.Fragment, null, children),
    },
    '@/components/layout/TopNav': {
      TopNav: () => React.createElement('nav', { 'data-test': 'navigation' }),
    },
    '@/app/eis-theme.css': {},
  }).default;
  return renderToStaticMarkup(React.createElement(DashboardLayout, null,
    React.createElement('section', { 'data-test': 'protected-child' }, 'Security or dashboard content')));
}

authTest('vendor dashboard layout renders security settings and the OTP guide', async () => {
  for (const pathname of ['/settings/security', '/settings/security/guide']) {
    const rendered = renderDashboard({ role: 'vendor' }, pathname);
    assert.match(rendered, /data-test="protected-child"/);
    assert.match(rendered, /data-test="navigation"/);
  }
});

authTest('vendor dashboard layout suppresses ordinary dashboard and unrelated settings content', async () => {
  for (const pathname of ['/dashboard', '/settings', '/settings/security-other']) {
    const rendered = renderDashboard({ role: 'vendor' }, pathname);
    assert.doesNotMatch(rendered, /data-test="protected-child"/);
    assert.equal(rendered, '');
  }
});

authTest('dashboard layout denies unresolved profiles and hides protected children while loading', async () => {
  assert.doesNotMatch(renderDashboard(null, '/dashboard'), /data-test="protected-child"/);
  assert.match(renderDashboard(null, '/dashboard'), /role="alert"/);
  assert.doesNotMatch(renderDashboard(null, '/dashboard', true), /data-test="protected-child"/);
  assert.match(renderDashboard({ role: 'staff' }, '/dashboard'), /data-test="protected-child"/);
});

authTest('verified company Microsoft sessions bypass app OTP at every boundary while EIS passwords retain OTP', async () => {
  const proof = await makeSessionProof({companyDomainVerified:true});
  const profile = {id:microsoftUser.id,role:'admin',brands:[],email:microsoftUser.email,name:'Company MS'};
  const f = fixture({user:microsoftUser,session:{access_token:accessTokenFor()},sessionProof:proof,profile,
    aal:{currentLevel:'aal1',nextLevel:'aal2'},aalError:{message:'MFA must not be requested'}});
  assert.equal((await f.sessionGet()).status,200);
  assert.equal((await (await f.sessionGet()).json()).skipOtp,true);
  assert.equal((await f.session(sessionRequest())).status,200);
  assert.equal((await f.helpers.requireAdmin()).id,microsoftUser.id);
  assert.equal((await f.middleware(accountRequest('/api/sales',proof))).headers.get('x-middleware-next'),'1');
  assert.equal(f.state.calls.mfa,0);
  const password = fixture({aal:{currentLevel:'aal1',nextLevel:'aal2'},sessionProof:proof});
  assert.equal((await password.session(sessionRequest())).status,403);
  assert.equal(await microsoftSession.canSkipMicrosoftOtp(approvedUser,password.state.session,proof),false);
  assert.equal(await microsoftSession.canSkipMicrosoftOtp(microsoftUser,f.state.session,undefined),false);
  assert.equal(await microsoftSession.canSkipMicrosoftOtp(microsoftUser,f.state.session,await makeSessionProof()),false);
}, {REQUIRE_MFA:'true'});

authTest('a rejected Microsoft email domain cannot register an account or receive a session', async () => {
  const f = fixture({identityDomainDenied:true});
  expectRedirect(await f.callback(new Request(origin + '/auth/callback?code=test-code&state=test-state')), '/login?error=sso_domain_not_allowed');
  assert.deepEqual(f.state.calls.accounts,[]);
  assert.deepEqual(f.state.calls.links,[]);
  assert.deepEqual(f.state.calls.otpVerifications,[]);
});

authTest('the verified company-domain decision survives callback as a signed session claim', async () => {
  const f = fixture({identity:{...microsoftIdentity,companyDomainVerified:true}});
  const response = await f.callback(new Request(origin + '/auth/callback?code=test-code&state=test-state'));
  const proof = response.cookies.get(microsoftSession.MICROSOFT_SESSION_COOKIE)?.value;
  assert.equal(await microsoftSession.canSkipMicrosoftOtp(microsoftUser,f.state.otpSession,proof),true);
});

authTest('temporary session exchange failure recovers with a fresh grant without replaying Microsoft code', async () => {
  const f = fixture({otpErrors:[{status:0,name:'AuthRetryableFetchError'}],freshGrants:true});
  const response = await f.callback(request('/auth/callback?code=valid'));
  expectRedirect(response, '/login?auth_complete=1');
  assert.equal(f.state.calls.exchanges.length,1);
  assert.equal(f.state.calls.links.length,2);
  assert.notEqual(f.state.calls.otpVerifications[0].token_hash,f.state.calls.otpVerifications[1].token_hash);
  assert.equal(responseHasProof(response),true);
});
authTest('persistent transport failures stop after three fresh grants and issue no session proof', async () => {
  const f = fixture({otpError:{status:0,name:'AuthRetryableFetchError'},freshGrants:true});
  const response = await f.callback(request('/auth/callback?code=valid'));
  expectRedirect(response, '/login?error=auth_unavailable');
  assert.equal(f.state.calls.links.length,3);
  assert.equal(f.state.calls.exchanges.length,1);
  assert.equal(responseHasProof(response),false);
});
authTest('rate limits and rejected OTP grants do not retry', async () => {
  for(const status of [400,401,403,429]) {
    const f=fixture({otpError:{status}});
    expectRedirect(await f.callback(request('/auth/callback?code=valid')), '/login?error=sso_failed');
    assert.equal(f.state.calls.links.length,1);
    assert.equal(responseHasProof(await f.callback(request('/auth/callback'))),false);
  }
});

authTest('temporary user verification outage returns 503 rather than logging out or allowing access', async () => {
  const f=fixture({user:null,userError:{status:0,name:'AuthRetryableFetchError'}});
  const response=await f.middleware(new NextRequest(origin+'/dashboard'));
  assert.equal(response.status,503);
  assert.equal(response.headers.get('retry-after'),'3');
  assert.equal(response.headers.get('location'),null);
  assert.equal(f.state.calls.signOut,0);
});
async function signSessionPayload(payload) {
  const {SignJWT}=await import('jose');
  const key=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`BCAVE EIS Microsoft session proof:v1:${process.env.SUPABASE_SECRET_KEY}`)));
  return new SignJWT(payload).setProtectedHeader({alg:'HS256',typ:'JWT'}).sign(key);
}
authTest('Microsoft proof has no fixed eight-hour expiry and still requires its live Supabase session',async()=>{
 const {decodeJwt}=await import('jose');
 const payload=decodeJwt(await makeSessionProof({companyDomainVerified:true}));
 assert.equal(payload.exp,undefined);
 assert.equal(payload.session_lifetime,'supabase_session');
 const old=await signSessionPayload({...payload,iat:Math.floor(Date.now()/1000)-9*60*60});
 const session={access_token:accessTokenFor()};
 assert.equal(await microsoftSession.isAccountSessionAllowed(microsoftUser,session,old),true);
 assert.equal(await microsoftSession.canSkipMicrosoftOtp(microsoftUser,session,old),true);
 assert.equal(await microsoftSession.isAccountSessionAllowed(microsoftUser,null,old),false);
 assert.equal(await microsoftSession.isAccountSessionAllowed(microsoftUser,{access_token:accessTokenFor(microsoftUser,'66666666-6666-4666-8666-666666666666')},old),false);
});
authTest('a valid legacy proof upgrades transparently and preserves refreshed Supabase cookies',async()=>{
 const {decodeJwt}=await import('jose');const payload=decodeJwt(await makeSessionProof({companyDomainVerified:true}));
 delete payload.session_lifetime;payload.exp=Math.floor(Date.now()/1000)+3600;
 const legacy=await signSessionPayload(payload);
 const f=fixture({user:microsoftUser,session:{access_token:accessTokenFor()},sessionProof:legacy,refreshCookies:[{name:'test-refreshed-auth',value:'opaque',options:{path:'/'}}]});
 const req=accountRequest('/dashboard',legacy);const res=await f.middleware(req);
 assert.equal(res.headers.get('x-middleware-next'),'1');
 const renewed=res.cookies.get(microsoftSession.MICROSOFT_SESSION_COOKIE);
 assert.ok(renewed?.value);
 assert.equal(renewed.maxAge,400*24*60*60);
 assert.equal(renewed.httpOnly,true);
 assert.equal(renewed.secure,true);
 assert.equal(decodeJwt(renewed.value).exp,undefined);
 assert.equal(decodeJwt(renewed.value).company_domain_verified,true);
 assert.equal(req.cookies.get(microsoftSession.MICROSOFT_SESSION_COOKIE).value,renewed.value);
 assert.equal(res.cookies.get('test-refreshed-auth').value,'opaque');
});
authTest('expired or malformed legacy proofs cannot be upgraded into persistent sessions',async()=>{
 const {decodeJwt}=await import('jose');const payload=decodeJwt(await makeSessionProof({companyDomainVerified:true}));delete payload.session_lifetime;
 for(const exp of [undefined,Math.floor(Date.now()/1000)-1]){
  const proof=await signSessionPayload({...payload,...(exp===undefined?{}:{exp})});
  assert.equal(await microsoftSession.isAccountSessionAllowed(microsoftUser,{access_token:accessTokenFor()},proof),false);
  assert.equal(await microsoftSession.renewMicrosoftSessionProof(microsoftUser,{access_token:accessTokenFor()},proof),null);
 }
});
authTest('cookie persistence renews after a day without issuing a new Supabase session or extending other users',async()=>{
 const {decodeJwt}=await import('jose');const fresh=await makeSessionProof({companyDomainVerified:true});
 assert.equal(await microsoftSession.renewMicrosoftSessionProof(microsoftUser,{access_token:accessTokenFor()},fresh),null);
 const old=await signSessionPayload({...decodeJwt(fresh),iat:Math.floor(Date.now()/1000)-2*24*60*60});
 const renewed=await microsoftSession.renewMicrosoftSessionProof(microsoftUser,{access_token:accessTokenFor()},old);
 assert.equal(decodeJwt(renewed).session_id,sessionId);
 assert.equal(await microsoftSession.renewMicrosoftSessionProof({...microsoftUser,app_metadata:{...microsoftUser.app_metadata,microsoft_access_approved:false}},{access_token:accessTokenFor()},old),null);
});
authTest('logout clears the HttpOnly proof even when the Supabase session is already missing',async()=>{
 const f=fixture({user:null,session:null});
 const req=new NextRequest(origin+'/api/auth/session',{method:'DELETE'});
 assert.equal((await f.middleware(req)).headers.get('x-middleware-next'),'1');
 const res=await f.sessionDelete();
 assert.equal(res.status,200);
 assert.equal(res.cookies.get(microsoftSession.MICROSOFT_SESSION_COOKIE).maxAge,0);
 assert.equal(res.cookies.get(microsoftSession.MICROSOFT_SESSION_COOKIE).httpOnly,true);
 assert.equal(f.state.calls.getUser,0);
 assert.equal(f.state.calls.serverClients,0);
});
