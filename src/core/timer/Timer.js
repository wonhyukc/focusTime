class Timer {
    constructor(settings, storage, notification) {
        this.settings = settings;
        this.storage = storage;
        this.notification = notification;
        
        // 타이머 상태 초기화
        this.isRunning = false;
        this.timeLeft = settings.focusTime * 60;
        this.currentSession = 'focus';
        this.pomodoroCount = 0;
        this.timerId = null;
    }

    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.notification.show('타이머 시작', '포커스 시간이 시작되었습니다.');
        this.notification.playSound();
        
        this.timerId = setInterval(() => {
            if (this.timeLeft > 0) {
                this.timeLeft--;
            } else {
                clearInterval(this.timerId);
                this.isRunning = false;
                this.completeSession();
            }
        }, 1000);
    }

    pause() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        clearInterval(this.timerId);
    }

    resume() {
        if (this.isRunning) return;
        this.start();
    }

    reset() {
        this.pause();
        this.timeLeft = this.settings.focusTime * 60;
        this.currentSession = 'focus';
        this.pomodoroCount = 0;
        this.notification.show('타이머 리셋', '타이머가 초기화되었습니다.');
    }

    completeSession() {
        // 세션 완료 시 타이머 멈춤
        this.pause();
        if (this.currentSession === 'focus') {
            // 먼저 카운트 증가 후 조건 체크
            this.pomodoroCount++;
            if (this.pomodoroCount % this.settings.longBreakInterval === 0) {
                this.currentSession = 'longBreak';
                this.timeLeft = this.settings.longBreakTime * 60;
                this.notification.show('장시간 휴식', '장시간 휴식이 시작되었습니다.');
            } else {
                this.currentSession = 'break';
                this.timeLeft = this.settings.shortBreakTime * 60;
                this.notification.show('휴식', '짧은 휴식이 시작되었습니다.');
            }
        } else {
            this.currentSession = 'focus';
            this.timeLeft = this.settings.focusTime * 60;
            this.notification.show('포커스', '포커스 시간이 시작되었습니다.');
        }
        this.notification.playSound();
        this.saveState();
        this.isRunning = false; // 세션 완료 후 항상 false로 설정
    }

    abandonSession() {
        if (this.currentSession === 'focus') {
            this.storage.set('abandonedSessions', {
                timestamp: Date.now(),
                sessionType: this.currentSession,
                timeLeft: this.timeLeft
            });
        }
        
        this.notification.show('세션 포기', '현재 세션이 포기되었습니다.');
        this.reset();
    }

    saveState() {
        this.storage.set('timerState', {
            isRunning: this.isRunning,
            timeLeft: this.timeLeft,
            currentSession: this.currentSession,
            pomodoroCount: this.pomodoroCount
        });
    }

    async loadState() {
        const { timerState } = await this.storage.get('timerState');
        if (timerState) {
            this.isRunning = timerState.isRunning;
            this.timeLeft = timerState.timeLeft;
            this.currentSession = timerState.currentSession;
            this.pomodoroCount = timerState.pomodoroCount;
            
            if (this.isRunning) {
                this.start();
            }
        }
    }
}

export default Timer; 