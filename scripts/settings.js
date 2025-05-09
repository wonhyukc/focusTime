import { PROJECT_HISTORY_KEY, MAX_HISTORY_SIZE, DEFAULT_VERSION, DEFAULT_LANG, DEFAULT_SETTINGS_BG, validateDuration, ProjectHistoryManager, normalizeSettings } from './common.js';

// 상수 정의
const CONSTANTS = {
    PROJECT_HISTORY_KEY: PROJECT_HISTORY_KEY,
    MAX_HISTORY_SIZE: MAX_HISTORY_SIZE,
    DEFAULT_VERSION: DEFAULT_VERSION,
    DEFAULT_LANG: DEFAULT_LANG
};

// 기본 설정값 정의
const DEFAULT_SETTINGS = {
    projectName: "포모로그 설정",
    version: CONSTANTS.DEFAULT_VERSION,
    lang: CONSTANTS.DEFAULT_LANG,
    focus: {
        duration: 25,
        sound: "beep",
        soundVolume: 100,
        soundType: "low-short-beep",
        soundTypeVolume: 15,
        desktopNotification: true,
        tabNotification: false
    },
    shortBreak: {
        duration: 5,
        sound: "beep",
        soundVolume: 100,
        soundType: "low-short-beep",
        soundTypeVolume: 15,
        desktopNotification: true,
        tabNotification: false
    },
    longBreak: {
        duration: 15,
        startAfter: 4,
        sound: "beep",
        soundVolume: 100,
        soundType: "low-short-beep",
        soundTypeVolume: 15,
        desktopNotification: true,
        tabNotification: false
    }
};

// 유틸리티 함수들
const Utils = {
    getInputNumberOrDefault(id, defaultValue = 100) {
        const el = document.getElementById(id);
        if (!el) return defaultValue;
        const v = parseInt(el.value);
        return isNaN(v) ? defaultValue : v;
    },

    clampVolume(v, el, def = 10) {
        if (typeof v !== 'number' || isNaN(v)) return def;
        if (v < 0 || v > 100) {
            showToast('볼륨은 0~100 사이의 값만 입력할 수 있습니다.', 'error');
            if (el) el.value = def;
            return def;
        }
        return v;
    },

    async getLanguage() {
        return new Promise(resolve => {
            chrome.storage.sync.get(['selectedLanguage'], data => {
                resolve(data.selectedLanguage || CONSTANTS.DEFAULT_LANG);
            });
        });
    }
};

// 설정 관리 클래스
class SettingsManager {
    static async getCurrentSettings() {
        const settings = {
            projectName: document.getElementById('project-name')?.value || DEFAULT_SETTINGS.projectName,
            focus: this.getSessionSettings('focus'),
            shortBreak: this.getSessionSettings('shortBreak'),
            longBreak: this.getSessionSettings('longBreak')
        };
        settings.lang = await Utils.getLanguage();
        return settings;
    }

    static getSessionSettings(sessionType) {
        const prefix = sessionType === 'longBreak' ? 'long-break' : `${sessionType}-break`;
        return {
            duration: Utils.getInputNumberOrDefault(`${sessionType}-duration`, DEFAULT_SETTINGS[sessionType].duration),
            sound: document.getElementById(`${sessionType}-sound`)?.value,
            soundType: document.getElementById(`${sessionType}-sound-type`)?.value,
            soundVolume: Utils.clampVolume(
                Utils.getInputNumberOrDefault(`${sessionType}-sound-volume`, DEFAULT_SETTINGS[sessionType].soundVolume),
                document.getElementById(`${sessionType}-sound-volume`),
                DEFAULT_SETTINGS[sessionType].soundVolume
            ),
            soundTypeVolume: Utils.clampVolume(
                Utils.getInputNumberOrDefault(`${sessionType}-sound-type-volume`, DEFAULT_SETTINGS[sessionType].soundTypeVolume),
                document.getElementById(`${sessionType}-sound-type-volume`),
                DEFAULT_SETTINGS[sessionType].soundTypeVolume
            ),
            desktopNotification: document.getElementById(`${sessionType}-desktop-notification`)?.checked,
            tabNotification: document.getElementById(`${sessionType}-tab-notification`)?.checked,
            ...(sessionType === 'longBreak' && {
                startAfter: Utils.getInputNumberOrDefault('long-break-start', DEFAULT_SETTINGS.longBreak.startAfter)
            })
        };
    }

    static mergeWithDefaultSettings(userSettings) {
        return {
            projectName: userSettings.projectName ?? DEFAULT_SETTINGS_BG.projectName,
            version: DEFAULT_SETTINGS_BG.version,
            focus: { ...DEFAULT_SETTINGS_BG.focus, ...(userSettings.focus || {}) },
            shortBreak: { ...DEFAULT_SETTINGS_BG.shortBreak, ...(userSettings.shortBreak || {}) },
            longBreak: { ...DEFAULT_SETTINGS_BG.longBreak, ...(userSettings.longBreak || {}) },
            general: { ...DEFAULT_SETTINGS_BG.general, ...(userSettings.general || {}) }
        };
    }

    static async applySettings(settings) {
        try {
            if (!settings.version) {
                settings.version = CONSTANTS.DEFAULT_VERSION;
            }
            const mergedSettings = this.mergeWithDefaultSettings(settings);
            await this.updateUIElements(mergedSettings);
            await this.saveSettings(mergedSettings);
        } catch (error) {
            showToast('설정 적용 중 오류 발생', 'error');
        }
    }

    static async updateUIElements(settings) {
        // 프로젝트 이름 설정
        const projectNameElement = document.getElementById('project-name');
        if (projectNameElement) {
            projectNameElement.value = settings.projectName || DEFAULT_SETTINGS.projectName;
        }

        // 각 세션 타입별 설정 업데이트
        ['focus', 'shortBreak', 'longBreak'].forEach(sessionType => {
            this.updateSessionUI(sessionType, settings[sessionType]);
        });
    }

    static updateSessionUI(sessionType, sessionSettings) {
        const prefix = sessionType === 'longBreak' ? 'long-break' : `${sessionType}-break`;
        const elements = {
            duration: document.getElementById(`${sessionType}-duration`),
            sound: document.getElementById(`${sessionType}-sound`),
            soundType: document.getElementById(`${sessionType}-sound-type`),
            soundVolume: document.getElementById(`${sessionType}-sound-volume`),
            soundTypeVolume: document.getElementById(`${sessionType}-sound-type-volume`),
            desktopNotification: document.getElementById(`${sessionType}-desktop-notification`),
            tabNotification: document.getElementById(`${sessionType}-tab-notification`)
        };

        if (elements.duration) elements.duration.value = sessionSettings.duration;
        if (elements.sound) elements.sound.value = sessionSettings.sound;
        if (elements.soundType) elements.soundType.value = sessionSettings.soundType;
        if (elements.soundVolume) elements.soundVolume.value = sessionSettings.soundVolume;
        if (elements.soundTypeVolume) elements.soundTypeVolume.value = sessionSettings.soundTypeVolume;
        if (elements.desktopNotification) elements.desktopNotification.checked = sessionSettings.desktopNotification;
        if (elements.tabNotification) elements.tabNotification.checked = sessionSettings.tabNotification;

        if (sessionType === 'longBreak') {
            const startAfterElement = document.getElementById('long-break-start');
            if (startAfterElement) startAfterElement.value = sessionSettings.startAfter;
        }
    }

    static async saveSettings(settings) {
        return new Promise((resolve, reject) => {
            chrome.storage.sync.set({ settings }, async () => {
                if (chrome.runtime.lastError) {
                    showToast('설정 저장 중 오류 발생', 'error');
                    reject(chrome.runtime.lastError);
                } else {
                    if (settings.projectName) {
                        await ProjectHistoryManager.addProjectToHistory(settings.projectName);
                    }
                    resolve();
                }
            });
        });
    }
}

// 설정 가져오기
function importSettings(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) {
        return;
    }
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            let settings = JSON.parse(e.target.result);
            // playSound 필드 제거
            if (settings.focus) delete settings.focus.playSound;
            if (settings.shortBreak) delete settings.shortBreak.playSound;
            if (settings.longBreak) delete settings.longBreak.playSound;
            await SettingsManager.applySettings(normalizeSettings(settings));
            // 언어 설정 반영
            if (settings.lang) {
                chrome.storage.sync.set({ selectedLanguage: settings.lang }, () => {
                    if (typeof updateLanguage === 'function') {
                        updateLanguage(settings.lang);
                    }
                });
            }
            showToast('설정이 가져오기되었습니다.', 'success');
        } catch (error) {
            console.error('[importSettings] 잘못된 설정 파일:', error);
            showToast('잘못된 설정 파일입니다.', 'error');
        }
    };
    reader.readAsText(file);
    // 파일 입력 초기화
    e.target.value = '';
}

// 설정 초기화
function resetSettings() {
    if (confirm('모든 설정을 초기값으로 되돌리시겠습니까?')) {
        SettingsManager.applySettings(DEFAULT_SETTINGS);
        showToast('설정이 초기화되었습니다.', 'success');
    }
}

// 이벤트 리스너 등록
document.addEventListener('DOMContentLoaded', async () => {
    await ProjectHistoryManager.loadProjectHistory(); // 프로젝트 기록 로드 먼저

    // 초기 설정 로드 및 적용
    chrome.storage.sync.get('settings', async (result) => {
        let initialSettings;
        if (result.settings) {
            initialSettings = result.settings;
            // version, lang 누락 보완
            if (!initialSettings.version) initialSettings.version = '1.0';
            if (!initialSettings.lang) initialSettings.lang = 'ko';
            await SettingsManager.applySettings(normalizeSettings(initialSettings));
        } else {
            initialSettings = DEFAULT_SETTINGS;
            // version, lang 보완
            initialSettings.version = '1.0';
            initialSettings.lang = 'ko';
            await SettingsManager.applySettings(normalizeSettings(initialSettings));
        }
    });

    // 초기화 버튼
    document.getElementById('reset-settings').addEventListener('click', resetSettings);

    // 설정 변경 시 자동 저장 (feedback-text는 제외)
    document.querySelectorAll('input, select').forEach(element => {
        if (element.id !== 'feedback-text') {
            element.addEventListener('change', async () => {
                const settings = await SettingsManager.getCurrentSettings();
                await SettingsManager.applySettings(normalizeSettings(settings));
            });
        }
    });

    // Focus sound type volume input
    const focusSoundTypeVolumeElement = document.getElementById('focus-sound-type-volume');
    if (focusSoundTypeVolumeElement) {
        focusSoundTypeVolumeElement.addEventListener('input', async () => {
            const settings = await SettingsManager.getCurrentSettings();
            await SettingsManager.applySettings(normalizeSettings(settings));
        });
        focusSoundTypeVolumeElement.addEventListener('change', async () => {
            const settings = await SettingsManager.getCurrentSettings();
            await SettingsManager.applySettings(normalizeSettings(settings));
        });
    }

    // 프로젝트 이름 입력란: 드롭다운+직접입력 지원 및 기록 반영
    const projectNameInput = document.getElementById('project-name');
    if (projectNameInput) {
        projectNameInput.addEventListener('change', async (e) => {
            const value = e.target.value.trim();
            if (value) {
                await ProjectHistoryManager.addProjectToHistory(value);
            }
        });
        projectNameInput.addEventListener('blur', async (e) => {
            const value = e.target.value.trim();
            if (value) {
                await ProjectHistoryManager.addProjectToHistory(value);
            }
        });
    }

    // 피드백 폼 제출 이벤트
    const feedbackForm = document.getElementById('feedback-form');
    if (feedbackForm) {
        feedbackForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const feedback = document.getElementById('feedback-text').value.trim();
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

// 이벤트 핸들러
const EventHandlers = {
    async handleSettingsChange() {
        const settings = await SettingsManager.getCurrentSettings();
        await SettingsManager.applySettings(normalizeSettings(settings));
    },

    async handleProjectNameChange(e) {
        const value = e.target.value.trim();
        if (value) {
            await ProjectHistoryManager.addProjectToHistory(value);
        }
    },

    handleFeedbackSubmit(e) {
        e.preventDefault();
        const feedback = document.getElementById('feedback-text').value.trim();
        if (!feedback) {
            alert('의견을 입력해주세요.');
            return;
        }
        const subject = encodeURIComponent('포모도로 타이머 피드백');
        const body = encodeURIComponent(feedback);
        window.location.href = `mailto:willyads@gmail.com?subject=${subject}&body=${body}`;
    },

    async handleImportSettings(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                let settings = JSON.parse(e.target.result);
                ['focus', 'shortBreak', 'longBreak'].forEach(sessionType => {
                    if (settings[sessionType]) delete settings[sessionType].playSound;
                });
                await SettingsManager.applySettings(normalizeSettings(settings));
                if (settings.lang) {
                    chrome.storage.sync.set({ selectedLanguage: settings.lang }, () => {
                        if (typeof updateLanguage === 'function') {
                            updateLanguage(settings.lang);
                        }
                    });
                }
                showToast('설정이 가져오기되었습니다.', 'success');
            } catch (error) {
                console.error('[importSettings] 잘못된 설정 파일:', error);
                showToast('잘못된 설정 파일입니다.', 'error');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    },

    async handleResetSettings() {
        if (confirm('모든 설정을 초기값으로 되돌리시겠습니까?')) {
            await SettingsManager.applySettings(DEFAULT_SETTINGS);
            showToast('설정이 초기화되었습니다.', 'success');
        }
    }
};

// 초기화 함수
async function initializeSettings() {
    await ProjectHistoryManager.loadProjectHistory();

    // 초기 설정 로드 및 적용
    return new Promise((resolve) => {
        chrome.storage.sync.get('settings', async (result) => {
            let initialSettings = result.settings || DEFAULT_SETTINGS;
            if (!initialSettings.version) initialSettings.version = CONSTANTS.DEFAULT_VERSION;
            if (!initialSettings.lang) initialSettings.lang = CONSTANTS.DEFAULT_LANG;
            await SettingsManager.applySettings(normalizeSettings(initialSettings));
            resolve();
        });
    });
}

// 이벤트 리스너 등록 함수
function registerEventListeners() {
    document.getElementById('reset-settings')?.addEventListener('click', EventHandlers.handleResetSettings);

    // 설정 변경 시 자동 저장
    document.querySelectorAll('input, select').forEach(element => {
        if (element.id !== 'feedback-text') {
            element.addEventListener('change', EventHandlers.handleSettingsChange);
        }
    });

    // 프로젝트 이름 입력란
    const projectNameInput = document.getElementById('project-name');
    if (projectNameInput) {
        projectNameInput.addEventListener('change', EventHandlers.handleProjectNameChange);
        projectNameInput.addEventListener('blur', EventHandlers.handleProjectNameChange);
    }

    // 피드백 폼
    document.getElementById('feedback-form')?.addEventListener('submit', EventHandlers.handleFeedbackSubmit);
}

// DOMContentLoaded 이벤트 핸들러
document.addEventListener('DOMContentLoaded', async () => {
    await initializeSettings();
    registerEventListeners();
}); 