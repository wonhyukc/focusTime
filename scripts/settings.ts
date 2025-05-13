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
    longBreakInterval: 4
}; 