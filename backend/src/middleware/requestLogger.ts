import { Request, Response, NextFunction } from "express";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startHrTime = process.hrtime.bigint();

  res.on("finish", () => {
    const endHrTime = process.hrtime.bigint();
    const durationMs = Number(endHrTime - startHrTime) / 1e6;

    const logEntry = {
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      duration_ms: durationMs.toFixed(2),
      ip: req.ip || req.socket.remoteAddress || "unknown",
    };

    console.info(`[Performance] ${logEntry.method} ${logEntry.path} - Status: ${logEntry.statusCode} - ${logEntry.duration_ms}ms - IP: ${logEntry.ip}`);
  });

  next();
}
