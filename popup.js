// 상태 변수
let timeLeft;
let timer;
let isRunning = false;
let isFocusSession = true;
let completedSessions = 0;
let abandonedSessions = 0;
let sessionHistory = [];
let settings = {
    version: "1.0",
    focusTime: 25,
    breakTime: 5,
    longBreakTime: 15,
    setsBeforeLongBreak: 4,
    soundEnabled: true
};

// DOM 요소
let timerDisplay;
let startButton;
let resetButton;
let focusTimeInput;
let breakTimeInput;
let sessionTypeDisplay;
let completedSessionsDisplay;
let abandonedSessionsDisplay;
let exportDataButton;
let importDataButton;
let resetDataButton;
let testSoundButton;
let soundInfo;
let progressRing;
let container;
let soundEnabledCheckbox;
let debugInfo;
let longBreakTimeInput;
let setsBeforeLongBreakInput;

// DOM 요소 초기화
function initializeDOM() {
    container = document.querySelector('.container');
    timerDisplay = document.getElementById('timer');
    sessionTypeDisplay = document.getElementById('session-type');
    startButton = document.getElementById('start');
    resetButton = document.getElementById('reset');
    focusTimeInput = document.getElementById('focus-time');
    breakTimeInput = document.getElementById('break-time');
    completedSessionsDisplay = document.getElementById('completed-sessions');
    abandonedSessionsDisplay = document.getElementById('abandoned-sessions');
    exportDataButton = document.getElementById('export-data');
    importDataButton = document.getElementById('import-data');
    resetDataButton = document.getElementById('reset-data');
    testSoundButton = document.getElementById('test-sound');
    soundInfo = document.getElementById('sound-info');
    progressRing = document.querySelector('.progress-ring__progress');
    soundEnabledCheckbox = document.getElementById('sound-enabled');
    debugInfo = document.getElementById('debug-info');
    longBreakTimeInput = document.getElementById('long-break-time');
    setsBeforeLongBreakInput = document.getElementById('sets-before-long-break');
}

// 설정값 저장
function saveSettings() {
    settings.focusTime = parseFloat(focusTimeInput.value);
    settings.breakTime = parseFloat(breakTimeInput.value);
    settings.longBreakTime = parseInt(longBreakTimeInput.value);
    settings.setsBeforeLongBreak = parseInt(setsBeforeLongBreakInput.value);
    settings.soundEnabled = soundEnabledCheckbox.checked;
    chrome.storage.local.set({ settings });
    updateTimerDisplay();
}

// 설정값 로드
function loadSettings() {
    if (!focusTimeInput || !breakTimeInput || !longBreakTimeInput || !setsBeforeLongBreakInput) {
        console.error('설정 입력 요소를 찾을 수 없습니다.');
        return;
    }

    chrome.storage.local.get(['settings'], (result) => {
        if (result.settings) {
            settings = { ...settings, ...result.settings };
            focusTimeInput.value = settings.focusTime;
            breakTimeInput.value = settings.breakTime;
            longBreakTimeInput.value = settings.longBreakTime;
            setsBeforeLongBreakInput.value = settings.setsBeforeLongBreak;
            soundEnabledCheckbox.checked = settings.soundEnabled;
        }
        updateTimerDisplay();
        updateDebugInfo(result);
    });
}

// 입력 필드 초기화
function initializeInputs() {
    // 포커스 시간 입력 처리
    focusTimeInput.addEventListener('input', function() {
        // 입력 중에는 숫자와 소수점만 허용
        this.value = this.value.replace(/[^0-9.]/g, '');
    });

    focusTimeInput.addEventListener('blur', function() {
        // 포커스가 벗어날 때만 값 검증
        if (this.value === '') {
            this.value = 25;
            settings.focusTime = 25;
            saveSettings();
        } else {
            let value = parseFloat(this.value);
            if (isNaN(value) || value < 0.1) value = 0.1;
            if (value > 60) value = 60;
            this.value = value;
            settings.focusTime = value;
            saveSettings();
        }
    });

    // 휴식 시간 입력 처리
    breakTimeInput.addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9.]/g, '');
    });

    breakTimeInput.addEventListener('blur', function() {
        if (this.value === '') {
            this.value = 5;
            settings.breakTime = 5;
            saveSettings();
        } else {
            let value = parseFloat(this.value);
            if (isNaN(value) || value < 0.1) value = 0.1;
            if (value > 30) value = 30;
            this.value = value;
            settings.breakTime = value;
            saveSettings();
        }
    });

    // 긴 휴식 시간 입력 처리
    longBreakTimeInput.addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '');
    });

    longBreakTimeInput.addEventListener('blur', function() {
        if (this.value === '') {
            this.value = 15;
            settings.longBreakTime = 15;
            saveSettings();
        } else {
            let value = parseInt(this.value);
            if (isNaN(value) || value < 1) value = 1;
            if (value > 60) value = 60;
            this.value = value;
            settings.longBreakTime = value;
            saveSettings();
        }
    });

    // 세트 수 입력 처리
    setsBeforeLongBreakInput.addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '');
    });

    setsBeforeLongBreakInput.addEventListener('blur', function() {
        if (this.value === '') {
            this.value = 4;
            settings.setsBeforeLongBreak = 4;
            saveSettings();
        } else {
            let value = parseInt(this.value);
            if (isNaN(value) || value < 1) value = 1;
            if (value > 10) value = 10;
            this.value = value;
            settings.setsBeforeLongBreak = value;
            saveSettings();
        }
    });
}

// 초기화
function init() {
    initializeDOM();
    
    // DOM 요소 존재 여부 확인
    if (!timerDisplay || !startButton || !resetButton || !sessionTypeDisplay || 
        !focusTimeInput || !breakTimeInput || !container) {
        console.error('필수 DOM 요소를 찾을 수 없습니다.');
        return;
    }

    // 초기 설정 로드
    chrome.storage.local.get(['settings', 'timeLeft', 'isRunning', 'isBreak'], (result) => {
        if (result.settings) {
            settings = result.settings;
            focusTimeInput.value = settings.focusTime;
            breakTimeInput.value = settings.breakTime;
            soundEnabledCheckbox.checked = settings.soundEnabled !== undefined ? settings.soundEnabled : true;
        }

        // 타이머 상태 초기화
        timeLeft = result.timeLeft || settings.focusTime * 60;
        isRunning = result.isRunning || false;
        isFocusSession = !result.isBreak;

        // UI 업데이트
        updateDisplay();
        updateModeStyles();
        updateDebugInfo(result);
        
        // 이벤트 리스너 설정
        setupEventListeners();
        
        // 통계 로드
        loadStats();

        // 주기적 업데이트 시작
        setInterval(() => {
            updateDisplay();
            updateDebugInfo();
        }, 1000);

        // 입력 필드 초기화
        initializeInputs();
    });
}

// 이벤트 리스너 설정
function setupEventListeners() {
    if (startButton) {
        startButton.addEventListener('click', () => {
            chrome.storage.local.get(['isRunning', 'sessionComplete'], (result) => {
                if (result.sessionComplete) {
                    chrome.runtime.sendMessage({ action: 'startNextSession' });
                } else {
                    const newState = !result.isRunning;
                    chrome.runtime.sendMessage({
                        action: newState ? 'startTimer' : 'pauseTimer'
                    });
                }
            });
        });
    }

    if (resetButton) {
        resetButton.addEventListener('click', () => {
            if (confirm('타이머를 리셋하시겠습니까?')) {
                chrome.runtime.sendMessage({ action: 'resetTimer' });
            }
        });
    }

    if (exportDataButton) exportDataButton.addEventListener('click', exportData);
    if (importDataButton) importDataButton.addEventListener('click', importData);
    if (resetDataButton) resetDataButton.addEventListener('click', resetData);
    if (testSoundButton) testSoundButton.addEventListener('click', playNotificationSound);
    if (soundEnabledCheckbox) {
        soundEnabledCheckbox.addEventListener('change', saveSettings);
    }
}

// 타이머 토글 (시작/일시정지)
function toggleTimer() {
    if (!isRunning) {
        isRunning = true;
        timer = setInterval(updateTimer, 1000);
        startButton.textContent = '일시정지';
        startButton.classList.add('active');
    } else {
        isRunning = false;
        clearInterval(timer);
        startButton.textContent = '재개';
        startButton.classList.remove('active');
    }
}

// 타이머 초기화
function resetTimer() {
    if (confirm('현재 진행 중인 세션을 포기하고 초기화하시겠습니까?')) {
        pauseTimer();
        isFocusSession = true;
        updateTimerDisplay();
        abandonedSessions++;
        updateStats();
        updateModeStyles();
        // 배지 초기화
        chrome.action.setBadgeText({ text: '' });
    }
}

// 타이머 일시정지
function pauseTimer() {
    if (isRunning) {
        isRunning = false;
        clearInterval(timer);
        startButton.textContent = '재개';
        startButton.classList.remove('active');
        // 일시정지 상태를 배지에 표시
        const currentTime = timerDisplay.textContent;
        chrome.action.setBadgeText({ text: '⏸️' + currentTime });
    }
}

// 타이머 업데이트
function updateTimer() {
    if (timeLeft > 0) {
        timeLeft--;
        updateTimerDisplay();
        updateProgress();
    } else {
        playNotificationSound();
        if (isFocusSession) {
            completedSessions++;
        }
        isFocusSession = !isFocusSession;
        timeLeft = (isFocusSession ? settings.focusTime : settings.breakTime) * 60;
        updateTimerDisplay();
        updateModeStyles();
        saveSession();
    }
}

// 타이머 표시 업데이트
function updateTimerDisplay() {
    if (!isRunning) {
        timeLeft = (isFocusSession ? settings.focusTime : settings.breakTime) * 60;
    }
    
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // 타이머 디스플레이 업데이트
    timerDisplay.textContent = timeString;
    sessionTypeDisplay.textContent = isFocusSession ? '집중 시간' : '휴식 시간';
    sessionTypeDisplay.style.color = isFocusSession ? '#3498db' : '#2ecc71';
    
    // 확장 프로그램 아이콘 배지 업데이트
    updateBadge(timeString);
    
    updateProgress();
}

// 배지 업데이트
function updateBadge(timeString) {
    // 배지 텍스트 업데이트
    chrome.action.setBadgeText({ text: timeString });
    
    // 배지 색상 설정
    const badgeColor = isFocusSession ? '#3498db' : '#2ecc71';
    chrome.action.setBadgeBackgroundColor({ color: badgeColor });
    
    // 배지 텍스트 색상 설정
    chrome.action.setBadgeTextColor({ color: '#FFFFFF' });
}

// 프로그레스 업데이트
function updateProgress() {
    const totalTime = (isFocusSession ? settings.focusTime : settings.breakTime) * 60;
    const progress = ((totalTime - timeLeft) / totalTime) * 100;
    
    // 프로그레스 링 업데이트
    if (progressRing) {
        const circumference = 2 * Math.PI * 90;
        const offset = circumference - (progress / 100) * circumference;
        progressRing.style.strokeDasharray = `${circumference} ${circumference}`;
        progressRing.style.strokeDashoffset = offset;
    }
}

// 모드 스타일 업데이트
function updateModeStyles() {
    if (isFocusSession) {
        container.classList.remove('break-mode');
        container.classList.add('focus-mode');
    } else {
        container.classList.remove('focus-mode');
        container.classList.add('break-mode');
    }
}

// 알림음 재생
function playNotificationSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        // 오실레이터 설정
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4 음
        
        // 게인(볼륨) 설정
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime); // 시작 볼륨
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5); // 페이드아웃

        // 연결
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // 재생
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);

        // 상태 표시
        soundInfo.textContent = '알림음 재생 중';
        soundInfo.style.opacity = '1';

        // 0.5초 후 상태 표시 제거
        setTimeout(() => {
            soundInfo.style.opacity = '0';
            setTimeout(() => {
                soundInfo.textContent = '';
            }, 300);
        }, 500);

        // 1초 후 컨텍스트 정리
        setTimeout(() => {
            audioContext.close();
        }, 1000);

    } catch (error) {
        console.error('알림음 재생 중 오류 발생:', error);
        soundInfo.textContent = '알림음 재생 실패';
        soundInfo.style.opacity = '1';
        setTimeout(() => {
            soundInfo.style.opacity = '0';
            setTimeout(() => {
                soundInfo.textContent = '';
            }, 300);
        }, 2000);
    }
}

// 통계 저장
function saveSession() {
    const session = {
        timestamp: new Date().toISOString(),
        type: isFocusSession ? 'focus' : 'break',
        duration: isFocusSession ? settings.focusTime : settings.breakTime
    };
    sessionHistory.push(session);
    chrome.storage.local.set({ sessionHistory });
    updateStats();
}

// 통계 로드
function loadStats() {
    chrome.storage.local.get(['sessionHistory', 'completedSessions', 'abandonedSessions'], (result) => {
        sessionHistory = result.sessionHistory || [];
        completedSessions = result.completedSessions || 0;
        abandonedSessions = result.abandonedSessions || 0;
        updateStats();
    });
}

// 통계 업데이트
function updateStats() {
    if (!completedSessionsDisplay || !abandonedSessionsDisplay) {
        console.error('통계 표시 요소를 찾을 수 없습니다.');
        return;
    }

    completedSessionsDisplay.textContent = completedSessions;
    abandonedSessionsDisplay.textContent = abandonedSessions;
    chrome.storage.local.set({ completedSessions, abandonedSessions });
    
    // 통계 아이템 애니메이션
    const statItems = document.querySelectorAll('.stat-item');
    statItems.forEach(item => {
        item.style.animation = 'pulse 0.3s ease';
        setTimeout(() => {
            item.style.animation = '';
        }, 300);
    });
}

// 데이터 내보내기
function exportData() {
    const exportData = {
        version: settings.version,
        settings: {
            focusTime: settings.focusTime,
            breakTime: settings.breakTime,
            longBreakTime: settings.longBreakTime,
            setsBeforeLongBreak: settings.setsBeforeLongBreak,
            soundEnabled: settings.soundEnabled
        },
        sessionHistory: sessionHistory
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pomodoro_settings.json';
    a.click();
    URL.revokeObjectURL(url);
}

// 데이터 가져오기
function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedData = JSON.parse(event.target.result);
                
                if (importedData.sessionHistory) {
                    sessionHistory = importedData.sessionHistory;
                }
                
                if (importedData.settings) {
                    settings = importedData.settings;
                    focusTimeInput.value = settings.focusTime;
                    breakTimeInput.value = settings.breakTime;
                    soundEnabledCheckbox.checked = settings.soundEnabled;
                    saveSettings();
                }

                updateStats();
                alert('데이터를 성공적으로 가져왔습니다.');
            } catch (error) {
                console.error('데이터 가져오기 중 오류 발생:', error);
                alert('데이터를 가져오는 중 오류가 발생했습니다.');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// 데이터 초기화
function resetData() {
    if (confirm('모든 통계 데이터를 삭제하시겠습니까?')) {
        sessionHistory = [];
        completedSessions = 0;
        abandonedSessions = 0;
        chrome.storage.local.clear();
        updateStats();
    }
}

// 타이머 상태 업데이트
function updateDisplay() {
    if (!timerDisplay || !startButton || !sessionTypeDisplay || !focusTimeInput || !breakTimeInput) {
        console.error('필수 DOM 요소가 초기화되지 않았습니다.');
        return;
    }

    chrome.storage.local.get(['timeLeft', 'isRunning', 'isBreak', 'focusTime', 'breakTime', 'sessionComplete'], (result) => {
        const minutes = Math.floor(result.timeLeft / 60);
        const seconds = result.timeLeft % 60;
        timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        if (result.sessionComplete) {
            const nextSessionType = result.isBreak ? '집중' : '휴식';
            startButton.textContent = `${nextSessionType} 시작`;
            startButton.classList.add('next-session');
        } else {
            startButton.textContent = result.isRunning ? '일시정지' : '시작';
            startButton.classList.remove('next-session');
        }

        sessionTypeDisplay.textContent = result.isBreak ? '휴식 시간' : '집중 시간';
        sessionTypeDisplay.style.color = result.isBreak ? '#2ecc71' : '#3498db';
        
        // 입력 필드가 포커스를 가지고 있지 않을 때만 값을 업데이트
        if (document.activeElement !== focusTimeInput) {
            focusTimeInput.value = result.focusTime || 25;
        }
        if (document.activeElement !== breakTimeInput) {
            breakTimeInput.value = result.breakTime || 5;
        }

        updateDebugInfo(result);
    });
}

// 메시지 리스너 추가
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'playSound') {
        playNotificationSound();
    }
    return true;
});

// 디버그 정보 업데이트 함수
function updateDebugInfo(data) {
    if (!debugInfo) return;
    
    const debugData = {
        '현재 설정': settings,
        '타이머 상태': {
            timeLeft: timeLeft,
            isRunning: isRunning,
            isFocusSession: isFocusSession,
            '현재 시간': new Date().toLocaleTimeString()
        }
    };

    if (data) {
        debugData['스토리지 데이터'] = data;
    }

    debugInfo.textContent = JSON.stringify(debugData, null, 2);
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(init, 0);
}); 