type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export function log(message: string, level: LogLevel = 'info', meta?: any) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        ...(meta && { meta })
    };
    // 콘솔 출력(실제 서비스에서는 서버 전송 등으로 확장 가능)
    // eslint-disable-next-line no-console
    console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](JSON.stringify(logEntry));
}

export function logError(message: string, level: LogLevel = 'error', code?: string) {
    log(message, level, code ? { code } : undefined);
} 