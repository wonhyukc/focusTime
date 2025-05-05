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

    // 타이머 소리 옵션 동적 생성 함수 호출
    populateTimerSoundOptions('focus-sound');
    populateTimerSoundOptions('short-break-sound');
    populateTimerSoundOptions('long-break-sound');

    // 설정 저장 기능
    const settingsForm = document.querySelectorAll('.timer-settings input, .timer-settings select');
    settingsForm.forEach(input => {
        input.addEventListener('change', saveSettings);
    });

    // 설정 로드
    loadSettings();

    // Let stats-display.js handle chart initialization
    // Use window.dashboardChartInitialized to avoid duplicate initialization
    if (!window.statsDisplayLoaded) {
        setTimeout(initializeCharts, 500); // Give Chart.js more time to load
    }

    // 설정 내보내기/가져오기/초기화 기능
    document.getElementById('export-settings').addEventListener('click', exportSettings);
    document.getElementById('reset-settings').addEventListener('click', resetSettings);

    // 통계 내보내기/가져오기/초기화 기능
    document.getElementById('export-stats').addEventListener('click', exportStats);
    document.getElementById('import-stats').addEventListener('click', () => {
        if (confirm('통계 가져오기에 기존 데이터는 모두 지워집니다. 기존 데이터가 필요하면 먼저 통계 내보내기를 하세요. 계속 진행할까요?')) {
            document.getElementById('stats-file-input').click();
        }
    });
    document.getElementById('reset-stats').addEventListener('click', resetStats);
    // 통계 파일 입력 변경 이벤트 리스너 등록
    document.getElementById('stats-file-input').addEventListener('change', handleStatsFileImport);

    // 볼륨 슬라이더 변경 시 로그 출력
    function logVolumeChange(soundType, volume) {
    }

    document.getElementById('focus-sound-volume')?.addEventListener('input', function(e) {
    });
    document.getElementById('focus-sound-volume')?.addEventListener('change', function(e) {
    });
    document.getElementById('short-break-sound-volume')?.addEventListener('input', function(e) {
    });
    document.getElementById('short-break-sound-volume')?.addEventListener('change', function(e) {
    });
    document.getElementById('long-break-sound-volume')?.addEventListener('input', function(e) {
    });
    document.getElementById('long-break-sound-volume')?.addEventListener('change', function(e) {
    });
    document.getElementById('focus-sound-type-volume')?.addEventListener('input', function(e) {
    });
    document.getElementById('focus-sound-type-volume')?.addEventListener('change', function(e) {
    });
});

// '타이머 소리' 드롭다운 옵션 생성 함수
function populateTimerSoundOptions(selectElementId) {
    const selectElement = document.getElementById(selectElementId);
    if (!selectElement) return;

    const timerSoundOptions = [
        { value: 'beep', text: '짧은 beep' },
        { value: 'gong', text: '공(Gong)' }
    ];

    selectElement.innerHTML = ''; // 기존 옵션 제거

    timerSoundOptions.forEach(optionData => {
        const option = document.createElement('option');
        option.value = optionData.value;
        option.textContent = optionData.text;
        selectElement.appendChild(option);
    });
}

// 설정 저장
function saveSettings() {
    const settings = {
        focus: {
            duration: parseInt(document.getElementById('focus-duration').value),
            sound: document.getElementById('focus-sound').value,
            soundVolume: parseInt(document.getElementById('focus-sound-volume').value),
            soundType: document.getElementById('focus-sound-type').value,
            soundTypeVolume: parseInt(document.getElementById('focus-sound-type-volume').value),
            desktopNotification: document.getElementById('focus-desktop-notification').checked,
            tabNotification: document.getElementById('focus-tab-notification').checked
        },
        shortBreak: {
            duration: parseInt(document.getElementById('short-break-duration').value),
            sound: document.getElementById('short-break-sound').value,
            soundVolume: parseInt(document.getElementById('short-break-sound-volume').value),
            desktopNotification: document.getElementById('short-break-desktop-notification').checked,
            tabNotification: document.getElementById('short-break-tab-notification').checked
        },
        longBreak: {
            duration: parseInt(document.getElementById('long-break-duration').value),
            startAfter: parseInt(document.getElementById('long-break-start').value),
            sound: document.getElementById('long-break-sound').value,
            soundVolume: parseInt(document.getElementById('long-break-sound-volume').value),
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
            if (focus.sound) {
                document.getElementById('focus-sound').value = focus.sound;
            }
            if (focus.soundType) {
                document.getElementById('focus-sound-type').value = focus.soundType;
            }
            document.getElementById('focus-sound-volume').value = (typeof focus.soundVolume === 'number') ? focus.soundVolume : 100;
            document.getElementById('focus-sound-type-volume').value = (typeof focus.soundTypeVolume === 'number') ? focus.soundTypeVolume : 100;
            document.getElementById('focus-desktop-notification').checked = focus.desktopNotification;
            document.getElementById('focus-tab-notification').checked = focus.tabNotification;

            // 짧은 휴식 설정
            document.getElementById('short-break-duration').value = shortBreak.duration;
            if (shortBreak.sound) {
                document.getElementById('short-break-sound').value = shortBreak.sound;
            }
            document.getElementById('short-break-sound-volume').value = (typeof shortBreak.soundVolume === 'number') ? shortBreak.soundVolume : 100;
            document.getElementById('short-break-desktop-notification').checked = shortBreak.desktopNotification;
            document.getElementById('short-break-tab-notification').checked = shortBreak.tabNotification;

            // 긴 휴식 설정
            document.getElementById('long-break-start').value = longBreak.startAfter;
            document.getElementById('long-break-duration').value = longBreak.duration;
            if (longBreak.sound) {
                document.getElementById('long-break-sound').value = longBreak.sound;
            }
            document.getElementById('long-break-sound-volume').value = (typeof longBreak.soundVolume === 'number') ? longBreak.soundVolume : 100;
            document.getElementById('long-break-desktop-notification').checked = longBreak.desktopNotification;
            document.getElementById('long-break-tab-notification').checked = longBreak.tabNotification;
        }
    });
}

// 소리 미리듣기
document.querySelectorAll('.preview-sound').forEach(button => {
    button.addEventListener('click', () => {
        // 버튼 바로 앞의 select 요소 가져오기
        const soundSelect = button.previousElementSibling;
        let volume = 100;
        // 볼륨 input은 select 다음 또는 버튼 다음에 위치
        if (soundSelect && soundSelect.tagName === 'SELECT') {
            // 볼륨 input 찾기 (형제 노드 중 input[type=number])
            let sibling = button.nextElementSibling;
            while (sibling) {
                if (sibling.tagName === 'INPUT' && sibling.type === 'number') {
                    volume = parseInt(sibling.value) || 100;
                    break;
                }
                sibling = sibling.nextElementSibling;
            }
            const soundType = soundSelect.value;
            chrome.runtime.sendMessage({ 
                action: 'playSound',
                soundType: soundType,
                isPreview: true,
                volume: volume
            });
        }
    });
});

// 차트 초기화
function initializeCharts() {
    // Check if Chart is defined before using it
    if (typeof Chart === 'undefined') {
        setTimeout(initializeCharts, 500);
        return;
    }
    
    try {
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
    } catch (error) {
    }
}

// 피드백 제출
document.getElementById('feedback-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const feedback = document.getElementById('feedback-text').value;
    // 여기에 피드백 제출 로직 추가
    document.getElementById('feedback-text').value = '';
    alert('피드백이 제출되었습니다. 감사합니다!');
});

// 설정 내보내기
function exportSettings() {
    chrome.storage.sync.get('settings', (data) => {
        if (data.settings) {
            // 볼륨 값이 없으면 100으로 보정
            if (typeof data.settings.focus.soundVolume !== 'number') data.settings.focus.soundVolume = 100;
            if (typeof data.settings.focus.soundTypeVolume !== 'number') data.settings.focus.soundTypeVolume = 100;
            if (typeof data.settings.shortBreak.soundVolume !== 'number') data.settings.shortBreak.soundVolume = 100;
            if (typeof data.settings.longBreak.soundVolume !== 'number') data.settings.longBreak.soundVolume = 100;
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
        throw new Error("CSV 헤더에 필요한 열('시작시각(년월일시분)', '세션', '지속시간', '프로젝트')이 없습니다.");
    }

    // 세션 타입 매핑 테이블
    const sessionTypeMap = {
        '집중': 'focus',
        '휴식': 'shortBreak',
        '긴휴식': 'longBreak'
    };

    const history = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue; // 빈 줄 건너뛰기

        // 간단한 CSV 파싱 (쉼표만 구분, 복잡한 따옴표 처리 없음)
        // TODO: 필요시 더 강력한 CSV 파서 라이브러리 사용 고려
        const values = line.split(',');

        if (values.length < Math.max(startIndex, sessionIndex, durationIndex, projectIndex) + 1) {
            continue;
        }

        // 값에서 앞뒤 공백 제거
        const startTime = values[startIndex]?.trim();
        const sessionCsv = values[sessionIndex]?.trim();
        const durationStr = values[durationIndex]?.trim();
        const projectName = values[projectIndex]?.trim() || "N/A"; // 프로젝트 이름 없으면 N/A

        // 데이터 변환 및 유효성 검사
        const sessionType = sessionTypeMap[sessionCsv] || null; // 매핑 테이블 사용
        const durationMinutes = parseInt(durationStr);

        if (!startTime || !sessionType || isNaN(durationMinutes)) {
            continue;
        }

        // 내부 데이터 형식으로 변환
        history.push({
            startTime: startTime,
            type: sessionType,
            durationMinutes: durationMinutes,
            projectName: projectName
        });
    }
    return history;
}

// 통계 가져오기 (중복 함수 제거: importStats 대신 handleStatsFileImport 사용)
function handleStatsFileImport(event) {
    if (event.target.files && event.target.files.length > 0) {
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const fileContent = event.target.result;
                const parsedHistory = parseCsvToHistory(fileContent); // CSV 파싱

                if (parsedHistory.length === 0) {
                     showToast('CSV 파일에서 유효한 데이터를 찾을 수 없습니다.', 'warning');
                     return;
                }

                const response = await chrome.runtime.sendMessage({ action: 'importParsedStats', data: parsedHistory });

                if (response?.success) {
                    showToast(response.message || '통계가 성공적으로 가져오기되었습니다.');

                    setTimeout(() => {
                        if (typeof loadAndProcessStats === 'function') {
                            loadAndProcessStats(); // stats-display.js의 함수 호출
                        } else {
                             showToast('통계 UI를 업데이트하려면 페이지를 새로고침하세요.', 'info');
                        }
                    }, 500); // 500ms (0.5초) 지연 후 호출

                } else {
                    showToast(response?.message || '통계 가져오기 실패', 'error');
                }
            } catch (error) {
                showToast(`파일 처리 오류: ${error.message}`, 'error');
            }
        };
        reader.onerror = (event) => {
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
            if (response?.success) {
                showToast('통계가 초기화되었습니다.');
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

// 내보내기 버튼 클릭
document.getElementById('export-stats')?.addEventListener('click', async () => {
    try {
        const response = await chrome.runtime.sendMessage({ action: 'exportStats' });
        if (response?.success) {
            // Background에서 받은 데이터 URI로 다운로드 링크 생성 및 클릭
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", response.dataUri);
            downloadAnchorNode.setAttribute("download", response.filename);
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
            showToast('통계가 내보내기되었습니다.');
        } else {
            showToast(response?.message || '통계 내보내기 실패', 'error');
        }
    } catch (error) {
        showToast('내보내기 요청 중 오류 발생', 'error');
    }
});

// 백그라운드에서 통계 업데이트 메시지 수신
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "statsUpdated") {
         sendResponse({ success: true }); // 메시지 수신 확인 응답
    }
    // 다른 메시지 처리 로직...
    // return true; // 다른 비동기 리스너가 없다면 불필요
});

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