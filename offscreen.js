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
        console.log("Offscreen: 알림음 재생 시작");
        playNotificationSound();
    }
    return false;
});

// Web Audio API를 사용하여 알림음 생성 및 재생
function playNotificationSound() {
    try {
        console.log("Offscreen: playNotificationSound 함수 실행");
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

        console.log("Offscreen: 알림음 재생 시작됨");

        // 오디오 컨텍스트와 문서 정리
        setTimeout(() => {
            audioContext.close();
            console.log("Offscreen: 오디오 컨텍스트 종료");
            setTimeout(() => {
                console.log("Offscreen: 문서 종료");
                window.close();
            }, 100);
        }, 1500); // 1.5초 후 정리 (1초 재생 + 0.5초 여유)

    } catch (error) {
        console.error('Offscreen: 알림음 재생 중 오류 발생:', error);
        window.close();
    }
} 