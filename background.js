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
                    // 먼저 타이머 상태 업데이트
                    chrome.storage.local.set({
                        timeLeft: 0,
                        isRunning: false,
                        sessionComplete: true
                    }, async () => {
                        chrome.alarms.clear(timer.alarmName);
                        updateBadge(0, result.isBreak);

                        // 소리 설정이 켜져 있으면 먼저 소리 재생
                        if (result.settings?.soundEnabled) {
                            await playSound();
                        }

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
                            silent: true // 알림음은 직접 제어하므로 크롬 알림음은 끔
                        });
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
        
        // 상태를 업데이트
        chrome.storage.local.set({
            timeLeft: newTimeLeft,
            isBreak: isBreak,
            isRunning: true,
            sessionComplete: false
        }, () => {
            // 타이머 시작
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