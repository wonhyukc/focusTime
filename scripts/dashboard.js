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

// --- CSV 파싱 함수 ---
function parseCsvToHistory(csvText) {
    const lines = csvText.trim().split(/\r?\n/); // 줄바꿈 처리 (\n 또는 \r\n)
    if (lines.length < 2) {
        throw new Error("CSV 파일에 헤더 또는 데이터가 없습니다.");
    }

    const headerLine = lines[0];
    // 헤더 이름의 공백 제거 및 정확한 이름 매칭
    const headers = headerLine.split(',').map(h => h.trim());

    // 필수 헤더 인덱스 찾기
    const startIndex = headers.indexOf('시작시각(년월일시분)');
    const sessionIndex = headers.indexOf('세션');
    const durationIndex = headers.indexOf('지속시간');
    const projectIndex = headers.indexOf('프로젝트');

    if (startIndex === -1 || sessionIndex === -1 || durationIndex === -1 || projectIndex === -1) {
        console.error("찾은 헤더:", headers); // 실제 헤더 로그 출력
        throw new Error("CSV 헤더에 필요한 열('시작시각(년월일시분)', '세션', '지속시간', '프로젝트')이 없습니다.");
    }

    const history = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue; // 빈 줄 건너뛰기

        // 간단한 CSV 파싱 (쉼표만 구분, 복잡한 따옴표 처리 없음)
        // TODO: 필요시 더 강력한 CSV 파서 라이브러리 사용 고려
        const values = line.split(',');

        if (values.length < headers.length) {
             console.warn(`Skipping incomplete CSV row ${i + 1}: ${line}`);
            continue;
        }

         // 값에서 앞뒤 공백 제거
         const startTime = values[startIndex]?.trim();
         const sessionCsv = values[sessionIndex]?.trim();
         const durationStr = values[durationIndex]?.trim();
         const projectName = values[projectIndex]?.trim() || "N/A"; // 프로젝트 이름 없으면 N/A

         // 데이터 변환 및 유효성 검사
        const sessionType = sessionCsv === '집중' ? 'focus' : (sessionCsv === '휴식' ? 'shortBreak' : null); // 휴식은 shortBreak로 가정
         const durationMinutes = parseInt(durationStr);

         if (!startTime || !sessionType || isNaN(durationMinutes)) {
             console.warn(`Skipping invalid data in CSV row ${i + 1}: ${line}`);
             continue;
         }

         // 내부 데이터 형식으로 변환
         history.push({
             startTime: startTime, // ISO 문자열로 가정
             type: sessionType,
             durationMinutes: durationMinutes,
             projectName: projectName
             // endTime은 CSV에 없으므로 생략
         });
    }
    return history;
}

// 통계 가져오기
function importStats(event) {
    if (event.target.files && event.target.files.length > 0) {
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const fileContent = event.target.result;
                // CSV 파싱
                const parsedHistory = parseCsvToHistory(fileContent);

                if (parsedHistory.length === 0) {
                     showToast('CSV 파일에서 유효한 데이터를 찾을 수 없습니다.', 'warning');
                     return;
                }

                // 파싱된 데이터를 background로 전송 (새 action 사용)
                const response = await chrome.runtime.sendMessage({ action: 'importParsedStats', data: parsedHistory });
                console.log("Import parsed stats response:", response);

                if (response?.success) {
                    showToast(response.message || '통계가 성공적으로 가져오기되었습니다.', 'success');
                    // 통계 UI 갱신
                    if (typeof loadAndProcessStats === 'function') {
                        loadAndProcessStats(); // stats-display.js의 함수 호출
                    } else {
                         console.warn("loadAndProcessStats function not found for UI update.");
                    }
                } else {
                    showToast(response?.message || '통계 가져오기 실패', 'error');
                }
            } catch (error) {
                console.error("Error parsing or importing CSV stats file:", error);
                showToast(`파일 처리 오류: ${error.message}`, 'error');
            }
        };
        reader.onerror = (event) => {
            console.error("File reading error:", event);
            showToast('파일을 읽는 중 오류가 발생했습니다.', 'error');
        };
        reader.readAsText(file); // 파일을 텍스트로 읽기
        event.target.value = ''; // 입력 필드 초기화
    }
}

// 통계 초기화
function resetStats() {
    if (confirm('정말로 모든 통계 기록을 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        chrome.runtime.sendMessage({ action: 'resetStats' }, (response) => {
            console.log("Reset response:", response); // 응답 로그 추가
            if (response?.success) {
                showToast('통계가 초기화되었습니다.', 'success');
                // 통계 UI 갱신 로직 호출 (화면 비우기)
                if (typeof clearStatsDisplay === 'function') {
                     clearStatsDisplay(); // stats-display.js의 함수 호출
                }
            } else {
                 showToast(response?.message || '통계 초기화 실패', 'error');
            }
        });
    }
}

// --- 통계 탭 기능 ---

// 내보내기 버튼 클릭
document.getElementById('export-stats')?.addEventListener('click', async () => {
    try {
        const response = await chrome.runtime.sendMessage({ action: 'exportStats' });
        console.log("Export response:", response); // 응답 로그 추가
        if (response?.success) {
            // Background에서 받은 데이터 URI로 다운로드 링크 생성 및 클릭
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", response.dataUri);
            downloadAnchorNode.setAttribute("download", response.filename);
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
            showToast('통계가 내보내기되었습니다.', 'success'); // showToast 함수 필요
        } else {
            showToast(response?.message || '통계 내보내기 실패', 'error');
        }
    } catch (error) {
        console.error("Error sending export message:", error);
        showToast('내보내기 요청 중 오류 발생', 'error');
    }
});

// 가져오기 버튼 클릭
document.getElementById('import-stats')?.addEventListener('click', () => {
    document.getElementById('stats-file-input')?.click();
});

// 통계 파일 입력 변경
document.getElementById('stats-file-input')?.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const fileContent = event.target.result;
                // CSV 파싱
                const parsedHistory = parseCsvToHistory(fileContent);

                if (parsedHistory.length === 0) {
                     showToast('CSV 파일에서 유효한 데이터를 찾을 수 없습니다.', 'warning');
                     return;
                }

                // 파싱된 데이터를 background로 전송 (새 action 사용)
                const response = await chrome.runtime.sendMessage({ action: 'importParsedStats', data: parsedHistory });
                console.log("Import parsed stats response:", response);

                if (response?.success) {
                    showToast(response.message || '통계가 성공적으로 가져오기되었습니다.', 'success');
                    // 통계 UI 갱신
                    if (typeof loadAndProcessStats === 'function') {
                        loadAndProcessStats(); // stats-display.js의 함수 호출
                    } else {
                         console.warn("loadAndProcessStats function not found for UI update.");
                    }
                } else {
                    showToast(response?.message || '통계 가져오기 실패', 'error');
                }
            } catch (error) {
                console.error("Error parsing or importing CSV stats file:", error);
                showToast(`파일 처리 오류: ${error.message}`, 'error');
            }
        };
        reader.onerror = (event) => {
            console.error("File reading error:", event);
            showToast('파일을 읽는 중 오류가 발생했습니다.', 'error');
        };
        reader.readAsText(file); // 파일을 텍스트로 읽기
        e.target.value = ''; // 입력 필드 초기화
    }
});

// 초기화 버튼 클릭
document.getElementById('reset-stats')?.addEventListener('click', () => {
    if (confirm('정말로 모든 통계 기록을 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        chrome.runtime.sendMessage({ action: 'resetStats' }, (response) => {
            console.log("Reset response:", response); // 응답 로그 추가
            if (response?.success) {
                showToast('통계가 초기화되었습니다.', 'success');
                // 통계 UI 갱신 로직 호출 (화면 비우기)
                if (typeof clearStatsDisplay === 'function') {
                     clearStatsDisplay(); // stats-display.js의 함수 호출
                }
            } else {
                 showToast(response?.message || '통계 초기화 실패', 'error');
            }
        });
    }
});

// 백그라운드에서 통계 업데이트 메시지 수신 (선택 사항)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "statsUpdated") {
        console.log("Stats updated message received from background.");
        // TODO: 통계 UI 갱신 로직 호출
        // loadAndDisplayStats();
         sendResponse({ success: true }); // 메시지 수신 확인 응답
    }
    // 다른 메시지 처리 로직...
    // return true; // 다른 비동기 리스너가 없다면 불필요
});

// TODO: 통계 UI 로드 및 표시 함수 (예: loadAndDisplayStats)
// TODO: 통계 UI 초기화 함수 (예: clearStatsDisplay)
// 페이지 로드 시 통계 표시 함수 호출 필요
// document.addEventListener('DOMContentLoaded', loadAndDisplayStats);

// showToast 함수 정의 (settings.js와 중복 방지를 위해 필요시 여기에만 두거나 공통 파일로 분리)
if (typeof showToast === 'undefined') { // 이미 정의되지 않았을 경우에만 정의
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => { toast.classList.add('show'); }, 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => { 
                if (document.body.contains(toast)) {
                     document.body.removeChild(toast); 
                }
            }, 300);
        }, 3000);
    }
} 