export class PomodoroError extends Error {
    constructor(message: string, public code?: string) {
        super(message);
        this.name = 'PomodoroError';
    }
} 