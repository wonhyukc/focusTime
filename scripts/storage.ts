import { SessionData } from './types';
import { handleError } from './utils';
import { PomodoroError } from './errors';

export class StorageManager {
    async saveSessionDataWithRetry(data: any, retries = 2): Promise<void> {
        try {
            await chrome.storage.local.set({ pomodoroHistory: data });
        } catch (error) {
            if (retries > 0) {
                await this.saveSessionDataWithRetry(data, retries - 1);
            } else {
                handleError(error, 'saveSessionData');
                // 사용자에게 알림 등 추가 복구 로직
                throw new PomodoroError('세션 데이터 저장 실패', 'SESSION_SAVE_FAIL');
            }
        }
    }

    async getPomodoroHistory(): Promise<SessionData[]> {
        const result = await chrome.storage.local.get('pomodoroHistory');
        return result.pomodoroHistory || [];
    }
} 