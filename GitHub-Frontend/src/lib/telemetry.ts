const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export function sendTelemetryLog(action: string, category = 'UI_CLICK', details?: any, level: 'INFO' | 'WARN' | 'ERROR' = 'INFO') {
  try {
    const path = typeof window !== 'undefined' ? window.location.pathname : '/';
    
    // Asynchronously send telemetry log without blocking UI
    fetch(`${API_BASE_URL}/telemetry/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        level,
        category,
        action,
        path,
        details,
      }),
    }).catch(() => {
      // Ignore background telemetry errors so UI never breaks
    });
  } catch (err) {
    // Silent catch
  }
}
