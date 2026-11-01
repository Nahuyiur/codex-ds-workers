import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, renameSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {paths, applyStartDefaults, BRIDGE_REVISION, SDK_VERSION} from '../lib/paths.mjs';
import {setup, uninstall, checkOwnership, installation, readJson, rewriteAdvice} from '../lib/install.mjs';
import {compatiblePatch} from '../adapters/launch-v021.mjs';

function sandbox(t) {
  const dir = mkdtempSync(join(tmpdir(), 'codex-ds-unit-'));
  t.after(() => rmSync(dir, {recursive: true, force: true}));
  return {dir, p: paths({CODEX_DS_WORKERS_HOME: join(dir, 'workers'), CODEX_HOME: join(dir, 'codex')}, dir)};
}
function json(file, data) {mkdirSync(join(file, '..'), {recursive: true}); writeFileSync(file, JSON.stringify(data));}

function fixture(t) {
  const {dir, p} = sandbox(t);
  const sourceRoot = join(dir, 'package');
  json(join(sourceRoot, 'runtime', 'package.json'), {private: true});
  json(join(sourceRoot, 'runtime', 'package-lock.json'), {lockfileVersion: 3});
  mkdirSync(join(sourceRoot, 'adapters'), {recursive: true});
  writeFileSync(join(sourceRoot, 'adapters', 'launch-v021.mjs'), '// test adapter');
  mkdirSync(join(sourceRoot, 'skills', 'dsh-subagent'), {recursive: true});
  writeFileSync(join(sourceRoot, 'skills', 'dsh-subagent', 'SKILL.md'), 'Fixture skill');
  mkdirSync(join(p.vendor, '.git'), {recursive: true});
  json(join(p.vendor, 'node_modules', '@modelcontextprotocol', 'sdk', 'package.json'), {version: 'fixture'});
  json(join(p.sdk, 'node_modules', '@deepseek-ai', 'dsh', 'package.json'), {version: SDK_VERSION});
  const calls = [];
  let active = false, failSetup = false;
  const runner = async (command, args, options) => {
    calls.push({command, args});
    if (args.includes('rev-parse')) return BRIDGE_REVISION + '\n';
    if (args.includes('status')) return JSON.stringify({running: true, active: active ? ['working'] : []});
    if (args[0]?.endsWith('install.mjs')) {
      if (failSetup) throw new Error('Injected upstream setup failure');
      json(join(p.config, 'installation.json'), {fixture: true});
      json(join(p.state, 'http.json'), {port: 19543});
      mkdirSync(p.codexHome, {recursive: true});
      writeFileSync(join(p.codexHome, 'config.toml'), '[mcp_servers.dsh_subagent]\nurl = "http://127.0.0.1:19543/mcp"\n');
    }
    if (args.includes('uninstall')) {
      rmSync(join(p.config, 'installation.json'));
      writeFileSync(join(p.codexHome, 'config.toml'), '');
    }
    return '';
  };
  return {p, sourceRoot, runner, calls, active: value => {active = value;}, failSetup: value => {failSetup = value;}};
}

test('start defaults are low; explicit effort wins; followup cannot silently change effort', () => {
  assert.deepEqual(applyStartDefaults({name: 'dsh_start'}).arguments,
    {model: 'deepseek-flash', provider: 'deepseek-official', effort: 'low'});
  for (const effort of ['low', 'high', 'max'])
    assert.equal(applyStartDefaults({name: 'dsh_start', arguments: {effort}}).arguments.effort, effort);
  assert.deepEqual(applyStartDefaults({name: 'dsh_followup', arguments: {agent_id: 'a', task: 'next'}}).arguments,
    {agent_id: 'a', task: 'next'});
  assert.throws(() => applyStartDefaults({name: 'dsh_followup', arguments: {effort: 'high'}}), /new session/);
  assert.throws(() => applyStartDefaults({name: 'other_tool'}), /DSH tool/);
});

test('upstream advice cannot direct the portable installer to an unpinned latest package', () => {
  const advice = 'Sign in with: npx -y dsh-subagent-mcp@latest login\nTo use the Codex copy selected by this integration: npx -y dsh-subagent-mcp@latest codex\n';
  assert.equal(rewriteAdvice(advice), 'Sign in with: codex login\n');
  for (const suffix of ['', ' --capture-key'])
    assert.equal(rewriteAdvice('npx -y dsh-subagent-mcp@latest configure' + suffix), 'node bin/codex-ds-workers.mjs configure');
});

test('custom data, DSH and Codex paths remain distinct and explicit', t => {
  const {dir} = sandbox(t);
  const p = paths({CODEX_DS_WORKERS_HOME: join(dir, 'data'), DSH_SUBAGENT_DATA: join(dir, 'bridge-data'),
    DSH_SUBAGENT_CONFIG: join(dir, 'bridge-config'), DSH_SUBAGENT_STATE: join(dir, 'state'),
    DSH_HOME: join(dir, 'dsh'), CODEX_HOME: join(dir, 'codex')}, dir);
  assert.equal(p.data, join(dir, 'bridge-data'));
  assert.equal(p.config, join(dir, 'bridge-config'));
  assert.equal(p.dshHome, join(dir, 'dsh'));
  assert.equal(p.codexHome, join(dir, 'codex'));
});

test('foreign skill, bridge config and MCP registration are refused before execution', async t => {
  for (const kind of ['skill', 'bridge', 'registration']) {
    const {p} = sandbox(t);
    const file = kind === 'skill' ? join(p.codexHome, 'skills', 'dsh-subagent', 'SKILL.md')
      : kind === 'bridge' ? join(p.config, 'installation.json') : join(p.codexHome, 'config.toml');
    mkdirSync(join(file, '..'), {recursive: true});
    const content = kind === 'bridge' ? '{}' : kind === 'registration' ? '[mcp_servers.dsh_subagent]\nurl = "https://example.invalid/mcp"\n' : 'foreign';
    writeFileSync(file, content);
    let ran = false;
    await assert.rejects(setup(p, {runner: async () => {ran = true;}}), /foreign|not owned/i);
    assert.equal(ran, false);
    assert.equal(readFileSync(file, 'utf8'), content);
    assert.equal(existsSync(p.marker), false);
  }
});

test('owned setup converges on repeat; no scheduler is added by the wrapper (mocked upstream)', async t => {
  const f = fixture(t);
  await setup(f.p, f);
  await setup(f.p, f);
  assert.equal(installation(f.p).phase, 'installed');
  assert.equal(readJson(join(f.p.codexHome, 'skills', 'dsh-subagent', '.codex-ds-workers.json')).root, f.p.root);
  assert.equal(f.calls.filter(call => call.args[0]?.endsWith('install.mjs')).length, 2);
  assert.equal(f.calls.some(call => call.command === 'launchctl' || call.command === 'systemctl'), false);
  const receipt = await uninstall(f.p, f.runner);
  assert.equal(receipt.uninstalled, true);
  assert.equal(existsSync(join(f.p.codexHome, 'skills', 'dsh-subagent')), false);
  assert.equal(existsSync(f.p.sdk), true);
});

test('active owned installation refuses setup and uninstall before replacing artifacts (mocked upstream)', async t => {
  const f = fixture(t); await setup(f.p, f); f.active(true);
  const before = readFileSync(join(f.p.program, 'runtime.json'), 'utf8');
  await assert.rejects(setup(f.p, f), /Active/);
  await assert.rejects(uninstall(f.p, f.runner), /Active/);
  assert.equal(readFileSync(join(f.p.program, 'runtime.json'), 'utf8'), before);
});

test('failed setup restores an existing owned skill and removes a newly staged skill (mocked upstream)', async t => {
  const f = fixture(t); f.failSetup(true);
  await assert.rejects(setup(f.p, f), /Injected/);
  assert.equal(existsSync(join(f.p.codexHome, 'skills', 'dsh-subagent')), false);
  assert.equal(installation(f.p).phase, 'failed');
  f.failSetup(false); await setup(f.p, f);
  writeFileSync(join(f.p.codexHome, 'skills', 'dsh-subagent', 'local.txt'), 'retained');
  f.failSetup(true); await assert.rejects(setup(f.p, f), /Injected/);
  assert.equal(readFileSync(join(f.p.codexHome, 'skills', 'dsh-subagent', 'local.txt'), 'utf8'), 'retained');
});

test('retry recovers an interrupted owned skill swap before a failing install (mocked upstream)', async t => {
  const f = fixture(t); await setup(f.p, f);
  const skill = join(f.p.codexHome, 'skills', 'dsh-subagent');
  writeFileSync(join(skill, 'local.txt'), 'preserved across interrupted swap');
  renameSync(skill, join(f.p.root, '.skill-backup'));
  f.failSetup(true);
  await assert.rejects(setup(f.p, f), /Injected/);
  assert.equal(readFileSync(join(skill, 'local.txt'), 'utf8'), 'preserved across interrupted swap');
});

test('SDK patch adaptation handles quoted POSIX and Windows vendor paths', t => {
  const {dir} = sandbox(t);
  for (const preset of ['standard', 'minimal']) {
    const p = join(dir, 'dsh-web-app', 'presets', preset + '.patch.yml');
    mkdirSync(join(p, '..'), {recursive: true}); writeFileSync(p, `# ${preset}\n`);
  }
  for (const plugin of ['/vendor/src/dsh-plugin.mjs', 'C:\\vendor path\\src\\dsh-plugin.mjs']) {
    const source = `- insert:\n    - id: agent-presets\n      name: '@deepseek-ai/dsh-agent-presets'\n      config:\n        default: standard\n    - id: codex-subagent-rpc\n      name: ${JSON.stringify(plugin)}\n`;
    const patch = compatiblePatch(source, '/adapter', dir);
    assert.match(patch, /dsh-agent-preset-registry/);
    assert.match(patch, /dsh-plugin-v021\.mjs/);
    assert.doesNotMatch(patch, /dsh-agent-presets'/);
    assert.match(patch, /# standard/);
  }
  assert.throws(() => compatiblePatch('unsupported shape', '/adapter', dir), /Pinned/);
});
