# 함수 문서화

이 문서는 코드베이스의 모든 함수를 파일과 목적별로 정리한 종합 목록을 제공합니다.

## background.js

### 타이머 관리 함수
- `startTimer()`: 포모도로 타이머를 시작합니다
- `pauseTimer()`: 현재 타이머 세션을 일시정지합니다
- `resetTimer()`: 타이머를 초기 상태로 되돌립니다
- `completeSession()`: 현재 세션을 완료로 표시합니다
- `abandonSession()`: 현재 세션을 포기로 표시합니다

### 설정 관리 함수
- `loadSettings()`: 저장소에서 사용자 설정을 불러옵니다
- `saveSettings(settings)`: 사용자 설정을 저장소에 저장합니다
- `resetSettings()`: 설정을 기본값으로 초기화합니다
- `updateSettings(newSettings)`: 특정 설정을 업데이트합니다

### 통계 관리 함수
- `saveSession(sessionData)`: 완료된 세션을 기록에 저장합니다
- `getStatistics()`: 모든 세션 통계를 가져옵니다
- `exportStatistics()`: 통계를 CSV 형식으로 내보냅니다
- `importStatistics(csvData)`: CSV 형식의 통계를 가져옵니다
- `resetStatistics()`: 모든 통계 데이터를 초기화합니다

### 알림 함수
- `playNotificationSound()`: 알림음을 재생합니다
- `showBrowserNotification(title, message)`: 브라우저 알림을 표시합니다
- `updateBadgeText(text)`: 확장 프로그램 뱃지 텍스트를 업데이트합니다

### 저장소 관리 함수
- `saveToStorage(key, value)`: 데이터를 Chrome 저장소에 저장합니다
- `loadFromStorage(key)`: Chrome 저장소에서 데이터를 불러옵니다
- `clearStorage()`: 모든 저장된 데이터를 삭제합니다

## dashboard.js

### UI 관리 함수
- `updateDashboard()`: 대시보드 화면을 업데이트합니다
- `renderStatistics()`: 대시보드에 통계를 표시합니다
- `updateCharts()`: 통계 차트를 업데이트합니다
- `toggleSettingsPanel()`: 설정 패널 표시를 전환합니다

### 데이터 처리 함수
- `processStatistics(data)`: 원시 통계 데이터를 처리합니다
- `formatTime(seconds)`: 초 단위 시간을 MM:SS 형식으로 변환합니다
- `calculateProductivityScore(sessions)`: 생산성 점수를 계산합니다

## offscreen.js

### 오디오 관리 함수
- `initializeAudio()`: 오디오 컨텍스트를 초기화합니다
- `playSound(soundType)`: 지정된 소리 유형을 재생합니다
- `stopSound()`: 현재 재생 중인 소리를 중지합니다

### 메시지 처리 함수
- `handleMessage(message)`: 백그라운드 스크립트의 메시지를 처리합니다
- `sendResponse(response)`: 백그라운드 스크립트에 응답을 보냅니다

## 유틸리티 함수

### 시간 관리
- `formatTime(seconds)`: 초를 MM:SS 형식으로 변환합니다
- `parseTime(timeString)`: 시간 문자열을 초로 변환합니다
- `getCurrentTimestamp()`: 현재 타임스탬프를 가져옵니다

### 데이터 검증
- `validateSettings(settings)`: 설정 객체를 검증합니다
- `validateSessionData(sessionData)`: 세션 데이터를 검증합니다
- `validateImportData(data)`: 가져온 데이터를 검증합니다

### 오류 처리
- `handleError(error)`: 오류를 처리하고 기록합니다
- `showErrorMessage(message)`: 사용자에게 오류 메시지를 표시합니다

## 이벤트 핸들러

### 타이머 이벤트
- `onTimerStart()`: 타이머 시작 이벤트를 처리합니다
- `onTimerPause()`: 타이머 일시정지 이벤트를 처리합니다
- `onTimerComplete()`: 타이머 완료 이벤트를 처리합니다
- `onSessionComplete()`: 세션 완료 이벤트를 처리합니다

### UI 이벤트
- `onSettingsChange()`: 설정 변경 이벤트를 처리합니다
- `onStatisticsUpdate()`: 통계 업데이트 이벤트를 처리합니다
- `onNotificationClick()`: 알림 클릭 이벤트를 처리합니다

### 저장소 이벤트
- `onStorageChange(changes)`: 저장소 변경 이벤트를 처리합니다
- `onStorageError(error)`: 저장소 오류 이벤트를 처리합니다

## Chrome 확장 프로그램 특정 함수

### 메시지 처리
- `handleExtensionMessage(message, sender, sendResponse)`: 확장 프로그램의 메시지를 처리합니다
- `sendMessageToExtension(message)`: 확장 프로그램에 메시지를 보냅니다

### 브라우저 통합
- `updateBrowserAction(state)`: 브라우저 액션 상태를 업데이트합니다
- `handleBrowserActionClick()`: 브라우저 액션 클릭을 처리합니다

## 참고사항
- 모든 함수는 주요 목적과 기본 기능이 문서화되어 있습니다
- 함수는 여기에 나열되지 않은 추가 매개변수를 가질 수 있습니다
- 일부 함수는 내부/비공개이며 확장 프로그램 API에 노출되지 않을 수 있습니다
- 오류 처리와 로깅이 코드베이스 전체에 구현되어 있습니다
- 모든 함수는 프로젝트의 코딩 표준과 모범 사례를 따릅니다 