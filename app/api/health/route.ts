import { NextResponse } from 'next/server';
import os from 'os';

// GET handler for /api/health
export async function GET() {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    system: {
      platform: process.platform,
      nodeVersion: process.version,
      uptime: uptime,
      memory: {
        rss: formatBytes(memoryUsage.rss),
        heapTotal: formatBytes(memoryUsage.heapTotal),
        heapUsed: formatBytes(memoryUsage.heapUsed),
        external: formatBytes(memoryUsage.external)
      },
      cpus: os.cpus().length,
      loadAvg: os.loadavg()
    },
    caching: {
      enabled: false,
      note: 'Caching has been disabled'
    }
  });
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
} 