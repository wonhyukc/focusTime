// DOM 요소
let timerDisplay;
let sessionTypeDisplay;
let startButton;
let resetButton;
let focusTimeInput;
let breakTimeInput;
let completedSessionsDisplay;
let abandonedSessionsDisplay;
let exportDataButton;
let importDataButton;
let resetDataButton;
let testSoundButton;
let soundInfo;
let progressRing;
let container;

// 상태 변수
let timeLeft;
let timer;
let isRunning = false;
let isFocusSession = true;
let completedSessions = 0;
let abandonedSessions = 0;
let sessionHistory = [];
let settings = {
    focusTime: 25,
    breakTime: 5
};

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
}

// 설정값 저장
function saveSettings() {
    settings.focusTime = parseInt(focusTimeInput.value);
    settings.breakTime = parseInt(breakTimeInput.value);
    chrome.storage.local.set({ settings });
    updateTimerDisplay();
}

// 설정값 로드
function loadSettings() {
    chrome.storage.local.get(['settings'], (result) => {
        if (result.settings) {
            settings = result.settings;
            focusTimeInput.value = settings.focusTime;
            breakTimeInput.value = settings.breakTime;
        }
        updateTimerDisplay();
    });
}

// 초기화
function init() {
    initializeDOM();
    loadSettings();
    loadStats();
    setupEventListeners();
    updateModeStyles();
}

// 이벤트 리스너 설정
function setupEventListeners() {
    if (startButton) startButton.addEventListener('click', toggleTimer);
    if (resetButton) resetButton.addEventListener('click', resetTimer);
    if (focusTimeInput) {
        focusTimeInput.addEventListener('change', () => {
            saveSettings();
            updateTimerDisplay();
        });
    }
    if (breakTimeInput) {
        breakTimeInput.addEventListener('change', () => {
            saveSettings();
            updateTimerDisplay();
        });
    }
    if (exportDataButton) exportDataButton.addEventListener('click', exportData);
    if (importDataButton) importDataButton.addEventListener('click', importData);
    if (resetDataButton) resetDataButton.addEventListener('click', resetData);
    if (testSoundButton) testSoundButton.addEventListener('click', playNotificationSound);
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
    }
}

// 타이머 일시정지
function pauseTimer() {
    if (isRunning) {
        isRunning = false;
        clearInterval(timer);
        startButton.textContent = '재개';
        startButton.classList.remove('active');
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
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    sessionTypeDisplay.textContent = isFocusSession ? '집중 시간' : '휴식 시간';
    updateProgress();
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
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(350, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.5);
        
        soundInfo.textContent = '재생 중: 알림음';
        soundInfo.style.opacity = '1';
        
        setTimeout(() => {
            soundInfo.style.opacity = '0';
            setTimeout(() => {
                soundInfo.textContent = '';
            }, 300);
        }, 2000);
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
    if (sessionHistory.length === 0) {
        alert('내보낼 통계 데이터가 없습니다.');
        return;
    }

    const csv = '시작시각(년월일시분),세션,지속시간\n' +
        sessionHistory.map(session => 
            `${session.timestamp},${session.type === 'focus' ? '집중' : '휴식'},${session.duration}`
        ).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pomodoro_stats.csv';
    a.click();
    URL.revokeObjectURL(url);
}

// 데이터 가져오기
function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const csv = event.target.result;
                const lines = csv.split('\n');
                const newSessions = [];
                
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;
                    
                    const [timestamp, type, duration] = line.split(',');
                    if (timestamp && type && duration) {
                        newSessions.push({
                            timestamp,
                            type: type === '집중' ? 'focus' : 'break',
                            duration: parseInt(duration)
                        });
                    }
                }
                
                if (newSessions.length > 0) {
                    sessionHistory = [...sessionHistory, ...newSessions];
                    chrome.storage.local.set({ sessionHistory }, () => {
                        completedSessions = sessionHistory.filter(session => 
                            session.type === 'focus' && session.duration === settings.focusTime
                        ).length;
                        abandonedSessions = sessionHistory.filter(session => 
                            session.type === 'focus' && session.duration < settings.focusTime
                        ).length;
                        
                        updateStats();
                        alert('통계 데이터를 성공적으로 가져왔습니다.');
                    });
                } else {
                    alert('가져올 수 있는 통계 데이터가 없습니다.');
                }
            } catch (error) {
                console.error('통계 데이터 가져오기 중 오류 발생:', error);
                alert('통계 데이터를 가져오는 중 오류가 발생했습니다.');
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

// DOM이 로드된 후 초기화 실행
document.addEventListener('DOMContentLoaded', init); 