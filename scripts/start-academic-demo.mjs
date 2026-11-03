// Portable foreground helper for an isolated local Supabase-backed demo preview.
// Run after `node scripts/academic-demo.mjs setup` in a separate terminal.
import { execFileSync, spawnSync, spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))
const WEB = resolve(ROOT, 'web')
const CONTAINER = 'supabase_db_air-rental'
const PORT = 3011
const API_URL = 'http://127.0.0.1:55321'

function runSupabaseStatus() {
  const candidates = process.platform === 'win32'
    ? [{ command: 'supabase', shell: false }, { command: 'npx.cmd', shell: true }]
    : [{ command: 'supabase', shell: false }, { command: 'npx', shell: false }]
  for (const candidate of candidates) {
    const args = candidate.command === 'npx' || candidate.command === 'npx.cmd'
      ? ['--yes', 'supabase', 'status', '-o', 'json']
      : ['status', '-o', 'json']
    const result = spawnSync(candidate.command, args, {
      cwd: ROOT, encoding: 'utf8', windowsHide: true, shell: candidate.shell, timeout: 20_000,
    })
    if (result.error?.code === 'ENOENT') continue
    if (result.status !== 0) throw new Error('Supabase local status failed; check the isolated A.I.R stack.')
    try { return JSON.parse(result.stdout) } catch { throw new Error('Supabase CLI status output was invalid.') }
  }
  throw new Error('Supabase CLI was not found.')
}

function assertLocalProject(status) {
  const labels = JSON.parse(execFileSync('docker', ['inspect', CONTAINER, '--format', '{{json .Config.Labels}}'], {
    cwd: ROOT, encoding: 'utf8', windowsHide: true, timeout: 10_000,
  }))
  const workdir = resolve(labels['com.supabase.cli.workdir'] ?? '')
  const expectedRoot = resolve(ROOT)
  const samePath = process.platform === 'win32'
    ? workdir.toLowerCase() === expectedRoot.toLowerCase()
    : workdir === expectedRoot
  if (labels['com.supabase.cli.project'] !== 'air-rental' || !samePath || status.API_URL !== API_URL) {
    throw new Error('Refusing preview: local Docker project, repository path, or API endpoint did not match.')
  }
  if (!status.ANON_KEY || !status.SERVICE_ROLE_KEY) throw new Error('Required local Supabase credentials are unavailable.')
}

async function assertPortFree(port) {
  await new Promise((resolvePromise, reject) => {
    const probe = createServer()
    probe.once('error', () => reject(new Error(`Port ${port} is already in use; stop only the process you started for this demo.`)))
    probe.listen(port, '127.0.0.1', () => probe.close((error) => error ? reject(error) : resolvePromise()))
  })
}

const localStatus = runSupabaseStatus()
assertLocalProject(localStatus)
await assertPortFree(PORT)

const environment = { ...process.env }
Object.assign(environment, {
  NODE_ENV: 'development',
  NEXT_PUBLIC_APP_URL: `http://localhost:${PORT}`,
  NEXT_PUBLIC_SUPABASE_URL: localStatus.API_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: localStatus.ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: localStatus.SERVICE_ROLE_KEY,
  AIR_ENABLE_PHONE_OTP: 'false',
  AIR_ENABLE_IDENTITY_DOCUMENTS: 'false',
  AIR_ENABLE_PAYMENTS: 'false',
  AIR_ENABLE_ERROR_ALERTS: 'false',
  CHAT_RATE_LIMIT_SECRET: 'air-academic-demo-chat-local-only-55321-3011',
  CHAT_TRUST_PROXY: 'false',
  AIR_ENABLE_CHAT_LLM: 'false',
})
for (const key of ['OPS_ALERT_WEBHOOK_URL', 'SEPAY_WEBHOOK_SECRET', 'AIR_BANK_NAME', 'AIR_BANK_ACCOUNT_NUMBER', 'AIR_BANK_ACCOUNT_NAME', 'OPENAI_API_KEY', 'OPENAI_MODEL', 'SENTRY_DSN', 'NEXT_PUBLIC_SENTRY_DSN']) {
  delete environment[key]
}

console.log(`Starting A.I.R academic demo at http://localhost:${PORT} using guarded local Supabase.`)
console.log('Email magic links stay in local Mailpit; phone OTP, identity documents, payment, alerts and LLM are disabled.')
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '-H', '127.0.0.1', '-p', String(PORT)], {
  cwd: WEB,
  env: environment,
  stdio: 'inherit',
  windowsHide: true,
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal))
}
child.on('error', (error) => {
  console.error(`Could not start the Next.js preview: ${error.message}`)
  process.exitCode = 1
})
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  else process.exitCode = code ?? 1
})
