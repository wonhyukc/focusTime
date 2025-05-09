// 공통 상수 및 기본 설정
export const PROJECT_HISTORY_KEY = 'projectHistory';
export const MAX_HISTORY_SIZE = 10;
export const DEFAULT_VERSION = '1.0';
export const DEFAULT_LANG = 'ko';

export const DEFAULT_SETTINGS_BG = {
    projectName: "포모로그 설정",
    version: DEFAULT_VERSION,
    focus: {
        duration: 25,
        sound: "beep",
        soundVolume: 10,
        soundType: "brown_noise",
        desktopNotification: true,
        tabNotification: true
    },
    shortBreak: {
        duration: 5,
        sound: "beep",
        soundVolume: 10,
        desktopNotification: true,
        tabNotification: true
    },
    longBreak: {
        duration: 15,
        startAfter: 4,
        sound: "beep",
        soundVolume: 10,
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

// 유틸 함수
export function validateDuration(duration, defaultValue) {
    const num = parseInt(duration);
    return (!isNaN(num) && num > 0) ? num : defaultValue;
}

export function escapeCsvField(field) {
    if (field === null || field === undefined) {
        return '';
    }
    const str = String(field);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

export function formatDateToYMDHM(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
}

// 프로젝트 기록 관리 클래스
export class ProjectHistoryManager {
    static async addProjectToHistory(projectName) {
        if (!projectName) return;
        try {
            const result = await chrome.storage.local.get([PROJECT_HISTORY_KEY]);
            let history = result[PROJECT_HISTORY_KEY] || [];
            history = history.filter(item => item !== projectName);
            history.unshift(projectName);
            if (history.length > MAX_HISTORY_SIZE) {
                history = history.slice(0, MAX_HISTORY_SIZE);
            }
            await chrome.storage.local.set({ [PROJECT_HISTORY_KEY]: history });
            ProjectHistoryManager.populateDataList(history);
        } catch (error) {
            console.error("Error adding project to history:", error);
        }
    }

    static async loadProjectHistory() {
        try {
            const result = await chrome.storage.local.get([PROJECT_HISTORY_KEY]);
            const history = result[PROJECT_HISTORY_KEY] || [];
            ProjectHistoryManager.populateDataList(history);
        } catch (error) {
            console.error("Error loading project history:", error);
        }
    }

    static populateDataList(history) {
        const dataList = document.getElementById('project-history-list');
        if (!dataList) return;
        dataList.innerHTML = '';
        history.forEach(item => {
            const option = document.createElement('option');
            option.value = item;
            dataList.appendChild(option);
        });
    }
}

// settings 구조 보정 함수
export function normalizeSettings(settings) {
    if (!settings || typeof settings !== 'object') settings = {};
    const normalized = {
        projectName: settings.projectName ?? DEFAULT_SETTINGS_BG.projectName,
        version: settings.version ?? DEFAULT_SETTINGS_BG.version,
        lang: settings.lang ?? DEFAULT_LANG,
        focus: {
            ...DEFAULT_SETTINGS_BG.focus,
            ...(settings.focus || {})
        },
        shortBreak: {
            ...DEFAULT_SETTINGS_BG.shortBreak,
            ...(settings.shortBreak || {})
        },
        longBreak: {
            ...DEFAULT_SETTINGS_BG.longBreak,
            ...(settings.longBreak || {})
        },
        general: {
            ...DEFAULT_SETTINGS_BG.general,
            ...(settings.general || {})
        }
    };
    // 필수 필드 타입 보정
    if (typeof normalized.focus.duration !== 'number') normalized.focus.duration = DEFAULT_SETTINGS_BG.focus.duration;
    if (typeof normalized.shortBreak.duration !== 'number') normalized.shortBreak.duration = DEFAULT_SETTINGS_BG.shortBreak.duration;
    if (typeof normalized.longBreak.duration !== 'number') normalized.longBreak.duration = DEFAULT_SETTINGS_BG.longBreak.duration;
    if (typeof normalized.longBreak.startAfter !== 'number') normalized.longBreak.startAfter = DEFAULT_SETTINGS_BG.longBreak.startAfter;
    return normalized;
}

// 사용자 피드백용 토스트 함수 (간단 버전)
export function showToast(message, type = 'info') {
    // type: 'info', 'success', 'error'
    if (typeof window !== 'undefined' && window.showToast) {
        window.showToast(message, type);
    } else if (typeof window !== 'undefined') {
        // 간단 대체: alert
        alert(`[${type}] ${message}`);
    } else {
        // background 등에서는 콘솔로 대체
        if (type === 'error') {
            console.error(message);
        } else {
            console.log(message);
        }
    }
} 