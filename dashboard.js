function updateTimerDisplay() {
    console.log('=== updateTimerDisplay called ===');
    console.log('Current state:', {
        isRunning: state.isRunning,
        isPaused: state.isPaused,
        currentSession: state.currentSession,
        remainingTime: state.remainingTime
    });

    const minutes = Math.floor(state.remainingTime / 60);
    const seconds = state.remainingTime % 60;
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    document.getElementById('timer').textContent = timeString;
    document.getElementById('session-type').textContent = state.currentSession;
    
    // Update button states
    const startButton = document.getElementById('start-timer');
    const pauseButton = document.getElementById('pause-timer');
    const stopButton = document.getElementById('stop-timer');
    const restartButton = document.getElementById('restart-timer');

    console.log('Button states before update:', {
        startButton: startButton.style.display,
        pauseButton: pauseButton.style.display,
        stopButton: stopButton.style.display,
        restartButton: restartButton.style.display
    });

    if (state.isRunning) {
        startButton.style.display = 'none';
        pauseButton.style.display = 'inline-block';
        stopButton.style.display = 'inline-block';
        restartButton.style.display = 'none';
    } else if (state.isPaused) {
        startButton.style.display = 'inline-block';
        pauseButton.style.display = 'none';
        stopButton.style.display = 'inline-block';
        restartButton.style.display = 'none';
    } else {
        startButton.style.display = 'inline-block';
        pauseButton.style.display = 'none';
        stopButton.style.display = 'none';
        restartButton.style.display = 'none';
    }

    console.log('Button states after update:', {
        startButton: startButton.style.display,
        pauseButton: pauseButton.style.display,
        stopButton: stopButton.style.display,
        restartButton: restartButton.style.display
    });
}

let startTimerClickLock = false;
document.getElementById('start-timer').addEventListener('click', () => {
    if (startTimerClickLock) return;
    startTimerClickLock = true;
    setTimeout(() => { startTimerClickLock = false; }, 500);

    console.log('[DEBUG] start-timer button clicked');
    chrome.runtime.sendMessage({ action: 'getTimerState' }, (bgState) => {
        console.log('=== Start button clicked ===');
        console.log('Background timer state:', bgState);
        if (!bgState) {
            console.warn('[DEBUG] bgState is undefined/null, aborting start-timer click handler.');
            return;
        }
        if (
            !bgState.isRunning &&
            bgState.timeLeft > 0 &&
            !bgState.sessionComplete // resume only if session is not complete
        ) {
            chrome.runtime.sendMessage({ action: 'toggleTimer' }); // resume
        } else {
            chrome.runtime.sendMessage({ action: 'startTimer', sessionType: state.currentSession }); // new session
        }
    });
});

document.getElementById('pause-timer').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'togglePause' });
});

document.getElementById('stop-timer').addEventListener('click', () => {
    console.log('=== Stop button clicked ===');
    console.log('Current state before stop:', {
        isRunning: state.isRunning,
        isPaused: state.isPaused,
        currentSession: state.currentSession
    });
    chrome.runtime.sendMessage({ action: 'stopTimer' });
});

document.getElementById('restart-timer').addEventListener('click', () => {
    console.log('=== Restart button clicked ===');
    console.log('Current state before restart:', {
        isRunning: state.isRunning,
        isPaused: state.isPaused,
        currentSession: state.currentSession
    });
    chrome.runtime.sendMessage({ action: 'startTimer', sessionType: state.currentSession });
}); 