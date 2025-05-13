import { TimerManager } from './scripts/timer.js';
import { NotificationManager } from './scripts/notification.js';
import { StateManager } from './scripts/state.js';
import { DEFAULT_SETTINGS_BG } from './scripts/settings.js';

// 프로젝트 기록 저장 키
const PROJECT_HISTORY_KEY = 'projectHistory';
const MAX_HISTORY_SIZE = 10;

// 전역 변수
let timerManager;
let notificationManager;
let stateManager;
let settings = DEFAULT_SETTINGS_BG;

// 타이머 상태
let timerState = {
    timeLeft: 0,
    isRunning: false,
    type: 'focus',
    pomodoroCount: 0,
    alarmName: 'pomodoroTimer',
    sessionComplete: false,
    sessionStartTime: null, // 세션 시작 시간 추가
    currentProjectName: null // 현재 세션의 프로젝트 이름 추가
};

let isCreatingMenus = false;
let lastPlayedSoundType = null;
let lastPlayedVolume = null;

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
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
}

// 초기화
async function initialize() {
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
function setupEventListeners() {
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
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
            await timerManager.updateSettings(changes.settings.newValue);
        }
    });
}

// 메시지 처리
async function handleMessage(message, sender, sendResponse) {
    const state = stateManager.getState();

    switch (message.type) {
        case 'START_TIMER':
            await timerManager.startTimer(message.timerType);
            sendResponse({ success: true });
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
            sendResponse({ state: state.timer });
            break;

        case 'GET_SETTINGS':
            sendResponse({ settings: state.settings });
            break;

        case 'UPDATE_SETTINGS':
            await stateManager.updateSettings(message.settings);
            await timerManager.updateSettings(message.settings);
            sendResponse({ success: true });
            break;

        case 'EXPORT_STATS':
            const stats = await timerManager.exportStats();
            sendResponse({ stats });
            break;

        case 'IMPORT_STATS':
            const result = await timerManager.importStats(message.stats);
            sendResponse({ success: result });
            break;

        case 'RESET_STATS':
            await timerManager.resetStats();
            sendResponse({ success: true });
            break;

        default:
            sendResponse({ error: 'Unknown message type' });
    }
}

// 초기화 실행
initialize();

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
        // 병합 후 focus 로그
        const mergedFocus = { ...DEFAULT_SETTINGS_BG.focus, ...(settings.focus || {}) };
        // 프로젝트 이름 처리 (없으면 BG 기본값 사용)
        const projectName = settings.projectName !== undefined ? settings.projectName : DEFAULT_SETTINGS_BG.projectName;
        // 설정값 유효성 검사 및 보정
        const resultSettings = {
            projectName: projectName,
            lang: settings.lang || 'ko',
            focus: {
                ...DEFAULT_SETTINGS_BG.focus,
                ...(settings.focus || {}),
                duration: validateDuration(settings.focus?.duration, DEFAULT_SETTINGS_BG.focus.duration),
                soundVolume: settings.focus?.soundTypeVolume ?? settings.focus?.soundVolume ?? DEFAULT_SETTINGS_BG.focus.soundVolume
                // sound, soundType 은 기본값과 병합하여 사용
            },
            shortBreak: {
                 ...DEFAULT_SETTINGS_BG.shortBreak,
                ...(settings.shortBreak || {}),
                duration: validateDuration(settings.shortBreak?.duration, DEFAULT_SETTINGS_BG.shortBreak.duration),
                soundVolume: settings.shortBreak?.soundTypeVolume ?? settings.shortBreak?.soundVolume ?? DEFAULT_SETTINGS_BG.shortBreak.soundVolume
                // sound 는 기본값과 병합하여 사용, soundType은 없음
            },
            longBreak: {
                 ...DEFAULT_SETTINGS_BG.longBreak,
                ...(settings.longBreak || {}),
                duration: validateDuration(settings.longBreak?.duration, DEFAULT_SETTINGS_BG.longBreak.duration),
                startAfter: validateDuration(settings.longBreak?.startAfter, DEFAULT_SETTINGS_BG.longBreak.startAfter),
                soundVolume: settings.longBreak?.soundTypeVolume ?? settings.longBreak?.soundVolume ?? DEFAULT_SETTINGS_BG.longBreak.soundVolume
                // sound 는 기본값과 병합하여 사용, soundType은 없음
            },
             general: settings.general || DEFAULT_SETTINGS_BG.general
        };
        return resultSettings;
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
    const settings = await getCurrentSettings();
    timerState.type = type;
    timerState.isRunning = true;
    timerState.sessionComplete = false;
    timerState.sessionStartTime = new Date().toISOString();
    timerState.currentProjectName = settings.projectName || "N/A";
    // 타입에 따른 시간 설정
    let durationMinutes;
    switch (type) {
        case 'focus':
            durationMinutes = validateDuration(settings.focus.duration, DEFAULT_SETTINGS_BG.focus.duration);
            // 집중 세션에서만, 사운드가 설정된 경우에만 재생
            if (settings.focus.soundType && settings.focus.soundType !== 'none') {
                await playSound(settings.focus.soundType, false, settings.focus.soundVolume);
            } else {
                await playSound('none', false, 0);
            }
            break;
        case 'shortBreak':
            durationMinutes = validateDuration(settings.shortBreak.duration, DEFAULT_SETTINGS_BG.shortBreak.duration);
            await playSound('none', false, 0);
            break;
        case 'longBreak':
            durationMinutes = validateDuration(settings.longBreak.duration, DEFAULT_SETTINGS_BG.longBreak.duration);
            await playSound('none', false, 0);
            break;
        default:
            durationMinutes = DEFAULT_SETTINGS_BG.focus.duration;
            await playSound('none', false, 0);
    }
    timerState.timeLeft = durationMinutes * 60;
    // 프로젝트 이름 기록에 추가 (focus 시작 시 - 기존 로직 유지 가능, 단 저장 시점 변경됨)
    if (type === 'focus' && settings.projectName) {
        await addProjectToHistoryBackground(settings.projectName);
    }
    await chrome.storage.local.set({
        timeLeft: timerState.timeLeft,
        isRunning: timerState.isRunning,
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
}

// 다음 세션 시작 (nextSessionType을 인자로 받음)
async function startNextSession(nextSessionType) {
    const settings = await getCurrentSettings();
    timerState.type = nextSessionType;
    timerState.isRunning = true;
    timerState.sessionComplete = false;
    timerState.sessionStartTime = new Date().toISOString();
    timerState.currentProjectName = settings.projectName || "N/A";

    // 소리 재생/중지: 세션 타입에 따라
    if (nextSessionType === 'focus') {
        await playSound(settings.focus.soundType, false, settings.focus.soundVolume);
    } else {
        await playSound('none', false, 0);
    }

    // 상태 저장 및 타이머 시작
    await chrome.storage.local.set({
        timeLeft: timerState.timeLeft,
        isRunning: timerState.isRunning,
        sessionComplete: false,
        type: timerState.type,
        sessionStartTime: timerState.sessionStartTime,
        currentProjectName: timerState.currentProjectName
    });
    // 알람 생성
    chrome.alarms.create(timerState.alarmName, {
        periodInMinutes: 1/60
    });
    // 뱃지/메뉴 업데이트
    updateBadgeForPauseState();
    await createRunningMenus();
}

// 타이머 시작/일시정지/재개
async function toggleTimer() {
    timerState.isRunning = !timerState.isRunning;
    timerState.sessionComplete = false;
    
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
}

// 뱃지/툴팁(타이틀) 업데이트 함수
function updateBadgeForPauseState() {
    const color = timerState.isRunning ? 
        (timerState.type !== 'focus' ? '#2ecc71' : '#3498db') :  // 실행 중: 휴식-초록색, 집중-파란색
        '#95a5a6';  // 일시정지: 회색

    chrome.action.setBadgeBackgroundColor({ color: color });
    updateBadge(timerState.timeLeft, timerState.type !== 'focus');
    updateActionTitle(); // 툴팁도 함께 업데이트
}

// 기존 updateBadge 함수 수정
function updateBadge(timeLeft, isBreak) {
    // timeLeft가 유효하지 않은 경우 기본 설정값을 사용
    if (!timeLeft || isNaN(timeLeft)) {
        chrome.storage.sync.get('settings', (result) => {
            const settings = result.settings || DEFAULT_SETTINGS_BG;
            if (timerState.type !== 'focus') {
                timeLeft = settings.shortBreak.duration * 60;
            } else {
                timeLeft = settings.focus.duration * 60;
            }
            updateBadgeText(timeLeft);
            updateActionTitle(); // 툴팁도 함께 업데이트
        });
        return;
    }
    updateBadgeText(timeLeft);
    updateActionTitle(); // 툴팁도 함께 업데이트
}

// 아이콘 툴팁(타이틀) 업데이트 함수
function updateActionTitle() {
    let sessionLabel;
    if (timerState.type === 'focus') {
        sessionLabel = '집중세션';
    } else if (timerState.type === 'shortBreak') {
        sessionLabel = '휴식세션';
    } else if (timerState.type === 'longBreak') {
        sessionLabel = '긴휴식세션';
    } else {
        sessionLabel = '알 수 없음';
    }
    if (timerState.timeLeft <= 0 || isNaN(timerState.timeLeft)) {
        chrome.action.setTitle({ title: '타이머가 정지됨' });
        return;
    }
    let timeStr = '';
    if (timerState.timeLeft < 60) {
        timeStr = '<1분';
    } else {
        let roundedMinutes = Math.round(timerState.timeLeft / 60);
        timeStr = `${roundedMinutes}분`;
    }
    chrome.action.setTitle({ title: `${sessionLabel} ${timeStr} 남음` });
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
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    switch (message.action) {
        case 'startTimer':
            await startTimer(message.sessionType);
            break;
        case 'toggleTimer':
            await toggleTimer();
            break;
        case 'stopTimer':
            await stopTimer();
            break;
        case 'startNextSession':
            // 인자 없이 호출될 때도 다음 세션 타입을 명확히 계산해서 넘김
            let nextType;
            if (timerState.type === 'focus') {
                // 집중 끝 → 휴식
                const settings = await getCurrentSettings();
                if (timerState.pomodoroCount > 0 && timerState.pomodoroCount % validateDuration(settings.longBreak.startAfter, DEFAULT_SETTINGS_BG.longBreak.startAfter) === 0) {
                    nextType = 'longBreak';
                } else {
                    nextType = 'shortBreak';
                }
            } else {
                // 휴식 끝 → 집중
                nextType = 'focus';
            }
            await startNextSession(nextType);
            break;
        case 'playSound':
            await playSound(message.soundType, message.isPreview, message.volume);
            break;
        case 'exportStats':
            await exportStats();
            break;
        case 'importParsedStats':
            await importParsedStats(message.data);
            break;
        case 'resetStats':
            await resetStats();
            break;
        case 'getTimerState':
            sendResponse({
                isRunning: timerState.isRunning,
                type: timerState.type,
                timeLeft: timerState.timeLeft,
                sessionComplete: timerState.sessionComplete,
                currentSession: timerState.type
            });
            return true;
        case 'OFFSCREEN_LOADED':
            break;
        default:
            sendResponse({ success: false, message: 'Unknown action' });
            break;
    }
});

// Offscreen Document를 통해 소리를 재생하는 함수
async function playSound(soundType, isPreview = false, volume = undefined) {
    // 오프스크린 문서 존재 여부
    const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [chrome.runtime.getURL('offscreen.html')]
    });
    if (existingContexts.length > 0) {
        chrome.runtime.sendMessage({
            command: "playSound",
            soundType: soundType,
            isPreview: isPreview,
            volume: volume
        });
        return;
    }
    // 오프스크린 문서가 없을 때만 새로 생성
    await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['AUDIO_PLAYBACK'],
        justification: '포모로그 타이머 알림음 재생'
    });
    // 오프스크린 문서 생성 후 메시지 전송
    chrome.runtime.sendMessage({
        command: "playSound",
        soundType: soundType,
        isPreview: isPreview,
        volume: volume
    });
}

// 컨텍스트 메뉴 클릭 처리
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    const settings = await getCurrentSettings();
    switch (info.menuItemId) {
        case 'cycleStart':
            await startNewCycle();
            await createRunningMenus();
            break;
        case 'focusStart':
            await startTimer('focus');
            await createRunningMenus();
            break;
        case 'shortBreakStart':
            await startTimer('shortBreak');
            await createRunningMenus();
            break;
        case 'longBreakStart':
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
            await startTimer('focus');
            await createRunningMenus();
            break;
        case 'restartShortBreak':
            await startTimer('shortBreak');
            await createRunningMenus();
            break;
        case 'restartLongBreak':
            await startTimer('longBreak');
            await createRunningMenus();
            break;
        case 'restartCycle':
            await startNewCycle();
            await createRunningMenus();
            break;
        case 'openDashboard':
            chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
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
    // 알람 중지
    chrome.alarms.clear(timerState.alarmName);
    
    // 모든 소리 중지
    await playSound('none', false, 0);
    
    // 오프스크린 문서에 직접 중지 명령 전송 (백업)
    chrome.runtime.sendMessage({
        command: 'playSound',
        soundType: 'none',
        isPreview: false,
        volume: 0
    });
    
    // 상태 초기화
    timerState.isRunning = false;
    timerState.timeLeft = 0;
    timerState.type = 'focus';
    timerState.pomodoroCount = 0;
    timerState.sessionComplete = false;
    
    // 상태 저장
    await chrome.storage.local.set({
        timeLeft: timerState.timeLeft,
        isRunning: timerState.isRunning,
        type: timerState.type,
        sessionComplete: timerState.sessionComplete,
        pomodoroCount: timerState.pomodoroCount
    });
    
    // 메뉴 초기화
    await createInitialMenus();
    
    // 뱃지 초기화
    chrome.action.setBadgeText({ text: '' });
    chrome.action.setBadgeBackgroundColor({ color: '#3498db' });
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
    
    // 타이머 완료 시 모든 소리 중지
    await playSound('none', false, 0);

    // 알림음 재생
    const settings = await getCurrentSettings();
    let soundType, soundVolume;
    switch (timerState.type) {
        case 'focus':
            soundType = settings.focus.sound;
            soundVolume = settings.focus.soundVolume;
            break;
        case 'shortBreak':
            soundType = settings.shortBreak.sound || DEFAULT_SETTINGS_BG.shortBreak.sound;
            soundVolume = settings.shortBreak.soundVolume ?? DEFAULT_SETTINGS_BG.shortBreak.soundVolume;
            break;
        case 'longBreak':
            soundType = settings.longBreak.sound || DEFAULT_SETTINGS_BG.longBreak.sound;
            soundVolume = settings.longBreak.soundVolume ?? DEFAULT_SETTINGS_BG.longBreak.soundVolume;
            break;
        default:
            soundType = DEFAULT_SETTINGS_BG.focus.sound;
            soundVolume = DEFAULT_SETTINGS_BG.focus.soundVolume;
    }
    await playSound(soundType, false, soundVolume);

    // --- 완료된 세션 정보 저장 ---
    let durationMinutes = 0;
    let endTime = new Date();
    if (timerState.sessionStartTime) {
        try {
            const start = new Date(timerState.sessionStartTime);
            durationMinutes = Math.round((endTime - start) / 1000 / 60 * 100) / 100;
        } catch (e) {
            durationMinutes = 0;
        }
    }
    const completedSessionData = {
        startTime: timerState.sessionStartTime,
        endTime: endTime.toISOString(),
        type: timerState.type,
        durationMinutes: durationMinutes,
        projectName: timerState.currentProjectName
    };
    await saveSessionData(completedSessionData);
    // === 집중 카운트 증가 추가 ===
    if (timerState.type === 'focus') {
        timerState.pomodoroCount++;
    }
    // 다음 세션 타입 결정
    let nextType, nextDurationMinutes;
    if (timerState.type === 'focus') {
        if (timerState.pomodoroCount > 0 &&
            timerState.pomodoroCount % validateDuration(settings.longBreak.startAfter, DEFAULT_SETTINGS_BG.longBreak.startAfter) === 0) {
            nextType = 'longBreak';
            nextDurationMinutes = validateDuration(settings.longBreak.duration, DEFAULT_SETTINGS_BG.longBreak.duration);
        } else {
            nextType = 'shortBreak';
            nextDurationMinutes = validateDuration(settings.shortBreak.duration, DEFAULT_SETTINGS_BG.shortBreak.duration);
        }
    } else {
        nextType = 'focus';
        nextDurationMinutes = validateDuration(settings.focus.duration, DEFAULT_SETTINGS_BG.focus.duration);
    }
    // --- 이전 세션 타입을 저장 ---
    await chrome.storage.local.set({ pomodoroPreviousType: timerState.type });
    // 다음 세션 상태를 미리 timerState에 반영
    timerState.type = nextType;
    timerState.timeLeft = nextDurationMinutes * 60;
    timerState.sessionStartTime = new Date().toISOString();
    timerState.currentProjectName = settings.projectName || "N/A";
    // 자동 시작 설정 확인
    const shouldAutoStart = nextType !== 'focus'
        ? settings.general.autoStartBreaks
        : settings.general.autoStartPomodoros;
    if (shouldAutoStart) {
        await startNextSession(nextType);
    } else {
        timerState.isRunning = false;
        timerState.sessionComplete = true;
        await chrome.storage.local.set({
            timeLeft: timerState.timeLeft,
            isRunning: false,
            sessionComplete: true,
            type: timerState.type,
            sessionStartTime: timerState.sessionStartTime,
            currentProjectName: timerState.currentProjectName
        });
        await createInitialMenus();
        updateBadgeForPauseState();
    }
    // 알림 표시
    let title = nextType !== 'focus' ? '휴식 시간입니다!' : '집중 시간입니다!';
    let message = nextType !== 'focus'
        ? '잠시 휴식을 취하고 기분 전환을 해보세요.'
        : '이제 집중할 시간입니다. 목표를 향해 화이팅!';
    
    chrome.notifications.create('pomodoroNotification', {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: title,
        message: message,
        requireInteraction: true,
        silent: true
    });
}

// 세션 데이터 저장 (신규 함수)
async function saveSessionData(completedSession) {
   if (!completedSession || !completedSession.startTime || !completedSession.type) {
       console.error("Invalid session data for saving:", completedSession);
       return;
   }
   const pomodoroEntry = {
       startTime: completedSession.startTime,
       endTime: completedSession.endTime,
       type: completedSession.type,
       durationMinutes: completedSession.durationMinutes,
       projectName: completedSession.projectName || "N/A"
   };

   try {
       const result = await chrome.storage.local.get('pomodoroHistory');
       const history = result.pomodoroHistory || [];
       history.push(pomodoroEntry);
       await chrome.storage.local.set({ pomodoroHistory: history });
   } catch (error) {
       console.error("Error saving session history:", error);
   }
}

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
        
            // throw new Error('Imported data structure mismatch.'); // 필요시 더 엄격하게
        }

        // 기존 기록을 덮어쓰기
        await chrome.storage.local.set({ pomodoroHistory: historyArray });
        

        // 통계 업데이트 알림
        chrome.runtime.sendMessage({ action: "statsUpdated" });
        return { success: true, message: `통계 ${historyArray.length}건 가져오기 완료` };

    } catch (error) {
        
        return { success: false, message: `통계 가져오기 실패: ${error.message}` };
    }
}

// 통계 데이터 초기화
async function resetStats() {
    try {
        // 사용자 확인은 dashboard에서 처리 가정
        await chrome.storage.local.remove('pomodoroHistory');
        
        // 통계 업데이트 알림
        chrome.runtime.sendMessage({ action: "statsUpdated" });
        return { success: true, message: '통계 초기화 완료' };
    } catch (error) {
        
        return { success: false, message: '통계 초기화 중 오류 발생' };
    }
}

// 초기화/리셋 시 DEFAULT_SETTINGS_BG 로그
