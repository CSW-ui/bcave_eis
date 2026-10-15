const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const { test } = require('node:test')
const ts = require('typescript')

function fixture(options = {}) {
  const provider = 'custom:bcave-entra'
  const emailIdentity = { provider: 'email', identity_id: 'password-identity' }
  const microsoftIdentity = { provider, identity_id: 'legacy-microsoft-identity' }
  const user = { id: 'existing-eis-user', app_metadata: {}, identities: [emailIdentity, microsoftIdentity], ...options.user }
  const calls = []
  let removed = false
  const client = { auth: {
    async getUser() { return { data: { user: removed && !options.readbackFailure ? { ...user, identities: [emailIdentity] } : user }, error: null } },
    async getSession() { return { data: { session: { password: !options.noPassword } }, error: null } },
    async unlinkIdentity(identity) { calls.push(identity); removed = !options.unlinkError; return { error: options.unlinkError || null } },
  } }
  const mocks = {
    '@/lib/auth': { getServerProfile: async () => options.authorized === false ? null : { id: user.id } },
    '@/lib/supabase-server': { createSupabaseServerClient: () => client },
    '@/lib/account-source': {
      getAuthSource: u => u?.app_metadata?.auth_source === 'microsoft' ? 'microsoft' : 'email',
      getLegacyMicrosoftProviderIds: () => ['custom:bcave-entra', 'custom:configured-entra'],
    },
    '@/lib/microsoft-session': { isPasswordAccountSession: (_user, session) => session?.password === true },
  }
  const filename = path.resolve(__dirname, '../src/app/api/auth/unlink-microsoft/route.ts')
  const loaded = new Module(filename, module)
  loaded.paths = Module._nodeModulePaths(path.dirname(filename))
  loaded.require = name => mocks[name] || module.require(name)
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename)
  return { calls, POST: loaded.exports.POST }
}

test('legacy unlink requires an authenticated approved EIS account with OTP', async () => {
  const f = fixture({ authorized: false })
  assert.equal((await f.POST()).status, 401)
  assert.deepEqual(f.calls, [])
})
test('legacy unlink cannot target a separate Microsoft account', async () => {
  const f = fixture({ user: { app_metadata: { auth_source: 'microsoft' } } })
  assert.equal((await f.POST()).status, 403)
  assert.deepEqual(f.calls, [])
})
test('legacy unlink requires a password-authenticated session rather than an email OTP grant', async () => {
  const f = fixture({ noPassword: true })
  assert.equal((await f.POST()).status, 401)
  assert.deepEqual(f.calls, [])
})
test('legacy unlink preserves password identity and removes only the Microsoft identity', async () => {
  const f = fixture()
  assert.deepEqual(await (await f.POST()).json(), { success: true })
  assert.deepEqual(f.calls, [{ provider: 'custom:bcave-entra', identity_id: 'legacy-microsoft-identity' }])
})
test('legacy unlink refuses to remove the only login identity', async () => {
  const f = fixture({ user: { identities: [{ provider: 'custom:bcave-entra', identity_id: 'only-identity' }] } })
  assert.equal((await f.POST()).status, 409)
  assert.deepEqual(f.calls, [])
})
test('disabled manual linking reports the owner requirement without deleting existing accounts', async () => {
  const f = fixture({ unlinkError: { code: 'manual_linking_disabled', message: 'internal details' } })
  const response = await f.POST()
  assert.equal(response.status, 409)
  assert.match((await response.json()).error, /프로젝트 소유자/)
})
test('legacy unlink verifies the identity was actually removed', async () => {
  const f = fixture({ readbackFailure: true })
  assert.equal((await f.POST()).status, 503)
})
test('legacy unlink also handles the configured Microsoft provider identifier', async () => {
  const f = fixture({ user: { identities: [
    { provider: 'email', identity_id: 'password-identity' },
    { provider: 'custom:configured-entra', identity_id: 'configured-identity' },
  ] } })
  assert.equal((await f.POST()).status, 200)
  assert.deepEqual(f.calls, [{ provider: 'custom:configured-entra', identity_id: 'configured-identity' }])
})
