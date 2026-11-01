// Opt-in network/install check. No provider key or model request is used.
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync, realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const temporary = mkdtempSync(join(tmpdir(), 'codex-ds-isolated-'));
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(DSH_|DEEPSEEK_|CODEX_)/.test(key)));
Object.assign(env, {HOME: join(temporary, 'home'), USERPROFILE: join(temporary, 'home'),
  CODEX_HOME: join(temporary, 'codex'), CODEX_DS_WORKERS_HOME: join(temporary, 'workers')});
mkdirSync(env.HOME, {recursive: true});
const cli = join(root, 'bin', 'codex-ds-workers.mjs');
const report = {platform: process.platform, node: process.versions.node, model_requests: 0, temporary_home: true, checks: {}};
let installed = false;

const call = (args, input) => new Promise((accept, reject) => {
  const child = spawn(process.execPath, [cli, ...args], {env, cwd: root, stdio: ['pipe', 'pipe', 'pipe']});
  let stdout = '', stderr = '';
  child.stdout.on('data', data => {stdout += data; process.stdout.write(data);});
  child.stderr.on('data', data => {stderr += data; process.stderr.write(data);});
  child.stdin.end(input || '');
  child.on('error', reject);
  child.on('exit', code => code === 0 ? accept(stdout) : reject(new Error(`${args[0]} failed (${code}): ${stderr.slice(-3000)}`)));
});
const record = () => JSON.parse(readFileSync(join(env.CODEX_DS_WORKERS_HOME, 'config', 'installation.json'), 'utf8'));
try {
  console.log('Isolated setup: fresh temporary HOME/CODEX_HOME; no provider key.');
  await call(['setup']); installed = true;
  report.checks.setup = true;
  const first = record();
  assert.equal(first.backend, 'background');
  assert.ok(realpathSync(first.dsh).startsWith(realpathSync(env.CODEX_DS_WORKERS_HOME)));
  assert.ok(first.env.DSH_HOME.startsWith(env.CODEX_DS_WORKERS_HOME));
  assert.equal(existsSync(join(env.CODEX_DS_WORKERS_HOME, 'config', 'provider.json')), false);
  report.checks.private_owned_paths_and_no_saved_key = true;
  const config = readFileSync(join(env.CODEX_HOME, 'config.toml'), 'utf8');
  assert.match(config, /\[mcp_servers\.dsh_subagent\]/);
  assert.match(config, /http_headers/);
  report.checks.codex_registration = true;
  const status = JSON.parse(await call(['status', '--json']));
  assert.equal(status.active.length, 0);
  report.checks.no_active_tasks = true;
  const tools = JSON.parse(await call(['rpc'], JSON.stringify({name: 'dsh_list', arguments: {cwd: root}})));
  assert.equal(tools.total, 0);
  report.checks.authenticated_rpc = true;
  await call(['setup']);
  report.checks.repeat_setup = true;
  await call(['stop']);
  await call(['setup']);
  report.checks.setup_after_stopped_service = true;
  await call(['doctor', '--json']);
  report.checks.doctor_command = true;
  await call(['uninstall']); installed = false;
  assert.equal(existsSync(join(env.CODEX_HOME, 'skills', 'dsh-subagent')), false);
  assert.doesNotMatch(readFileSync(join(env.CODEX_HOME, 'config.toml'), 'utf8'), /\[mcp_servers\.dsh_subagent\]/);
  assert.ok(existsSync(join(env.CODEX_DS_WORKERS_HOME, 'state')));
  report.checks.uninstall_registration_and_skill_history_retained = true;
  report.pass = true;
} catch (error) {
  report.pass = false;
  report.error = error.message.replaceAll(temporary, '<temporary-home>').replace(/sk-[a-zA-Z0-9_-]{16,}/g, '[REDACTED]');
  throw error;
} finally {
  if (installed) {try {await call(['uninstall']);} catch {}}
  const output = process.env.CODEX_DS_TEST_REPORT;
  if (output) writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  if (process.env.CODEX_DS_KEEP_TEST_HOME === '1') console.log('Temporary test files retained by explicit test option.');
  else rmSync(temporary, {recursive: true, force: true});
}
