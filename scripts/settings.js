// 기본 설정값 정의
const DEFAULT_SETTINGS = {
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

// 현재 설정 가져오기
function getCurrentSettings() {
    const settings = {
        focus: {
            duration: parseInt(document.getElementById('focus-duration').value) || DEFAULT_SETTINGS.focus.duration,
            sound: document.getElementById('focus-sound').value,
            soundType: document.getElementById('focus-sound-type').value,
            desktopNotification: document.getElementById('focus-desktop-notification').checked,
            tabNotification: document.getElementById('focus-tab-notification').checked,
            playSound: false
        },
        shortBreak: {
            duration: parseInt(document.getElementById('short-break-duration').value) || DEFAULT_SETTINGS.shortBreak.duration,
            soundType: document.getElementById('short-break-sound-type').value,
            desktopNotification: document.getElementById('short-break-desktop-notification').checked,
            tabNotification: document.getElementById('short-break-tab-notification').checked
        },
        longBreak: {
            duration: parseInt(document.getElementById('long-break-duration').value) || DEFAULT_SETTINGS.longBreak.duration,
            startAfter: parseInt(document.getElementById('long-break-start').value) || DEFAULT_SETTINGS.longBreak.startAfter,
            soundType: document.getElementById('long-break-sound-type').value,
            desktopNotification: document.getElementById('long-break-desktop-notification').checked,
            tabNotification: document.getElementById('long-break-tab-notification').checked
        }
    };
    console.log("Current settings:", settings);
    return settings;
}

// 설정 적용하기
function applySettings(settings) {
    try {
        // Focus 설정
        document.getElementById('focus-duration').value = settings.focus.duration;
        document.getElementById('focus-sound').value = settings.focus.sound;
        document.getElementById('focus-sound-type').value = settings.focus.soundType;
        document.getElementById('focus-desktop-notification').checked = settings.focus.desktopNotification;
        document.getElementById('focus-tab-notification').checked = settings.focus.tabNotification;

        // Short Break 설정
        document.getElementById('short-break-duration').value = settings.shortBreak.duration;
        document.getElementById('short-break-sound-type').value = settings.shortBreak.soundType;
        document.getElementById('short-break-desktop-notification').checked = settings.shortBreak.desktopNotification;
        document.getElementById('short-break-tab-notification').checked = settings.shortBreak.tabNotification;

        // Long Break 설정
        document.getElementById('long-break-duration').value = settings.longBreak.duration;
        document.getElementById('long-break-start').value = settings.longBreak.startAfter;
        document.getElementById('long-break-sound-type').value = settings.longBreak.soundType;
        document.getElementById('long-break-desktop-notification').checked = settings.longBreak.desktopNotification;
        document.getElementById('long-break-tab-notification').checked = settings.longBreak.tabNotification;

        // 설정을 Chrome storage에 저장
        chrome.storage.sync.set({ settings }, () => {
            if (chrome.runtime.lastError) {
                console.error('Error saving settings:', chrome.runtime.lastError);
                showToast('설정 저장 중 오류 발생', 'error');
            } else {
                console.log('Settings saved successfully');
                showToast('설정이 저장되었습니다.', 'success');
            }
        });
    } catch (error) {
        console.error("Error applying settings:", error);
        showToast('설정 적용 중 오류 발생', 'error');
    }
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
function importSettings(file) {
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
document.addEventListener('DOMContentLoaded', () => {
    // 초기 설정 로드
    chrome.storage.sync.get('settings', (result) => {
        if (result.settings) {
            applySettings(result.settings);
        } else {
            applySettings(DEFAULT_SETTINGS);
        }
    });

    // 내보내기 버튼
    document.getElementById('export-settings').addEventListener('click', exportSettings);

    // 가져오기 버튼
    document.getElementById('import-settings').addEventListener('click', () => {
        document.getElementById('settings-file-input').click();
    });

    // 파일 입력 변경 이벤트
    document.getElementById('settings-file-input').addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            importSettings(e.target.files[0]);
            e.target.value = ''; // 입력 초기화
        }
    });

    // 초기화 버튼
    document.getElementById('reset-settings').addEventListener('click', resetSettings);

    // 설정 변경 시 자동 저장
    document.querySelectorAll('input, select').forEach(element => {
        element.addEventListener('change', () => {
            const settings = getCurrentSettings();
            applySettings(settings);
        });
    });
}); 