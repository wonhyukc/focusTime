let timer = {
    timeLeft: 0,
    isRunning: false,
    isBreak: false,
    alarmName: 'pomodoroTimer'
};

// 타이머 상태 초기화
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(['focusTime', 'breakTime'], (result) => {
        const focusTime = result.focusTime || 25;
        const breakTime = result.breakTime || 5;
        chrome.storage.local.set({
            timeLeft: focusTime * 60,
            isRunning: false,
            isBreak: false,
            focusTime: focusTime,
            breakTime: breakTime
        });
    });
});

// 알람 이벤트 처리
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === timer.alarmName) {
        chrome.storage.local.get(['timeLeft', 'isRunning', 'isBreak', 'focusTime', 'breakTime'], (result) => {
            if (result.isRunning) {
                let newTimeLeft = result.timeLeft - 1;
                
                if (newTimeLeft <= 0) {
                    // 세션 완료 시 알림 표시
                    chrome.notifications.create({
                        type: 'basic',
                        iconUrl: 'icons/icon128.png',
                        title: result.isBreak ? '휴식 시간 종료!' : '집중 시간 종료!',
                        message: result.isBreak ? '다시 집중할 시간입니다!' : '휴식 시간을 가지세요!'
                    });

                    // 다음 세션으로 전환
                    const isBreak = !result.isBreak;
                    newTimeLeft = isBreak ? result.breakTime * 60 : result.focusTime * 60;
                    
                    chrome.storage.local.set({
                        timeLeft: newTimeLeft,
                        isBreak: isBreak
                    });

                    // 뱃지 업데이트
                    updateBadge(newTimeLeft, isBreak);
                } else {
                    chrome.storage.local.set({ timeLeft: newTimeLeft });
                    updateBadge(newTimeLeft, result.isBreak);
                }
            }
        });
    }
});

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
            chrome.storage.local.get(['focusTime', 'isBreak'], (result) => {
                const newTime = result.isBreak ? result.breakTime * 60 : result.focusTime * 60;
                chrome.storage.local.set({
                    timeLeft: newTime,
                    isRunning: false
                });
                toggleTimer(false);
                updateBadge(newTime, result.isBreak);
            });
            break;
    }
    sendResponse({ success: true });
    return true;
}); 