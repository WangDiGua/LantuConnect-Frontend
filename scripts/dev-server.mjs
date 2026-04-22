import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const scriptFile = fileURLToPath(import.meta.url);
const stateFile = path.join(root, '.devserver.json');
const outLogFile = path.join(root, '.devserver.out.log');
const errLogFile = path.join(root, '.devserver.err.log');
const copyScriptFile = path.join(root, 'scripts', 'copy-vditor-public.mjs');
const viteBinFile = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');

const [, , command = 'help', inputMode] = process.argv;

function resolveMode(mode) {
  if (!mode || mode === 'dev' || mode === 'development') return 'development';
  if (mode === 'stable' || mode === 'no-strict') return 'no-strict';
  throw new Error(`不支持的模式：${mode}`);
}

function modeLabel(mode) {
  return mode === 'no-strict' ? 'stable' : 'development';
}

function now() {
  return new Date().toISOString();
}

function log(message) {
  console.log(`[dev-server] ${message}`);
}

function readState() {
  if (!fs.existsSync(stateFile)) return null;
  try {
    return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  } catch {
    return null;
  }
}

function writeState(state) {
  fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function removeState() {
  if (fs.existsSync(stateFile)) {
    fs.rmSync(stateFile, { force: true });
  }
}

function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForExit(pid, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!isProcessAlive(pid)) return true;
    await sleep(250);
  }
  return !isProcessAlive(pid);
}

function ensureStateFileMatches(pid) {
  const state = readState();
  return state?.pid === pid;
}

async function runStep(name, filePath, outStream, errStream) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [filePath], {
      cwd: root,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });

    child.stdout.pipe(outStream, { end: false });
    child.stderr.pipe(errStream, { end: false });

    child.on('error', (error) => reject(error));
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${name} exited with code ${code ?? 'null'}`));
    });
  });
}

async function runStepInForeground(name, filePath) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [filePath], {
      cwd: root,
      windowsHide: false,
      stdio: 'inherit',
      env: process.env,
    });

    child.on('error', (error) => reject(error));
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${name} exited with code ${code ?? 'null'}`));
    });
  });
}

async function serve(mode) {
  const outStream = fs.createWriteStream(outLogFile, { flags: 'a' });
  const errStream = fs.createWriteStream(errLogFile, { flags: 'a' });

  const writeOut = (message) => outStream.write(`[${now()}] ${message}\n`);
  const writeErr = (message) => errStream.write(`[${now()}] ${message}\n`);

  let viteChild = null;
  let shuttingDown = false;

  const cleanupOwnedState = () => {
    if (ensureStateFileMatches(process.pid)) {
      removeState();
    }
  };

  const shutdown = async (reason) => {
    if (shuttingDown) return;
    shuttingDown = true;
    writeOut(`wrapper shutting down (${reason})`);
    cleanupOwnedState();

    if (viteChild && isProcessAlive(viteChild.pid)) {
      viteChild.kill('SIGTERM');
      const exited = await waitForExit(viteChild.pid, 8000);
      if (!exited && isProcessAlive(viteChild.pid)) {
        viteChild.kill('SIGKILL');
      }
    }

    outStream.end();
    errStream.end();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
  process.on('exit', () => {
    cleanupOwnedState();
    if (viteChild && isProcessAlive(viteChild.pid)) {
      viteChild.kill('SIGTERM');
    }
  });

  try {
    writeOut(`wrapper started (pid=${process.pid}, mode=${modeLabel(mode)})`);
    await runStep('copy-vditor-public', copyScriptFile, outStream, errStream);

    if (!fs.existsSync(viteBinFile)) {
      throw new Error('vite is not installed. Run "npm install" first.');
    }

    viteChild = spawn(
      process.execPath,
      [viteBinFile, '--configLoader', 'native', '--mode', mode],
      {
        cwd: root,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: process.env,
      },
    );

    const state = readState();
    if (state?.pid === process.pid) {
      writeState({
        ...state,
        vitePid: viteChild.pid,
        wrapperStartedAt: state.wrapperStartedAt ?? now(),
      });
    }

    writeOut(`vite started (pid=${viteChild.pid}, mode=${modeLabel(mode)})`);
    viteChild.stdout.pipe(outStream, { end: false });
    viteChild.stderr.pipe(errStream, { end: false });

    viteChild.on('error', (error) => {
      writeErr(`vite failed to start: ${error.message}`);
      void shutdown('vite error');
    });

    viteChild.on('exit', (code, signal) => {
      writeOut(`vite exited (code=${code ?? 'null'}, signal=${signal ?? 'null'})`);
      cleanupOwnedState();
      outStream.end();
      errStream.end();
      process.exit(code ?? 0);
    });
  } catch (error) {
    writeErr(error instanceof Error ? error.message : String(error));
    cleanupOwnedState();
    outStream.end();
    errStream.end();
    process.exit(1);
  }
}

async function start(mode) {
  const current = readState();
  if (current?.pid && isProcessAlive(current.pid)) {
    log(`服务已在运行中（包装进程 PID ${current.pid}，模式 ${modeLabel(current.mode ?? 'development')}）`);
    log('可执行: npm run project:status');
    return;
  }

  if (current) {
    removeState();
  }

  fs.writeFileSync(outLogFile, '', 'utf8');
  fs.writeFileSync(errLogFile, '', 'utf8');

  const child = spawn(process.execPath, [scriptFile, 'serve', mode], {
    cwd: root,
    detached: true,
    windowsHide: true,
    stdio: 'ignore',
    env: process.env,
  });

  child.unref();

  writeState({
    pid: child.pid,
    mode,
    wrapperStartedAt: now(),
    launcher: 'background',
    outLogFile: path.basename(outLogFile),
    errLogFile: path.basename(errLogFile),
  });

  await sleep(1200);

  if (!isProcessAlive(child.pid)) {
    removeState();
    log('启动失败，请检查 .devserver.err.log');
    process.exitCode = 1;
    return;
  }

  log(`已在 ${modeLabel(mode)} 模式启动（包装进程 PID ${child.pid}）`);
  log('访问地址: http://localhost:3000/');
  log(`标准输出日志: ${path.basename(outLogFile)}`);
  log(`标准错误日志: ${path.basename(errLogFile)}`);
}

async function runForeground(mode) {
  const current = readState();
  if (current?.pid && isProcessAlive(current.pid)) {
    log(`服务已在运行中（包装进程 PID ${current.pid}，模式 ${modeLabel(current.mode ?? 'development')}）`);
    log('如需替换当前实例，请使用 restart-project.cmd');
    return;
  }

  if (current) {
    removeState();
  }

  log(`正在以 ${modeLabel(mode)} 模式启动`);
  log('实时日志会显示在当前窗口');
  log('按 Ctrl+C 或直接关闭窗口即可停止服务');

  await runStepInForeground('copy-vditor-public', copyScriptFile);

  if (!fs.existsSync(viteBinFile)) {
    throw new Error('vite is not installed. Run "npm install" first.');
  }

  const viteChild = spawn(
    process.execPath,
    [viteBinFile, '--configLoader', 'native', '--mode', mode],
    {
      cwd: root,
      windowsHide: false,
      stdio: 'inherit',
      env: process.env,
    },
  );

  writeState({
    pid: process.pid,
    mode,
    wrapperStartedAt: now(),
    launcher: 'foreground',
    vitePid: viteChild.pid,
    outLogFile: path.basename(outLogFile),
    errLogFile: path.basename(errLogFile),
  });

  let shuttingDown = false;

  const cleanupOwnedState = () => {
    if (ensureStateFileMatches(process.pid)) {
      removeState();
    }
  };

  const shutdown = async (reason) => {
    if (shuttingDown) return;
    shuttingDown = true;
    log(`正在停止服务（${reason}）`);
    cleanupOwnedState();

    if (isProcessAlive(viteChild.pid)) {
      viteChild.kill('SIGTERM');
      const exited = await waitForExit(viteChild.pid, 8000);
      if (!exited && isProcessAlive(viteChild.pid)) {
        viteChild.kill('SIGKILL');
      }
    }

    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
  process.on('exit', () => {
    cleanupOwnedState();
    if (isProcessAlive(viteChild.pid)) {
      viteChild.kill('SIGTERM');
    }
  });

  await new Promise((resolve, reject) => {
    viteChild.on('error', (error) => reject(error));
    viteChild.on('exit', (code, signal) => {
      cleanupOwnedState();
      if (shuttingDown) {
        resolve();
        return;
      }
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`vite exited unexpectedly (code=${code ?? 'null'}, signal=${signal ?? 'null'})`));
    });
  });
}

async function stop() {
  const current = readState();
  if (!current?.pid) {
    log('当前没有运行中的受管实例');
    return;
  }

  if (!isProcessAlive(current.pid)) {
    removeState();
    log('检测到陈旧状态文件，已清理');
    return;
  }

  process.kill(current.pid, 'SIGTERM');
  const exited = await waitForExit(current.pid, 15000);
  if (!exited && isProcessAlive(current.pid)) {
    process.kill(current.pid, 'SIGKILL');
    await waitForExit(current.pid, 5000);
  }

  removeState();
  log(`已停止包装进程 PID ${current.pid}`);
}

function status() {
  const current = readState();
  if (!current?.pid) {
    log('当前没有运行中的受管实例');
    return;
  }

  if (!isProcessAlive(current.pid)) {
    removeState();
    log('当前未运行，陈旧状态文件已移除');
    return;
  }

  log(`运行中（包装进程 PID ${current.pid}，模式 ${modeLabel(current.mode ?? 'development')}）`);
  if (current.vitePid) {
    log(`Vite 进程 PID ${current.vitePid}`);
  }
  if (current.launcher === 'foreground') {
    log('启动方式: 前台窗口（日志正在 CMD 窗口中实时显示）');
    return;
  }
  log(`标准输出日志: ${path.basename(outLogFile)}`);
  log(`标准错误日志: ${path.basename(errLogFile)}`);
}

function help() {
  log('用法: node scripts/dev-server.mjs <run|restart-run|start|stop|restart|status> [development|stable]');
}

async function main() {
  try {
    switch (command) {
      case 'serve':
        await serve(resolveMode(inputMode));
        return;
      case 'run':
        await runForeground(resolveMode(inputMode));
        return;
      case 'start':
        await start(resolveMode(inputMode));
        return;
      case 'stop':
        await stop();
        return;
      case 'restart-run': {
        const current = readState();
        const nextMode = resolveMode(inputMode ?? current?.mode ?? 'development');
        await stop();
        await runForeground(nextMode);
        return;
      }
      case 'restart': {
        const current = readState();
        const nextMode = resolveMode(inputMode ?? current?.mode ?? 'development');
        await stop();
        await start(nextMode);
        return;
      }
      case 'status':
        status();
        return;
      default:
        help();
    }
  } catch (error) {
    log(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

await main();
