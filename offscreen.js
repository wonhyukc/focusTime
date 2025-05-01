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
        console.log("Offscreen: 알림음 재생 시작", message.soundType);
        playNotificationSound(message.soundType);
    }
    return false;
});

// Web Audio API를 사용하여 알림음 생성 및 재생
function playNotificationSound(soundType = 'low-short-beep') {
    try {
        console.log("Offscreen: playNotificationSound 함수 실행", soundType);
        
        // 사운드 타입에 따라 다른 소리 재생
        switch (soundType) {
            case 'gong':
                playGongSound();
                break;
            case 'brown_noise':
                playAudioFile('sounds/brown_noise.mp3');
                break;
            case 'rainy_birds':
                playAudioFile('sounds/rainy_birds.mp3');
                break;
            case 'clock_ticking':
                playAudioFile('sounds/clock_ticking.wav');
                break;
            default:
                // 기본 beep 소리 재생
                playBeepSound();
        }
    } catch (error) {
        console.error('Offscreen: 알림음 재생 중 오류 발생:', error);
        window.close();
    }
}

// 기본 beep 소리 재생
function playBeepSound() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    // 오실레이터 설정
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(350, audioContext.currentTime); // 350Hz 음
    
    // 게인(볼륨) 설정 - 더 낮은 볼륨으로 설정
    gainNode.gain.setValueAtTime(0.05, audioContext.currentTime); // 시작 볼륨 (0.05 = 5%)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.0); // 1초 동안 페이드아웃

    // 연결
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // 재생 - 1초 동안
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 1.0);

    console.log("Offscreen: beep 알림음 재생 시작됨");
    
    // 오디오 컨텍스트와 문서 정리
    setTimeout(() => {
        audioContext.close();
        console.log("Offscreen: 오디오 컨텍스트 종료");
        setTimeout(() => {
            console.log("Offscreen: 문서 종료");
            window.close();
        }, 100);
    }, 1500); // 1.5초 후 정리 (1초 재생 + 0.5초 여유)
}

// 오디오 파일 재생 (공통 함수)
function playAudioFile(soundPath) {
    console.log(`Offscreen: ${soundPath} 소리 재생 시도`);
    
    // 오디오 엘리먼트 생성
    const audio = new Audio();
    audio.src = chrome.runtime.getURL(soundPath);
    
    // 소리 재생
    audio.oncanplaythrough = () => {
        console.log(`Offscreen: ${soundPath} 소리 로드 완료, 재생 시작`);
        audio.play()
            .then(() => {
                console.log(`Offscreen: ${soundPath} 재생 성공`);
            })
            .catch(error => {
                console.error(`Offscreen: ${soundPath} 재생 실패`, error);
                // 실패하면 기본 beep으로 폴백
                playBeepSound();
            });
    };
    
    audio.onerror = (e) => {
        console.error(`Offscreen: ${soundPath} 소리 로드 실패`, e);
        // 오류 시 기본 beep으로 폴백
        playBeepSound();
    };
    
    // 재생이 끝난 후 정리
    audio.onended = () => {
        console.log(`Offscreen: ${soundPath} 재생 완료`);
        setTimeout(() => {
            console.log("Offscreen: 문서 종료");
            window.close();
        }, 500);
    };
}

// Gong 소리 재생 (기존 함수 유지하되 공통 함수 활용)
function playGongSound() {
    playAudioFile('sounds/gong.wav');
} 