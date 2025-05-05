// Main audio player controls
const audio = document.getElementById('audio');
const playBtn = document.getElementById('playBtn');
const vol = document.getElementById('volume');
let timer;

// Initialize audio settings
audio.loop = true;
audio.volume = vol.value / 100; // Set initial volume

// Update volume when slider changes
vol.addEventListener('input', () => {
    const newVolume = vol.value / 100;
    audio.volume = newVolume;
    console.log(`Main audio volume set to: ${newVolume * 100}%`);
});

// Play/pause button functionality
playBtn.addEventListener('click', () => {
    if (audio.paused) {
        audio.play();
        playBtn.textContent = '일시정지';
        timer = setTimeout(() => {
            audio.pause();
            playBtn.textContent = '재생';
        }, 5 * 60 * 1000);
    } else {
        audio.pause();
        playBtn.textContent = '재생';
        clearTimeout(timer);
    }
});

// Pomodoro timer sound controls
document.getElementById('focusSoundVolume').addEventListener('input', function(e) {
    const volume = e.target.value;
    console.log(`Focus sound volume set to: ${volume}`);
    // Save the volume setting for focus sound
    chrome.storage.sync.get(['settings'], function(result) {
        const settings = result.settings || {};
        settings.focus = settings.focus || {};
        settings.focus.soundVolume = volume;
        chrome.storage.sync.set({ settings: settings });
    });
});

document.getElementById('breakSoundVolume').addEventListener('input', function(e) {
    const volume = e.target.value;
    console.log(`Break sound volume set to: ${volume}`);
    // Save the volume setting for break sound
    chrome.storage.sync.get(['settings'], function(result) {
        const settings = result.settings || {};
        settings.shortBreak = settings.shortBreak || {};
        settings.shortBreak.soundVolume = volume;
        chrome.storage.sync.set({ settings: settings });
    });
}); 