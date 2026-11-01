import {homedir} from 'node:os';
import {join, resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

export const OWNER = 'codex-ds-workers';
export const BRIDGE_REVISION = '8ee8a8152e4f7fa1d805bb40e8f1a10fecceabd4';
export const SDK_VERSION = '0.2.1-rc.5';
export const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function paths(env = process.env, home = homedir(), platform = process.platform) {
  const base = platform === 'win32' ? env.LOCALAPPDATA || join(home, 'AppData', 'Local')
    : platform === 'darwin' ? join(home, 'Library', 'Application Support')
    : env.XDG_DATA_HOME || join(home, '.local', 'share');
  const root = resolve(env.CODEX_DS_WORKERS_HOME || join(base, OWNER));
  return {
    root,
    data: resolve(env.DSH_SUBAGENT_DATA || join(root, 'bridge')),
    config: resolve(env.DSH_SUBAGENT_CONFIG || join(root, 'config')),
    state: resolve(env.DSH_SUBAGENT_STATE || join(root, 'state')),
    dshHome: resolve(env.DSH_HOME || join(root, 'dsh')),
    codexHome: resolve(env.CODEX_HOME || join(home, '.codex')),
    vendor: join(root, 'vendor', BRIDGE_REVISION),
    sdk: join(root, 'sdk'),
    program: join(root, 'program'),
    marker: join(root, 'owner.json'),
  };
}

export function managedEnvironment(p, env = process.env) {
  return {...env, CODEX_DS_WORKERS_HOME: p.root, DSH_SUBAGENT_DATA: p.data,
    DSH_SUBAGENT_CONFIG: p.config, DSH_SUBAGENT_STATE: p.state,
    DSH_HOME: p.dshHome, CODEX_HOME: p.codexHome};
}

export function applyStartDefaults(request) {
  if (!request || typeof request !== 'object' || !/^dsh_[a-z_]+$/.test(request.name || ''))
    throw new Error('rpc requires a DSH tool name and arguments object.');
  if (request.arguments !== undefined && (!request.arguments || typeof request.arguments !== 'object' || Array.isArray(request.arguments)))
    throw new Error('Tool arguments must be an object.');
  const args = request.arguments || {};
  if (request.name === 'dsh_followup' && ['effort', 'model', 'provider'].some(key => key in args))
    throw new Error('Follow-up retains model/provider/effort. Start a new session to change them.');
  return {...request, arguments: request.name === 'dsh_start'
    ? {model: 'deepseek-flash', provider: 'deepseek-official', effort: 'low', ...args} : args};
}
