// 프로젝트 기록 저장 키
const PROJECT_HISTORY_KEY = 'projectHistory';
const MAX_HISTORY_SIZE = 10; // 기록 최대 개수 (선택 사항)

// 기본 설정값 정의
const DEFAULT_SETTINGS = {
    projectName: "포모로그 설정",
    focus: {
        duration: 25,
        sound: "beep",
        soundVolume: 100, // 종료음 볼륨
        soundType: "low-short-beep",
        soundTypeVolume: 15, // 재생음 볼륨
        desktopNotification: true,
        tabNotification: false
    },
    shortBreak: {
        duration: 5,
        sound: "beep",
        soundVolume: 100, // 종료음 볼륨
        soundType: "low-short-beep",
        soundTypeVolume: 15, // 재생음 볼륨
        desktopNotification: true,
        tabNotification: false
    },
    longBreak: {
        duration: 15,
        startAfter: 4,
        sound: "beep",
        soundVolume: 100, // 종료음 볼륨
        soundType: "low-short-beep",
        soundTypeVolume: 15, // 재생음 볼륨
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
    const getNumberOrDefault = (id, def) => {
        const el = document.getElementById(id);
        if (!el) return def;
        const v = parseInt(el.value);
        return isNaN(v) ? def : v;
    };
    // 볼륨 유효성 검사 함수
    const clampVolume = (v, el, def = 10) => {
        if (typeof v !== 'number' || isNaN(v)) return def;
        if (v < 0 || v > 100) {
            showToast('볼륨은 0~100 사이의 값만 입력할 수 있습니다.', 'error');
            if (el) el.value = def;
            return def;
        }
        return v;
    };
    const settings = {
        projectName: document.getElementById('project-name')?.value || DEFAULT_SETTINGS.projectName,
        focus: {
            duration: getNumberOrDefault('focus-duration', DEFAULT_SETTINGS.focus.duration),
            sound: document.getElementById('focus-sound')?.value,
            soundType: document.getElementById('focus-sound-type')?.value,
            soundVolume: clampVolume(getNumberOrDefault('focus-sound-volume', DEFAULT_SETTINGS.focus.soundVolume), document.getElementById('focus-sound-volume'), DEFAULT_SETTINGS.focus.soundVolume),
            soundTypeVolume: clampVolume(getNumberOrDefault('focus-sound-type-volume', DEFAULT_SETTINGS.focus.soundTypeVolume), document.getElementById('focus-sound-type-volume'), DEFAULT_SETTINGS.focus.soundTypeVolume),
            desktopNotification: document.getElementById('focus-desktop-notification')?.checked,
            tabNotification: document.getElementById('focus-tab-notification')?.checked
        },
        shortBreak: {
            duration: getNumberOrDefault('short-break-duration', DEFAULT_SETTINGS.shortBreak.duration),
            sound: document.getElementById('short-break-sound')?.value,
            soundType: document.getElementById('short-break-sound-type')?.value,
            soundVolume: clampVolume(getNumberOrDefault('short-break-sound-volume', DEFAULT_SETTINGS.shortBreak.soundVolume), document.getElementById('short-break-sound-volume'), DEFAULT_SETTINGS.shortBreak.soundVolume),
            soundTypeVolume: clampVolume(getNumberOrDefault('short-break-sound-type-volume', DEFAULT_SETTINGS.shortBreak.soundTypeVolume), document.getElementById('short-break-sound-type-volume'), DEFAULT_SETTINGS.shortBreak.soundTypeVolume),
            desktopNotification: document.getElementById('short-break-desktop-notification')?.checked,
            tabNotification: document.getElementById('short-break-tab-notification')?.checked
        },
        longBreak: {
            duration: getNumberOrDefault('long-break-duration', DEFAULT_SETTINGS.longBreak.duration),
            startAfter: getNumberOrDefault('long-break-start', DEFAULT_SETTINGS.longBreak.startAfter),
            sound: document.getElementById('long-break-sound')?.value,
            soundType: document.getElementById('long-break-sound-type')?.value,
            soundVolume: clampVolume(getNumberOrDefault('long-break-sound-volume', DEFAULT_SETTINGS.longBreak.soundVolume), document.getElementById('long-break-sound-volume'), DEFAULT_SETTINGS.longBreak.soundVolume),
            soundTypeVolume: clampVolume(getNumberOrDefault('long-break-sound-type-volume', DEFAULT_SETTINGS.longBreak.soundTypeVolume), document.getElementById('long-break-sound-type-volume'), DEFAULT_SETTINGS.longBreak.soundTypeVolume),
            desktopNotification: document.getElementById('long-break-desktop-notification')?.checked,
            tabNotification: document.getElementById('long-break-tab-notification')?.checked
        }
    };
    return settings;
}

function mergeWithDefaultSettings(userSettings) {
    const DEFAULT_SETTINGS_BG = {
        projectName: "포모로그 설정",
        version: "1.0",
        focus: {
            duration: 25,
            sound: "beep",
            soundVolume: 100,
            soundType: "brown_noise",
            desktopNotification: true,
            tabNotification: true
        },
        shortBreak: {
            duration: 5,
            sound: "beep",
            soundVolume: 100,
            desktopNotification: true,
            tabNotification: true
        },
        longBreak: {
            duration: 15,
            startAfter: 4,
            sound: "beep",
            soundVolume: 100,
            desktopNotification: true,
            tabNotification: true
        },
        general: {
            soundEnabled: true,
            autoStartBreaks: false,
            autoStartPomodoros: false,
            availableSounds: [
                { name: "기본 비프음", value: "low-short-beep" },
                { name: "공(Gong)", value: "gong" },
                { name: "Brown Noise", value: "brown_noise" },
                { name: "Rainy Day", value: "rainy_birds" },
                { name: "Clock Ticking", value: "clock_ticking" }
            ]
        }
    };
    return {
        projectName: userSettings.projectName ?? DEFAULT_SETTINGS_BG.projectName,
        version: DEFAULT_SETTINGS_BG.version,
        focus: { ...DEFAULT_SETTINGS_BG.focus, ...(userSettings.focus || {}) },
        shortBreak: { ...DEFAULT_SETTINGS_BG.shortBreak, ...(userSettings.shortBreak || {}) },
        longBreak: { ...DEFAULT_SETTINGS_BG.longBreak, ...(userSettings.longBreak || {}) },
        general: { ...DEFAULT_SETTINGS_BG.general, ...(userSettings.general || {}) }
    };
}

// 설정 적용하기
async function applySettings(settings) {
    try {
        // version 필드 강제 추가
        if (!settings.version) {
            settings.version = '1.0';
        }
        // 병합: 누락된 필드는 기본값으로 채움
        const mergedSettings = mergeWithDefaultSettings(settings);
        // 프로젝트 이름 설정
        const projectNameElement = document.getElementById('project-name');
        if (projectNameElement) {
            projectNameElement.value = mergedSettings.projectName || DEFAULT_SETTINGS.projectName;
        }

        // Focus 설정
        const focusDurationElement = document.getElementById('focus-duration');
        if (focusDurationElement) {
            focusDurationElement.value = mergedSettings.focus.duration;
        }

        const focusSoundElement = document.getElementById('focus-sound');
        if (focusSoundElement) {
            focusSoundElement.value = mergedSettings.focus.sound;
        }

        const focusSoundTypeElement = document.getElementById('focus-sound-type');
        if (focusSoundTypeElement) {
            focusSoundTypeElement.value = mergedSettings.focus.soundType;
        }

        const focusSoundVolumeElement = document.getElementById('focus-sound-volume');
        if (focusSoundVolumeElement) {
            focusSoundVolumeElement.value = mergedSettings.focus.soundVolume;
            focusSoundVolumeElement.addEventListener('input', (e) => {
                const settings = getCurrentSettings();
                applySettings(settings);
            });
            focusSoundVolumeElement.addEventListener('change', (e) => {
                const settings = getCurrentSettings();
                applySettings(settings);
            });
        }

        const focusDesktopNotificationElement = document.getElementById('focus-desktop-notification');
        if (focusDesktopNotificationElement) {
            focusDesktopNotificationElement.checked = mergedSettings.focus.desktopNotification;
        }

        const focusTabNotificationElement = document.getElementById('focus-tab-notification');
        if (focusTabNotificationElement) {
            focusTabNotificationElement.checked = mergedSettings.focus.tabNotification;
        }

        // Short Break 설정
        document.getElementById('short-break-duration').value = mergedSettings.shortBreak.duration;
        const shortBreakSoundEl = document.getElementById('short-break-sound');
        if (shortBreakSoundEl) shortBreakSoundEl.value = mergedSettings.shortBreak.sound;
        const shortBreakSoundTypeEl = document.getElementById('short-break-sound-type');
        if (shortBreakSoundTypeEl) shortBreakSoundTypeEl.value = mergedSettings.shortBreak.soundType;
        document.getElementById('short-break-desktop-notification').checked = mergedSettings.shortBreak.desktopNotification;
        document.getElementById('short-break-tab-notification').checked = mergedSettings.shortBreak.tabNotification;

        const shortBreakSoundVolumeElement = document.getElementById('short-break-sound-volume');
        if (shortBreakSoundVolumeElement) {
            shortBreakSoundVolumeElement.addEventListener('input', (e) => {
                const settings = getCurrentSettings();
                applySettings(settings);
            });
            shortBreakSoundVolumeElement.addEventListener('change', (e) => {
                const settings = getCurrentSettings();
                applySettings(settings);
            });
        }

        // Long Break 설정
        document.getElementById('long-break-duration').value = mergedSettings.longBreak.duration;
        document.getElementById('long-break-start').value = mergedSettings.longBreak.startAfter;
        const longBreakSoundEl = document.getElementById('long-break-sound');
        if (longBreakSoundEl) longBreakSoundEl.value = mergedSettings.longBreak.sound;
        const longBreakSoundTypeEl = document.getElementById('long-break-sound-type');
        if (longBreakSoundTypeEl) longBreakSoundTypeEl.value = mergedSettings.longBreak.soundType;
        document.getElementById('long-break-desktop-notification').checked = mergedSettings.longBreak.desktopNotification;
        document.getElementById('long-break-tab-notification').checked = mergedSettings.longBreak.tabNotification;

        const longBreakSoundVolumeElement = document.getElementById('long-break-sound-volume');
        if (longBreakSoundVolumeElement) {
            longBreakSoundVolumeElement.addEventListener('input', (e) => {
                const settings = getCurrentSettings();
                applySettings(settings);
            });
            longBreakSoundVolumeElement.addEventListener('change', (e) => {
                const settings = getCurrentSettings();
                applySettings(settings);
            });
        }

        // 설정을 Chrome storage에 저장
        chrome.storage.sync.set({ settings: mergedSettings }, async () => {
            if (chrome.runtime.lastError) {
                showToast('설정 저장 중 오류 발생', 'error');
            } else {
                // 프로젝트 이름이 있으면 기록에 추가
                if (mergedSettings.projectName) {
                    await addProjectToHistory(mergedSettings.projectName);
                }
            }
        });
    } catch (error) {
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

// 설정 가져오기
function importSettings(e) {
    console.log('[importSettings] 호출됨, 이벤트:', e);
    const file = e.target.files && e.target.files[0];
    if (!file) {
        console.log('[importSettings] 파일이 선택되지 않음');
        return;
    }
    console.log('[importSettings] 파일 선택됨:', file.name);
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            console.log('[importSettings] 파일 읽기 완료');
            let settings = JSON.parse(e.target.result);
            console.log('[importSettings] 파싱된 설정:', settings);
            // playSound 필드 제거
            if (settings.focus) delete settings.focus.playSound;
            if (settings.shortBreak) delete settings.shortBreak.playSound;
            if (settings.longBreak) delete settings.longBreak.playSound;
            applySettings(settings);
            showToast('설정이 가져오기되었습니다.', 'success');
            console.log('[importSettings] 설정 적용 및 완료');
        } catch (error) {
            console.error('[importSettings] 잘못된 설정 파일:', error);
            showToast('잘못된 설정 파일입니다.', 'error');
        }
    };
    reader.readAsText(file);
    // 파일 입력 초기화
    e.target.value = '';
    console.log('[importSettings] 파일 입력 초기화 완료');
}

// 설정 초기화
function resetSettings() {
    if (confirm('모든 설정을 초기값으로 되돌리시겠습니까?')) {
        applySettings(DEFAULT_SETTINGS);
        showToast('설정이 초기화되었습니다.', 'success');
    }
}

// 이벤트 리스너 등록
document.addEventListener('DOMContentLoaded', async () => {
    await loadProjectHistory(); // 프로젝트 기록 로드 먼저

    // 초기 설정 로드 및 적용
    chrome.storage.sync.get('settings', (result) => {
        let initialSettings;
        if (result.settings) {
            initialSettings = result.settings;
            applySettings(initialSettings);
        } else {
            initialSettings = DEFAULT_SETTINGS;
            applySettings(initialSettings);
        }
    });

    // 가져오기 버튼 및 파일 input 이벤트(중복 방지)
    const importBtn = document.getElementById('import-settings');
    const fileInput = document.getElementById('settings-file-input');
    if (importBtn && fileInput) {
        importBtn.onclick = () => fileInput.click();
        fileInput.onchange = (e) => {
            if (e.target.files.length > 0) {
                importSettings(e);
                e.target.value = '';
            }
        };
    }

    // 초기화 버튼
    document.getElementById('reset-settings').addEventListener('click', resetSettings);

    // 설정 변경 시 자동 저장 (feedback-text는 제외)
    document.querySelectorAll('input, select').forEach(element => {
        if (element.id !== 'feedback-text') {
            element.addEventListener('change', () => {
                const settings = getCurrentSettings();
                applySettings(settings);
            });
        }
    });

    // Focus sound type volume input
    const focusSoundTypeVolumeElement = document.getElementById('focus-sound-type-volume');
    if (focusSoundTypeVolumeElement) {
        focusSoundTypeVolumeElement.addEventListener('input', (e) => {
            const settings = getCurrentSettings();
            applySettings(settings);
        });
        focusSoundTypeVolumeElement.addEventListener('change', (e) => {
            const settings = getCurrentSettings();
            applySettings(settings);
        });
    }

    // 프로젝트 이름 입력란: 드롭다운+직접입력 지원 및 기록 반영
    const projectNameInput = document.getElementById('project-name');
    if (projectNameInput) {
        projectNameInput.addEventListener('change', async (e) => {
            const value = e.target.value.trim();
            if (value) {
                await addProjectToHistory(value);
            }
        });
        projectNameInput.addEventListener('blur', async (e) => {
            const value = e.target.value.trim();
            if (value) {
                await addProjectToHistory(value);
            }
        });
    }

    // 피드백 폼 제출 이벤트
    const feedbackForm = document.getElementById('feedback-form');
    if (feedbackForm) {
        feedbackForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const feedback = document.getElementById('feedback-text').value.trim();
            console.log('[FEEDBACK] 보내기 버튼 클릭됨. 입력 내용:', feedback);
            if (!feedback) {
                alert('의견을 입력해주세요.');
                return;
            }
            const subject = encodeURIComponent('포모도로 타이머 피드백');
            const body = encodeURIComponent(feedback);
            window.location.href = `mailto:willyads@gmail.com?subject=${subject}&body=${body}`;
        });
    }
}); 