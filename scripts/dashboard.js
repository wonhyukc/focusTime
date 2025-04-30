// 탭 전환 기능
document.addEventListener('DOMContentLoaded', function() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // 활성 탭 버튼 변경
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // 탭 컨텐츠 변경
            const tabId = button.dataset.tab;
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === tabId) {
                    content.classList.add('active');
                }
            });
        });
    });

    // 설정 저장 기능
    const settingsForm = document.querySelectorAll('.timer-settings input, .timer-settings select');
    settingsForm.forEach(input => {
        input.addEventListener('change', saveSettings);
    });

    // 설정 로드
    loadSettings();

    // 차트 초기화
    initializeCharts();

    // 설정 내보내기/가져오기/초기화 기능
    document.getElementById('export-settings').addEventListener('click', exportSettings);
    document.getElementById('import-settings').addEventListener('click', () => {
        document.getElementById('settings-file-input').click();
    });
    document.getElementById('reset-settings').addEventListener('click', resetSettings);
    document.getElementById('settings-file-input').addEventListener('change', importSettings);

    // 통계 내보내기/가져오기/초기화 기능
    document.getElementById('export-stats').addEventListener('click', exportStats);
    document.getElementById('import-stats').addEventListener('click', () => {
        document.getElementById('stats-file-input').click();
    });
    document.getElementById('reset-stats').addEventListener('click', resetStats);
    document.getElementById('stats-file-input').addEventListener('change', importStats);
});

// 설정 저장
function saveSettings() {
    const settings = {
        focus: {
            duration: parseInt(document.getElementById('focus-duration').value),
            sound: "beep",
            soundVolume: 50,
            soundType: "short",
            desktopNotification: document.getElementById('focus-desktop-notification').checked,
            tabNotification: document.getElementById('focus-tab-notification').checked
        },
        shortBreak: {
            duration: parseInt(document.getElementById('short-break-duration').value),
            sound: "beep",
            soundVolume: 50,
            soundType: "short",
            desktopNotification: document.getElementById('short-break-desktop-notification').checked,
            tabNotification: document.getElementById('short-break-tab-notification').checked
        },
        longBreak: {
            duration: parseInt(document.getElementById('long-break-duration').value),
            startAfter: parseInt(document.getElementById('long-break-start').value),
            sound: "beep",
            soundVolume: 50,
            soundType: "short",
            desktopNotification: document.getElementById('long-break-desktop-notification').checked,
            tabNotification: document.getElementById('long-break-tab-notification').checked
        },
        general: {
            soundEnabled: true,
            autoStartBreaks: false,
            autoStartPomodoros: false
        }
    };

    chrome.storage.sync.set({ settings }, () => {
        showToast('설정이 저장되었습니다.');
    });
}

// 설정 로드
function loadSettings() {
    chrome.storage.sync.get('settings', (data) => {
        if (data.settings) {
            const { focus, shortBreak, longBreak } = data.settings;

            // 집중 시간 설정
            document.getElementById('focus-duration').value = focus.duration;
            document.getElementById('focus-desktop-notification').checked = focus.desktopNotification;
            document.getElementById('focus-tab-notification').checked = focus.tabNotification;

            // 짧은 휴식 설정
            document.getElementById('short-break-duration').value = shortBreak.duration;
            document.getElementById('short-break-desktop-notification').checked = shortBreak.desktopNotification;
            document.getElementById('short-break-tab-notification').checked = shortBreak.tabNotification;

            // 긴 휴식 설정
            document.getElementById('long-break-start').value = longBreak.startAfter;
            document.getElementById('long-break-duration').value = longBreak.duration;
            document.getElementById('long-break-desktop-notification').checked = longBreak.desktopNotification;
            document.getElementById('long-break-tab-notification').checked = longBreak.tabNotification;
        }
    });
}

// 소리 미리듣기
document.querySelectorAll('.preview-sound').forEach(button => {
    button.addEventListener('click', () => {
        // 낮고 짧은 beep 소리 재생
        chrome.runtime.sendMessage({ action: 'playSound' });
    });
});

// 차트 초기화
function initializeCharts() {
    // Chart.js를 사용하여 차트 구현
    // 일간 차트
    const dailyCtx = document.getElementById('daily-chart').getContext('2d');
    new Chart(dailyCtx, {
        type: 'bar',
        data: {
            labels: Array.from({length: 24}, (_, i) => `${i}:00`),
            datasets: [{
                label: '포모도로 수',
                data: Array(24).fill(0),
                backgroundColor: '#3B82F6'
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });

    // 주간 차트
    const weeklyCtx = document.getElementById('weekly-chart').getContext('2d');
    new Chart(weeklyCtx, {
        type: 'bar',
        data: {
            labels: ['일', '월', '화', '수', '목', '금', '토'],
            datasets: [{
                label: '포모도로 수',
                data: Array(7).fill(0),
                backgroundColor: '#3B82F6'
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });

    // 월간 차트
    const monthlyCtx = document.getElementById('monthly-chart').getContext('2d');
    new Chart(monthlyCtx, {
        type: 'bar',
        data: {
            labels: Array.from({length: 12}, (_, i) => `${i + 1}월`),
            datasets: [{
                label: '포모도로 수',
                data: Array(12).fill(0),
                backgroundColor: '#3B82F6'
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// 피드백 제출
document.getElementById('feedback-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const feedback = document.getElementById('feedback-text').value;
    // 여기에 피드백 제출 로직 추가
    console.log('피드백 제출:', feedback);
    document.getElementById('feedback-text').value = '';
    alert('피드백이 제출되었습니다. 감사합니다!');
});

// 설정 내보내기
function exportSettings() {
    chrome.storage.sync.get('settings', (data) => {
        if (data.settings) {
            const jsonContent = JSON.stringify(data.settings, null, 2);
            const blob = new Blob([jsonContent], { type: 'application/json' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'focus_timer_settings.json';
            link.click();
            showToast('설정을 내보냈습니다.');
        }
    });
}

// 설정 가져오기
function importSettings(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const settings = JSON.parse(e.target.result);
                // 설정 유효성 검사
                if (validateSettings(settings)) {
                    chrome.storage.sync.set({ settings }, () => {
                        loadSettings();
                        showToast('설정을 가져왔습니다.');
                    });
                } else {
                    showToast('올바르지 않은 설정 파일입니다.', 'error');
                }
            } catch (error) {
                showToast('설정 파일을 읽는 중 오류가 발생했습니다.', 'error');
            }
        };
        reader.readAsText(file);
    }
    event.target.value = '';
}

// 설정 초기화
function resetSettings() {
    if (confirm('모든 설정을 초기값으로 되돌리시겠습니까?')) {
        chrome.storage.sync.set({ settings: DEFAULT_SETTINGS }, () => {
            loadSettings();
            showToast('설정이 초기화되었습니다.');
        });
    }
}

// 설정 유효성 검사
function validateSettings(settings) {
    const required = ['focus', 'shortBreak', 'longBreak', 'general'];
    if (!required.every(key => key in settings)) return false;

    // 각 섹션의 필수 필드 검사
    const focusRequired = ['duration', 'sound', 'soundVolume', 'soundType', 'desktopNotification', 'tabNotification'];
    const breakRequired = ['duration', 'sound', 'soundVolume', 'soundType', 'desktopNotification', 'tabNotification'];
    const longBreakRequired = [...breakRequired, 'startAfter'];
    const generalRequired = ['soundEnabled', 'autoStartBreaks', 'autoStartPomodoros'];

    return (
        focusRequired.every(key => key in settings.focus) &&
        breakRequired.every(key => key in settings.shortBreak) &&
        longBreakRequired.every(key => key in settings.longBreak) &&
        generalRequired.every(key => key in settings.general)
    );
}

// 토스트 메시지 표시
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 2000);
    }, 100);
}

// 통계 내보내기
function exportStats() {
    chrome.storage.local.get('pomodoroData', (data) => {
        if (data.pomodoroData) {
            const jsonContent = JSON.stringify(data.pomodoroData, null, 2);
            const blob = new Blob([jsonContent], { type: 'application/json' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'focus_timer_stats.json';
            link.click();
        } else {
            alert('내보낼 통계 데이터가 없습니다.');
        }
    });
}

// 통계 가져오기
function importStats(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const pomodoroData = JSON.parse(e.target.result);
                chrome.storage.local.set({ pomodoroData }, () => {
                    initializeCharts(); // 차트 다시 그리기
                    alert('통계를 성공적으로 가져왔습니다.');
                });
            } catch (error) {
                alert('올바르지 않은 통계 파일입니다.');
            }
        };
        reader.readAsText(file);
    }
    event.target.value = ''; // 파일 입력 초기화
}

// 통계 초기화
function resetStats() {
    if (confirm('모든 통계 데이터를 초기화하시겠습니까?')) {
        chrome.storage.local.remove('pomodoroData', () => {
            initializeCharts(); // 차트 초기화
            alert('통계가 초기화되었습니다.');
        });
    }
} 