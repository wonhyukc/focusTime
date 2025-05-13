import { TimerManager } from '../scripts/timer.js';
import { NotificationManager } from '../scripts/notification.js';

// Mock chrome API
global.chrome = {
    storage: {
        local: {
            get: jest.fn(),
            set: jest.fn()
        }
    },
    alarms: {
        create: jest.fn(),
        clear: jest.fn()
    }
};

// Mock NotificationManager
class MockNotificationManager {
    constructor() {
        this.soundsPlayed = [];
    }

    async playSound(soundType, isLoop, volume) {
        this.soundsPlayed.push({ soundType, isLoop, volume });
    }

    async showNotification(title, message) {
        this.lastNotification = { title, message };
    }
}

describe('TimerManager', () => {
    let timerManager;
    let mockNotificationManager;
    const mockSettings = {
        focus: {
            duration: 25,
            soundType: 'beep',
            soundVolume: 0.5
        },
        shortBreak: {
            duration: 5,
            soundType: 'none',
            soundVolume: 0
        },
        longBreak: {
            duration: 15,
            soundType: 'none',
            soundVolume: 0
        },
        general: {
            autoStartBreaks: false,
            autoStartPomodoros: false
        }
    };

    beforeEach(() => {
        mockNotificationManager = new MockNotificationManager();
        timerManager = new TimerManager(mockSettings, mockNotificationManager);
        jest.clearAllMocks();
    });

    test('타이머 시작 - 집중 세션', async () => {
        await timerManager.startTimer('focus');
        
        expect(timerManager.state.isRunning).toBe(true);
        expect(timerManager.state.type).toBe('focus');
        expect(timerManager.state.timeLeft).toBe(25 * 60); // 25분
        expect(chrome.alarms.create).toHaveBeenCalledWith(
            'pomodoroTimer',
            { periodInMinutes: 1/60 }
        );
        expect(mockNotificationManager.soundsPlayed).toContainEqual({
            soundType: 'beep',
            isLoop: false,
            volume: 0.5
        });
    });

    test('타이머 일시정지/재개', async () => {
        await timerManager.startTimer('focus');
        await timerManager.toggleTimer();
        
        expect(timerManager.state.isRunning).toBe(false);
        expect(chrome.alarms.clear).toHaveBeenCalledWith('pomodoroTimer');
        
        await timerManager.toggleTimer();
        expect(timerManager.state.isRunning).toBe(true);
        expect(chrome.alarms.create).toHaveBeenCalledWith(
            'pomodoroTimer',
            { periodInMinutes: 1/60 }
        );
    });

    test('타이머 중지', async () => {
        await timerManager.startTimer('focus');
        await timerManager.stopTimer();
        
        expect(timerManager.state.isRunning).toBe(false);
        expect(timerManager.state.timeLeft).toBe(0);
        expect(timerManager.state.type).toBe('focus');
        expect(chrome.alarms.clear).toHaveBeenCalledWith('pomodoroTimer');
    });

    test('세션 완료 처리 - 집중 → 휴식', async () => {
        await timerManager.startTimer('focus');
        await timerManager.completeTimer();
        
        expect(timerManager.state.type).toBe('shortBreak');
        expect(timerManager.state.timeLeft).toBe(5 * 60); // 5분
        expect(timerManager.state.isRunning).toBe(false);
        expect(mockNotificationManager.lastNotification).toBeDefined();
    });

    test('통계 내보내기', async () => {
        const mockHistory = [{
            startTime: '2024-01-01T10:00:00Z',
            type: 'focus',
            durationMinutes: 25,
            projectName: 'Test Project'
        }];
        
        chrome.storage.local.get.mockResolvedValue({ pomodoroHistory: mockHistory });
        
        const result = await timerManager.exportStats();
        
        expect(result.success).toBe(true);
        expect(result.dataUri).toContain('data:text/csv');
        expect(result.filename).toBe('pomodoro_stats.csv');
    });
}); 