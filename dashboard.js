function updateTimerDisplay() {
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
}

let startTimerClickLock = false;
document.getElementById('start-timer').addEventListener('click', () => {
    if (startTimerClickLock) return;
    startTimerClickLock = true;
    setTimeout(() => { startTimerClickLock = false; }, 500);

    chrome.runtime.sendMessage({ action: 'getTimerState' }, (bgState) => {
        if (!bgState) {
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
    chrome.runtime.sendMessage({ action: 'stopTimer' });
});

document.getElementById('restart-timer').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'startTimer', sessionType: state.currentSession });
}); 