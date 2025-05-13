// 타이머 상태 관리
export class TimerState {
    constructor() {
        this.timeLeft = 0;
        this.isRunning = false;
        this.type = 'focus';
        this.pomodoroCount = 0;
        this.alarmName = 'pomodoroTimer';
        this.sessionComplete = false;
        this.sessionStartTime = null;
        this.currentProjectName = null;
    }
}

// 타이머 관리 클래스
export class TimerManager {
    constructor(settings, notification) {
        this.settings = settings;
        this.notification = notification;
        this.state = new TimerState();
    }

    // 타이머 시작
    async startTimer(type) {
        this.state.type = type;
        this.state.isRunning = true;
        this.state.sessionComplete = false;
        this.state.sessionStartTime = new Date().toISOString();
        this.state.currentProjectName = this.settings.projectName || "N/A";

        // 타입에 따른 시간 설정
        let durationMinutes;
        switch (type) {
            case 'focus':
                durationMinutes = this.validateDuration(this.settings.focus.duration);
                if (this.settings.focus.soundType && this.settings.focus.soundType !== 'none') {
                    await this.notification.playSound(this.settings.focus.soundType, false, this.settings.focus.soundVolume);
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

        this.state.timeLeft = durationMinutes * 60;
        await this.saveState();
        
        // 알람 생성
        chrome.alarms.create(this.state.alarmName, { periodInMinutes: 1/60 });
    }

    // 타이머 일시정지/재개
    async toggleTimer() {
        this.state.isRunning = !this.state.isRunning;
        this.state.sessionComplete = false;
        
        if (this.state.isRunning) {
            chrome.alarms.create(this.state.alarmName, { periodInMinutes: 1/60 });
        } else {
            chrome.alarms.clear(this.state.alarmName);
        }
        
        await this.saveState();
    }

    // 타이머 중지
    async stopTimer() {
        chrome.alarms.clear(this.state.alarmName);
        await this.notification.playSound('none', false, 0);
        
        this.state = new TimerState();
        await this.saveState();
    }

    // 타이머 완료 처리
    async completeTimer() {
        chrome.alarms.clear(this.state.alarmName);
        await this.notification.playSound('none', false, 0);

        // 알림음 재생
        let soundType, soundVolume;
        switch (this.state.type) {
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
        this.state.type = nextType;
        this.state.timeLeft = this.getDurationForType(nextType) * 60;
        this.state.sessionStartTime = new Date().toISOString();
        this.state.currentProjectName = this.settings.projectName || "N/A";

        // 자동 시작 설정 확인
        const shouldAutoStart = nextType !== 'focus'
            ? this.settings.general.autoStartBreaks
            : this.settings.general.autoStartPomodoros;

        if (shouldAutoStart) {
            await this.startTimer(nextType);
        } else {
            this.state.isRunning = false;
            this.state.sessionComplete = true;
            await this.saveState();
        }

        // 알림 표시
        await this.notification.showSessionComplete(nextType);
    }

    // 유틸리티 메서드들
    validateDuration(duration, defaultValue) {
        const num = parseInt(duration);
        return (!isNaN(num) && num > 0) ? num : defaultValue;
    }

    getNextSessionType() {
        if (this.state.type === 'focus') {
            if (this.state.pomodoroCount > 0 &&
                this.state.pomodoroCount % this.validateDuration(this.settings.longBreak.startAfter) === 0) {
                return 'longBreak';
            }
            return 'shortBreak';
        }
        return 'focus';
    }

    getDurationForType(type) {
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

    async saveState() {
        await chrome.storage.local.set({
            timeLeft: this.state.timeLeft,
            isRunning: this.state.isRunning,
            type: this.state.type,
            sessionComplete: this.state.sessionComplete,
            pomodoroCount: this.state.pomodoroCount,
            sessionStartTime: this.state.sessionStartTime,
            currentProjectName: this.state.currentProjectName
        });
    }

    async saveSessionData() {
        const endTime = new Date();
        let durationMinutes = 0;
        
        if (this.state.sessionStartTime) {
            try {
                const start = new Date(this.state.sessionStartTime);
                durationMinutes = Math.round((endTime - start) / 1000 / 60 * 100) / 100;
            } catch (e) {
                durationMinutes = 0;
            }
        }

        const completedSessionData = {
            startTime: this.state.sessionStartTime,
            endTime: endTime.toISOString(),
            type: this.state.type,
            durationMinutes: durationMinutes,
            projectName: this.state.currentProjectName
        };

        if (this.state.type === 'focus') {
            this.state.pomodoroCount++;
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
    async exportStats() {
        try {
            const result = await chrome.storage.local.get('pomodoroHistory');
            const history = result.pomodoroHistory || [];
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
    async importStats(historyArray) {
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
            return { success: false, message: `통계 가져오기 실패: ${error.message}` };
        }
    }

    // 통계 초기화
    async resetStats() {
        try {
            await chrome.storage.local.remove('pomodoroHistory');
            chrome.runtime.sendMessage({ action: "statsUpdated" });
            return { success: true, message: '통계 초기화 완료' };
        } catch (error) {
            return { success: false, message: '통계 초기화 중 오류 발생' };
        }
    }

    // 유틸리티 메서드
    escapeCsvField(field) {
        if (field === null || field === undefined) {
            return '';
        }
        const str = String(field);
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }

    formatDateToYMDHM(dateString) {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hour = String(date.getHours()).padStart(2, '0');
        const minute = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${hour}:${minute}`;
    }

    // 설정 업데이트
    async updateTimerSettings(newSettings) {
        this.settings = newSettings;
        let newDuration;
        let newVolume;
        let newSoundType;

        switch (this.state.type) {
            case 'focus':
                newDuration = this.settings.focus.duration * 60;
                newVolume = this.settings.focus.soundVolume;
                newSoundType = this.settings.focus.soundType;
                break;
            case 'shortBreak':
                newDuration = this.settings.shortBreak.duration * 60;
                newVolume = this.settings.shortBreak.soundVolume;
                newSoundType = this.settings.shortBreak.soundType;
                break;
            case 'longBreak':
                newDuration = this.settings.longBreak.duration * 60;
                newVolume = this.settings.longBreak.soundVolume;
                newSoundType = this.settings.longBreak.soundType;
                break;
        }

        // 남은 시간 비율 계산 및 적용
        const remainingRatio = this.state.timeLeft / (this.state.timeLeft + 1);
        this.state.timeLeft = Math.round(newDuration * remainingRatio);
        await this.saveState();

        // 소리 설정 업데이트
        if (typeof newVolume === 'number') {
            await this.notification.playSound(newSoundType, false, newVolume);
        }
    }
} 