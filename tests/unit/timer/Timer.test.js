import Timer from '../../../src/core/timer/Timer';

// 타이머 기능 테스트
describe('Timer', () => {
    let timer;
    let mockSettings;
    let mockStorage;
    let mockNotification;

    // 테스트 전 설정
    beforeEach(() => {
        // 모의 객체 설정
        mockSettings = {
            focusTime: 25,
            shortBreakTime: 5,
            longBreakTime: 15,
            longBreakInterval: 4
        };

        mockStorage = {
            get: jest.fn(),
            set: jest.fn()
        };

        mockNotification = {
            show: jest.fn(),
            playSound: jest.fn()
        };

        // 타이머 인스턴스 생성
        timer = new Timer(mockSettings, mockStorage, mockNotification);
    });

    // 테스트 후 정리
    afterEach(() => {
        jest.clearAllMocks();
        jest.clearAllTimers();
    });

    // 타이머 초기화 테스트
    describe('초기화', () => {
        test('타이머가 올바르게 초기화되어야 함', () => {
            expect(timer.isRunning).toBe(false);
            expect(timer.timeLeft).toBe(mockSettings.focusTime * 60);
            expect(timer.currentSession).toBe('focus');
            expect(timer.pomodoroCount).toBe(0);
        });

        test('설정이 올바르게 로드되어야 함', () => {
            expect(timer.settings).toEqual(mockSettings);
        });
    });

    // 타이머 시작 테스트
    describe('시작', () => {
        test('타이머가 시작되어야 함', () => {
            timer.start();
            expect(timer.isRunning).toBe(true);
        });

        test('이미 실행 중인 타이머는 중복 시작되지 않아야 함', () => {
            timer.start();
            const initialTimeLeft = timer.timeLeft;
            timer.start();
            expect(timer.timeLeft).toBe(initialTimeLeft);
        });

        test('시작 시 알림이 표시되어야 함', () => {
            timer.start();
            expect(mockNotification.show).toHaveBeenCalledWith(
                '타이머 시작',
                '포커스 시간이 시작되었습니다.'
            );
        });
    });

    // 타이머 일시정지 테스트
    describe('일시정지', () => {
        test('타이머가 일시정지되어야 함', () => {
            timer.start();
            const timeBeforePause = timer.timeLeft;
            timer.pause();
            expect(timer.isRunning).toBe(false);
            expect(timer.timeLeft).toBe(timeBeforePause);
        });

        test('일시정지된 타이머는 재개할 수 있어야 함', () => {
            timer.start();
            timer.pause();
            const timeBeforeResume = timer.timeLeft;
            timer.resume();
            expect(timer.isRunning).toBe(true);
            expect(timer.timeLeft).toBe(timeBeforeResume);
        });
    });

    // 타이머 리셋 테스트
    describe('리셋', () => {
        test('타이머가 초기 상태로 리셋되어야 함', () => {
            timer.start();
            timer.pause();
            timer.reset();
            expect(timer.isRunning).toBe(false);
            expect(timer.timeLeft).toBe(mockSettings.focusTime * 60);
            expect(timer.currentSession).toBe('focus');
        });

        test('리셋 시 알림이 표시되어야 함', () => {
            timer.reset();
            expect(mockNotification.show).toHaveBeenCalledWith(
                '타이머 리셋',
                '타이머가 초기화되었습니다.'
            );
        });
    });

    // 세션 완료 테스트
    describe('세션 완료', () => {
        test('포커스 세션이 완료되면 휴식 세션으로 전환되어야 함', () => {
            timer.timeLeft = 0;
            timer.completeSession();
            expect(timer.currentSession).toBe('break');
            expect(timer.timeLeft).toBe(mockSettings.shortBreakTime * 60);
        });

        test('포모도로 카운트가 증가해야 함', () => {
            timer.timeLeft = 0;
            timer.completeSession();
            expect(timer.pomodoroCount).toBe(1);
        });

        test('장시간 휴식 조건이 충족되면 장시간 휴식으로 전환되어야 함', () => {
            timer.pomodoroCount = mockSettings.longBreakInterval - 1;
            timer.timeLeft = 0;
            timer.completeSession();
            expect(timer.currentSession).toBe('longBreak');
            expect(timer.timeLeft).toBe(mockSettings.longBreakTime * 60);
        });
    });

    // 세션 포기 테스트
    describe('세션 포기', () => {
        test('세션을 포기하면 통계가 기록되어야 함', () => {
            timer.start();
            timer.abandonSession();
            expect(mockStorage.set).toHaveBeenCalled();
        });

        test('세션 포기 시 알림이 표시되어야 함', () => {
            timer.abandonSession();
            expect(mockNotification.show).toHaveBeenCalledWith(
                '세션 포기',
                '현재 세션이 포기되었습니다.'
            );
        });
    });

    // 시간 업데이트 테스트
    describe('시간 업데이트', () => {
        test('타이머가 실행 중일 때 시간이 감소해야 함', () => {
            jest.useFakeTimers();
            timer.start();
            const initialTime = timer.timeLeft;
            jest.advanceTimersByTime(1000);
            expect(timer.timeLeft).toBe(initialTime - 1);
            jest.useRealTimers();
        });

        test('시간이 0이 되면 세션이 완료되어야 함', () => {
            jest.useFakeTimers();
            timer.timeLeft = 1;
            timer.start();
            jest.advanceTimersByTime(1000);
            jest.runOnlyPendingTimers();
            expect(timer.timeLeft).toBe(mockSettings.shortBreakTime * 60);
            expect(timer.isRunning).toBe(false);
            jest.useRealTimers();
        });
    });

    // 알림 테스트
    describe('알림', () => {
        test('세션 시작 시 알림이 표시되어야 함', () => {
            timer.start();
            expect(mockNotification.show).toHaveBeenCalled();
            expect(mockNotification.playSound).toHaveBeenCalled();
        });

        test('세션 완료 시 알림이 표시되어야 함', () => {
            timer.timeLeft = 0;
            timer.completeSession();
            expect(mockNotification.show).toHaveBeenCalled();
            expect(mockNotification.playSound).toHaveBeenCalled();
        });
    });

    // 상태 저장 테스트
    describe('상태 저장', () => {
        test('타이머 상태가 저장되어야 함', () => {
            timer.start();
            timer.saveState();
            expect(mockStorage.set).toHaveBeenCalledWith(
                'timerState',
                expect.objectContaining({
                    isRunning: true,
                    timeLeft: expect.any(Number),
                    currentSession: expect.any(String),
                    pomodoroCount: expect.any(Number)
                })
            );
        });

        test('저장된 상태를 불러올 수 있어야 함', async () => {
            const savedState = {
                isRunning: true,
                timeLeft: 1500,
                currentSession: 'focus',
                pomodoroCount: 2
            };
            mockStorage.get.mockResolvedValue({ timerState: savedState });
            await timer.loadState();
            expect(timer.isRunning).toBe(savedState.isRunning);
            expect(timer.timeLeft).toBe(savedState.timeLeft);
            expect(timer.currentSession).toBe(savedState.currentSession);
            expect(timer.pomodoroCount).toBe(savedState.pomodoroCount);
        });
    });
}); 