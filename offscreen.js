// offscreen.js
console.log('Offscreen document loaded');

// 문서 로드 완료 시 background로 메시지 전송
document.addEventListener('DOMContentLoaded', () => {
    console.log('Offscreen document fully loaded');
    chrome.runtime.sendMessage({ type: 'OFFSCREEN_LOADED' });
});

// 백그라운드 스크립트로부터 메시지를 받기 위한 리스너
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Offscreen: 메시지 수신", message);
    if (message.command === "playSound") {
        console.log("Offscreen: 알림음 재생 시작", message.soundType, "Is Preview:", message.isPreview);
        // isPreview 플래그도 playNotificationSound 함수로 전달
        playNotificationSound(message.soundType, message.isPreview);
    }
    return false;
});

// Web Audio API를 사용하여 알림음 생성 및 재생
function playNotificationSound(soundType = 'low-short-beep', isPreview = false) { // isPreview 파라미터 추가
    try {
        console.log("Offscreen: playNotificationSound 함수 실행", { soundType, isPreview });
        
        // 사운드 타입에 따라 다른 소리 재생
        switch (soundType) {
            case 'gong':
                playAudioFile('sounds/361494__tec_studio__gong-002.wav', isPreview);
                break;
            case 'brown_noise':
                playAudioFile('sounds/253922__jagadamba__brown-noise-2-minutes.wav', isPreview);
                break;
            case 'rainy_birds':
                playAudioFile('sounds/201534__toonothing__rainy-day-with-various-birds.wav', isPreview);
                break;
            case 'clock_ticking':
                playAudioFile('sounds/412751__blukotek__ticking-of-the-clock-01.wav', isPreview);
                break;
            case 'beep':
            default:
                // 기본 beep 소리 재생 (미리듣기 여부 전달)
                playBeepSound(isPreview);
        }
    } catch (error) {
        console.error('Offscreen: 알림음 재생 중 오류 발생:', error);
        window.close(); // 오류 발생 시 창 닫기
    }
}

// 기본 beep 소리 재생
function playBeepSound(isPreview = false) { // isPreview 파라미터 추가
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(350, audioContext.currentTime); 
    gainNode.gain.setValueAtTime(0.05, audioContext.currentTime); 
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.0);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 1.0); // 비프음은 짧으므로 3초 제한 불필요

    console.log("Offscreen: beep 알림음 재생 시작됨");
    
    // 오디오 컨텍스트와 문서 정리 (미리듣기든 아니든 1.5초 후 정리)
    setTimeout(() => {
        audioContext.close();
        console.log("Offscreen: 오디오 컨텍스트 종료");
        setTimeout(() => {
            console.log("Offscreen: 문서 종료 (beep)");
            window.close();
        }, 100);
    }, 1500); 
}

// 오디오 파일 재생 (공통 함수)
function playAudioFile(soundPath, isPreview = false) { // isPreview 파라미터 추가
    console.log(`Offscreen: ${soundPath} 소리 재생 시도`, { isPreview });
    
    const audio = new Audio();
    audio.src = chrome.runtime.getURL(soundPath);
    let previewTimeoutId = null; // 미리듣기 타임아웃 ID
    let closeTimeoutId = null; // 창 닫기 타임아웃 ID

    // 미리듣기 타이머 및 창 닫기 타이머 클리어 함수
    const clearTimeouts = () => {
        if (previewTimeoutId) clearTimeout(previewTimeoutId);
        if (closeTimeoutId) clearTimeout(closeTimeoutId);
        previewTimeoutId = null;
        closeTimeoutId = null;
    };

    audio.oncanplaythrough = () => {
        console.log(`Offscreen: ${soundPath} 소리 로드 완료, 재생 시작`);
        audio.play()
            .then(() => {
                console.log(`Offscreen: ${soundPath} 재생 성공`);
                if (isPreview) {
                    // 3초 후 재생 중지 타이머 설정
                    previewTimeoutId = setTimeout(() => {
                        console.log("Offscreen: 미리듣기 3초 경과, 재생 중지");
                        audio.pause();
                        audio.currentTime = 0; // 시간 초기화 (선택 사항)
                        previewTimeoutId = null; // ID 초기화

                        // 재생 중지 후 창 닫기 타이머 (0.5초 후)
                        closeTimeoutId = setTimeout(() => {
                            console.log("Offscreen: 문서 종료 (preview timeout)");
                            window.close();
                        }, 500); 

                    }, 3000);
                }
            })
            .catch(error => {
                console.error(`Offscreen: ${soundPath} 재생 실패`, error);
                clearTimeouts();
                playBeepSound(); // 실패하면 기본 beep으로 폴백 (미리듣기 여부 전달 안 함)
            });
    };
    
    audio.onerror = (e) => {
        console.error(`Offscreen: ${soundPath} 소리 로드 실패`, e);
        clearTimeouts();
        playBeepSound(); // 오류 시 기본 beep으로 폴백
    };
    
    // 재생이 끝난 후 정리 (미리듣기가 아닐 때 또는 미리듣기 타임아웃 전에 끝날 때)
    audio.onended = () => {
        console.log(`Offscreen: ${soundPath} 재생 완료 (onended)`);
        clearTimeouts(); // 모든 타이머 클리어
        // 약간의 지연 후 창 닫기
        closeTimeoutId = setTimeout(() => {
            console.log("Offscreen: 문서 종료 (onended)");
            window.close();
        }, 500);
    };
}

// Gong 소리 재생 (이제 직접 호출되지 않고 playNotificationSound를 통해 처리됨)
function playGongSound(isPreview = false) {
    playAudioFile('sounds/361494__tec_studio__gong-002.wav', isPreview);
} 