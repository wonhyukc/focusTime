// 프로젝트 기록 저장 키
const PROJECT_HISTORY_KEY = 'projectHistory';
const MAX_HISTORY_SIZE = 10; // 기록 최대 개수 (선택 사항)

// 기본 설정값 정의
const DEFAULT_SETTINGS = {
    projectName: "집중 시간 도우미 설정",
    focus: {
        duration: 25,
        sound: "beep",
        soundVolume: 50,
        soundType: "low-short-beep",
        desktopNotification: true,
        tabNotification: false,
        playSound: false
    },
    shortBreak: {
        duration: 5,
        sound: "beep",
        soundVolume: 50,
        soundType: "low-short-beep",
        desktopNotification: true,
        tabNotification: false
    },
    longBreak: {
        duration: 15,
        startAfter: 4,
        sound: "beep",
        soundVolume: 50,
        soundType: "low-short-beep",
        desktopNotification: true,
        tabNotification: false
    }
};

function getInputNumberOrDefault(id, defaultValue = 100) {
    const el = document.getElementById(id);
    if (!el) return defaultValue;
    const v = parseInt(el.value);
    return isNaN(v) ? defaultValue : v;
}

// 현재 설정 가져오기
function getCurrentSettings() {
    const settings = {
        projectName: document.getElementById('project-name')?.value || DEFAULT_SETTINGS.projectName,
        focus: {
            duration: parseInt(document.getElementById('focus-duration')?.value) || DEFAULT_SETTINGS.focus.duration,
            sound: document.getElementById('focus-sound')?.value,
            soundType: document.getElementById('focus-sound-type')?.value,
            soundVolume: parseInt(document.getElementById('focus-sound-volume')?.value) || DEFAULT_SETTINGS.focus.soundVolume,
            desktopNotification: document.getElementById('focus-desktop-notification')?.checked,
            tabNotification: document.getElementById('focus-tab-notification')?.checked,
            playSound: false
        },
        shortBreak: {
            duration: parseInt(document.getElementById('short-break-duration')?.value) || DEFAULT_SETTINGS.shortBreak.duration,
            sound: document.getElementById('short-break-sound')?.value,
            soundType: document.getElementById('short-break-sound-type')?.value,
            soundVolume: parseInt(document.getElementById('short-break-sound-volume')?.value) || DEFAULT_SETTINGS.shortBreak.soundVolume,
            desktopNotification: document.getElementById('short-break-desktop-notification')?.checked,
            tabNotification: document.getElementById('short-break-tab-notification')?.checked
        },
        longBreak: {
            duration: parseInt(document.getElementById('long-break-duration')?.value) || DEFAULT_SETTINGS.longBreak.duration,
            startAfter: parseInt(document.getElementById('long-break-start')?.value) || DEFAULT_SETTINGS.longBreak.startAfter,
            sound: document.getElementById('long-break-sound')?.value,
            soundType: document.getElementById('long-break-sound-type')?.value,
            soundVolume: parseInt(document.getElementById('long-break-sound-volume')?.value) || DEFAULT_SETTINGS.longBreak.soundVolume,
            desktopNotification: document.getElementById('long-break-desktop-notification')?.checked,
            tabNotification: document.getElementById('long-break-tab-notification')?.checked
        }
    };
    console.log("Current settings:", settings);
    return settings;
}

// 설정 적용하기
async function applySettings(settings) {
    try {
        // 프로젝트 이름 설정
        const projectNameElement = document.getElementById('project-name');
        if (projectNameElement) {
            projectNameElement.value = settings.projectName || DEFAULT_SETTINGS.projectName;
        }

        // Focus 설정
        const focusDurationElement = document.getElementById('focus-duration');
        if (focusDurationElement) {
            focusDurationElement.value = settings.focus.duration;
        }

        const focusSoundElement = document.getElementById('focus-sound');
        if (focusSoundElement) {
            focusSoundElement.value = settings.focus.sound;
        }

        const focusSoundTypeElement = document.getElementById('focus-sound-type');
        if (focusSoundTypeElement) {
            focusSoundTypeElement.value = settings.focus.soundType;
        }

        const focusSoundVolumeElement = document.getElementById('focus-sound-volume');
        if (focusSoundVolumeElement) {
            focusSoundVolumeElement.value = settings.focus.soundVolume;
        }

        const focusDesktopNotificationElement = document.getElementById('focus-desktop-notification');
        if (focusDesktopNotificationElement) {
            focusDesktopNotificationElement.checked = settings.focus.desktopNotification;
        }

        const focusTabNotificationElement = document.getElementById('focus-tab-notification');
        if (focusTabNotificationElement) {
            focusTabNotificationElement.checked = settings.focus.tabNotification;
        }

        // Short Break 설정
        document.getElementById('short-break-duration').value = settings.shortBreak.duration;
        const shortBreakSoundEl = document.getElementById('short-break-sound');
        if (shortBreakSoundEl) shortBreakSoundEl.value = settings.shortBreak.sound;
        const shortBreakSoundTypeEl = document.getElementById('short-break-sound-type');
        if (shortBreakSoundTypeEl) shortBreakSoundTypeEl.value = settings.shortBreak.soundType;
        document.getElementById('short-break-desktop-notification').checked = settings.shortBreak.desktopNotification;
        document.getElementById('short-break-tab-notification').checked = settings.shortBreak.tabNotification;

        // Long Break 설정
        document.getElementById('long-break-duration').value = settings.longBreak.duration;
        document.getElementById('long-break-start').value = settings.longBreak.startAfter;
        const longBreakSoundEl = document.getElementById('long-break-sound');
        if (longBreakSoundEl) longBreakSoundEl.value = settings.longBreak.sound;
        const longBreakSoundTypeEl = document.getElementById('long-break-sound-type');
        if (longBreakSoundTypeEl) longBreakSoundTypeEl.value = settings.longBreak.soundType;
        document.getElementById('long-break-desktop-notification').checked = settings.longBreak.desktopNotification;
        document.getElementById('long-break-tab-notification').checked = settings.longBreak.tabNotification;

        // 설정을 Chrome storage에 저장
        chrome.storage.sync.set({ settings }, async () => {
            if (chrome.runtime.lastError) {
                console.error('Error saving settings:', chrome.runtime.lastError);
                showToast('설정 저장 중 오류 발생', 'error');
            } else {
                console.log('Settings saved successfully');
                // 프로젝트 이름이 있으면 기록에 추가
                if (settings.projectName) {
                    await addProjectToHistory(settings.projectName);
                }
            }
        });
    } catch (error) {
        console.error("Error applying settings:", error);
        showToast('설정 적용 중 오류 발생', 'error');
    }
}

// 프로젝트 기록에 이름 추가
async function addProjectToHistory(projectName) {
    if (!projectName) return; // 빈 이름은 추가하지 않음

    try {
        const result = await chrome.storage.local.get([PROJECT_HISTORY_KEY]);
        let history = result[PROJECT_HISTORY_KEY] || [];

        // 중복 제거 및 최신화 (기존 이름이 있으면 맨 앞으로)
        history = history.filter(item => item !== projectName);
        history.unshift(projectName);

        // 최대 크기 제한
        if (history.length > MAX_HISTORY_SIZE) {
            history = history.slice(0, MAX_HISTORY_SIZE);
        }

        await chrome.storage.local.set({ [PROJECT_HISTORY_KEY]: history });
        console.log('Project history updated:', history);
        // datalist 업데이트
        populateDataList(history);

    } catch (error) {
        console.error("Error adding project to history:", error);
    }
}

// 프로젝트 기록 불러와서 datalist 채우기
async function loadProjectHistory() {
    try {
        const result = await chrome.storage.local.get([PROJECT_HISTORY_KEY]);
        const history = result[PROJECT_HISTORY_KEY] || [];
        populateDataList(history);
    } catch (error) {
        console.error("Error loading project history:", error);
    }
}

// datalist 채우는 헬퍼 함수
function populateDataList(history) {
    const dataList = document.getElementById('project-history-list');
    if (!dataList) return;

    dataList.innerHTML = ''; // 기존 옵션 제거
    history.forEach(item => {
        const option = document.createElement('option');
        option.value = item;
        dataList.appendChild(option);
    });
}

// 설정 내보내기
function exportSettings() {
    try {
        const settings = getCurrentSettings();
        console.log("Settings to export:", settings);
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(settings, null, 2));
        console.log("Data string:", dataStr.substring(0, 100) + "...");
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "pomodoro_settings.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        showToast('설정이 내보내기되었습니다.', 'success');
    } catch (error) {
        console.error("Error exporting settings:", error);
        showToast('설정 내보내기 중 오류 발생', 'error');
    }
}

// 설정 가져오기
function importSettings(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const settings = JSON.parse(e.target.result);
            applySettings(settings);
            showToast('설정이 가져오기되었습니다.', 'success');
        } catch (error) {
            showToast('잘못된 설정 파일입니다.', 'error');
        }
    };
    reader.readAsText(file);
}

// 설정 초기화
function resetSettings() {
    if (confirm('모든 설정을 초기값으로 되돌리시겠습니까?')) {
        applySettings(DEFAULT_SETTINGS);
        showToast('설정이 초기화되었습니다.', 'success');
    }
}

// 토스트 메시지 표시
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// 이벤트 리스너 등록
document.addEventListener('DOMContentLoaded', async () => {
    await loadProjectHistory(); // 프로젝트 기록 로드 먼저

    // 초기 설정 로드 및 적용
    chrome.storage.sync.get('settings', (result) => {
        let initialSettings;
        if (result.settings) {
            initialSettings = result.settings;
             // 저장된 설정 적용 (프로젝트 이름 포함)
             applySettings(initialSettings); // applySettings가 필드 채우도록 변경
        } else {
            initialSettings = DEFAULT_SETTINGS; // 저장된 설정 없으면 새 기본값 사용
             applySettings(initialSettings); // 기본 설정 적용
        }
    });

    // 내보내기 버튼
    document.getElementById('export-settings').addEventListener('click', exportSettings);

    // 가져오기 버튼 및 파일 input 이벤트(중복 방지)
    const importBtn = document.getElementById('import-settings');
    const fileInput = document.getElementById('settings-file-input');
    if (importBtn && fileInput) {
        importBtn.onclick = () => fileInput.click();
        fileInput.onchange = (e) => {
            if (e.target.files.length > 0) {
                importSettings(e); // 반드시 이벤트 객체를 넘김
                e.target.value = ''; // 입력 초기화
            }
        };
    }

    // 초기화 버튼
    document.getElementById('reset-settings').addEventListener('click', resetSettings);

    // 설정 변경 시 자동 저장 (applySettings 호출로 변경)
    document.querySelectorAll('input, select').forEach(element => {
        element.addEventListener('change', () => {
            const settings = getCurrentSettings();
            applySettings(settings); // 변경 시 applySettings 호출 (내부에서 저장 및 기록 추가)
        });
    });
}); 