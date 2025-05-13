// 알림 관리 클래스
export class NotificationManager {
    constructor() {
        this.offscreenPort = null;
        this.initializeOffscreen();
    }

    // 오프스크린 초기화
    async initializeOffscreen() {
        if (await chrome.offscreen.hasDocument()) {
            return;
        }

        await chrome.offscreen.createDocument({
            url: 'offscreen.html',
            reasons: ['AUDIO_PLAYBACK'],
            justification: 'Playing notification sounds'
        });
    }

    // 알림 표시
    async showNotification(title, message, iconUrl) {
        const notificationOptions = {
            type: 'basic',
            iconUrl: iconUrl || 'icons/icon48.png',
            title: title,
            message: message,
            priority: 2
        };

        try {
            await chrome.notifications.create('pomodoroNotification', notificationOptions);
        } catch (error) {
            console.error('Error showing notification:', error);
        }
    }

    // 세션 완료 알림 표시
    async showSessionComplete(type) {
        let title, message;
        switch (type) {
            case 'focus':
                title = chrome.i18n.getMessage('focusTimeComplete');
                message = chrome.i18n.getMessage('takeBreak');
                break;
            case 'shortBreak':
                title = chrome.i18n.getMessage('shortBreakComplete');
                message = chrome.i18n.getMessage('startFocus');
                break;
            case 'longBreak':
                title = chrome.i18n.getMessage('longBreakComplete');
                message = chrome.i18n.getMessage('startFocus');
                break;
            default:
                title = chrome.i18n.getMessage('sessionComplete');
                message = chrome.i18n.getMessage('sessionCompleteMessage');
        }

        await this.showNotification(title, message);
    }

    // 소리 재생
    async playSound(soundType, isLoop = false, volume = 1.0) {
        if (!soundType || soundType === 'none') {
            return;
        }

        try {
            if (!this.offscreenPort) {
                this.offscreenPort = chrome.runtime.connect({ name: 'offscreen' });
            }

            this.offscreenPort.postMessage({
                target: 'offscreen',
                type: 'play-sound',
                data: {
                    soundType,
                    isLoop,
                    volume
                }
            });
        } catch (error) {
            console.error('Error playing sound:', error);
        }
    }

    // 알림 클릭 이벤트 처리
    async handleNotificationClick(notificationId) {
        if (notificationId === 'pomodoroNotification') {
            chrome.notifications.clear(notificationId);
            chrome.windows.create({
                url: 'dashboard.html',
                type: 'popup',
                width: 800,
                height: 600
            });
        }
    }
} 