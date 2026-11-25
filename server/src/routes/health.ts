import { Router, Request, Response } from 'express'

export const healthRouter = Router()

healthRouter.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() })
})

healthRouter.get('/ready', (_req: Request, res: Response) => {
  res.json({ status: 'ready' })
})

healthRouter.get('/live', (_req: Request, res: Response) => {
  res.json({ status: 'alive' })
})