import { spawnSync } from 'node:child_process';
const env = { ...process.env, FINANCAS10_BUILD_TARGET: 'release' };
for (const args of [['run', 'native:sync'], ['run', 'native:bundle:build']]) {
  const result = process.platform === 'win32'
    ? spawnSync('cmd.exe', ['/d', '/s', '/c', `npm ${args.join(' ')}`], { env, stdio: 'inherit' })
    : spawnSync('npm', args, { env, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
