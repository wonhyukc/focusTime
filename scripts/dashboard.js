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
});

// 설정 저장
function saveSettings() {
    const settings = {
        focus: {
            duration: document.getElementById('focus-duration').value,
            sound: document.getElementById('focus-sound').value,
            desktopNotification: document.getElementById('focus-desktop-notification').checked,
            tabNotification: document.getElementById('focus-tab-notification').checked,
            soundType: document.getElementById('focus-sound-type').value
        },
        shortBreak: {
            duration: document.getElementById('short-break-duration').value,
            desktopNotification: document.getElementById('short-break-desktop-notification').checked,
            tabNotification: document.getElementById('short-break-tab-notification').checked,
            soundType: document.getElementById('short-break-sound-type').value
        },
        longBreak: {
            startAfter: document.getElementById('long-break-start').value,
            duration: document.getElementById('long-break-duration').value,
            desktopNotification: document.getElementById('long-break-desktop-notification').checked,
            tabNotification: document.getElementById('long-break-tab-notification').checked,
            soundType: document.getElementById('long-break-sound-type').value
        }
    };

    chrome.storage.sync.set({ settings }, () => {
        console.log('설정이 저장되었습니다.');
    });
}

// 설정 로드
function loadSettings() {
    chrome.storage.sync.get('settings', (data) => {
        if (data.settings) {
            const { focus, shortBreak, longBreak } = data.settings;

            // 집중 시간 설정
            document.getElementById('focus-duration').value = focus.duration;
            document.getElementById('focus-sound').value = focus.sound;
            document.getElementById('focus-desktop-notification').checked = focus.desktopNotification;
            document.getElementById('focus-tab-notification').checked = focus.tabNotification;
            document.getElementById('focus-sound-type').value = focus.soundType;

            // 짧은 휴식 설정
            document.getElementById('short-break-duration').value = shortBreak.duration;
            document.getElementById('short-break-desktop-notification').checked = shortBreak.desktopNotification;
            document.getElementById('short-break-tab-notification').checked = shortBreak.tabNotification;
            document.getElementById('short-break-sound-type').value = shortBreak.soundType;

            // 긴 휴식 설정
            document.getElementById('long-break-start').value = longBreak.startAfter;
            document.getElementById('long-break-duration').value = longBreak.duration;
            document.getElementById('long-break-desktop-notification').checked = longBreak.desktopNotification;
            document.getElementById('long-break-tab-notification').checked = longBreak.tabNotification;
            document.getElementById('long-break-sound-type').value = longBreak.soundType;
        }
    });
}

// 소리 미리듣기
document.querySelector('.preview-sound').addEventListener('click', () => {
    const soundType = document.getElementById('focus-sound').value;
    // 여기에 소리 재생 로직 추가
    console.log(`${soundType} 소리 재생`);
});

// 데이터 내보내기
document.getElementById('export-csv').addEventListener('click', exportToCSV);
document.getElementById('export-data').addEventListener('click', exportData);

function exportToCSV(data) {
    chrome.storage.local.get('pomodoroData', (data) => {
        if (data.pomodoroData) {
            const csvContent = convertToCSV(data.pomodoroData);
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'pomodoro_data.csv';
            link.click();
        }
    });
}

function exportData() {
    chrome.storage.local.get('pomodoroData', (data) => {
        if (data.pomodoroData) {
            const jsonContent = JSON.stringify(data.pomodoroData, null, 2);
            const blob = new Blob([jsonContent], { type: 'application/json' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'pomodoro_backup.json';
            link.click();
        }
    });
}

function convertToCSV(data) {
    // CSV 변환 로직 구현
    return 'Date,Duration,Type\n' + data.map(item => 
        `${item.date},${item.duration},${item.type}`
    ).join('\n');
}

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