// 기본 설정값
const DEFAULT_SETTINGS = {
    version: "1.0",
    focusTime: 25,
    breakTime: 5,
    longBreakTime: 15,
    setsBeforeLongBreak: 4,
    soundEnabled: true
};

let timer = {
    timeLeft: 0,
    isRunning: false,
    isBreak: false,
    alarmName: 'pomodoroTimer',
    sessionComplete: false
};

// 타이머 상태 초기화
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(['settings'], (result) => {
        const settings = result.settings || DEFAULT_SETTINGS;
        chrome.storage.local.set({
            timeLeft: settings.focusTime * 60,
            isRunning: false,
            isBreak: false,
            sessionComplete: false,
            settings: settings
        });
    });
});

// 알람 이벤트 처리
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === timer.alarmName) {
        chrome.storage.local.get(['timeLeft', 'isRunning', 'isBreak', 'settings', 'sessionComplete'], (result) => {
            if (result.isRunning && !result.sessionComplete) {
                let newTimeLeft = result.timeLeft - 1;
                
                if (newTimeLeft <= 0) {
                    // 세션 완료 시 알림 표시
                    const isBreakTime = result.isBreak;
                    const title = isBreakTime ? '휴식 시간 종료!' : '수고하셨어요, 집중 시간 종료! 쉬세요!';
                    const message = '\n이 메시지를 누르거나 상단 아이콘을 누르면 다음 세션으로 진행합니다';

                    chrome.notifications.create('pomodoroNotification', {
                        type: 'basic',
                        iconUrl: 'icons/icon128.png',
                        title: title,
                        message: message,
                        requireInteraction: true,
                        silent: !result.settings?.soundEnabled
                    });

                    // 타이머 일시 정지 및 세션 완료 상태로 변경
                    chrome.storage.local.set({
                        timeLeft: 0,
                        isRunning: false,
                        sessionComplete: true
                    }, () => {
                        chrome.alarms.clear(timer.alarmName);
                        updateBadge(0, result.isBreak);
                    });
                } else {
                    chrome.storage.local.set({ timeLeft: newTimeLeft });
                    updateBadge(newTimeLeft, result.isBreak);
                }
            }
        });
    }
});

// 알림 클릭 이벤트 처리
chrome.notifications.onClicked.addListener((notificationId) => {
    if (notificationId === 'pomodoroNotification') {
        // 알림 업데이트로 클릭 피드백 표시
        chrome.notifications.update(notificationId, {
            message: '다음 세션으로 전환 중...'
        }, () => {
            // 잠시 후 알림 제거
            setTimeout(() => {
                chrome.notifications.clear(notificationId);
                startNextSession();
            }, 1000);
        });
    }
});

// 다음 세션 시작
function startNextSession() {
    chrome.storage.local.get(['isBreak', 'settings'], (result) => {
        const isBreak = !result.isBreak;
        const settings = result.settings || DEFAULT_SETTINGS;
        const newTimeLeft = isBreak ? settings.breakTime * 60 : settings.focusTime * 60;
        
        // 먼저 상태를 업데이트
        chrome.storage.local.set({
            timeLeft: newTimeLeft,
            isBreak: isBreak,
            isRunning: true,
            sessionComplete: false
        }, () => {
            // 상태 업데이트 후 타이머 시작
            chrome.alarms.create(timer.alarmName, {
                periodInMinutes: 1/60  // 1초마다 실행
            });
            updateBadge(newTimeLeft, isBreak);
        });
    });
}

// 타이머 시작/일시정지
function toggleTimer(start) {
    if (start) {
        chrome.alarms.create(timer.alarmName, {
            periodInMinutes: 1/60  // 1초마다 실행
        });
    } else {
        chrome.alarms.clear(timer.alarmName);
    }
    chrome.storage.local.set({ isRunning: start });
}

// 뱃지 업데이트 함수
function updateBadge(timeLeft, isBreak) {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const text = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    chrome.action.setBadgeText({ text: text });
    chrome.action.setBadgeBackgroundColor({ 
        color: isBreak ? '#2ecc71' : '#3498db'  // 휴식: 초록색, 집중: 파란색
    });
}

// 메시지 리스너 설정
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'startTimer':
            toggleTimer(true);
            break;
        case 'pauseTimer':
            toggleTimer(false);
            break;
        case 'resetTimer':
            chrome.storage.local.get(['settings', 'isBreak'], (result) => {
                const settings = result.settings || DEFAULT_SETTINGS;
                const newTime = result.isBreak ? settings.breakTime * 60 : settings.focusTime * 60;
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
    }
    sendResponse({ success: true });
    return true;
}); 