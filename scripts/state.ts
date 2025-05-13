import { TimerState, TimerSettings, SessionData } from './types';

type StateListener = (oldState: TimerState, newState: TimerState) => void;

export class StateManager {
    private state: TimerState;
    private listeners: StateListener[] = [];

    constructor() {
        this.state = this.loadState();
    }

    subscribe(listener: StateListener): void {
        this.listeners.push(listener);
    }

    unsubscribe(listener: StateListener): void {
        this.listeners = this.listeners.filter(l => l !== listener);
    }

    private notifyListeners(oldState: TimerState, newState: TimerState): void {
        this.listeners.forEach(listener => listener(oldState, newState));
    }

    async updateTimerState(updates: Partial<TimerState>): Promise<void> {
        const oldState = { ...this.state };
        this.state = { ...this.state, ...updates };
        this.notifyListeners(oldState, this.state);
        await this.saveState();
    }

    async updateSettings(settings: TimerSettings): Promise<void> {
        const oldState = { ...this.state };
        this.state = { ...this.state, settings };
        this.notifyListeners(oldState, this.state);
        await this.saveState();
    }

    async updateProjectHistory(history: SessionData[]): Promise<void> {
        const oldState = { ...this.state };
        this.state = { ...this.state, projectHistory: history };
        this.notifyListeners(oldState, this.state);
        await this.saveState();
    }

    async updateLastPlayedSound(sound: string): Promise<void> {
        const oldState = { ...this.state };
        this.state = { ...this.state, lastPlayedSound: sound };
        this.notifyListeners(oldState, this.state);
        await this.saveState();
    }

    private async saveState(): Promise<void> {
        await chrome.storage.local.set({ state: this.state });
    }

    private loadState(): TimerState {
        return {
            timeLeft: 0,
            isRunning: false,
            type: 'focus',
            pomodoroCount: 0,
            sessionComplete: false,
            sessionStartTime: null,
            currentProjectName: '',
            settings: null,
            projectHistory: [],
            lastPlayedSound: null
        };
    }

    async resetState(): Promise<void> {
        const oldState = { ...this.state };
        this.state = this.loadState();
        this.notifyListeners(oldState, this.state);
        await this.saveState();
    }

    getState(): TimerState {
        return this.state;
    }
} 