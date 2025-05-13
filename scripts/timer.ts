import { StateManager } from './state';
import { TimerType, TimerSettings, SessionData, TimerState } from './types';

export class TimerManager {
    private stateManager: StateManager;
    private notification: any; // NotificationManager 타입은 나중에 정의
    private settings: TimerSettings;

    constructor(settings: TimerSettings, notification: any) {
        this.stateManager = new StateManager();
        this.notification = notification;
        this.settings = settings;
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
                    await this.notification.playSound(this.settings.focus.sound, false, this.settings.focus.soundVolume);
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
            isRunning: !state.timer.isRunning,
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
        let soundType: string;
        let soundVolume: number;
        switch (state.timer.type) {
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
        if (state.timer.type === 'focus') {
            if (state.timer.pomodoroCount > 0 &&
                state.timer.pomodoroCount % this.validateDuration(this.settings.longBreak.startAfter) === 0) {
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
        
        if (state.timer.sessionStartTime) {
            try {
                const start = new Date(state.timer.sessionStartTime);
                durationMinutes = Math.round((endTime.getTime() - start.getTime()) / 1000 / 60 * 100) / 100;
            } catch (e) {
                durationMinutes = 0;
            }
        }

        const completedSessionData: SessionData = {
            startTime: state.timer.sessionStartTime || new Date().toISOString(),
            endTime: endTime.toISOString(),
            type: state.timer.type,
            durationMinutes: durationMinutes,
            projectName: state.timer.currentProjectName || "N/A"
        };

        if (state.timer.type === 'focus') {
            await this.stateManager.updateTimerState({
                pomodoroCount: state.timer.pomodoroCount + 1
            });
        }

        try {
            const result = await chrome.storage.local.get('pomodoroHistory');
            const history = result.pomodoroHistory || [];
            history.push(completedSessionData);
            await chrome.storage.local.set({ pomodoroHistory: history });
        } catch (error) {
            console.error("Error saving session history:", error);
        }
    }

    // 통계 내보내기
    async exportStats(): Promise<{ success: boolean; dataUri?: string; filename?: string; message?: string }> {
        try {
            const result = await chrome.storage.local.get('pomodoroHistory');
            const history: SessionData[] = result.pomodoroHistory || [];
            if (history.length === 0) {
                return { success: false, message: '내보낼 통계 데이터가 없습니다.' };
            }

            // CSV 헤더
            const header = ['시작시각(년월일시분)', '세션', '지속시간', '프로젝트'];
            // 데이터 행 생성
            const rows = history.map(entry => {
                const startTime = this.formatDateToYMDHM(entry.startTime);
                const sessionType = entry.type === 'focus' ? '집중' : (entry.type === 'shortBreak' ? '휴식' : '긴휴식');
                const duration = entry.durationMinutes;
                const projectName = entry.projectName;

                return [
                    this.escapeCsvField(startTime),
                    this.escapeCsvField(sessionType),
                    this.escapeCsvField(duration),
                    this.escapeCsvField(projectName)
                ].join(',');
            });

            // CSV 내용 결합
            const csvContent = [header.join(','), ...rows].join('\r\n');
            const dataUri = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);

            return { success: true, dataUri: dataUri, filename: 'pomodoro_stats.csv' };
        } catch (error) {
            console.error("Error exporting stats:", error);
            return { success: false, message: '통계 내보내기 중 오류 발생' };
        }
    }

    // 통계 가져오기
    async importStats(historyArray: SessionData[]): Promise<{ success: boolean; message: string }> {
        try {
            if (!Array.isArray(historyArray)) {
                throw new Error('Imported data is not an array.');
            }

            if (historyArray.length > 0 && (
                !historyArray[0].startTime ||
                !historyArray[0].type ||
                historyArray[0].durationMinutes === undefined ||
                historyArray[0].projectName === undefined)
            ) {
                throw new Error('Imported data structure mismatch.');
            }

            await chrome.storage.local.set({ pomodoroHistory: historyArray });
            chrome.runtime.sendMessage({ action: "statsUpdated" });
            return { success: true, message: `통계 ${historyArray.length}건 가져오기 완료` };
        } catch (error) {
            return { success: false, message: `통계 가져오기 실패: ${error instanceof Error ? error.message : 'Unknown error'}` };
        }
    }

    // 통계 초기화
    async resetStats(): Promise<{ success: boolean; message: string }> {
        try {
            await chrome.storage.local.remove('pomodoroHistory');
            chrome.runtime.sendMessage({ action: "statsUpdated" });
            return { success: true, message: '통계 초기화 완료' };
        } catch (error) {
            return { success: false, message: '통계 초기화 중 오류 발생' };
        }
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
        
        if (state.timer.timeLeft > 0) {
            let newDuration: number;
            let newVolume: number;
            let newSoundType: string;

            switch (state.timer.type) {
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
            const remainingRatio = state.timer.timeLeft / (state.timer.timeLeft + 1);
            await this.stateManager.updateTimerState({
                timeLeft: Math.round(newDuration * remainingRatio)
            });

            // 소리 설정 업데이트
            if (typeof newVolume === 'number') {
                await this.notification.playSound(newSoundType, false, newVolume);
            }
        }
    }
} 