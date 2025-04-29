// DOM 요소
const timerDisplay = document.getElementById('timer');
const sessionTypeDisplay = document.getElementById('session-type');
const startButton = document.getElementById('start');
const pauseButton = document.getElementById('pause');
const resetButton = document.getElementById('reset');
const focusTimeInput = document.getElementById('focus-time');
const breakTimeInput = document.getElementById('break-time');
const completedSessionsDisplay = document.getElementById('completed-sessions');
const abandonedSessionsDisplay = document.getElementById('abandoned-sessions');
const exportDataButton = document.getElementById('export-data');
const importDataButton = document.getElementById('import-data');
const resetDataButton = document.getElementById('reset-data');
const testSoundButton = document.getElementById('test-sound');

// 상태 변수
let timeLeft;
let timer;
let isRunning = false;
let isFocusSession = true;
let completedSessions = 0;
let abandonedSessions = 0;
let sessionHistory = [];

// 초기화
function init() {
    loadStats();
    updateTimerDisplay();
    setupEventListeners();
}

// 이벤트 리스너 설정
function setupEventListeners() {
    startButton.addEventListener('click', startTimer);
    pauseButton.addEventListener('click', pauseTimer);
    resetButton.addEventListener('click', resetTimer);
    focusTimeInput.addEventListener('change', updateTimerDisplay);
    breakTimeInput.addEventListener('change', updateTimerDisplay);
    exportDataButton.addEventListener('click', exportData);
    importDataButton.addEventListener('click', importData);
    resetDataButton.addEventListener('click', resetData);
    testSoundButton.addEventListener('click', playNotificationSound);
}

// 타이머 시작
function startTimer() {
    if (!isRunning) {
        isRunning = true;
        timer = setInterval(updateTimer, 1000);
        startButton.textContent = '재개';
    }
}

// 타이머 일시정지
function pauseTimer() {
    if (isRunning) {
        isRunning = false;
        clearInterval(timer);
        startButton.textContent = '시작';
    }
}

// 타이머 초기화
function resetTimer() {
    pauseTimer();
    isFocusSession = true;
    updateTimerDisplay();
    abandonedSessions++;
    updateStats();
}

// 타이머 업데이트
function updateTimer() {
    if (timeLeft > 0) {
        timeLeft--;
        updateTimerDisplay();
    } else {
        playNotificationSound();
        if (isFocusSession) {
            completedSessions++;
        }
        isFocusSession = !isFocusSession;
        updateTimerDisplay();
        saveSession();
    }
}

// 타이머 표시 업데이트
function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    timeLeft = (isFocusSession ? focusTimeInput.value : breakTimeInput.value) * 60;
    sessionTypeDisplay.textContent = isFocusSession ? '집중 시간' : '휴식 시간';
    sessionTypeDisplay.className = isFocusSession ? 'focus-session' : 'break-session';
}

// 알림음 재생
function playNotificationSound() {
    // Tone.js 초기화
    if (Tone.context.state !== 'running') {
        Tone.start();
    }
    
    // 알림음 시퀀스 생성
    const synth = new Tone.Synth().toDestination();
    const now = Tone.now();
    
    // 첫 번째 음
    synth.triggerAttackRelease("C4", "8n", now);
    // 두 번째 음 (약간의 지연 후)
    synth.triggerAttackRelease("E4", "8n", now + 0.2);
    // 세 번째 음 (약간의 지연 후)
    synth.triggerAttackRelease("G4", "8n", now + 0.4);
}

// 통계 저장
function saveSession() {
    const session = {
        timestamp: new Date().toISOString(),
        type: isFocusSession ? 'focus' : 'break',
        duration: isFocusSession ? focusTimeInput.value : breakTimeInput.value
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
}

// 데이터 내보내기
function exportData() {
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
        const reader = new FileReader();
        reader.onload = (event) => {
            const csv = event.target.result;
            const lines = csv.split('\n');
            const newSessions = [];
            
            for (let i = 1; i < lines.length; i++) {
                const [timestamp, type, duration] = lines[i].split(',');
                if (timestamp && type && duration) {
                    newSessions.push({
                        timestamp,
                        type: type === '집중' ? 'focus' : 'break',
                        duration
                    });
                }
            }
            
            sessionHistory = [...sessionHistory, ...newSessions];
            chrome.storage.local.set({ sessionHistory });
            updateStats();
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

// 초기화 실행
init(); 