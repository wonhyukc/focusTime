import { TimerState, TimerSettings, SessionData } from './types';

interface State {
    timer: TimerState;
    settings: TimerSettings | null;
    projectHistory: string[];
    lastPlayedSound: {
        type: string | null;
        volume: number | null;
    };
}

type StateListener = (state: State) => void;

export class StateManager {
    private state: State;
    private listeners: Set<StateListener>;

    constructor() {
        this.state = {
            timer: {
                timeLeft: 0,
                isRunning: false,
                type: 'focus',
                pomodoroCount: 0,
                sessionComplete: false,
                sessionStartTime: null,
                currentProjectName: null
            },
            settings: null,
            projectHistory: [],
            lastPlayedSound: {
                type: null,
                volume: null
            }
        };
        this.listeners = new Set();
    }

    // 상태 구독
    subscribe(listener: StateListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    // 상태 변경 알림
    private notifyListeners(): void {
        this.listeners.forEach(listener => listener(this.state));
    }

    // 타이머 상태 업데이트
    async updateTimerState(updates: Partial<TimerState>): Promise<void> {
        this.state.timer = { ...this.state.timer, ...updates };
        await this.saveState();
        this.notifyListeners();
    }

    // 설정 업데이트
    async updateSettings(settings: Partial<TimerSettings>): Promise<void> {
        if (this.state.settings) {
            this.state.settings = { ...this.state.settings, ...settings };
        } else {
            this.state.settings = settings as TimerSettings;
        }
        await this.saveState();
        this.notifyListeners();
    }

    // 프로젝트 히스토리 업데이트
    async updateProjectHistory(projectName: string): Promise<void> {
        if (!projectName) return;

        const history = this.state.projectHistory.filter(item => item !== projectName);
        history.unshift(projectName);
        if (history.length > 10) {
            history.pop();
        }

        this.state.projectHistory = history;
        await this.saveState();
        this.notifyListeners();
    }

    // 마지막 재생된 소리 업데이트
    updateLastPlayedSound(type: string | null, volume: number | null): void {
        this.state.lastPlayedSound = { type, volume };
        this.notifyListeners();
    }

    // 상태 저장
    private async saveState(): Promise<void> {
        await chrome.storage.local.set({
            timerState: this.state.timer,
            settings: this.state.settings,
            projectHistory: this.state.projectHistory
        });
    }

    // 상태 로드
    async loadState(): Promise<State> {
        const result = await chrome.storage.local.get([
            'timerState',
            'settings',
            'projectHistory'
        ]);

        this.state = {
            timer: result.timerState || this.state.timer,
            settings: result.settings || this.state.settings,
            projectHistory: result.projectHistory || [],
            lastPlayedSound: this.state.lastPlayedSound
        };

        this.notifyListeners();
        return this.state;
    }

    // 상태 초기화
    async resetState(): Promise<void> {
        this.state = {
            timer: {
                timeLeft: 0,
                isRunning: false,
                type: 'focus',
                pomodoroCount: 0,
                sessionComplete: false,
                sessionStartTime: null,
                currentProjectName: null
            },
            settings: this.state.settings,
            projectHistory: [],
            lastPlayedSound: {
                type: null,
                volume: null
            }
        };

        await this.saveState();
        this.notifyListeners();
    }

    // 현재 상태 가져오기
    getState(): State {
        return this.state;
    }
} 