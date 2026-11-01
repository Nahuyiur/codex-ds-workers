import {existsSync, readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, renameSync, lstatSync, realpathSync} from 'node:fs';
import {join, dirname, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {OWNER, BRIDGE_REVISION, SDK_VERSION, PACKAGE_ROOT, managedEnvironment} from './paths.mjs';

export const readJson = file => existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
export const rewriteAdvice = text => text
  .replaceAll('npx -y dsh-subagent-mcp@latest login', 'codex login')
  .replaceAll('npx -y dsh-subagent-mcp@latest configure --capture-key', 'node bin/codex-ds-workers.mjs configure')
  .replaceAll('npx -y dsh-subagent-mcp@latest configure', 'node bin/codex-ds-workers.mjs configure')
  .replace(/^To use the Codex copy selected by this integration:.*\r?\n/gm, '')
  .replaceAll('npx -y dsh-subagent-mcp@latest codex', 'codex');
const writeJson = (file, data) => {
  mkdirSync(dirname(file), {recursive: true, mode: 0o700});
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', {mode: 0o600});
};
const skillPath = p => join(p.codexHome, 'skills', 'dsh-subagent');
const skillMarker = p => join(skillPath(p), '.codex-ds-workers.json');
const lexists = file => {try {lstatSync(file); return true;} catch (error) {if (error.code === 'ENOENT') return false; throw error;}};

export function installation(p) {
  const record = readJson(p.marker);
  if (!record) return null;
  if (record.owner !== OWNER || record.paths?.root !== p.root) throw new Error('This data directory belongs to another installation.');
  for (const key of ['data', 'config', 'state', 'dshHome', 'codexHome'])
    if (record.paths[key] !== p[key]) throw new Error(`Installation ${key} differs. Reuse its original environment or choose a different CODEX_DS_WORKERS_HOME.`);
  return record;
}

export function checkOwnership(p) {
  const record = installation(p);
  if (existsSync(join(p.config, 'installation.json')) && !record)
    throw new Error('An existing bridge installation is not owned by codex-ds-workers; preserved. Choose isolated data/config/state paths.');
  if (lexists(skillPath(p))) {
    const owner = readJson(skillMarker(p));
    if (owner?.owner !== OWNER || owner.root !== p.root)
      throw new Error('A foreign dsh-subagent skill exists; preserved. Select a separate CODEX_HOME.');
  }
  const config = join(p.codexHome, 'config.toml');
  const text = existsSync(config) ? readFileSync(config, 'utf8') : '';
  const table = text.match(/^\s*\[mcp_servers\.(?:dsh_subagent|"dsh_subagent"|'dsh_subagent')\][^\r\n]*\r?\n([\s\S]*?)(?=^\[|$(?![\s\S]))/m);
  if (table || /\bdsh_subagent\b/.test(text)) {
    const endpoint = readJson(join(p.state, 'http.json'));
    const url = table?.[1].match(/^url\s*=\s*"([^"\r\n]+)"/m)?.[1];
    if (!record || !endpoint || url !== `http://127.0.0.1:${endpoint.port}/mcp`)
      throw new Error('A foreign MCP registration named dsh_subagent exists; preserved. Select a separate CODEX_HOME or explicitly resolve the name conflict.');
  }
  return record;
}

export function run(command, args, {env = process.env, capture = false, cwd} = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {env, cwd, windowsHide: true, stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit'});
    let out = '', err = '';
    if (capture) {child.stdout.on('data', data => {out += data;}); child.stderr.on('data', data => {err += data;});}
    child.on('error', reject);
    child.on('exit', code => {
      if (code === 0) return resolvePromise(out);
      const error = new Error(`${command} exited with ${code}${capture ? ': ' + err.trim() : ''}`);
      error.exitCode = code;
      error.stdout = out;
      reject(error);
    });
  });
}

export function npmCommand(env = process.env) {
  const require = createRequire(import.meta.url);
  try {return [process.execPath, join(dirname(require.resolve('npm/package.json')), 'bin', 'npm-cli.js')];} catch {}
  for (const dir of (env.PATH || env.Path || '').split(process.platform === 'win32' ? ';' : ':')) {
    for (const file of [join(dir, 'node_modules', 'npm', 'bin', 'npm-cli.js'), join(dir, '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js')])
      if (existsSync(file)) return [process.execPath, resolve(file)];
    if (process.platform !== 'win32' && existsSync(join(dir, 'npm'))) {
      const file = realpathSync(join(dir, 'npm'));
      if (/\.[cm]?js$/.test(file)) return [process.execPath, file];
    }
  }
  throw new Error('npm JavaScript entrypoint was not found. Install Node.js 24+ with npm and put it on PATH.');
}

async function assertIdle(p, runner, env) {
  if (!existsSync(join(p.config, 'installation.json'))) return;
  let output;
  try {output = await runner(process.execPath, [join(p.vendor, 'src', 'cli.mjs'), 'status', '--json'], {env, capture: true});}
  catch (error) {if (error.exitCode !== 1 || !error.stdout) throw error; output = error.stdout;}
  const status = JSON.parse(output);
  if (typeof status.running !== 'boolean' || (status.running && !Array.isArray(status.active)))
    throw new Error('Cannot establish bridge activity safely.');
  if (status.running && status.active?.length) throw new Error('Active bridge tasks exist. Finish or interrupt them before setup/uninstall.');
}

async function prepareDependencies(p, env, runner, sourceRoot) {
  if (!existsSync(join(p.vendor, '.git'))) {
    if (existsSync(p.vendor)) throw new Error('Managed source directory has no Git identity; preserved for inspection.');
    mkdirSync(dirname(p.vendor), {recursive: true, mode: 0o700});
    const staging = p.vendor + '.download';
    rmSync(staging, {recursive: true, force: true});
    try {
      await runner('git', ['init', '--quiet', staging], {env});
      await runner('git', ['-C', staging, 'remote', 'add', 'origin', 'https://github.com/dqtz5vpvj9-create/dsh-subagent-mcp.git'], {env});
      await runner('git', ['-C', staging, 'fetch', '--quiet', '--depth', '1', 'origin', BRIDGE_REVISION], {env});
      await runner('git', ['-C', staging, 'checkout', '--quiet', '--detach', 'FETCH_HEAD'], {env});
      renameSync(staging, p.vendor);
    } catch (error) {rmSync(staging, {recursive: true, force: true}); throw error;}
  }
  const revision = (await runner('git', ['-C', p.vendor, 'rev-parse', 'HEAD'], {env, capture: true})).trim();
  if (revision !== BRIDGE_REVISION) throw new Error('Managed bridge revision differs from the pinned revision; preserved for inspection.');
  const npm = npmCommand(env);
  if (!existsSync(join(p.vendor, 'node_modules', '@modelcontextprotocol', 'sdk', 'package.json')))
    await runner(npm[0], [...npm.slice(1), 'ci', '--no-audit', '--no-fund'], {env, cwd: p.vendor});
  mkdirSync(p.sdk, {recursive: true, mode: 0o700});
  for (const file of ['package.json', 'package-lock.json']) cpSync(join(sourceRoot, 'runtime', file), join(p.sdk, file));
  const installed = readJson(join(p.sdk, 'node_modules', '@deepseek-ai', 'dsh', 'package.json'));
  if (installed?.version !== SDK_VERSION)
    await runner(npm[0], [...npm.slice(1), 'ci', '--prefix', p.sdk, '--no-audit', '--no-fund'], {env});
}

function prepareProgram(p, sourceRoot) {
  mkdirSync(p.program, {recursive: true, mode: 0o700});
  cpSync(join(sourceRoot, 'adapters'), join(p.program, 'adapters'), {recursive: true});
  writeJson(join(p.program, 'runtime.json'), {sdk: p.sdk});
  const profile = join(p.dshHome, 'profiles', 'codex-ds-workers-v021', 'package.json');
  if (!existsSync(profile)) writeJson(profile, {name: 'codex-ds-workers-profile', private: true, dependencies: {},
    dsh: {profile: {bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-sdk-app'], patchReload: 'startup'}}});
}

export async function setup(p, {service = 'background', sourceRoot = PACKAGE_ROOT, runner = run} = {}) {
  if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('Node.js 24+ is required.');
  if (!['background', 'auto'].includes(service)) throw new Error('Use --service background or --service auto.');
  const previous = checkOwnership(p);
  const env = managedEnvironment(p);
  await assertIdle(p, runner, env);
  const skillSource = join(sourceRoot, 'skills', 'dsh-subagent');
  if (!existsSync(join(skillSource, 'SKILL.md'))) throw new Error('Package is missing skills/dsh-subagent/SKILL.md.');
  mkdirSync(p.root, {recursive: true, mode: 0o700});
  const record = {owner: OWNER, schema: 1, phase: 'preparing', cli: join(sourceRoot, 'bin', 'codex-ds-workers.mjs'),
    bridge: BRIDGE_REVISION, sdk: SDK_VERSION, paths: p};
  writeJson(p.marker, record);
  const backup = join(p.root, '.skill-backup');
  const staged = join(p.root, '.skill-stage');
  let skillChanged = false;
  try {
    if (lexists(backup)) {
      const owner = readJson(join(backup, '.codex-ds-workers.json'));
      if (owner?.owner !== OWNER || owner.root !== p.root) throw new Error('Unowned skill backup found; preserved.');
      if (lexists(skillPath(p))) rmSync(skillPath(p), {recursive: true, force: true});
      mkdirSync(dirname(skillPath(p)), {recursive: true});
      renameSync(backup, skillPath(p));
    }
    await prepareDependencies(p, env, runner, sourceRoot);
    prepareProgram(p, sourceRoot);
    rmSync(staged, {recursive: true, force: true});
    cpSync(skillSource, staged, {recursive: true});
    writeJson(join(staged, '.codex-ds-workers.json'), {owner: OWNER, root: p.root});
    mkdirSync(dirname(skillPath(p)), {recursive: true});
    skillChanged = true;
    if (lexists(skillPath(p))) renameSync(skillPath(p), backup);
    renameSync(staged, skillPath(p));
    const adapter = join(p.program, 'adapters', 'launch-v021.mjs');
    const setupOutput = await runner(process.execPath, [join(p.vendor, 'scripts', 'install.mjs'), '--yes', '--no-skill', '--service', service],
      {env: {...env, DSH_CLI: adapter}, capture: true});
    if (setupOutput) process.stdout.write(rewriteAdvice(setupOutput));
    writeJson(p.marker, {...record, phase: 'installed'});
    rmSync(backup, {recursive: true, force: true});
    return {installed: true, cli: join(sourceRoot, 'bin', 'codex-ds-workers.mjs'), root: p.root,
      codexHome: p.codexHome, bridge: BRIDGE_REVISION, sdk: SDK_VERSION};
  } catch (error) {
    if (skillChanged) {
      rmSync(skillPath(p), {recursive: true, force: true});
      if (lexists(backup)) renameSync(backup, skillPath(p));
    }
    rmSync(staged, {recursive: true, force: true});
    writeJson(p.marker, previous || {...record, phase: 'failed'});
    throw error;
  }
}

export async function upstream(p, command, args = [], runner = run) {
  const record = installation(p);
  if (!record || !existsSync(join(p.config, 'installation.json')))
    throw new Error('Not installed in this environment. Run setup first.');
  const options = {env: managedEnvironment(p), capture: command === 'doctor'};
  try {
    const output = await runner(process.execPath, [join(p.vendor, 'src', 'cli.mjs'), command, ...args], options);
    if (options.capture && output) process.stdout.write(rewriteAdvice(output));
    return output;
  } catch (error) {
    if (options.capture && error.stdout) process.stdout.write(rewriteAdvice(error.stdout));
    throw error;
  }
}

export async function uninstall(p, runner = run) {
  if (!installation(p)) return {uninstalled: false, reason: 'No owned installation found.'};
  checkOwnership(p);
  await assertIdle(p, runner, managedEnvironment(p));
  if (existsSync(join(p.config, 'installation.json'))) await upstream(p, 'uninstall', [], runner);
  if (lexists(skillPath(p))) rmSync(skillPath(p), {recursive: true, force: true});
  writeJson(p.marker, {...installation(p), phase: 'uninstalled'});
  return {uninstalled: true, preserved: 'Provider settings, histories, SDK/source caches and the isolated DSH home.'};
}

export async function rpc(p, request) {
  const record = installation(p);
  if (record?.phase !== 'installed') throw new Error('Run setup before rpc.');
  Object.assign(process.env, managedEnvironment(p));
  const {bridgeClient} = await import(pathToFileURL(join(p.vendor, 'src', 'bridge-client.mjs')));
  const client = await bridgeClient(p.state);
  try {
    const result = await client.request('tools/call', {name: request.name, arguments: request.arguments,
      _meta: {threadId: process.env.CODEX_THREAD_ID}});
    const text = result.content?.filter(item => item.type === 'text').map(item => item.text).join('\n') || '{}';
    if (result.isError) throw new Error(text);
    return text;
  } finally {client.close();}
}
