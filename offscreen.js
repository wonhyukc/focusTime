// offscreen.js
console.log('\n---집중시간 앱 시작---------------');

// 문서 로드 완료 시 background로 메시지 전송
document.addEventListener('DOMContentLoaded', () => {
    chrome.runtime.sendMessage({ action: 'OFFSCREEN_LOADED' });
});

let currentAudio = null;
let currentSoundType = null;
let currentIsPreview = null;
let currentAudioContext = null; // Web Audio API용 전역 컨텍스트

// 백그라운드 스크립트로부터 메시지를 받기 위한 리스너
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.command === "playSound") {
        // 사운드 중지 명령 처리
        if (message.soundType === 'none') {
            // 모든 audio 태그 정지 및 제거
            document.querySelectorAll('audio').forEach(audio => {
                audio.pause();
                audio.src = "";
                if (audio.remove) audio.remove();
            });
            if (currentAudio) {
                currentAudio.pause();
                currentAudio.src = "";
                if (currentAudio.remove) currentAudio.remove();
                currentAudio = null;
            }
            if (currentAudioContext) {
                try {
                    currentAudioContext.close();
                } catch (e) {}
                currentAudioContext = null;
            }
            sendResponse(true);
            return;
        }
        // 같은 소리, 같은 isPreview, 오디오가 이미 재생 중이면 볼륨만 조정
        if (
            currentAudio &&
            !currentAudio.paused &&
            message.soundType === currentSoundType &&
            message.isPreview === currentIsPreview
        ) {
            currentAudio.volume = (message.volume ?? 50) / 100;
            sendResponse(true);
            return;
        }
        // 기존 오디오가 있으면 정지
        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }
        currentSoundType = message.soundType;
        currentIsPreview = message.isPreview;
        playNotificationSound(message.soundType, message.isPreview, message.volume);
        sendResponse(true);
        return;
    }
    sendResponse(true);
    return false;
});

// Web Audio API를 사용하여 알림음 생성 및 재생
function playNotificationSound(soundType = 'low-short-beep', isPreview = false, volume = 50) {
    try {
        // 사운드 타입에 따라 다른 소리 재생
        switch (soundType) {
            case 'gong':
                playAudioFile('sounds/361494__tec_studio__gong-002.wav', isPreview, volume);
                break;
            case 'brown_noise':
                playAudioFile('sounds/253922__jagadamba__brown-noise-2-minutes.wav', isPreview, volume);
                break;
            case 'rainy_birds':
                playAudioFile('sounds/201534__toonothing__rainy-day-with-various-birds.wav', isPreview, volume);
                break;
            case 'clock_ticking':
                playAudioFile('sounds/412751__blukotek__ticking-of-the-clock-01.wav', isPreview, volume);
                break;
            case 'beep':
            default:
                playBeepSound(isPreview, volume);
        }
    } catch (error) {
        window.close(); // 오류 발생 시 창 닫기
    }
}

// 기본 beep 소리 재생
function playBeepSound(isPreview = false, volume = 50) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    currentAudioContext = audioContext;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(350, audioContext.currentTime); 
    // 볼륨에 따라 gain을 조절 (0~1)
    const scaledGain = (typeof volume === 'number' && volume >= 0 && volume <= 100) ? (volume / 100) * 0.05 : 0.05;
    gainNode.gain.setValueAtTime(scaledGain, audioContext.currentTime); 
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.0);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 1.0); // 비프음은 짧으므로 3초 제한 불필요
    
    // 오디오 컨텍스트와 문서 정리 (미리듣기든 아니든 1.5초 후 정리)
    setTimeout(() => {
        audioContext.close();
        if (currentAudioContext === audioContext) currentAudioContext = null;
        setTimeout(() => {
            window.close();
        }, 100);
    }, 1500); 
}

// 오디오 파일 재생 (공통 함수)
function playAudioFile(soundPath, isPreview = false, volume = 50) {
    const audio = new Audio();
    audio.src = chrome.runtime.getURL(soundPath);
    audio.volume = volume / 100; // 볼륨 설정 적용
    let previewTimeoutId = null; // 미리듣기 타이머
    let closeTimeoutId = null; // 창 닫기 타이머

    // 미리듣기 타이머 및 창 닫기 타이머 클리어 함수
    const clearTimeouts = () => {
        if (previewTimeoutId) clearTimeout(previewTimeoutId);
        if (closeTimeoutId) clearTimeout(closeTimeoutId);
        previewTimeoutId = null;
        closeTimeoutId = null;
    };

    // currentAudio에 할당 (볼륨 조정 및 중복 방지용)
    currentAudio = audio;

    audio.oncanplaythrough = () => {
        audio.play()
            .then(() => {
                if (isPreview) {
                    // 3초 후 재생 중지 타이머 설정
                    previewTimeoutId = setTimeout(() => {
                        audio.pause();
                        audio.currentTime = 0; // 시간 초기화 (선택 사항)
                        previewTimeoutId = null; // ID 초기화

                        // 재생 중지 후 창 닫기 타이머 (0.5초 후)
                        closeTimeoutId = setTimeout(() => {
                            window.close();
                        }, 500); 

                    }, 3000);
                } else {
                    // 미리듣기가 아닐 때만 반복 재생
                    audio.loop = true;
                }
            })
            .catch(error => {
                clearTimeouts();
                playBeepSound(); // 실패하면 기본 beep으로 폴백 (미리듣기 여부 전달 안 함)
            });
    };
    
    audio.onerror = (e) => {
        clearTimeouts();
        playBeepSound(); // 오류 시 기본 beep으로 폴백
    };
    
    // 재생이 끝난 후 정리 (미리듣기가 아닐 때 또는 미리듣기 타임아웃 전에 끝날 때)
    audio.onended = () => {
        clearTimeouts(); // 모든 타이머 클리어
        // 약간의 지연 후 창 닫기
        closeTimeoutId = setTimeout(() => {
            window.close();
        }, 500);
    };
}

// Gong 소리 재생 (이제 직접 호출되지 않고 playNotificationSound를 통해 처리됨)
function playGongSound(isPreview = false) {
    playAudioFile('sounds/361494__tec_studio__gong-002.wav', isPreview);
}

// Add a new function to log sound-related information
function logSoundInfo(soundType, isPreview) {
} 