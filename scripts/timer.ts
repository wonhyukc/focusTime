import { StateManager } from './state';
import { TimerType, TimerSettings, SessionData, TimerState, SoundType } from './types';
import { handleError } from './utils';
import { PomodoroError } from './errors';
import { StatisticsManager } from './statistics';
import { StorageManager } from './storage';
import { NotificationManager } from './notification';

export class TimerManager {
    private stateManager: StateManager;
    private notification: NotificationManager;
    private settings: TimerSettings;
    private statisticsManager: StatisticsManager;
    private storageManager: StorageManager;

    constructor(settings: TimerSettings, notification: NotificationManager) {
        this.stateManager = new StateManager();
        this.notification = notification;
        this.settings = settings;
        this.statisticsManager = new StatisticsManager();
        this.storageManager = new StorageManager();
    }

    // 타이머 시작
    async startTimer(type: TimerType): Promise<void> {
        const updates: Partial<TimerState> = {
            type,
            isRunning: true,
            sessionComplete: false,
            sessionStartTime: new Date().toISOString(),
            currentProjectName: this.settings.projectName || "N/A"
        };

        // 타입에 따른 시간 설정
        let durationMinutes: number;
        switch (type) {
            case 'focus':
                durationMinutes = this.validateDuration(this.settings.focus.duration);
                if (this.settings.focus.sound && this.settings.focus.sound !== 'none') {
                    await this.notification.playSound(this.settings.focus.sound as SoundType, false, this.settings.focus.soundVolume);
                }
                break;
            case 'shortBreak':
                durationMinutes = this.validateDuration(this.settings.shortBreak.duration);
                await this.notification.playSound('none', false, 0);
                break;
            case 'longBreak':
                durationMinutes = this.validateDuration(this.settings.longBreak.duration);
                await this.notification.playSound('none', false, 0);
                break;
            default:
                durationMinutes = this.settings.focus.duration;
                await this.notification.playSound('none', false, 0);
        }

        updates.timeLeft = durationMinutes * 60;
        await this.stateManager.updateTimerState(updates);
        
        // 알람 생성
        chrome.alarms.create('pomodoroTimer', { periodInMinutes: 1/60 });
    }

    // 타이머 일시정지/재개
    async toggleTimer(): Promise<void> {
        const state = this.stateManager.getState();
        const updates = {
            isRunning: !state.isRunning,
            sessionComplete: false
        };
        
        if (updates.isRunning) {
            chrome.alarms.create('pomodoroTimer', { periodInMinutes: 1/60 });
        } else {
            chrome.alarms.clear('pomodoroTimer');
        }
        
        await this.stateManager.updateTimerState(updates);
    }

    // 타이머 중지
    async stopTimer(): Promise<void> {
        chrome.alarms.clear('pomodoroTimer');
        await this.notification.playSound('none', false, 0);
        await this.stateManager.resetState();
    }

    // 타이머 완료 처리
    async completeTimer(): Promise<void> {
        const state = this.stateManager.getState();
        chrome.alarms.clear('pomodoroTimer');
        await this.notification.playSound('none', false, 0);

        // 알림음 재생
        let soundType: SoundType;
        let soundVolume: number;
        switch (state.type) {
            case 'focus':
                soundType = this.settings.focus.sound;
                soundVolume = this.settings.focus.soundVolume;
                break;
            case 'shortBreak':
                soundType = this.settings.shortBreak.sound;
                soundVolume = this.settings.shortBreak.soundVolume;
                break;
            case 'longBreak':
                soundType = this.settings.longBreak.sound;
                soundVolume = this.settings.longBreak.soundVolume;
                break;
            default:
                soundType = this.settings.focus.sound;
                soundVolume = this.settings.focus.soundVolume;
        }
        await this.notification.playSound(soundType, false, soundVolume);

        // 세션 정보 저장
        await this.saveSessionData();

        // 다음 세션 타입 결정
        const nextType = this.getNextSessionType();
        const updates: Partial<TimerState> = {
            type: nextType,
            timeLeft: this.getDurationForType(nextType) * 60,
            sessionStartTime: new Date().toISOString(),
            currentProjectName: this.settings.projectName || "N/A"
        };

        // 자동 시작 설정 확인
        const shouldAutoStart = nextType !== 'focus'
            ? this.settings.general.autoStartBreaks
            : this.settings.general.autoStartPomodoros;

        if (shouldAutoStart) {
            updates.isRunning = true;
            await this.stateManager.updateTimerState(updates);
            await this.startTimer(nextType);
        } else {
            updates.isRunning = false;
            updates.sessionComplete = true;
            await this.stateManager.updateTimerState(updates);
        }

        // 알림 표시
        await this.notification.showSessionComplete(nextType);
    }

    // 유틸리티 메서드들
    private validateDuration(duration: number, defaultValue: number = 25): number {
        const num = parseInt(String(duration));
        return (!isNaN(num) && num > 0) ? num : defaultValue;
    }

    private getNextSessionType(): TimerType {
        const state = this.stateManager.getState();
        if (state.type === 'focus') {
            if (state.pomodoroCount > 0 &&
                state.pomodoroCount % this.validateDuration(this.settings.longBreak.startAfter) === 0) {
                return 'longBreak';
            }
            return 'shortBreak';
        }
        return 'focus';
    }

    private getDurationForType(type: TimerType): number {
        switch (type) {
            case 'focus':
                return this.validateDuration(this.settings.focus.duration);
            case 'shortBreak':
                return this.validateDuration(this.settings.shortBreak.duration);
            case 'longBreak':
                return this.validateDuration(this.settings.longBreak.duration);
            default:
                return this.settings.focus.duration;
        }
    }

    private async saveSessionData(): Promise<void> {
        const state = this.stateManager.getState();
        const endTime = new Date();
        let durationMinutes = 0;
        if (state.sessionStartTime) {
            try {
                const start = new Date(state.sessionStartTime);
                durationMinutes = Math.round((endTime.getTime() - start.getTime()) / 1000 / 60 * 100) / 100;
            } catch (e) {
                durationMinutes = 0;
            }
        }
        const completedSessionData: SessionData = {
            startTime: state.sessionStartTime || new Date().toISOString(),
            endTime: endTime.toISOString(),
            type: state.type,
            durationMinutes: durationMinutes,
            projectName: state.currentProjectName || "N/A"
        };
        if (state.type === 'focus') {
            await this.stateManager.updateTimerState({
                pomodoroCount: state.pomodoroCount + 1
            });
        }
        try {
            const history = await this.storageManager.getPomodoroHistory();
            history.push(completedSessionData);
            await this.storageManager.saveSessionDataWithRetry(history);
        } catch (error) {
            handleError(error, 'saveSessionData');
        }
    }

    // 통계 내보내기
    async exportStats(): Promise<{ success: boolean; dataUri?: string; filename?: string; message?: string }> {
        return this.statisticsManager.exportStats();
    }

    // 통계 가져오기
    async importStats(historyArray: SessionData[]): Promise<{ success: boolean; message: string }> {
        return this.statisticsManager.importStats(historyArray);
    }

    // 통계 초기화
    async resetStats(): Promise<{ success: boolean; message: string }> {
        return this.statisticsManager.resetStats();
    }

    // 유틸리티 메서드
    private escapeCsvField(field: any): string {
        if (field === null || field === undefined) {
            return '';
        }
        const str = String(field);
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }

    private formatDateToYMDHM(dateString: string): string {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hour = String(date.getHours()).padStart(2, '0');
        const minute = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${hour}:${minute}`;
    }

    // 설정 업데이트
    async updateSettings(newSettings: TimerSettings): Promise<void> {
        this.settings = newSettings;
        const state = this.stateManager.getState();
        
        if (state.timeLeft > 0) {
            let newDuration: number;
            let newVolume: number;
            let newSoundType: string;

            switch (state.type) {
                case 'focus':
                    newDuration = this.settings.focus.duration * 60;
                    newVolume = this.settings.focus.soundVolume;
                    newSoundType = this.settings.focus.sound;
                    break;
                case 'shortBreak':
                    newDuration = this.settings.shortBreak.duration * 60;
                    newVolume = this.settings.shortBreak.soundVolume;
                    newSoundType = this.settings.shortBreak.sound;
                    break;
                case 'longBreak':
                    newDuration = this.settings.longBreak.duration * 60;
                    newVolume = this.settings.longBreak.soundVolume;
                    newSoundType = this.settings.longBreak.sound;
                    break;
                default:
                    return;
            }

            // 남은 시간 비율 계산 및 적용
            const remainingRatio = state.timeLeft / (state.timeLeft + 1);
            await this.stateManager.updateTimerState({
                timeLeft: Math.round(newDuration * remainingRatio)
            });

            // 소리 설정 업데이트
            if (typeof newVolume === 'number') {
                await this.notification.playSound(newSoundType as SoundType, false, newVolume);
            }
        }
    }
} 