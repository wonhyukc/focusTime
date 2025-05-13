export class NotificationManager {
    constructor();
    showNotification(title: string, message: string, icon: string): Promise<void>;
    showSessionComplete(type: string): Promise<void>;
    playSound(type: string, loop?: boolean, volume?: number): Promise<void>;
    handleNotificationClick(notificationId: string): void;
} 