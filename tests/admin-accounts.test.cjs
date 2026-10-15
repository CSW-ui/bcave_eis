const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { test } = require('node:test');
const ts = require('typescript');
const { NextResponse } = require('next/server');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function load(file, mocks = {}) {
  const filename = path.resolve(__dirname, '..', file);
  const loaded = new Module(filename, module);
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded.require = id => Object.prototype.hasOwnProperty.call(mocks, id) ? mocks[id] : module.require(id);
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, filename);
  return loaded.exports;
}

const accountSource = load('src/lib/account-source.ts');
const policy = load('src/lib/auth-policy.ts');
const officeEmail = 'staff@company.example';
const eisUser = { id: 'eis-uuid', email: officeEmail, app_metadata: {}, user_metadata: {} };
const msUser = {
  id: 'ms-uuid', email: 'microsoft-object@accounts.example.invalid',
  app_metadata: { auth_source: 'microsoft', microsoft_email: officeEmail, microsoft_tenant_id: 'company-tenant', microsoft_object_id: 'office-object' },
  user_metadata: { full_name: 'Microsoft Staff' },
};
const eisProfile = { id: eisUser.id, email: eisUser.email, name: 'EIS Staff', role: 'admin', brands: [] };
const msProfile = { id: msUser.id, email: msUser.email, name: 'Microsoft Staff', role: 'staff', brands: ['LE'] };
const approvedMsUser = { ...msUser, app_metadata: { ...msUser.app_metadata, microsoft_access_approved: true } };

function fixture(overrides = {}) {
  const state = {
    authUsers: [eisUser, msUser], profiles: [{ ...eisProfile }], events: [], pages: null,
    listError: null, profileError: null, upsertError: null, authUpdateError: null, gate: { id: 'admin', role: 'admin' },
    ...overrides,
    calls: { pages: [], lookups: [], upserts: [], updates: [], authUpdates: [], created: [], filters: [], mutations: [] },
  };
  state.authUsers = state.authUsers.map(user => ({ ...user, app_metadata: { ...user.app_metadata }, user_metadata: { ...user.user_metadata } }));
  function from(table) {
    let pendingUpdate;
    const filters = [];
    let limit = Infinity;
    function rows() {
      return (table === 'profiles' ? state.profiles : state.events)
        .filter(row => filters.every(([key, value]) => row[key] === value)).slice(0, limit);
    }
    const query = {
      select() { return query; }, order() { return query; },
      limit(value) { limit = value; return query; },
      range(start, end) { return Promise.resolve({ data: rows().slice(start, end + 1), error: state.profileError }); },
      eq(key, value) {
        state.calls.filters.push({ table, key, value });
        filters.push([key, value]);
        if (pendingUpdate) {
          state.calls.updates.push({ id: value, values: pendingUpdate });
          for (const row of rows()) Object.assign(row, pendingUpdate);
          return Promise.resolve({ error: null });
        }
        return query;
      },
      async maybeSingle() { return { data: rows()[0] || null, error: state.profileError }; },
      async upsert(value) {
        state.calls.upserts.push(value);
        state.calls.mutations.push('profile');
        if (state.upsertError) return { error: state.upsertError };
        const existing = state.profiles.find(profile => profile.id === value.id);
        if (existing) Object.assign(existing, value); else state.profiles.push(value);
        return { error: null };
      },
      update(value) { pendingUpdate = value; return query; },
      then(resolve, reject) { return Promise.resolve({ data: rows(), error: null }).then(resolve, reject); },
    };
    return query;
  }
  const supabaseAdmin = {
    from,
    auth: { admin: {
      async listUsers(params) {
        state.calls.pages.push(params);
        if (state.listError) return { data: { users: [] }, error: state.listError };
        const users = state.pages ? state.pages[params.page - 1] || [] : state.authUsers;
        const nextPage = state.pages && params.page < state.pages.length ? params.page + 1 : null;
        return { data: { users, nextPage }, error: null };
      },
      async getUserById(id) {
        state.calls.lookups.push(id);
        const user = state.authUsers.find(user => user.id === id);
        return { data: { user: user || null }, error: user ? null : { message: 'Unknown user' } };
      },
      async createUser(input) {
        state.calls.created.push(input);
        return { data: { user: { id: 'created-uuid', ...input } }, error: null };
      },
      async updateUserById(id, value) {
        state.calls.authUpdates.push({ id, value });
        state.calls.mutations.push('auth');
        if (state.authUpdateError) return { error: state.authUpdateError };
        const user = state.authUsers.find(user => user.id === id);
        if (user && value.app_metadata) user.app_metadata = value.app_metadata;
        return { error: null };
      },
    } },
  };
  const mocks = {
    '@/lib/supabase': { supabaseAdmin },
    '@/lib/auth': { requireAdmin: async () => state.gate },
    '@/lib/account-source': accountSource,
    '@/lib/auth-policy': policy,
    '@/lib/constants': { VALID_BRANDS: new Set(['CO', 'LE', 'WA', 'CK', 'LK']) },
  };
  return {
    state,
    users: load('src/app/api/admin/users/route.ts', mocks),
    events: load('src/app/api/admin/login-events/route.ts', mocks),
  };
}

function bodyRequest(body) {
  return new Request('https://eis.example.test/api/admin/users', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
}

test('account type trusts app metadata and ignores user-editable metadata', () => {
  assert.equal(accountSource.getAuthSource(msUser), 'microsoft');
  assert.equal(accountSource.getAuthSource(eisUser), 'email');
  assert.equal(accountSource.getAuthSource({ user_metadata: { auth_source: 'microsoft' } }), 'email');
  assert.equal(accountSource.getAccountDisplayEmail(msUser), officeEmail);
  assert.equal(accountSource.getAccountDisplayEmail({ email: officeEmail, user_metadata: { microsoft_email: 'forged@example.test' } }), officeEmail);
});

test('user listing keeps equal display emails as distinct UUIDs and shows pending Microsoft accounts', async () => {
  const f = fixture({ pages: [[eisUser], [msUser]] });
  const res = await f.users.GET();
  assert.equal(res.status, 200);
  const { users } = await res.json();
  assert.equal(users.length, 2);
  assert.equal(users[0].displayEmail, users[1].displayEmail);
  assert.notEqual(users[0].id, users[1].id);
  const pending = users.find(user => user.id === msUser.id);
  assert.deepEqual({ source: pending.authSource, role: pending.role, brands: pending.brands, hasProfile: pending.hasProfile },
    { source: 'microsoft', role: null, brands: [], hasProfile: false });
  assert.deepEqual(f.state.calls.pages.map(page => page.page), [1, 2]);
  assert.deepEqual(f.state.calls.upserts, []);
});

test('listing fails visibly if trusted account metadata cannot be fetched', async () => {
  const f = fixture({ listError: { message: 'Auth temporarily unavailable' } });
  assert.equal((await f.users.GET()).status, 500);
});

test('database-trigger profiles cannot expose Microsoft permissions without the trusted approval marker', async () => {
  for (const microsoftUser of [
    msUser,
    { ...msUser, app_metadata: { ...msUser.app_metadata, microsoft_access_approved: false } },
    { ...msUser, app_metadata: { ...msUser.app_metadata, microsoft_access_approved: 'true' } },
    { ...msUser, user_metadata: { ...msUser.user_metadata, microsoft_access_approved: true } },
  ]) {
    const f = fixture({ authUsers: [eisUser, microsoftUser], profiles: [{ ...eisProfile }, { ...msProfile, role: 'admin', brands: ['CO', 'LE'] }] });
    const { users } = await (await f.users.GET()).json();
    const pending = users.find(user => user.id === msUser.id);
    assert.equal(pending.hasProfile, false);
    assert.equal(pending.role, null);
    assert.deepEqual(pending.brands, []);
  }
});

test('explicit approval replaces a trigger profile and exposes permissions only after metadata save succeeds', async () => {
  const f = fixture({ profiles: [{ ...eisProfile }, { ...msProfile, role: 'staff', brands: [] }] });
  assert.equal((await f.users.PUT(bodyRequest({ id: msUser.id, name: 'New display name' }))).status, 400);
  assert.deepEqual(f.state.calls.mutations, []);
  assert.equal((await f.users.PUT(bodyRequest({ id: msUser.id, name: 'Microsoft Staff', role: 'manager', brands: ['WA'] }))).status, 200);
  assert.deepEqual(f.state.calls.mutations, ['profile', 'auth']);
  assert.deepEqual(f.state.calls.authUpdates[0].value.app_metadata, { ...msUser.app_metadata, microsoft_access_approved: true });
  const { users } = await (await f.users.GET()).json();
  const approved = users.find(user => user.id === msUser.id);
  assert.equal(approved.hasProfile, true);
  assert.equal(approved.role, 'manager');
  assert.deepEqual(approved.brands, ['WA']);
  assert.deepEqual(f.state.profiles.find(profile => profile.id === eisUser.id), eisProfile);
});

test('profile save failure cannot set a Microsoft approval marker', async () => {
  const f = fixture({ profiles: [{ ...eisProfile }, { ...msProfile }], upsertError: { message: 'Profile failed' } });
  assert.equal((await f.users.PUT(bodyRequest({ id: msUser.id, name: 'Microsoft Staff', role: 'staff', brands: ['LE'] }))).status, 500);
  assert.deepEqual(f.state.calls.authUpdates, []);
  assert.equal(f.state.authUsers.find(user => user.id === msUser.id).app_metadata.microsoft_access_approved, undefined);
});

test('approval marker save failure keeps a successfully written Microsoft profile in pending state', async () => {
  const f = fixture({ profiles: [{ ...eisProfile }, { ...msProfile }], authUpdateError: { message: 'Metadata failed' } });
  assert.equal((await f.users.PUT(bodyRequest({ id: msUser.id, name: 'Microsoft Staff', role: 'admin', brands: [] }))).status, 500);
  assert.deepEqual(f.state.calls.mutations, ['profile', 'auth']);
  const { users } = await (await f.users.GET()).json();
  const pending = users.find(user => user.id === msUser.id);
  assert.equal(pending.hasProfile, false);
  assert.equal(pending.role, null);
  assert.deepEqual(pending.brands, []);
});

test('new EIS account retains password creation and an explicit email account source', async () => {
  const f = fixture();
  const res = await f.users.POST(bodyRequest({ email: officeEmail, password: 'initial-password', name: 'Local Staff', role: 'staff', brands: ['CO'], authSource: 'microsoft' }));
  assert.equal(res.status, 200);
  assert.equal(f.state.calls.created[0].password, 'initial-password');
  assert.deepEqual(f.state.calls.created[0].app_metadata, { auth_source: 'email' });
  assert.equal(f.state.calls.upserts[0].id, 'created-uuid');
});

test('Microsoft permission approval requires an explicit role and writes its own synthetic-email profile', async () => {
  const f = fixture();
  assert.equal((await f.users.PUT(bodyRequest({ id: msUser.id, name: 'Microsoft Staff' }))).status, 400);
  assert.equal(f.state.calls.upserts.length, 0);
  const res = await f.users.PUT(bodyRequest({ id: msUser.id, name: 'Microsoft Staff', role: 'staff', brands: ['LE'], email: officeEmail }));
  assert.equal(res.status, 200);
  assert.deepEqual(f.state.calls.upserts[0], msProfile);
  assert.deepEqual(f.state.calls.authUpdates, [{ id: msUser.id, value: { app_metadata: { ...msUser.app_metadata, microsoft_access_approved: true } } }]);
  assert.deepEqual(f.state.calls.mutations, ['profile', 'auth']);
  assert.deepEqual(f.state.profiles.find(profile => profile.id === eisUser.id), eisProfile);
});

test('Microsoft password reset is rejected before any profile or Auth mutation', async () => {
  const f = fixture({ profiles: [{ ...eisProfile }, { ...msProfile }] });
  const res = await f.users.PUT(bodyRequest({ id: msUser.id, password: 'new-password', role: 'admin', authSource: 'email' }));
  assert.equal(res.status, 400);
  assert.deepEqual(f.state.calls.updates, []);
  assert.deepEqual(f.state.calls.upserts, []);
  assert.deepEqual(f.state.calls.authUpdates, []);
});

test('Microsoft role and brands change only its UUID while EIS password reset stays available', async () => {
  const f = fixture({ authUsers: [eisUser, approvedMsUser], profiles: [{ ...eisProfile }, { ...msProfile }] });
  assert.equal((await f.users.PUT(bodyRequest({ id: msUser.id, role: 'manager', brands: ['WA'] }))).status, 200);
  assert.deepEqual(f.state.calls.updates, [{ id: msUser.id, values: { role: 'manager', brands: ['WA'] } }]);
  assert.deepEqual(f.state.profiles.find(profile => profile.id === eisUser.id), eisProfile);
  assert.equal((await f.users.PUT(bodyRequest({ id: eisUser.id, password: 'new-eis-password' }))).status, 200);
  assert.deepEqual(f.state.calls.authUpdates, [{ id: eisUser.id, value: { password: 'new-eis-password' } }]);
});

test('invalid permission payloads and unknown UUIDs cannot change profiles', async () => {
  const f = fixture();
  for (const payload of [{ id: msUser.id, role: 'owner' }, { id: msUser.id, brands: ['UNKNOWN'] }, { id: 'missing', role: 'staff' }]) {
    assert.ok((await f.users.PUT(bodyRequest(payload))).status >= 400);
  }
  assert.deepEqual(f.state.calls.upserts, []);
  assert.deepEqual(f.state.calls.updates, []);
});

test('audit responses retain separate equal-email users and allow precise UUID filtering', async () => {
  const f = fixture({ events: [
    { id: 1, user_id: eisUser.id, email: officeEmail, created_at: '2026-10-14T00:00:00Z' },
    { id: 2, user_id: msUser.id, email: msUser.email, created_at: '2026-10-14T00:01:00Z' },
  ] });
  const all = await (await f.events.GET(new Request('https://eis.example.test/api/admin/login-events'))).json();
  assert.equal(all.events[0].displayEmail, all.events[1].displayEmail);
  assert.deepEqual(all.events.map(event => event.authSource), ['email', 'microsoft']);
  assert.deepEqual(all.events.map(event => event.user_id), [eisUser.id, msUser.id]);
  const filtered = await (await f.events.GET(new Request(`https://eis.example.test/api/admin/login-events?userId=${msUser.id}`))).json();
  assert.deepEqual(filtered.events.map(event => event.id), [2]);
});

test('non-admin requests cannot read or mutate accounts or audit logs', async () => {
  const f = fixture({ gate: NextResponse.json({ error: 'Admin required' }, { status: 403 }) });
  assert.equal((await f.users.GET()).status, 403);
  assert.equal((await f.users.PUT(bodyRequest({ id: msUser.id, role: 'admin' }))).status, 403);
  assert.equal((await f.users.POST(bodyRequest({ email: officeEmail }))).status, 403);
  assert.equal((await f.events.GET(new Request('https://eis.example.test/api/admin/login-events'))).status, 403);
  assert.deepEqual(f.state.calls.pages, []);
  assert.deepEqual(f.state.calls.upserts, []);
});

function passwordMarkup(user) {
  const page = load('src/app/(dashboard)/settings/password/page.tsx', {
    '@/lib/supabase-browser': { createSupabaseBrowserClient: () => ({ auth: {} }) },
    '@/contexts/AuthContext': { useAuth: () => ({ user, profile: { email: user.email }, loading: false }) },
    '@/lib/account-source': accountSource,
  }).default;
  return renderToStaticMarkup(React.createElement(page));
}

test('Microsoft password settings show company account management and no password form', () => {
  const markup = passwordMarkup(msUser);
  assert.match(markup, /myaccount\.microsoft\.com/);
  assert.match(markup, new RegExp(officeEmail.replaceAll('.', '\\.')));
  assert.doesNotMatch(markup, /type="password"/);
});

test('forged user metadata cannot hide the EIS password settings form', () => {
  const markup = passwordMarkup({ ...eisUser, user_metadata: { auth_source: 'microsoft' } });
  assert.match(markup, /type="password"/);
  assert.doesNotMatch(markup, /myaccount\.microsoft\.com/);
});
