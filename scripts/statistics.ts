import { SessionData } from './types';

export class StatisticsManager {
    async exportStats(): Promise<{ success: boolean; dataUri?: string; filename?: string; message?: string }> {
        try {
            const result = await chrome.storage.local.get('pomodoroHistory');
            const history: SessionData[] = result.pomodoroHistory || [];
            if (history.length === 0) {
                return { success: false, message: '내보낼 통계 데이터가 없습니다.' };
            }

            // CSV 헤더
            const header = ['시작시각(년월일시분)', '세션', '지속시간', '프로젝트'];
            // 데이터 행 생성
            const rows = history.map(entry => {
                const startTime = this.formatDateToYMDHM(entry.startTime);
                const sessionType = entry.type === 'focus' ? '집중' : (entry.type === 'shortBreak' ? '휴식' : '긴휴식');
                const duration = entry.durationMinutes;
                const projectName = entry.projectName;

                return [
                    this.escapeCsvField(startTime),
                    this.escapeCsvField(sessionType),
                    this.escapeCsvField(duration),
                    this.escapeCsvField(projectName)
                ].join(',');
            });

            // CSV 내용 결합
            const csvContent = [header.join(','), ...rows].join('\r\n');
            const dataUri = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);

            return { success: true, dataUri: dataUri, filename: 'pomodoro_stats.csv' };
        } catch (error) {
            console.error("Error exporting stats:", error);
            return { success: false, message: '통계 내보내기 중 오류 발생' };
        }
    }

    async importStats(historyArray: SessionData[]): Promise<{ success: boolean; message: string }> {
        try {
            if (!Array.isArray(historyArray)) {
                throw new Error('Imported data is not an array.');
            }

            if (historyArray.length > 0 && (
                !historyArray[0].startTime ||
                !historyArray[0].type ||
                historyArray[0].durationMinutes === undefined ||
                historyArray[0].projectName === undefined)
            ) {
                throw new Error('Imported data structure mismatch.');
            }

            await chrome.storage.local.set({ pomodoroHistory: historyArray });
            chrome.runtime.sendMessage({ action: "statsUpdated" });
            return { success: true, message: `통계 ${historyArray.length}건 가져오기 완료` };
        } catch (error) {
            return { success: false, message: `통계 가져오기 실패: ${error instanceof Error ? error.message : 'Unknown error'}` };
        }
    }

    async resetStats(): Promise<{ success: boolean; message: string }> {
        try {
            await chrome.storage.local.remove('pomodoroHistory');
            chrome.runtime.sendMessage({ action: "statsUpdated" });
            return { success: true, message: '통계 초기화 완료' };
        } catch (error) {
            return { success: false, message: '통계 초기화 중 오류 발생' };
        }
    }

    private escapeCsvField(field: any): string {
        if (field === null || field === undefined) {
            return '';
        }
        const str = String(field);
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }

    private formatDateToYMDHM(dateString: string): string {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hour = String(date.getHours()).padStart(2, '0');
        const minute = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${hour}:${minute}`;
    }
} 