import { SoundType } from './types';

export class NotificationManager {
    private offscreenDocument: Window | null = null;

    constructor() {
        this.initializeOffscreen();
    }

    private async initializeOffscreen(): Promise<void> {
        if (await chrome.offscreen.hasDocument()) {
            return;
        }

        await chrome.offscreen.createDocument({
            url: 'offscreen.html',
            reasons: ['AUDIO_PLAYBACK' as chrome.offscreen.Reason],
            justification: 'Playing timer completion sounds'
        });
    }

    async showNotification(title: string, message: string, icon: string): Promise<void> {
        await chrome.notifications.create('pomodoroNotification', {
            type: 'basic',
            iconUrl: icon,
            title: title,
            message: message
        });
    }

    async showSessionComplete(type: string): Promise<void> {
        const title = chrome.i18n.getMessage('notificationTitle');
        let message = '';
        let icon = '';

        switch (type) {
            case 'focus':
                message = chrome.i18n.getMessage('focusComplete');
                icon = 'icons/icon48.png';
                break;
            case 'shortBreak':
                message = chrome.i18n.getMessage('shortBreakComplete');
                icon = 'icons/icon48.png';
                break;
            case 'longBreak':
                message = chrome.i18n.getMessage('longBreakComplete');
                icon = 'icons/icon48.png';
                break;
        }

        await this.showNotification(title, message, icon);
    }

    async playSound(type: SoundType, loop: boolean = false, volume: number = 1.0): Promise<void> {
        if (type === 'none') {
            return;
        }

        const message = {
            type: 'PLAY_SOUND',
            sound: type,
            loop: loop,
            volume: volume
        };

        await chrome.runtime.sendMessage(message);
    }

    handleNotificationClick(notificationId: string): void {
        if (notificationId === 'pomodoroNotification') {
            chrome.tabs.create({ url: 'dashboard.html' });
        }
    }
} 