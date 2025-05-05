# Pomodoro Chrome Extension
## ff32817 커밋 이후 변경점 정리

---

## 1. background.js

### 1-1. 오프스크린 문서 중복 생성 방지

- **함수:** `playSound`
- **변경 내용:**
  - 오프스크린 문서 생성 시 이미 존재하면 새로 만들지 않고,
  - 중복 생성 에러(`Only a single offscreen document may be created`) 발생 시 catch 블록에서 기존 문서에 메시지만 보냄.
  - **코드 예시:**
    ```js
    try {
      // ...생성 시도...
      await chrome.offscreen.createDocument({ ... });
    } catch (error) {
      if (error.message.includes("Only a single offscreen document may be created")) {
        chrome.runtime.sendMessage(messagePayload);
        resolve();
      } else {
        reject(error);
      }
    }
    ```

---

### 1-2. background.js에서 command: 'playSound' 메시지 처리

- **함수:** `chrome.runtime.onMessage.addListener`
- **변경 내용:**
  - `{command: 'playSound', ...}` 메시지도 받아 playSound 함수를 호출하도록 분기 추가.
  - **코드 예시:**
    ```js
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      (async () => {
        let response;
        if (request.action) {
          // 기존 action 처리
        }
        // 추가: command 처리
        else if (request.command === 'playSound') {
          await playSound(request.soundType, request.isPreview, request.volume);
          response = { success: true };
        } else {
          response = { success: false, message: 'Unknown action' };
        }
        if (sendResponse) sendResponse(response);
      })();
      return true;
    });
    ```

---

### 1-3. 볼륨 즉시 반영(playSound) 부분 주석 처리

- **함수:** `chrome.storage.onChanged`
- **변경 내용:**
  - settings 저장(change) 시에는 playSound가 호출되지 않도록 해당 부분을 주석 처리.
  - **코드 예시:**
    ```js
    // --- 볼륨 즉시 반영 ---
    /*
    if (typeof newVolume === 'number') {
        chrome.runtime.sendMessage({
            command: 'playSound',
            soundType: ...,
            isPreview: false,
            volume: newVolume
        });
    }
    */
    // --- 볼륨 즉시 반영 끝 ---
    ```

---

## 2. scripts/dashboard.js

### 2-1. 슬라이더 이벤트 분리 및 실시간 반영

- **코드 위치:** DOMContentLoaded 내부
- **변경 내용:**
  - input 이벤트에서는 playSound만 호출(실시간 반영)
  - change 이벤트(손 뗐을 때)에서만 saveSettings 호출(저장 횟수 제한 회피)
  - **코드 예시:**
    ```js
    // input: 실시간 소리만
    document.getElementById('focus-sound-type-volume')?.addEventListener('input', function(e) {
        const soundType = document.getElementById('focus-sound-type')?.value || 'brown_noise';
        const volume = parseInt(e.target.value);
        chrome.runtime.sendMessage({
            command: 'playSound',
            soundType: soundType,
            isPreview: false,
            volume: volume
        });
        logVolumeChange(soundType, volume);
    });
    document.getElementById('focus-sound-type-volume')?.addEventListener('change', function(e) {
        saveSettings();
    });
    // (short-break-sound-volume, long-break-sound-volume도 동일하게 적용)
    ```

---

### 2-2. playSound 메시지 구조 통일

- **변경 내용:**
  - `{action: 'playSound', ...}` → `{command: 'playSound', ...}`로 통일

---

## 3. offscreen.js

### 3-1. 오디오 중복 재생 방지 및 볼륨만 조정

- **전역 변수 추가:**
    ```js
    let currentAudio = null;
    let currentSoundType = null;
    let currentIsPreview = null;
    ```
- **변경 내용:**
    - 같은 소리/상태면 볼륨만 조정, 새로운 소리/상태면 오디오 새로 재생
    - **코드 예시:**
      ```js
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
          if (message.command === "playSound") {
              if (
                  currentAudio &&
                  !currentAudio.paused &&
                  message.soundType === currentSoundType &&
                  message.isPreview === currentIsPreview
              ) {
                  currentAudio.volume = (message.volume ?? 50) / 100;
                  return;
              }
              if (currentAudio) {
                  currentAudio.pause();
                  currentAudio = null;
              }
              currentSoundType = message.soundType;
              currentIsPreview = message.isPreview;
              playNotificationSound(message.soundType, message.isPreview, message.volume);
          }
          return false;
      });
      ```

---

## 4. 기타(UX/버그 관련)

- context menu 중복 생성 방지(비동기 removeAll 후 await 처리)
- settings 저장 시 슬라이더의 최신 값이 저장되도록 보장

---

## 적용 요약

- **background.js**
  - playSound 중복 생성 방지 try-catch 보완
  - onMessage에서 command: 'playSound' 처리 분기 추가
  - onChanged에서 볼륨 playSound 호출 부분 주석 처리

- **scripts/dashboard.js**
  - 슬라이더 input: playSound만, change: saveSettings만
  - playSound 메시지 구조 통일(command 사용)

- **offscreen.js**
  - currentAudio/currentSoundType/currentIsPreview로 중복 재생 방지 및 볼륨만 조정

---

**이 문서를 복사해서 구글 문서, 워드, Notion, Github 등 어디든 붙여넣으시면 됩니다!**
필요하다면 각 파일별 diff(변경 전/후 코드)도 제공해드릴 수 있습니다.
추가로 궁금한 점 있으면 말씀해 주세요! 