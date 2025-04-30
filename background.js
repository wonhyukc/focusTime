// 기본 설정값
const DEFAULT_SETTINGS = {
    version: "1.0",
    focus: {
        duration: 25,
        sound: "beep",
        soundVolume: 50,
        soundType: "low-short-beep",
        desktopNotification: true,
        tabNotification: true
    },
    shortBreak: {
        duration: 5,
        sound: "beep",
        soundVolume: 50,
        soundType: "low-short-beep",
        desktopNotification: true,
        tabNotification: true
    },
    longBreak: {
        duration: 15,
        startAfter: 4,
        sound: "beep",
        soundVolume: 50,
        soundType: "low-short-beep",
        desktopNotification: true,
        tabNotification: true
    },
    general: {
        soundEnabled: true,
        autoStartBreaks: false,
        autoStartPomodoros: false
    }
};

// 타이머 상태
let timerState = {
    timeLeft: 0,
    isRunning: false,
    isBreak: false,
    type: 'focus', // 'focus' | 'shortBreak' | 'longBreak'
    pomodoroCount: 0,
    alarmName: 'pomodoroTimer',
    sessionComplete: false
};

// 컨텍스트 메뉴 생성
function createInitialMenus() {
    // 기존 메뉴 모두 제거
    chrome.contextMenus.removeAll(() => {
        // 초기 상태 메뉴 생성
        chrome.contextMenus.create({
            id: 'cycleStart',
            title: '사이클 시작',
            contexts: ['action']
        });

        chrome.contextMenus.create({
            id: 'focusStart',
            title: '집중 시작',
            contexts: ['action']
        });

        chrome.contextMenus.create({
            id: 'shortBreakStart',
            title: '짧은 휴식 시작',
            contexts: ['action']
        });

        chrome.contextMenus.create({
            id: 'longBreakStart',
            title: '긴 휴식 시작',
            contexts: ['action']
        });

        // 구분선 추가
        chrome.contextMenus.create({
            id: 'separator1',
            type: 'separator',
            contexts: ['action']
        });

        // 설정과 통계 메뉴 추가
        chrome.contextMenus.create({
            id: 'openDashboard',
            title: '설정 및 통계',
            contexts: ['action']
        });
    });
}

// 실행 중일 때의 메뉴 생성
function createRunningMenus() {
    chrome.contextMenus.removeAll(() => {
        // 일시정지/재개 메뉴 (타이머 상태에 따라 다르게 표시)
        chrome.contextMenus.create({
            id: 'togglePause',
            title: timerState.isRunning ? '일시정지' : '재개',
            contexts: ['action']
        });

        chrome.contextMenus.create({
            id: 'stop',
            title: '중지',
            contexts: ['action']
        });

        chrome.contextMenus.create({
            id: 'restart',
            title: '재시작',
            contexts: ['action']
        });

        chrome.contextMenus.create({
            id: 'restartFocus',
            parentId: 'restart',
            title: '집중',
            contexts: ['action']
        });

        chrome.contextMenus.create({
            id: 'restartShortBreak',
            parentId: 'restart',
            title: '휴식',
            contexts: ['action']
        });

        chrome.contextMenus.create({
            id: 'restartLongBreak',
            parentId: 'restart',
            title: '긴휴식',
            contexts: ['action']
        });

        chrome.contextMenus.create({
            id: 'restartCycle',
            parentId: 'restart',
            title: '싸이클',
            contexts: ['action']
        });

        // 구분선 추가
        chrome.contextMenus.create({
            id: 'separator1',
            type: 'separator',
            contexts: ['action']
        });

        // 설정과 통계 메뉴 추가
        chrome.contextMenus.create({
            id: 'openDashboard',
            title: '설정 및 통계',
            contexts: ['action']
        });
    });
}

// 초기 설정
chrome.runtime.onInstalled.addListener(() => {
    // 기본 설정 초기화
    chrome.storage.sync.get(['settings'], (result) => {
        if (!result.settings) {
            chrome.storage.sync.set({ settings: DEFAULT_SETTINGS }, () => {
                console.log('기본 설정이 초기화되었습니다.');
            });
        }
    });

    // 초기 메뉴 생성
    createInitialMenus();
});

// 알람 이벤트 처리
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === timerState.alarmName && timerState.isRunning) {
        if (timerState.timeLeft > 0) {
            timerState.timeLeft--;
            chrome.storage.local.set({ timeLeft: timerState.timeLeft });
            updateBadge(timerState.timeLeft, timerState.isBreak);
        } else {
            timerComplete();
        }
    }
});

// 알림 클릭 이벤트 처리
chrome.notifications.onClicked.addListener(async (notificationId) => {
    if (notificationId === 'pomodoroNotification') {
        // 알림 제거
        chrome.notifications.clear(notificationId);

        // 다음 세션 시작
        await startNextSession();
    }
});

// 설정값 유효성 검사 함수 추가
function validateDuration(duration, defaultValue) {
    const num = parseInt(duration);
    return (!isNaN(num) && num > 0) ? num : defaultValue;
}

// 현재 설정 가져오기 (Promise 버전)
async function getCurrentSettings() {
    try {
        const result = await chrome.storage.sync.get('settings');
        const settings = result.settings || DEFAULT_SETTINGS;
        
        // 설정값 유효성 검사 및 보정
        return {
            focus: {
                ...settings.focus,
                duration: validateDuration(settings.focus.duration, DEFAULT_SETTINGS.focus.duration)
            },
            shortBreak: {
                ...settings.shortBreak,
                duration: validateDuration(settings.shortBreak.duration, DEFAULT_SETTINGS.shortBreak.duration)
            },
            longBreak: {
                ...settings.longBreak,
                duration: validateDuration(settings.longBreak.duration, DEFAULT_SETTINGS.longBreak.duration),
                startAfter: validateDuration(settings.longBreak.startAfter, DEFAULT_SETTINGS.longBreak.startAfter)
            },
            general: settings.general || DEFAULT_SETTINGS.general
        };
    } catch (error) {
        console.error('설정 로드 중 오류:', error);
        return DEFAULT_SETTINGS;
    }
}

// 타이머 시작
async function startTimer(type) {
    const settings = await getCurrentSettings();
    timerState.type = type;
    timerState.isRunning = true;
    timerState.sessionComplete = false;
    
    // 타입에 따른 시간 설정 (유효성 검사 포함)
    switch (type) {
        case 'focus':
            timerState.timeLeft = validateDuration(settings.focus.duration, DEFAULT_SETTINGS.focus.duration) * 60;
            timerState.isBreak = false;
            break;
        case 'shortBreak':
            timerState.timeLeft = validateDuration(settings.shortBreak.duration, DEFAULT_SETTINGS.shortBreak.duration) * 60;
            timerState.isBreak = true;
            break;
        case 'longBreak':
            timerState.timeLeft = validateDuration(settings.longBreak.duration, DEFAULT_SETTINGS.longBreak.duration) * 60;
            timerState.isBreak = true;
            break;
    }
    
    // 상태 저장
    await chrome.storage.local.set({
        timeLeft: timerState.timeLeft,
        isRunning: timerState.isRunning,
        isBreak: timerState.isBreak,
        type: timerState.type,
        sessionComplete: timerState.sessionComplete
    });
    
    // 알람 생성
    chrome.alarms.create(timerState.alarmName, {
        periodInMinutes: 1/60  // 1초마다 실행
    });
    
    updateBadgeForPauseState();
}

// 다음 세션 시작
async function startNextSession() {
    // 알림음 재생
    await playSound();

    const settings = await getCurrentSettings();
    const isBreak = !timerState.isBreak;
    
    // 다음 세션의 시간 설정 (유효성 검사 포함)
    let newTimeLeft;
    if (isBreak) {
        if (timerState.pomodoroCount > 0 && 
            timerState.pomodoroCount % validateDuration(settings.longBreak.startAfter, DEFAULT_SETTINGS.longBreak.startAfter) === 0) {
            newTimeLeft = validateDuration(settings.longBreak.duration, DEFAULT_SETTINGS.longBreak.duration) * 60;
            timerState.type = 'longBreak';
        } else {
            newTimeLeft = validateDuration(settings.shortBreak.duration, DEFAULT_SETTINGS.shortBreak.duration) * 60;
            timerState.type = 'shortBreak';
        }
    } else {
        newTimeLeft = validateDuration(settings.focus.duration, DEFAULT_SETTINGS.focus.duration) * 60;
        timerState.type = 'focus';
    }

    // 상태 업데이트
    timerState.timeLeft = newTimeLeft;
    timerState.isBreak = isBreak;
    timerState.isRunning = true;
    timerState.sessionComplete = false;

    // 상태 저장 및 타이머 시작
    await chrome.storage.local.set({
        timeLeft: newTimeLeft,
        isBreak: isBreak,
        isRunning: true,
        sessionComplete: false,
        type: timerState.type
    });

    // 알람 생성
    chrome.alarms.create(timerState.alarmName, {
        periodInMinutes: 1/60
    });
    
    // 뱃지 업데이트
    updateBadgeForPauseState();
    
    // 메뉴 업데이트
    createRunningMenus();
}

// 아이콘 클릭 이벤트 처리
chrome.action.onClicked.addListener(async () => {
    if (!timerState.timeLeft || timerState.timeLeft === 0) {
        // 타이머가 실행되지 않은 상태: 집중 시간 시작
        await startTimer('focus');
        createRunningMenus();
    } else {
        // 타이머가 이미 존재하는 경우: 일시정지/재개 토글
        toggleTimer();
    }
});

// 타이머 시작/일시정지/재개
function toggleTimer() {
    timerState.isRunning = !timerState.isRunning;
    
    if (timerState.isRunning) {
        // 타이머 재개
        chrome.alarms.create(timerState.alarmName, {
            periodInMinutes: 1/60  // 1초마다 실행
        });
    } else {
        // 타이머 일시정지
        chrome.alarms.clear(timerState.alarmName);
    }
    
    // 상태 저장
    chrome.storage.local.set({ 
        isRunning: timerState.isRunning,
        timeLeft: timerState.timeLeft 
    });

    // 메뉴 업데이트
    createRunningMenus();

    // 뱃지 색상 업데이트 (일시정지 상태 표시)
    updateBadgeForPauseState();
}

// 일시정지 상태에 따른 뱃지 색상 업데이트
function updateBadgeForPauseState() {
    const color = timerState.isRunning ? 
        (timerState.isBreak ? '#2ecc71' : '#3498db') :  // 실행 중: 휴식-초록색, 집중-파란색
        '#95a5a6';  // 일시정지: 회색

    chrome.action.setBadgeBackgroundColor({ color: color });
    updateBadge(timerState.timeLeft, timerState.isBreak);
}

// 기존 updateBadge 함수 수정
function updateBadge(timeLeft, isBreak) {
    // timeLeft가 유효하지 않은 경우 기본 설정값을 사용
    if (!timeLeft || isNaN(timeLeft)) {
        chrome.storage.sync.get('settings', (result) => {
            const settings = result.settings || DEFAULT_SETTINGS;
            if (isBreak) {
                timeLeft = settings.shortBreak.duration * 60;
            } else {
                timeLeft = settings.focus.duration * 60;
            }
            updateBadgeText(timeLeft);
        });
        return;
    }
    updateBadgeText(timeLeft);
}

// 뱃지 텍스트 업데이트 헬퍼 함수
function updateBadgeText(timeLeft) {
    // 유효성 검사
    if (!timeLeft || isNaN(timeLeft) || timeLeft < 0) {
        timeLeft = 0;
    }
    
    const minutes = Math.floor(timeLeft / 60);
    const seconds = Math.floor(timeLeft % 60);  // 소수점 버림
    const text = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    chrome.action.setBadgeText({ text: text });
}

// 메시지 리스너 설정
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'startTimer':
            toggleTimer();
            break;
        case 'pauseTimer':
            toggleTimer();
            break;
        case 'resetTimer':
            chrome.storage.local.get(['settings', 'isBreak'], (result) => {
                const settings = result.settings || DEFAULT_SETTINGS;
                const newTime = result.isBreak ? settings.shortBreak.duration * 60 : settings.focus.duration * 60;
                chrome.storage.local.set({
                    timeLeft: newTime,
                    isRunning: false,
                    sessionComplete: false
                });
                toggleTimer(false);
                updateBadge(newTime, result.isBreak);
            });
            break;
        case 'startNextSession':
            startNextSession();
            break;
        case 'playSound':
            playSound();
            break;
    }
    sendResponse({ success: true });
    return true;
});

// Offscreen Document를 통해 소리를 재생하는 함수
async function playSound() {
    console.log("playSound 함수 호출됨");
    try {
        // 이미 존재하는 Offscreen Document 확인
        const existingContexts = await chrome.runtime.getContexts({
            contextTypes: ['OFFSCREEN_DOCUMENT'],
            documentUrls: [chrome.runtime.getURL('offscreen.html')]
        });
        console.log("existingContexts:", existingContexts);

        if (existingContexts.length > 0) {
            console.log("기존 Offscreen Document에 메시지 전송");
            // 이미 존재하면 메시지만 전송
            chrome.runtime.sendMessage({ command: "playSound" });
            return;
        }

        console.log("새 Offscreen Document 생성 시도");
        // Offscreen Document 생성 및 로드 완료 대기
        await new Promise(async (resolve, reject) => {
            try {
                const messageListener = (message) => {
                    if (message.type === 'OFFSCREEN_LOADED') {
                        console.log("Offscreen Document 로드 완료");
                        chrome.runtime.onMessage.removeListener(messageListener);
                        resolve();
                    }
                };
                chrome.runtime.onMessage.addListener(messageListener);

                // Offscreen Document 생성
                await chrome.offscreen.createDocument({
                    url: 'offscreen.html',
                    reasons: ['AUDIO_PLAYBACK'],
                    justification: '포모도로 타이머 알림음 재생'
                });

                // 10초 타임아웃
                setTimeout(() => {
                    chrome.runtime.onMessage.removeListener(messageListener);
                    reject(new Error('Offscreen Document 로드 타임아웃'));
                }, 10000);
            } catch (error) {
                console.error("Offscreen Document 생성 중 오류:", error);
                reject(error);
            }
        });

        console.log("소리 재생 메시지 전송");
        // 소리 재생 메시지 전송
        chrome.runtime.sendMessage({ command: "playSound" });

    } catch (error) {
        console.error("소리 재생 중 오류 발생:", error);
    }
}

// 컨텍스트 메뉴 클릭 처리
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    switch (info.menuItemId) {
        case 'cycleStart':
            await playSound();  // 알림음 재생 추가
            await startNewCycle();
            createRunningMenus();
            break;
        case 'focusStart':
            await playSound();  // 알림음 재생 추가
            await startTimer('focus');
            createRunningMenus();
            break;
        case 'shortBreakStart':
            await playSound();  // 알림음 재생 추가
            await startTimer('shortBreak');
            createRunningMenus();
            break;
        case 'longBreakStart':
            await playSound();  // 알림음 재생 추가
            await startTimer('longBreak');
            createRunningMenus();
            break;
        case 'togglePause':
            toggleTimer();
            break;
        case 'stop':
            stopTimer();
            createInitialMenus();
            break;
        case 'restartFocus':
            await playSound();  // 알림음 재생 추가
            await startTimer('focus');
            createRunningMenus();
            break;
        case 'restartShortBreak':
            await playSound();  // 알림음 재생 추가
            await startTimer('shortBreak');
            createRunningMenus();
            break;
        case 'restartLongBreak':
            await playSound();  // 알림음 재생 추가
            await startTimer('longBreak');
            createRunningMenus();
            break;
        case 'restartCycle':
            await playSound();  // 알림음 재생 추가
            await startNewCycle();
            createRunningMenus();
            break;
        case 'openDashboard':
            chrome.tabs.create({ url: 'pages/dashboard.html' });
            break;
    }
});

// 설정 가져오기
function getSettings() {
    return new Promise((resolve) => {
        chrome.storage.sync.get('settings', (data) => {
            resolve(data.settings || {
                focus: { duration: 25 },
                shortBreak: { duration: 5 },
                longBreak: { duration: 15, startAfter: 4 }
            });
        });
    });
}

// 새로운 싸이클 시작
async function startNewCycle() {
    timerState.pomodoroCount = 0;
    await startTimer('focus');
}

// 타이머 중지
function stopTimer() {
    timerState.isRunning = false;
    timerState.timeLeft = 0;
    timerState.type = 'focus';
    timerState.pomodoroCount = 0;
    updateBadge();
}

// 타이머 업데이트
function updateTimer() {
    if (!timerState.isRunning) return;

    if (timerState.timeLeft > 0) {
        updateBadge();
        timerState.timeLeft--;
        setTimeout(updateTimer, 1000);
    } else {
        timerComplete();
    }
}

// 타이머 완료
async function timerComplete() {
    // 알람 중지
    chrome.alarms.clear(timerState.alarmName);
    
    // 알림음 재생
    await playSound();
    
    // 포모도로 카운트 업데이트 (focus 세션이 끝났을 때만)
    if (timerState.type === 'focus') {
        timerState.pomodoroCount++;
        savePomodoroData();
    }

    // 설정 가져오기
    const settings = await getCurrentSettings();
    
    // 다음 세션 타입 결정
    const isBreak = !timerState.isBreak;
    let nextType;
    let nextTimeLeft;

    if (isBreak) {
        // 집중 -> 휴식 전환
        if (timerState.pomodoroCount > 0 && 
            timerState.pomodoroCount % validateDuration(settings.longBreak.startAfter, DEFAULT_SETTINGS.longBreak.startAfter) === 0) {
            nextType = 'longBreak';
            nextTimeLeft = validateDuration(settings.longBreak.duration, DEFAULT_SETTINGS.longBreak.duration) * 60;
        } else {
            nextType = 'shortBreak';
            nextTimeLeft = validateDuration(settings.shortBreak.duration, DEFAULT_SETTINGS.shortBreak.duration) * 60;
        }
    } else {
        // 휴식 -> 집중 전환
        nextType = 'focus';
        nextTimeLeft = validateDuration(settings.focus.duration, DEFAULT_SETTINGS.focus.duration) * 60;
    }

    // 상태 업데이트
    timerState.type = nextType;
    timerState.timeLeft = nextTimeLeft;
    timerState.isBreak = isBreak;

    // 자동 시작 설정 확인
    const shouldAutoStart = isBreak ? 
        settings.general.autoStartBreaks : 
        settings.general.autoStartPomodoros;

    if (shouldAutoStart) {
        // 자동 시작이 설정된 경우 바로 다음 세션 시작
        timerState.isRunning = true;
        timerState.sessionComplete = false;

        // 상태 저장
        await chrome.storage.local.set({
            timeLeft: nextTimeLeft,
            isBreak: isBreak,
            isRunning: true,
            sessionComplete: false,
            type: nextType
        });

        // 알람 생성
        chrome.alarms.create(timerState.alarmName, {
            periodInMinutes: 1/60
        });

        // 뱃지 업데이트
        updateBadgeForPauseState();
        
        // 메뉴 업데이트
        createRunningMenus();
    } else {
        // 자동 시작이 설정되지 않은 경우 대기 상태로 전환
        timerState.isRunning = false;
        timerState.sessionComplete = true;

        // 상태 저장
        await chrome.storage.local.set({
            timeLeft: nextTimeLeft,
            isBreak: isBreak,
            isRunning: false,
            sessionComplete: true,
            type: nextType
        });

        // 뱃지 업데이트
        updateBadgeForPauseState();
        
        // 메뉴 초기화
        createInitialMenus();
    }

    // 알림 표시 (자동 시작 여부와 관계없이 항상 표시)
    const title = isBreak ? '휴식 시간입니다!' : '집중 시간입니다!';
    const message = isBreak ?
        '잠시 휴식을 취하고 기분 전환을 해보세요.' :
        '이제 집중할 시간입니다. 목표를 향해 화이팅!';

    chrome.notifications.create('pomodoroNotification', {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: title,
        message: message,
        requireInteraction: true,
        silent: true
    });
}

// 포모도로 데이터 저장
function savePomodoroData() {
    const now = new Date();
    const pomodoroData = {
        date: now.toISOString(),
        type: timerState.type,
        duration: 25 // 기본 포모도로 시간
    };

    chrome.storage.local.get('pomodoroData', (data) => {
        const existingData = data.pomodoroData || [];
        existingData.push(pomodoroData);
        chrome.storage.local.set({ pomodoroData: existingData });
    });
}

// 설정 변경 감지 및 현재 세션 업데이트
chrome.storage.onChanged.addListener(async (changes, namespace) => {
    if (namespace === 'sync' && changes.settings) {
        const newSettings = changes.settings.newValue;
        
        // 현재 실행 중인 세션이 있을 경우 시간 업데이트
        if (timerState.timeLeft > 0) {
            const settings = await getCurrentSettings();
            let newDuration;
            
            switch (timerState.type) {
                case 'focus':
                    newDuration = settings.focus.duration * 60;
                    break;
                case 'shortBreak':
                    newDuration = settings.shortBreak.duration * 60;
                    break;
                case 'longBreak':
                    newDuration = settings.longBreak.duration * 60;
                    break;
            }
            
            // 남은 시간 비율 계산 및 적용
            const remainingRatio = timerState.timeLeft / (timerState.timeLeft + 1);
            timerState.timeLeft = Math.round(newDuration * remainingRatio);
            
            // 상태 저장
            await chrome.storage.local.set({ timeLeft: timerState.timeLeft });
            
            // 뱃지 업데이트
            updateBadgeForPauseState();
        }
    }
}); 