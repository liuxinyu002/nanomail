import { utilityProcess, UtilityProcess } from 'electron'
import { app, dialog } from 'electron'
import path from 'path'
import http from 'http'
import fs from 'fs'

// 日志文件路径
function getLogPath(): string {
  return path.join(app.getPath('userData'), 'backend.log')
}

// 写入日志文件
function logToFile(message: string): void {
  const logPath = getLogPath()
  const timestamp = new Date().toISOString()
  const logLine = `[${timestamp}] ${message}\n`
  try {
    fs.appendFileSync(logPath, logLine, 'utf-8')
  } catch (err) {
    // 忽略写入错误
  }
  console.log(message)
}

export class BackendProcess {
  private process: UtilityProcess | null = null
  private port = 3000
  private maxRetries = 3
  private retryCount = 0

  async start(): Promise<void> {
    // 清空旧日志
    const logPath = getLogPath()
    try {
      fs.writeFileSync(logPath, '', 'utf-8')
    } catch (err) {
      // 忽略
    }

    // 仅在生产环境运行
    if (!app.isPackaged) {
      logToFile('[Backend] Development mode: skipping backend process management')
      return
    }

    logToFile('[Backend] Starting backend process...')
    logToFile(`[Backend] Log file: ${logPath}`)

    const portAvailable = await this.checkPortAvailable(this.port)
    if (!portAvailable) {
      // 端口冲突时弹窗报错，让用户选择退出或重试
      const result = await dialog.showMessageBox({
        type: 'error',
        buttons: ['Exit', 'Retry'],
        title: 'Port Conflict',
        message: `Port ${this.port} is already in use.`,
        detail: 'Please close the conflicting application and try again.'
      })
      if (result.response === 0) {
        app.quit()
        return
      }
      // 用户选择重试
      return this.start()
    }

    // In production:
    // - __dirname = app.asar/dist/main (where main process JS lives)
    // - Backend is at app.asar/dist/backend/index.cjs
    // - So relative path is ../backend/index.cjs
    const backendPath = app.isPackaged
      ? path.join(__dirname, '../backend/index.cjs')
      : path.join(process.resourcesPath, 'backend', 'index.cjs')
    const userDataPath = app.getPath('userData')

    logToFile(`[Backend] Backend path: ${backendPath}`)
    logToFile(`[Backend] User data path: ${userDataPath}`)
    logToFile(`[Backend] __dirname: ${__dirname}`)
    logToFile(`[Backend] process.resourcesPath: ${process.resourcesPath}`)
    logToFile('[Backend] Checking if backend file exists...')

    // 检查后端文件是否存在
    if (!fs.existsSync(backendPath)) {
      logToFile(`[Backend] ERROR: Backend file not found: ${backendPath}`)
      dialog.showErrorBox('Backend Not Found', `Backend file not found at: ${backendPath}\n\nLog file: ${logPath}`)
      app.quit()
      return
    }

    logToFile('[Backend] Backend file exists, forking process...')
    logToFile(`[Backend] Environment: PORT=${this.port}, NODE_ENV=production, USER_DATA_PATH=${userDataPath}`)

    // 使用 Electron 的 utilityProcess.fork 启动后端进程
    // 优点：不依赖外部 Node.js 安装，使用 Electron 内置运行时
    this.process = utilityProcess.fork(backendPath, [], {
      env: {
        ...process.env,
        PORT: String(this.port),
        NODE_ENV: 'production',
        USER_DATA_PATH: userDataPath
      },
      // 继承 stdout/stderr 以便在控制台看到日志
      stdio: 'pipe'
    })

    logToFile(`[Backend] Process forked, PID: ${this.process.pid}`)

    // 监听后端进程的输出
    this.process.stdout?.on('data', (data) => {
      logToFile(`[Backend stdout] ${data.toString().trim()}`)
    })

    this.process.stderr?.on('data', (data) => {
      logToFile(`[Backend stderr] ${data.toString().trim()}`)
    })

    // 监听后端进程退出事件
    // 注意：utilityProcess 使用 'exit' 事件（不是 'close'）
    this.process.on('exit', (code) => {
      logToFile(`[Backend] Process exited with code ${code}`)
      if (code !== 0 && this.retryCount < this.maxRetries) {
        this.retryCount++
        logToFile(`[Backend] Backend exited unexpectedly, restarting... (${this.retryCount}/${this.maxRetries})`)
        setTimeout(() => this.start(), 1000)
      }
    })

    await this.waitForReady()
  }

  private async checkPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = http.createServer()
      server.once('error', () => resolve(false))
      server.once('listening', () => {
        server.close()
        resolve(true)
      })
      server.listen(port)
    })
  }

  private async waitForReady(maxWait = 10000): Promise<void> {
    const startTime = Date.now()
    let attempt = 0
    while (Date.now() - startTime < maxWait) {
      attempt++
      const elapsed = Date.now() - startTime
      logToFile(`[Backend] Health check attempt ${attempt} (${elapsed}ms elapsed)`)
      if (await this.healthCheck()) {
        logToFile(`[Backend] Health check passed after ${elapsed}ms`)
        return
      }
      await new Promise(r => setTimeout(r, 500))
    }
    const elapsed = Date.now() - startTime
    logToFile(`[Backend] ERROR: Health check failed after ${elapsed}ms, ${attempt} attempts`)

    // 显示详细错误对话框
    const logPath = getLogPath()
    dialog.showErrorBox(
      'Backend Start Failed',
      `Backend failed to start within ${elapsed}ms.\n\nLog file: ${logPath}\n\nPlease check the log file for details.`
    )

    throw new Error('Backend failed to start within timeout')
  }

  private async healthCheck(): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.get(`http://localhost:${this.port}/health`, (res) => {
        resolve(res.statusCode === 200)
      })
      req.on('error', () => resolve(false))
      req.setTimeout(2000, () => {
        req.destroy()
        resolve(false)
      })
    })
  }

  stop(): void {
    // UtilityProcess 没有直接的终止方法，通过 PID 终止进程
    if (this.process?.pid) {
      process.kill(this.process.pid, 'SIGTERM')
    }
    this.process = null
  }
}