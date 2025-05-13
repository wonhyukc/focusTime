import { TimerManager } from './scripts/timer';
import { NotificationManager } from './scripts/notification';
import { StateManager } from './scripts/state';
import { DEFAULT_SETTINGS_BG } from './scripts/settings';
import { Message, Response, TimerType, TimerSettings } from './scripts/types';

// 프로젝트 기록 저장 키
const PROJECT_HISTORY_KEY = 'projectHistory';
const MAX_HISTORY_SIZE = 10;

// 전역 변수
let timerManager: TimerManager;
let notificationManager: NotificationManager;
let stateManager: StateManager;

// 초기화
async function initialize(): Promise<void> {
    // 설정 로드
    const result = await chrome.storage.local.get('settings');
    const settings = result.settings || DEFAULT_SETTINGS_BG;

    // 매니저 초기화
    stateManager = new StateManager();
    notificationManager = new NotificationManager();
    timerManager = new TimerManager(settings, notificationManager);

    // 이벤트 리스너 설정
    setupEventListeners();
}

// 이벤트 리스너 설정
function setupEventListeners(): void {
    // 알람 이벤트
    chrome.alarms.onAlarm.addListener(async (alarm) => {
        if (alarm.name === 'pomodoroTimer') {
            const state = stateManager.getState();
            if (state.timer.timeLeft > 0) {
                await stateManager.updateTimerState({
                    timeLeft: state.timer.timeLeft - 1
                });
            } else {
                await timerManager.completeTimer();
            }
        }
    });

    // 메시지 이벤트
    chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
        handleMessage(message, sender, sendResponse);
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
            await timerManager.updateSettings(changes.settings.newValue as TimerSettings);
        }
    });
}

// 메시지 처리
async function handleMessage(message: Message, sender: any, sendResponse: (response: Response) => void): Promise<void> {
    const state = stateManager.getState();

    switch (message.type) {
        case 'START_TIMER':
            if (message.timerType) {
                await timerManager.startTimer(message.timerType);
                sendResponse({ success: true });
            } else {
                sendResponse({ success: false, error: 'Timer type is required' });
            }
            break;

        case 'STOP_TIMER':
            await timerManager.stopTimer();
            sendResponse({ success: true });
            break;

        case 'TOGGLE_TIMER':
            await timerManager.toggleTimer();
            sendResponse({ success: true });
            break;

        case 'GET_TIMER_STATE':
            sendResponse({ success: true, state: state.timer });
            break;

        case 'GET_SETTINGS':
            sendResponse({ success: true, settings: state.settings || undefined });
            break;

        case 'UPDATE_SETTINGS':
            if (message.settings) {
                await stateManager.updateSettings(message.settings);
                await timerManager.updateSettings(message.settings);
                sendResponse({ success: true });
            } else {
                sendResponse({ success: false, error: 'Settings are required' });
            }
            break;

        case 'EXPORT_STATS':
            const stats = await timerManager.exportStats();
            sendResponse({ success: stats.success, stats });
            break;

        case 'IMPORT_STATS':
            if (message.stats) {
                const result = await timerManager.importStats(message.stats);
                sendResponse({ success: result.success, error: result.message });
            } else {
                sendResponse({ success: false, error: 'Stats data is required' });
            }
            break;

        case 'RESET_STATS':
            const resetResult = await timerManager.resetStats();
            sendResponse({ success: resetResult.success, error: resetResult.message });
            break;

        default:
            sendResponse({ success: false, error: 'Unknown message type' });
    }
}

// 초기화 실행
initialize(); 