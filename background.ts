import { TimerManager } from './scripts/timer';
import { NotificationManager, ChromeNotificationManager } from './scripts/notification';
import { StateManager } from './scripts/state';
import { DEFAULT_SETTINGS_BG } from './scripts/settings';
import { Message, Response, TimerType, TimerSettings } from './scripts/types';

// 프로젝트 기록 저장 키
const PROJECT_HISTORY_KEY = 'projectHistory';
const MAX_HISTORY_SIZE = 10;

class BackgroundManager {
    private timerManager: TimerManager;
    private notificationManager: NotificationManager;
    private stateManager: StateManager;

    constructor() {
        this.stateManager = new StateManager();
        this.notificationManager = new ChromeNotificationManager();
        const settings = this.stateManager.getState().settings || DEFAULT_SETTINGS_BG;
        this.timerManager = new TimerManager(settings, this.notificationManager);
        this.initialize();
    }

    private async initialize(): Promise<void> {
        // 설정 로드
        const result = await chrome.storage.local.get('settings');
        const settings = result.settings || DEFAULT_SETTINGS_BG;

        // 매니저 초기화
        this.stateManager = new StateManager();
        this.notificationManager = new ChromeNotificationManager();
        this.timerManager = new TimerManager(settings, this.notificationManager);

        // 이벤트 리스너 설정
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // 알람 이벤트
        chrome.alarms.onAlarm.addListener(async (alarm) => {
            if (alarm.name === 'pomodoroTimer') {
                const state = this.stateManager.getState();
                if (state.timeLeft > 0) {
                    await this.stateManager.updateTimerState({
                        timeLeft: state.timeLeft - 1
                    });
                } else {
                    await this.timerManager.completeTimer();
                }
            }
        });

        // 메시지 이벤트
        chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
            return true;
        });

        // 알림 클릭 이벤트
        chrome.notifications.onClicked.addListener((notificationId) => {
            if (notificationId === 'pomodoroNotification') {
                chrome.tabs.create({ url: 'dashboard.html' });
            }
        });

        // 설정 변경 이벤트
        chrome.storage.onChanged.addListener(async (changes, areaName) => {
            if (areaName === 'local' && changes.settings) {
                await this.timerManager.updateSettings(changes.settings.newValue as TimerSettings);
            }
        });
    }

    private async handleMessage(message: Message, sender: any, sendResponse: (response: Response) => void): Promise<void> {
        const state = this.stateManager.getState();

        switch (message.type) {
            case 'START_TIMER':
                if (message.timerType) {
                    await this.timerManager.startTimer(message.timerType);
                    sendResponse({ success: true });
                } else {
                    sendResponse({ success: false, error: 'Timer type is required' });
                }
                break;

            case 'STOP_TIMER':
                await this.timerManager.stopTimer();
                sendResponse({ success: true });
                break;

            case 'TOGGLE_TIMER':
                await this.timerManager.toggleTimer();
                sendResponse({ success: true });
                break;

            case 'GET_TIMER_STATE':
                sendResponse({ success: true, state });
                break;

            case 'GET_SETTINGS':
                sendResponse({ success: true, settings: state.settings || undefined });
                break;

            case 'UPDATE_SETTINGS':
                if (message.settings) {
                    await this.stateManager.updateSettings(message.settings);
                    await this.timerManager.updateSettings(message.settings);
                    sendResponse({ success: true });
                } else {
                    sendResponse({ success: false, error: 'Settings are required' });
                }
                break;

            case 'EXPORT_STATS':
                const stats = await this.timerManager.exportStats();
                sendResponse({ success: stats.success, stats });
                break;

            case 'IMPORT_STATS':
                if (message.stats) {
                    const result = await this.timerManager.importStats(message.stats);
                    sendResponse({ success: result.success, error: result.message });
                } else {
                    sendResponse({ success: false, error: 'Stats data is required' });
                }
                break;

            case 'RESET_STATS':
                const resetResult = await this.timerManager.resetStats();
                sendResponse({ success: resetResult.success, error: resetResult.message });
                break;

            default:
                sendResponse({ success: false, error: 'Unknown message type' });
        }
    }
}

// 초기화 실행
new BackgroundManager(); 