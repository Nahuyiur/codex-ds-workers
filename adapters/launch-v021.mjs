// The bridge owns execution; this boundary adapts its pinned SDK profile.
import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, basename, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';

export function compatiblePatch(source, here, packages) {
  let patch = source.replace(/    - id: agent-presets\n      name: '@deepseek-ai\/dsh-agent-presets'\n      config:\n        default: standard\n/,
    "    - id: agent-preset-registry\n      name: '@deepseek-ai/dsh-agent-preset-registry'\n      config:\n        default: standard\n");
  if (patch === source) throw new Error('Pinned bridge preset row was not found; refusing an unadapted SDK launch.');
  let pluginReplaced = false;
  patch = patch.replace(/name: ("(?:\\.|[^"\\])*")/g, (row, literal) => {
    if (!JSON.parse(literal).replaceAll('\\', '/').endsWith('/src/dsh-plugin.mjs')) return row;
    pluginReplaced = true;
    return 'name: ' + JSON.stringify(join(here, 'dsh-plugin-v021.mjs'));
  });
  if (!pluginReplaced) throw new Error('Pinned bridge plugin row was not found.');
  patch += '\n' + ['standard', 'minimal'].map(p => readFileSync(join(packages, `dsh-web-app/presets/${p}.patch.yml`), 'utf8')).join('\n');
  return '- id: workflow-ptc\n  disabled: true\n- id: system-prompt\n  config:\n    includeHarnessIdentity: false\n    includeRuntimeContext: false\n    personaPrefix: ""\n' + patch;
}

export function launch(args = process.argv.slice(2)) {
  const here = dirname(fileURLToPath(import.meta.url));
  const runtime = JSON.parse(readFileSync(join(here, '..', 'runtime.json'), 'utf8'));
  const packages = join(runtime.sdk, 'node_modules', '@deepseek-ai');
  const cli = join(packages, 'dsh', 'lib', 'bin.js');
  const profileIndex = args.indexOf('--profile');
  if (profileIndex !== -1) args[profileIndex + 1] = 'codex-ds-workers-v021';
  const patchIndex = args.indexOf('--patch');
  if (patchIndex !== -1) {
    const source = args[patchIndex + 1];
    const target = join(dirname(source), 'v021-' + basename(source));
    writeFileSync(target, compatiblePatch(readFileSync(source, 'utf8'), here, packages), {mode: 0o600});
    args[patchIndex + 1] = target;
  }
  const child = spawn(process.execPath, [cli, ...args], {stdio: 'inherit', env: {...process.env, DSH_CLI: cli}});
  for (const signal of ['SIGTERM', 'SIGINT', 'SIGHUP']) process.on(signal, () => child.kill(signal));
  child.on('error', error => {console.error(error.message); process.exitCode = 1;});
  child.on('exit', (code, signal) => {process.exitCode = code ?? (signal ? 1 : 0);});
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) launch();
