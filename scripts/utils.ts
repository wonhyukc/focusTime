import { PomodoroError } from './errors';
import { logError } from './logger';

export function handleError(error: unknown, context: string = ''): void {
    if (error instanceof PomodoroError) {
        logError(`[${context}] ${error.name}: ${error.message}`, 'error', error.code);
    } else if (error instanceof Error) {
        logError(`[${context}] ${error.name}: ${error.message}`, 'error');
    } else {
        logError(`[${context}] Unknown error: ${String(error)}`, 'error');
    }
} 