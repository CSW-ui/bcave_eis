const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { test, before } = require('node:test');
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

const identity = {
  tenantId: '33333333-3333-4333-8333-333333333333',
  objectId: '44444444-4444-4444-8444-444444444444',
  email: 'staff@example.test',
  name: 'Microsoft Staff',
};
let microsoftAuth;
let internalEmail;
before(async () => {
  microsoftAuth = load('src/lib/microsoft-auth.ts', {
    jose: await import('jose'), '@/lib/auth-urls': load('src/lib/auth-urls.ts'),
  });
  internalEmail = microsoftAuth.getMicrosoftAccountEmail(identity.tenantId, identity.objectId);
});

function metadata(displayEmail = identity.email) {
  return {
    auth_source: 'microsoft', microsoft_tenant_id: identity.tenantId,
    microsoft_object_id: identity.objectId, microsoft_email: displayEmail,
    microsoft_access_approved: false,
  };
}

function microsoftUser(overrides = {}) {
  return { id: '22222222-2222-4222-8222-222222222222', email: internalEmail, app_metadata: metadata(), ...overrides };
}

function fixture(overrides = {}) {
  const state = {
    located: null, lookupError: null, lookupUser: undefined,
    created: microsoftUser(), createError: null,
    pages: [[microsoftUser()]], listError: null,
    updated: undefined, updateError: null,
    ...overrides,
    calls: { creates: [], lists: [], updates: [], profiles: [], gets: [] },
  };
  const admin = {
    async getUserById(id) { state.calls.gets.push(id); return {data:{user:state.lookupUser},error:state.getError??null}; },
    async createUser(input) {
      state.calls.creates.push(input);
      return { data: { user: state.created }, error: state.createErrors?.length ? state.createErrors.shift() : state.createError };
    },
    async listUsers(input) {
      state.calls.lists.push(input);
      return { data: { users: state.pages[input.page - 1] || [] }, error: state.listError };
    },
    async updateUserById(id, input) {
      state.calls.updates.push({ id, input });
      return {
        data: { user: state.updated === undefined ? microsoftUser({ app_metadata: input.app_metadata }) : state.updated },
        error: state.updateError,
      };
    },
  };
  const account = load('src/lib/microsoft-account.ts', {
    '@/lib/auth-network': { ...load('src/lib/auth-network.ts'), async waitForAuthRecovery() {} },
    '@/lib/microsoft-auth': microsoftAuth,
    '@/lib/supabase': { supabaseAdmin: {
      auth: { admin },
      from(table) {
        state.calls.profiles.push(table);
        assert.equal(table,'profiles');
        return {select(fields){assert.equal(fields,'id');return this},eq(field,email){assert.equal(field,'email');assert.equal(email,internalEmail);return this},async maybeSingle(){return {data:state.located,error:state.lookupError}}};
      },
    } },
  });
  return { ensure: account.ensureMicrosoftAccount, state };
}

test('registration creates an immutable alias with explicit unapproved Microsoft metadata and no profile mutations', async () => {
  const { ensure, state } = fixture();
  const user = await ensure(identity);
  assert.match(user.email, /^[0-9a-f]{64}@microsoft-sso\.invalid$/);
  assert.notEqual(user.email, identity.email);
  assert.equal(user.app_metadata.microsoft_access_approved, false);
  assert.deepEqual(state.calls.creates, [{
    email: internalEmail, email_confirm: true, app_metadata: metadata(), user_metadata: { name: identity.name },
  }]);
  assert.deepEqual(state.calls.lists, []);
  assert.deepEqual(state.calls.profiles, ['profiles']);
});

test('an existing alias lookup ignores a same-email EIS account and retains the Microsoft UUID', async () => {
  const existingEisUser = { id: '11111111-1111-4111-8111-111111111111', email: identity.email, app_metadata: { auth_source: 'email' } };
  const { ensure, state } = fixture({
    created: null, createError: { code: 'email_exists' }, pages: [[existingEisUser, microsoftUser()]],
  });
  const user = await ensure(identity);
  assert.equal(user.id, microsoftUser().id);
  assert.notEqual(user.id, existingEisUser.id);
  assert.equal(state.calls.creates[0].email, internalEmail);
  assert.deepEqual(state.calls.lists, [{ page: 1, perPage: 200 }]);
  assert.deepEqual(state.calls.updates, []);
  assert.deepEqual(state.calls.profiles, ['profiles']);
});

test('an absent alias cannot fall back to an EIS account with the same display email', async () => {
  const { ensure, state } = fixture({
    created: null, createError: { code: 'email_exists' },
    pages: [[{ id: 'existing-eis-user', email: identity.email, app_metadata: {} }]],
  });
  await assert.rejects(ensure(identity), /Microsoft account identity mismatch/);
  assert.deepEqual(state.calls.updates, []);
  assert.deepEqual(state.calls.profiles, ['profiles']);
});

test('only the explicit email_exists conflict can trigger an existing-account lookup', async () => {
  const { ensure, state } = fixture({ created: null, createError: { code: 'database_error', status: 500 } });
  await assert.rejects(ensure(identity), /Microsoft account registration failed/);
  assert.deepEqual(state.calls.lists, []);
  assert.deepEqual(state.calls.profiles, ['profiles']);
});

test('alias lookup traverses full pages until it finds the exact immutable account address', async () => {
  const firstPage = Array.from({ length: 200 }, (_, index) => ({ id: 'other-' + index, email: 'other-' + index + '@example.test' }));
  const { ensure, state } = fixture({
    created: null, createError: { code: 'email_exists' }, pages: [firstPage, [microsoftUser()]],
  });
  assert.equal((await ensure(identity)).id, microsoftUser().id);
  assert.deepEqual(state.calls.lists, [{ page: 1, perPage: 200 }, { page: 2, perPage: 200 }]);
});

test('an alias cannot be accepted unless administrator metadata matches Microsoft tenant and object IDs', async () => {
  for (const user of [
    microsoftUser({ app_metadata: {} }),
    microsoftUser({ app_metadata: { ...metadata(), auth_source: 'email' } }),
    microsoftUser({ app_metadata: { ...metadata(), microsoft_tenant_id: 'another-tenant' } }),
    microsoftUser({ app_metadata: { ...metadata(), microsoft_object_id: 'another-object' } }),
    microsoftUser({ email: identity.email }),
  ]) {
    const { ensure, state } = fixture({ created: user });
    await assert.rejects(ensure(identity), /Microsoft account identity mismatch/);
    assert.deepEqual(state.calls.updates, []);
    assert.deepEqual(state.calls.profiles, ['profiles']);
  }
});

test('display email changes update metadata without changing the alias, UUID, or permissions', async () => {
  for (const approval of [true, false]) {
    const account = microsoftUser({ app_metadata: { ...metadata('old@example.test'), microsoft_access_approved: approval, retained_setting: 'keep' } });
    const { ensure, state } = fixture({ created: account });
    const user = await ensure(identity);
    assert.equal(user.id, account.id);
    assert.equal(user.email, internalEmail);
    assert.equal(user.app_metadata.microsoft_access_approved, approval);
    assert.deepEqual(state.calls.updates, [{
      id: account.id, input: { app_metadata: { ...metadata(), microsoft_access_approved: approval, retained_setting: 'keep' } },
    }]);
    assert.deepEqual(state.calls.profiles, ['profiles']);
  }
});

test('failed or absent metadata updates fail closed', async () => {
  for (const overrides of [{ updateError: { code: 'database_error' } }, { updated: null }]) {
    const { ensure } = fixture({ created: microsoftUser({ app_metadata: metadata('old@example.test') }), ...overrides });
    await assert.rejects(ensure(identity), /Microsoft account metadata update failed/);
  }
});

test('account lookup failures and missing create results cannot register a session-ready account', async () => {
  const lookup = fixture({ created: null, createError: { code: 'email_exists' }, listError: { code: 'database_error' } });
  await assert.rejects(lookup.ensure(identity), /Microsoft account lookup failed/);
  const missing = fixture({ created: null });
  await assert.rejects(missing.ensure(identity), /Microsoft account identity mismatch/);
  assert.deepEqual(lookup.state.calls.profiles, ['profiles']);
  assert.deepEqual(missing.state.calls.profiles, ['profiles']);
});

test('lost creation response resolves the unique alias without duplicating accounts or granting access',async()=>{
 const f=fixture({createErrors:[{status:0},{code:'email_exists'}]});
 const user=await f.ensure(identity);
 assert.equal(f.state.calls.creates.length,2);
 assert.equal(f.state.calls.lists.length,1);
 assert.equal(user.email,internalEmail);
 assert.equal(user.app_metadata.microsoft_access_approved,false);
 assert.deepEqual(f.state.calls.creates[0],f.state.calls.creates[1]);
});
test('persistent registration network failures stop after three attempts',async()=>{
 const f=fixture({createError:{status:0}});
 await assert.rejects(f.ensure(identity));
 assert.equal(f.state.calls.creates.length,3);
 assert.equal(f.state.calls.lists.length,0);
});

test('existing immutable alias resolves directly without create attempts or listing Auth users',async()=>{
 const user=microsoftUser({app_metadata:{...metadata(),microsoft_access_approved:true}});
 const f=fixture({located:{id:user.id},lookupUser:user});
 assert.equal((await f.ensure(identity)).id,user.id);
 assert.deepEqual(f.state.calls.creates,[]);
 assert.deepEqual(f.state.calls.lists,[]);
 assert.deepEqual(f.state.calls.gets,[user.id]);
});
test('a profile locator cannot impersonate another account or bypass current Auth approval metadata',async()=>{
 for(const user of [microsoftUser({email:'eis@example.test'}),microsoftUser({app_metadata:{...metadata(),microsoft_object_id:'other'}})]){
 const f=fixture({located:{id:user.id},lookupUser:user});
 await assert.rejects(f.ensure(identity),/identity mismatch/);
 assert.equal(f.state.calls.creates.length,0);
 }
 const denied=microsoftUser({app_metadata:{...metadata(),microsoft_access_approved:false}});
 assert.equal((await fixture({located:{id:denied.id},lookupUser:denied}).ensure(identity)).app_metadata.microsoft_access_approved,false);
});
test('failed locator reads do not create replacement accounts',async()=>{
 const f=fixture({lookupError:{code:'network'}});await assert.rejects(f.ensure(identity),/lookup failed/);assert.equal(f.state.calls.creates.length,0);
});
