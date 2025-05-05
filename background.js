// 프로젝트 기록 저장 키 (settings.js와 동일하게 사용)
const PROJECT_HISTORY_KEY = 'projectHistory';
const MAX_HISTORY_SIZE = 10; // 기록 최대 개수 (선택 사항)

// 기본 설정값 (background용 - settings.js와 동기화 필요)
const DEFAULT_SETTINGS_BG = {
    projectName: "집중 시간 도우미 설정", // 기본 프로젝트 이름 변경
    version: "1.0", // 버전 정보 추가
    focus: {
        duration: 25,
        sound: "beep", // '타이머 소리' 기본값
        soundVolume: 50,
        soundType: "brown_noise", // '재생' 기본값 (이제 beep/gong 제외)
        desktopNotification: true,
        tabNotification: true
    },
    shortBreak: {
        duration: 5,
        sound: "beep", // '타이머 소리' 기본값
        soundVolume: 50,
        desktopNotification: true,
        tabNotification: true
    },
    longBreak: {
        duration: 15,
        startAfter: 4,
        sound: "beep", // '타이머 소리' 기본값
        soundVolume: 50,
        desktopNotification: true,
        tabNotification: true
    },
    general: {
        soundEnabled: true,
        autoStartBreaks: false,
        autoStartPomodoros: false,
        availableSounds: [
            { name: "기본 비프음", value: "low-short-beep" }, // 이 값은 이제 '재생'에는 없음
            { name: "공(Gong)", value: "gong" },
            { name: "Brown Noise", value: "brown_noise" },
            { name: "Rainy Day", value: "rainy_birds" },
            { name: "Clock Ticking", value: "clock_ticking" }
        ]
    }
};

// 타이머 상태
let timerState = {
    timeLeft: 0,
    isRunning: false,
    isBreak: false,
    type: 'focus',
    pomodoroCount: 0,
    alarmName: 'pomodoroTimer',
    sessionComplete: false,
    sessionStartTime: null, // 세션 시작 시간 추가
    currentProjectName: null // 현재 세션의 프로젝트 이름 추가
};

let isCreatingMenus = false;

// 컨텍스트 메뉴 생성
async function createInitialMenus() {
    if (isCreatingMenus) return;
    isCreatingMenus = true;
    await new Promise(resolve => chrome.contextMenus.removeAll(resolve));
    // 초기 상태 메뉴 생성
    chrome.contextMenus.create({
        id: 'cycleStart',
        title: '싸이클 시작',
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
    isCreatingMenus = false;
}

// 실행 중일 때의 메뉴 생성
async function createRunningMenus() {
    if (isCreatingMenus) return;
    isCreatingMenus = true;
    await new Promise(resolve => chrome.contextMenus.removeAll(resolve));
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
    isCreatingMenus = false;
}

function openDashboardPage() {
    chrome.tabs.create({ url: chrome.runtime.getURL('pages/dashboard.html') });
}

// 초기 설정
chrome.runtime.onInstalled.addListener(async (details) => {
    // 확장 프로그램이 설치, 업데이트, 재로드될 때마다 dashboard.html을 새 탭으로 엽니다.
    if (["install", "update", "chrome_update", "reload"].includes(details.reason)) {
        openDashboardPage();
    }
    // 기본 설정 초기화
    chrome.storage.sync.get(['settings'], (result) => {
        if (!result.settings) {
            chrome.storage.sync.set({ settings: DEFAULT_SETTINGS_BG }, () => {
                console.log('기본 설정이 초기화되었습니다.');
            });
        }
    });
    // 초기 메뉴 생성
    await createInitialMenus();
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

// 확장 프로그램 아이콘 클릭 이벤트 처리
chrome.action.onClicked.addListener((tab) => {
    chrome.storage.sync.get('settings', async (result) => {
        const settings = result.settings || DEFAULT_SETTINGS_BG;
        const projectName = settings.projectName || '';

        if (projectName) {
            // 사용자에게 확인 요청
            // 백그라운드 스크립트에서는 confirm 사용 불가, 다른 방식 필요
            // 예를 들어, 팝업을 띄우거나 content script를 통해 확인
            // 여기서는 임시로 바로 시작하거나 설정 페이지를 여는 방식으로 구현
            console.log(`프로젝트 "${projectName}" 타이머를 시작합니다.`);
            // TODO: 사용자 확인 로직 추가 (예: 팝업 또는 content script 사용)
            // 현재는 바로 시작
            if (!timerState.isRunning) {
                await startTimer('focus'); // 기본적으로 focus 시작
            } else {
                // 이미 실행 중이면 토글
                 toggleTimer();
            }

        } else {
            // 설정 페이지 열기
            chrome.runtime.openOptionsPage();
        }
    });
});

// 프로젝트 기록에 이름 추가 (background용)
async function addProjectToHistoryBackground(projectName) {
    if (!projectName) return;

    try {
        const result = await chrome.storage.local.get([PROJECT_HISTORY_KEY]);
        let history = result[PROJECT_HISTORY_KEY] || [];
        history = history.filter(item => item !== projectName);
        history.unshift(projectName);
        if (history.length > MAX_HISTORY_SIZE) {
            history = history.slice(0, MAX_HISTORY_SIZE);
        }
        await chrome.storage.local.set({ [PROJECT_HISTORY_KEY]: history });
        console.log('[Background] Project history updated:', history);
    } catch (error) {
        console.error("[Background] Error adding project to history:", error);
    }
}

// 설정값 유효성 검사 함수 추가
function validateDuration(duration, defaultValue) {
    const num = parseInt(duration);
    return (!isNaN(num) && num > 0) ? num : defaultValue;
}

// 현재 설정 가져오기 (Promise 버전)
async function getCurrentSettings() {
    try {
        const result = await chrome.storage.sync.get('settings');
        let settings = result.settings;

        // 설정이 없거나 버전이 다르면 기본값(BG용)으로 병합
        if (!settings || settings.version !== DEFAULT_SETTINGS_BG.version) {
            console.log('[BG] 저장된 설정이 없거나 버전이 달라 기본 설정과 병합합니다.');
            // settings.js의 DEFAULT_SETTINGS와 구조 맞추기 (short/long break의 soundType 제외)
             const baseSettings = {
                projectName: DEFAULT_SETTINGS_BG.projectName,
                focus: { ...DEFAULT_SETTINGS_BG.focus },
                shortBreak: { ...DEFAULT_SETTINGS_BG.shortBreak }, // soundType이 없는 기본값
                longBreak: { ...DEFAULT_SETTINGS_BG.longBreak },   // soundType이 없는 기본값
                 general: { ...DEFAULT_SETTINGS_BG.general }
            };
            settings = { ...baseSettings, ...(settings || {}) };
            // 병합 후에도 short/long break에 soundType이 있다면 제거
            delete settings.shortBreak?.soundType;
            delete settings.longBreak?.soundType;
            settings.version = DEFAULT_SETTINGS_BG.version; // 버전 업데이트
            await chrome.storage.sync.set({ settings }); // 병합된 설정 저장
        }

        // 프로젝트 이름 처리 (없으면 BG 기본값 사용)
        const projectName = settings.projectName !== undefined ? settings.projectName : DEFAULT_SETTINGS_BG.projectName;

        // 설정값 유효성 검사 및 보정
        return {
            projectName: projectName,
            focus: {
                ...DEFAULT_SETTINGS_BG.focus,
                ...(settings.focus || {}),
                duration: validateDuration(settings.focus?.duration, DEFAULT_SETTINGS_BG.focus.duration)
                // sound, soundType 은 기본값과 병합하여 사용
            },
            shortBreak: {
                 ...DEFAULT_SETTINGS_BG.shortBreak,
                ...(settings.shortBreak || {}),
                duration: validateDuration(settings.shortBreak?.duration, DEFAULT_SETTINGS_BG.shortBreak.duration)
                // sound 는 기본값과 병합하여 사용, soundType은 없음
            },
            longBreak: {
                 ...DEFAULT_SETTINGS_BG.longBreak,
                ...(settings.longBreak || {}),
                duration: validateDuration(settings.longBreak?.duration, DEFAULT_SETTINGS_BG.longBreak.duration),
                startAfter: validateDuration(settings.longBreak?.startAfter, DEFAULT_SETTINGS_BG.longBreak.startAfter)
                // sound 는 기본값과 병합하여 사용, soundType은 없음
            },
             general: settings.general || DEFAULT_SETTINGS_BG.general
        };
    } catch (error) {
        console.error('[BG] 설정 로드 중 오류:', error);
        // 오류 발생 시 BG 기본 설정 반환 (soundType 없는 버전)
        const errorDefaults = { ...DEFAULT_SETTINGS_BG };
        delete errorDefaults.shortBreak?.soundType;
        delete errorDefaults.longBreak?.soundType;
        return errorDefaults;
    }
}

// 타이머 시작
async function startTimer(type) {
    console.log('=== Background startTimer called ===');
    console.log('Parameters:', { type });
    console.log('State before start:', {
        isRunning: timerState.isRunning,
        isBreak: timerState.isBreak,
        currentSession: timerState.type
    });

    const settings = await getCurrentSettings();
    timerState.type = type;
    timerState.isRunning = true;
    timerState.sessionComplete = false;
    timerState.sessionStartTime = new Date().toISOString(); // 세션 시작 시간 기록
    timerState.currentProjectName = settings.projectName || "N/A"; // 현재 프로젝트 이름 기록

    // 타입에 따른 시간 설정
    let durationMinutes;
    switch (type) {
        case 'focus':
            durationMinutes = validateDuration(settings.focus.duration, DEFAULT_SETTINGS_BG.focus.duration);
            timerState.isBreak = false;
            // Start playing the selected sound for focus
            await playSound(settings.focus.soundType, false);
            break;
        case 'shortBreak':
            durationMinutes = validateDuration(settings.shortBreak.duration, DEFAULT_SETTINGS_BG.shortBreak.duration);
            timerState.isBreak = true;
            break;
        case 'longBreak':
            durationMinutes = validateDuration(settings.longBreak.duration, DEFAULT_SETTINGS_BG.longBreak.duration);
            timerState.isBreak = true;
            break;
        default:
            durationMinutes = DEFAULT_SETTINGS_BG.focus.duration; // Fallback
            timerState.isBreak = false;
    }
    timerState.timeLeft = durationMinutes * 60;

    // 프로젝트 이름 기록에 추가 (focus 시작 시 - 기존 로직 유지 가능, 단 저장 시점 변경됨)
    if (type === 'focus' && settings.projectName) {
        await addProjectToHistoryBackground(settings.projectName);
    }

    await chrome.storage.local.set({
        timeLeft: timerState.timeLeft,
        isRunning: timerState.isRunning,
        isBreak: timerState.isBreak,
        type: timerState.type,
        sessionComplete: timerState.sessionComplete,
        pomodoroCount: timerState.pomodoroCount,
        sessionStartTime: timerState.sessionStartTime,
        currentProjectName: timerState.currentProjectName
    });

    // 알람 생성 & UI 업데이트
    chrome.alarms.create(timerState.alarmName, { periodInMinutes: 1/60 });
    updateBadgeForPauseState();
    await createRunningMenus();

    console.log('State after start:', {
        isRunning: timerState.isRunning,
        isBreak: timerState.isBreak,
        currentSession: timerState.type,
        remainingTime: timerState.timeLeft
    });
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
            timerState.pomodoroCount % validateDuration(settings.longBreak.startAfter, DEFAULT_SETTINGS_BG.longBreak.startAfter) === 0) {
            newTimeLeft = validateDuration(settings.longBreak.duration, DEFAULT_SETTINGS_BG.longBreak.duration) * 60;
            timerState.type = 'longBreak';
        } else {
            newTimeLeft = validateDuration(settings.shortBreak.duration, DEFAULT_SETTINGS_BG.shortBreak.duration) * 60;
            timerState.type = 'shortBreak';
        }
    } else {
        newTimeLeft = validateDuration(settings.focus.duration, DEFAULT_SETTINGS_BG.focus.duration) * 60;
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
    await createRunningMenus();
}

// 아이콘 클릭 이벤트 처리
chrome.action.onClicked.addListener(async () => {
    if (!timerState.timeLeft || timerState.timeLeft === 0) {
        // 타이머가 실행되지 않은 상태: 집중 시간 시작
        await startTimer('focus');
        await createRunningMenus();
    } else {
        // 타이머가 이미 존재하는 경우: 일시정지/재개 토글
        await toggleTimer();
    }
});

// 타이머 시작/일시정지/재개
async function toggleTimer() {
    console.log('=== Background toggleTimer called ===');
    console.log('State before toggle:', {
        isRunning: timerState.isRunning,
        isBreak: timerState.isBreak,
        currentSession: timerState.type
    });

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
    await createRunningMenus();

    // 뱃지 색상 업데이트 (일시정지 상태 표시)
    updateBadgeForPauseState();

    console.log('State after toggle:', {
        isRunning: timerState.isRunning,
        isBreak: timerState.isBreak,
        currentSession: timerState.type
    });
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
            const settings = result.settings || DEFAULT_SETTINGS_BG;
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
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('=== Background message received ===');
    console.log('Message:', message);
    console.log('Current timer state:', {
        isRunning: timerState.isRunning,
        isBreak: timerState.isBreak,
        currentSession: timerState.type
    });

    switch (message.action) {
        case 'startTimer':
            console.log('Starting timer for session:', message.sessionType);
            startTimer(message.sessionType);
            break;
        case 'toggleTimer':
            console.log('Toggling timer (pause/resume)');
            toggleTimer();
            break;
        case 'stopTimer':
            console.log('Stopping timer');
            stopTimer();
            break;
        case 'startNextSession':
            startNextSession();
            break;
        case 'playSound':
            playSound(message.soundType, message.isPreview, message.volume);
            break;
        case 'exportStats':
            exportStats();
            break;
        case 'importParsedStats':
            importParsedStats(message.data);
            break;
        case 'resetStats':
            resetStats();
            break;
        default:
            console.log("Unknown action received:", message.action);
            sendResponse({ success: false, message: 'Unknown action' });
            break;
    }

    console.log('Timer state after action:', {
        isRunning: timerState.isRunning,
        isBreak: timerState.isBreak,
        currentSession: timerState.type
    });
});

// Offscreen Document를 통해 소리를 재생하는 함수
async function playSound(soundType, isPreview = false, volume = undefined) {
    console.log('[LOG] playSound 호출:', { soundType, isPreview, volume });
    // soundType이 'none'이면 아무 소리도 출력하지 않음
    if (soundType === 'none') {
        console.log('[LOG] playSound: soundType이 none이므로 소리 출력하지 않음');
        return;
    }
    let finalSoundType = 'low-short-beep';
    let finalVolume = volume;

    try {
        if (isPreview) {
            finalSoundType = soundType || 'low-short-beep';
            if (typeof finalVolume !== 'number') finalVolume = 50;
        } else {
            const settings = await getCurrentSettings();
            const completedSessionType = timerState.type;
            if (completedSessionType === 'focus') {
                finalSoundType = settings.focus?.soundType || DEFAULT_SETTINGS_BG.focus.soundType;
                finalVolume = settings.focus?.soundVolume ?? DEFAULT_SETTINGS_BG.focus.soundVolume;
            } else if (completedSessionType === 'shortBreak') {
                finalSoundType = settings.shortBreak?.sound || DEFAULT_SETTINGS_BG.shortBreak.sound;
                finalVolume = settings.shortBreak?.soundVolume ?? DEFAULT_SETTINGS_BG.shortBreak.soundVolume;
            } else if (completedSessionType === 'longBreak') {
                finalSoundType = settings.longBreak?.sound || DEFAULT_SETTINGS_BG.longBreak.sound;
                finalVolume = settings.longBreak?.soundVolume ?? DEFAULT_SETTINGS_BG.longBreak.soundVolume;
            } else {
                finalSoundType = 'low-short-beep';
                finalVolume = 50;
            }
            if (finalSoundType === 'low-short-beep') {
                finalSoundType = 'beep';
            }
        }

        console.log("Final sound type to play:", finalSoundType, "Is Preview:", isPreview, "Volume:", finalVolume);

        // 이미 존재하는 Offscreen Document 확인
        const existingContexts = await chrome.runtime.getContexts({
            contextTypes: ['OFFSCREEN_DOCUMENT'],
            documentUrls: [chrome.runtime.getURL('offscreen.html')]
        });
        if (existingContexts.length > 0) {
            // 기존 문서에 메시지 전송만 하고, 새로 만들지 않음
            chrome.runtime.sendMessage({
                command: "playSound",
                soundType: finalSoundType,
                isPreview: isPreview,
                volume: finalVolume
            });
            return;
        }

        // Offscreen Document가 없을 때만 새로 생성
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

                await chrome.offscreen.createDocument({
                    url: 'offscreen.html',
                    reasons: ['AUDIO_PLAYBACK'],
                    justification: '포모도로 타이머 알림음 재생'
                });

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
        chrome.runtime.sendMessage({
            command: "playSound",
            soundType: finalSoundType,
            isPreview: isPreview,
            volume: finalVolume
        });

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
            await createRunningMenus();
            break;
        case 'focusStart':
            await playSound();  // 알림음 재생 추가
            await startTimer('focus');
            await createRunningMenus();
            break;
        case 'shortBreakStart':
            await playSound();  // 알림음 재생 추가
            await startTimer('shortBreak');
            await createRunningMenus();
            break;
        case 'longBreakStart':
            await playSound();  // 알림음 재생 추가
            await startTimer('longBreak');
            await createRunningMenus();
            break;
        case 'togglePause':
            await toggleTimer();
            break;
        case 'stop':
            await stopTimer();
            break;
        case 'restartFocus':
            await playSound();  // 알림음 재생 추가
            await startTimer('focus');
            await createRunningMenus();
            break;
        case 'restartShortBreak':
            await playSound();  // 알림음 재생 추가
            await startTimer('shortBreak');
            await createRunningMenus();
            break;
        case 'restartLongBreak':
            await playSound();  // 알림음 재생 추가
            await startTimer('longBreak');
            await createRunningMenus();
            break;
        case 'restartCycle':
            await playSound();  // 알림음 재생 추가
            await startNewCycle();
            await createRunningMenus();
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
    await createRunningMenus();
}

// 타이머 중지
async function stopTimer() {
    console.log('=== Background stopTimer called ===');
    console.log('State before stop:', {
        isRunning: timerState.isRunning,
        isBreak: timerState.isBreak,
        currentSession: timerState.type
    });

    // 1. 알람 완전 제거
    chrome.alarms.clear(timerState.alarmName);

    // 2. timerState 모든 값 초기화 (최초 실행 상태와 동일하게)
    timerState.isRunning = false;
    timerState.timeLeft = 0;
    timerState.type = 'focus';
    timerState.pomodoroCount = 0;
    timerState.isBreak = false;
    timerState.sessionComplete = false;
    timerState.sessionStartTime = null;
    timerState.currentProjectName = null;

    // 3. localStorage 값도 완전히 초기화 (최초 실행 상태와 동일하게)
    await chrome.storage.local.set({
        timeLeft: 0,
        isRunning: false,
        isBreak: false,
        type: 'focus',
        sessionComplete: false,
        pomodoroCount: 0,
        sessionStartTime: null,
        currentProjectName: null
    });

    // 4. context menu를 최초 실행 상태로 되돌림
    await createInitialMenus();

    // 5. 뱃지/아이콘/UI 완전 초기화
    chrome.action.setBadgeText({ text: '' });
    chrome.action.setBadgeBackgroundColor({ color: '#3498db' });

    // 6. (선택) 기타 필요한 UI/상태 리셋 로직 추가 가능
    console.log('[LOG] stopTimer: 확장 앱 최초 실행 상태로 리셋 완료');

    console.log('State after stop:', {
        isRunning: timerState.isRunning,
        isBreak: timerState.isBreak,
        currentSession: timerState.type
    });
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
    console.log('[LOG] timerComplete 호출 (세션 종료)', timerState);
    // 알람 중지
    chrome.alarms.clear(timerState.alarmName);

    // 알림음 재생 (인자 없이 호출 -> playSound가 완료된 세션 타입 기반으로 소리 결정)
    await playSound();

     // --- 완료된 세션 정보 저장 ---
     const settings = await getCurrentSettings();
     let completedDuration;
     switch (timerState.type) { // 완료된 세션의 타입 사용
         case 'focus':
             completedDuration = settings.focus.duration;
             timerState.pomodoroCount++;
             await chrome.storage.local.set({ pomodoroCount: timerState.pomodoroCount });
             break;
         case 'shortBreak':
             completedDuration = settings.shortBreak.duration;
             break;
         case 'longBreak':
             completedDuration = settings.longBreak.duration;
             break;
         default:
             completedDuration = 0;
     }

     const completedSessionData = {
         startTime: timerState.sessionStartTime,
         type: timerState.type,
         durationMinutes: completedDuration,
         projectName: timerState.currentProjectName
     };
     await saveSessionData(completedSessionData); // 세션 데이터 저장 함수 호출
     // --- 저장 로직 끝 ---

    // 다음 세션 타입 결정
    const isBreak = !timerState.isBreak;
    let nextType;
    let nextDurationMinutes;

    if (isBreak) {
        // 집중 -> 휴식 전환
        if (timerState.pomodoroCount > 0 &&
            timerState.pomodoroCount % validateDuration(settings.longBreak.startAfter, DEFAULT_SETTINGS_BG.longBreak.startAfter) === 0) {
            nextType = 'longBreak';
            nextDurationMinutes = validateDuration(settings.longBreak.duration, DEFAULT_SETTINGS_BG.longBreak.duration);
        } else {
            nextType = 'shortBreak';
            nextDurationMinutes = validateDuration(settings.shortBreak.duration, DEFAULT_SETTINGS_BG.shortBreak.duration);
        }
    } else {
        // 휴식 -> 집중 전환
        nextType = 'focus';
        nextDurationMinutes = validateDuration(settings.focus.duration, DEFAULT_SETTINGS_BG.focus.duration);
    }

    // 다음 세션 상태 준비
    timerState.type = nextType;
    timerState.timeLeft = nextDurationMinutes * 60;
    timerState.isBreak = isBreak;
    timerState.sessionStartTime = new Date().toISOString(); // 다음 세션 시작 시간 설정
    // 다음 세션의 프로젝트 이름은 현재 설정 따름 (집중 시작 시 업데이트됨)
    timerState.currentProjectName = settings.projectName || "N/A";

    // 자동 시작 설정 확인
    const shouldAutoStart = isBreak ?
        settings.general.autoStartBreaks :
        settings.general.autoStartPomodoros;

    let newState = {}; // 저장할 상태 모음

    if (shouldAutoStart) {
        timerState.isRunning = true;
        timerState.sessionComplete = false;
        // 알람 생성
        chrome.alarms.create(timerState.alarmName, { periodInMinutes: 1/60 });
        // 메뉴 업데이트
        await createRunningMenus();
    } else {
        timerState.isRunning = false;
        timerState.sessionComplete = true;
         // 메뉴 초기화
        await createInitialMenus();
    }

     // 공통 상태 업데이트 및 저장
     newState = {
        timeLeft: timerState.timeLeft,
        isBreak: timerState.isBreak,
        isRunning: timerState.isRunning,
        sessionComplete: timerState.sessionComplete,
        type: timerState.type,
        sessionStartTime: timerState.sessionStartTime,
        currentProjectName: timerState.currentProjectName
        // pomodoroCount는 focus 완료 시 이미 저장됨
     };
     await chrome.storage.local.set(newState);

     // 뱃지 업데이트
     updateBadgeForPauseState();

    // 알림 표시
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
         silent: true // 소리는 playSound로 제어하므로 알림 자체는 조용히
     });
}

// 세션 데이터 저장 (신규 함수)
async function saveSessionData(completedSession) {
    // completedSession: { startTime, type, durationMinutes, projectName }
   if (!completedSession || !completedSession.startTime || !completedSession.type) {
       console.error("Invalid session data for saving:", completedSession);
       return;
   }
   const pomodoroEntry = {
       startTime: completedSession.startTime,
       endTime: new Date().toISOString(), // 완료 시각 기록
       type: completedSession.type,
       durationMinutes: completedSession.durationMinutes,
       projectName: completedSession.projectName || "N/A"
   };

   try {
       const result = await chrome.storage.local.get('pomodoroHistory');
       const history = result.pomodoroHistory || [];
       history.push(pomodoroEntry);
       await chrome.storage.local.set({ pomodoroHistory: history });
       console.log("Session history saved:", pomodoroEntry);
   } catch (error) {
       console.error("Error saving session history:", error);
   }
}

// 설정 변경 감지 및 현재 세션 업데이트
chrome.storage.onChanged.addListener(async (changes, namespace) => {
    if (namespace === 'sync' && changes.settings) {
        const newSettings = changes.settings.newValue;
        
        // 현재 실행 중인 세션이 있을 경우 시간 업데이트
        if (timerState.timeLeft > 0) {
            const settings = await getCurrentSettings();
            let newDuration;
            let newVolume;
            
            switch (timerState.type) {
                case 'focus':
                    newDuration = settings.focus.duration * 60;
                    newVolume = settings.focus.soundVolume;
                    break;
                case 'shortBreak':
                    newDuration = settings.shortBreak.duration * 60;
                    newVolume = settings.shortBreak.soundVolume;
                    break;
                case 'longBreak':
                    newDuration = settings.longBreak.duration * 60;
                    newVolume = settings.longBreak.soundVolume;
                    break;
            }
            
            // 남은 시간 비율 계산 및 적용
            const remainingRatio = timerState.timeLeft / (timerState.timeLeft + 1);
            timerState.timeLeft = Math.round(newDuration * remainingRatio);
            
            // 상태 저장
            await chrome.storage.local.set({ timeLeft: timerState.timeLeft });
            
            // 뱃지 업데이트
            updateBadgeForPauseState();

            // --- 볼륨 즉시 반영 ---
            /*
            if (typeof newVolume === 'number') {
                console.log(`[BG] 볼륨 변경 감지: 세션=${timerState.type}, 새 볼륨=${newVolume}`);
                chrome.runtime.sendMessage({
                    command: 'playSound',
                    soundType: timerState.type === 'focus' ? settings.focus.soundType : settings[timerState.type]?.sound,
                    isPreview: false,
                    volume: newVolume
                });
                console.log(`[BG] playSound 메시지 전송: soundType=${timerState.type === 'focus' ? settings.focus.soundType : settings[timerState.type]?.sound}, volume=${newVolume}`);
            }
            */
            // --- 볼륨 즉시 반영 끝 ---
        }
    }
});

// --- 통계 관련 함수들 --- 

// CSV 특수 문자 처리 함수
function escapeCsvField(field) {
    if (field === null || field === undefined) {
        return '';
    }
    const str = String(field);
    // 필드에 쉼표, 큰따옴표, 또는 줄바꿈 문자가 포함된 경우 큰따옴표로 묶고 내부 큰따옴표는 두 번 씁니다.
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

// 날짜를 'YYYY-MM-DD HH:mm' 포맷으로 변환하는 함수
function formatDateToYMDHM(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
}

// 통계 데이터 내보내기 (CSV 형식, 날짜 포맷 엄격 적용)
async function exportStats() {
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
            // 날짜 포맷 변환
            const startTime = formatDateToYMDHM(entry.startTime);
            const sessionType = entry.type === 'focus' ? '집중' : (entry.type === 'shortBreak' ? '휴식' : '긴휴식');
            const duration = entry.durationMinutes;
            const projectName = entry.projectName;

            return [
                escapeCsvField(startTime),
                escapeCsvField(sessionType),
                escapeCsvField(duration),
                escapeCsvField(projectName)
            ].join(',');
        });

        // CSV 내용 결합 (헤더 + 데이터)
        const csvContent = [header.join(','), ...rows].join('\r\n');

        // 데이터 URI 생성
        const dataUri = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);

        return { success: true, dataUri: dataUri, filename: 'pomodoro_stats.csv' };

    } catch (error) {
        console.error("Error exporting stats:", error);
        return { success: false, message: '통계 내보내기 중 오류 발생' };
    }
}

// 파싱된 통계 데이터 가져오기 (신규 함수)
async function importParsedStats(historyArray) {
    console.log("[Background] Received data for importParsedStats:", JSON.stringify(historyArray?.slice(0, 5))); // 수신 데이터 로그 추가
    try {
        // 간단한 유효성 검사
        if (!Array.isArray(historyArray)) {
            throw new Error('Imported data is not an array.');
        }
        // 첫 번째 항목의 구조 검사 (선택적)
        if (historyArray.length > 0 && (
            !historyArray[0].startTime ||
            !historyArray[0].type ||
            historyArray[0].durationMinutes === undefined ||
            historyArray[0].projectName === undefined)
        ) {
             console.warn("Imported data structure mismatch:", historyArray[0]);
            // throw new Error('Imported data structure mismatch.'); // 필요시 더 엄격하게
        }

        // 기존 기록을 덮어쓰기
        await chrome.storage.local.set({ pomodoroHistory: historyArray });
        console.log("Parsed pomodoro history imported successfully. Count:", historyArray.length);

        // 통계 업데이트 알림
        chrome.runtime.sendMessage({ action: "statsUpdated" });
        return { success: true, message: `통계 ${historyArray.length}건 가져오기 완료` };

    } catch (error) {
        console.error("Error importing parsed stats:", error);
        return { success: false, message: `통계 가져오기 실패: ${error.message}` };
    }
}

// 통계 데이터 초기화
async function resetStats() {
    try {
        // 사용자 확인은 dashboard에서 처리 가정
        await chrome.storage.local.remove('pomodoroHistory');
        console.log("Pomodoro history reset.");
        // 통계 업데이트 알림
        chrome.runtime.sendMessage({ action: "statsUpdated" });
        return { success: true, message: '통계 초기화 완료' };
    } catch (error) {
        console.error("Error resetting stats:", error);
        return { success: false, message: '통계 초기화 중 오류 발생' };
    }
}

// Remove all console.log statements and add a single log at the start of the extension
console.log('\n---집중시간 앱 시작---------------');

// Add a new function to log sound-related information
function logSoundInfo(soundType, isPreview) {
    // 로그 제거
} 