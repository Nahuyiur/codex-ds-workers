#!/usr/bin/env node
import {readFileSync} from 'node:fs';
import {parseArgs} from 'node:util';
import {paths, applyStartDefaults} from '../lib/paths.mjs';
import {setup, upstream, uninstall, rpc} from '../lib/install.mjs';

const [command = 'help', ...args] = process.argv.slice(2);
const clean = text => String(text).replace(/sk-[a-zA-Z0-9_-]{16,}/g, '[REDACTED]');
try {
  if (['help', '--help', '-h'].includes(command)) {
    console.log(`codex-ds-workers — Node.js 24+\n
Usage: node bin/codex-ds-workers.mjs COMMAND\n
  setup [--service background|auto]  Install pinned bridge, SDK and skill; no model request
  doctor [--json]                   Check the managed runtime and registration
  configure                        Enter a DeepSeek key privately through upstream
  status [--json]                   Read service state
  start | stop | restart           Use the upstream lifecycle (active work protected)
  rpc                              Read {"name":"dsh_start","arguments":{...}} from stdin
  uninstall                        Remove owned integration; retain keys and history\n
CODEX_DS_WORKERS_HOME selects managed data; CODEX_HOME selects the Codex profile.
Explicit DSH_SUBAGENT_DATA/CONFIG/STATE and DSH_HOME are honored.
Default dsh_start: deepseek-flash / deepseek-official / low. Explicit settings win.
Follow-up retains effort; start a new session to change it. Foreign installs are preserved.
Setup needs Git, npm and network access. It may install the upstream pinned Codex CLI.`);
  } else if (command === 'setup') {
    const {values} = parseArgs({args, options: {service: {type: 'string', default: 'background'}}});
    console.log(JSON.stringify(await setup(paths(), {service: values.service})));
  } else if (command === 'rpc') {
    if (args.length) throw new Error('rpc reads one JSON request from stdin; no arguments.');
    console.log(clean(await rpc(paths(), applyStartDefaults(JSON.parse(readFileSync(0, 'utf8'))))));
  } else if (command === 'uninstall') {
    if (args.length) throw new Error('uninstall accepts no purge or force option; keys/history are preserved.');
    console.log(JSON.stringify(await uninstall(paths())));
  } else if (['doctor', 'status', 'start', 'stop', 'restart'].includes(command)) {
    const {values} = parseArgs({args, options: ['doctor', 'status'].includes(command) ? {json: {type: 'boolean'}} : {}});
    await upstream(paths(), command, values.json ? ['--json'] : []);
  } else if (command === 'configure') {
    if (args.length) throw new Error('configure accepts no key argument. The upstream prompt captures it privately.');
    await upstream(paths(), 'configure');
  } else throw new Error('Unknown command. Run help.');
} catch (error) {console.error(clean(error.message)); process.exitCode = 1;}
