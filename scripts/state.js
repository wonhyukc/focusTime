// 상태 관리를 위한 클래스
export class StateManager {
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
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    // 상태 변경 알림
    notifyListeners() {
        this.listeners.forEach(listener => listener(this.state));
    }

    // 타이머 상태 업데이트
    async updateTimerState(updates) {
        this.state.timer = { ...this.state.timer, ...updates };
        await this.saveState();
        this.notifyListeners();
    }

    // 설정 업데이트
    async updateSettings(settings) {
        this.state.settings = { ...this.state.settings, ...settings };
        await this.saveState();
        this.notifyListeners();
    }

    // 프로젝트 히스토리 업데이트
    async updateProjectHistory(projectName) {
        if (!projectName) return;

        const history = this.state.projectHistory.filter(item => item !== projectName);
        history.unshift(projectName);
        if (history.length > 10) { // MAX_HISTORY_SIZE
            history.pop();
        }

        this.state.projectHistory = history;
        await this.saveState();
        this.notifyListeners();
    }

    // 마지막 재생된 소리 업데이트
    updateLastPlayedSound(type, volume) {
        this.state.lastPlayedSound = { type, volume };
        this.notifyListeners();
    }

    // 상태 저장
    async saveState() {
        await chrome.storage.local.set({
            timerState: this.state.timer,
            settings: this.state.settings,
            projectHistory: this.state.projectHistory
        });
    }

    // 상태 로드
    async loadState() {
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
    async resetState() {
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
            settings: this.state.settings, // 설정은 유지
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
    getState() {
        return this.state;
    }
} 