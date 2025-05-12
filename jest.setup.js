// Jest DOM 확장
require('@testing-library/jest-dom');

// Chrome API 모의
global.chrome = {
    storage: {
        local: {
            get: jest.fn(),
            set: jest.fn(),
            remove: jest.fn(),
            clear: jest.fn()
        }
    },
    runtime: {
        sendMessage: jest.fn(),
        onMessage: {
            addListener: jest.fn()
        }
    }
};

// 전역 이벤트 모의
global.MouseEvent = class MouseEvent {
    constructor(type, options) {
        this.type = type;
        this.bubbles = options.bubbles;
        this.cancelable = options.cancelable;
        this.view = options.view;
    }
};

global.KeyboardEvent = class KeyboardEvent {
    constructor(type, options) {
        this.type = type;
        this.key = options.key;
        this.bubbles = options.bubbles;
    }
};

// 타이머 모의
jest.useFakeTimers(); 