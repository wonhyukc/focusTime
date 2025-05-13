// 타이머 타입
export type TimerType = 'focus' | 'shortBreak' | 'longBreak';

// 소리 타입
export type SoundType = 'none' | 'bell' | 'digital' | 'gentle' | 'chime';

// 타이머 상태 인터페이스
export interface TimerState {
    timeLeft: number;
    isRunning: boolean;
    type: TimerType;
    pomodoroCount: number;
    sessionComplete: boolean;
    sessionStartTime: string | null;
    currentProjectName: string | null;
}

// 설정 인터페이스
export interface TimerSettings {
    projectName: string;
    durations: {
        focus: number;
        shortBreak: number;
        longBreak: number;
    };
    sound: {
        focus: SoundType;
        shortBreak: SoundType;
        longBreak: SoundType;
    };
    autoStartPomodoro: boolean;
    autoStartBreaks: boolean;
    longBreakInterval: number;
    focus: {
        duration: number;
        sound: SoundType;
        soundVolume: number;
    };
    shortBreak: {
        duration: number;
        sound: SoundType;
        soundVolume: number;
    };
    longBreak: {
        duration: number;
        startAfter: number;
        sound: SoundType;
        soundVolume: number;
    };
    general: {
        autoStartPomodoros: boolean;
        autoStartBreaks: boolean;
    };
}

// 세션 데이터 인터페이스
export interface SessionData {
    startTime: string;
    endTime: string;
    type: TimerType;
    durationMinutes: number;
    projectName: string;
}

// 메시지 타입
export type MessageType = 
    | 'START_TIMER'
    | 'STOP_TIMER'
    | 'TOGGLE_TIMER'
    | 'GET_TIMER_STATE'
    | 'GET_SETTINGS'
    | 'UPDATE_SETTINGS'
    | 'EXPORT_STATS'
    | 'IMPORT_STATS'
    | 'RESET_STATS';

// 메시지 인터페이스
export interface Message {
    type: MessageType;
    timerType?: TimerType;
    settings?: TimerSettings;
    stats?: SessionData[];
}

// 응답 인터페이스
export interface Response {
    success: boolean;
    error?: string;
    state?: TimerState;
    settings?: TimerSettings;
    stats?: {
        dataUri?: string;
        filename?: string;
        message?: string;
    };
} 