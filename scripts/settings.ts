import { TimerSettings } from './types';

export const DEFAULT_SETTINGS_BG: TimerSettings = {
    projectName: '',
    durations: {
        focus: 25,
        shortBreak: 5,
        longBreak: 15
    },
    sound: {
        focus: 'bell',
        shortBreak: 'gentle',
        longBreak: 'chime'
    },
    autoStartPomodoro: false,
    autoStartBreaks: false,
    longBreakInterval: 4,
    focus: {
        duration: 25,
        sound: 'bell',
        soundVolume: 1.0
    },
    shortBreak: {
        duration: 5,
        sound: 'gentle',
        soundVolume: 1.0
    },
    longBreak: {
        duration: 15,
        startAfter: 4,
        sound: 'chime',
        soundVolume: 1.0
    },
    general: {
        autoStartPomodoros: false,
        autoStartBreaks: false
    }
}; 