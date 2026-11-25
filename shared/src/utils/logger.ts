import type { Logger } from 'pino'

const createLogger = (): Logger => {
  const isProd = process.env.NODE_ENV === 'production'
  return {
    level: isProd ? 'info' : 'debug',
    info: (obj: any, msg?: string) => console.log(JSON.stringify({ level: 'info', ...obj, msg, time: new Date().toISOString() })),
    warn: (obj: any, msg?: string) => console.warn(JSON.stringify({ level: 'warn', ...obj, msg, time: new Date().toISOString() })),
    error: (obj: any, msg?: string) => console.error(JSON.stringify({ level: 'error', ...obj, msg, time: new Date().toISOString() })),
    debug: (obj: any, msg?: string) => console.log(JSON.stringify({ level: 'debug', ...obj, msg, time: new Date().toISOString() })),
    fatal: (obj: any, msg?: string) => console.error(JSON.stringify({ level: 'fatal', ...obj, msg, time: new Date().toISOString() })),
  } as Logger
}

export const logger = createLogger()