# 1단계: 코드 구조 개선 상세 계획

## 1.1 모듈 분리 계획

### 1.1.1 디렉토리 구조 설계
```
src/
├── core/
│   ├── timer/
│   │   ├── Timer.js
│   │   ├── TimerState.js
│   │   └── TimerEvents.js
│   ├── settings/
│   │   ├── Settings.js
│   │   ├── SettingsStorage.js
│   │   └── DefaultSettings.js
│   ├── statistics/
│   │   ├── Statistics.js
│   │   ├── StatisticsStorage.js
│   │   └── StatisticsExporter.js
│   ├── notification/
│   │   ├── NotificationManager.js
│   │   ├── SoundManager.js
│   │   └── BrowserNotification.js
│   └── storage/
│       ├── StorageManager.js
│       └── StorageTypes.js
├── utils/
│   ├── timeUtils.js
│   ├── validationUtils.js
│   └── errorUtils.js
└── background.js
```

### 1.1.2 모듈별 책임 정의

#### 타이머 모듈 (Timer)
- 타이머 상태 관리
- 타이머 시작/일시정지/재개/중지
- 타이머 이벤트 발생
- 세션 관리 (집중/휴식)

```javascript
class Timer {
    constructor(settings) {
        this.settings = settings;
        this.state = new TimerState();
    }
    
    start() { /* ... */ }
    pause() { /* ... */ }
    resume() { /* ... */ }
    stop() { /* ... */ }
    completeSession() { /* ... */ }
    abandonSession() { /* ... */ }
}
```

#### 설정 모듈 (Settings)
- 설정 로드/저장
- 설정 유효성 검사
- 기본값 관리
- 설정 변경 이벤트 처리

```javascript
class Settings {
    constructor() {
        this.defaults = DefaultSettings;
    }
    
    load() { /* ... */ }
    save(settings) { /* ... */ }
    validate(settings) { /* ... */ }
    reset() { /* ... */ }
}
```

#### 통계 모듈 (Statistics)
- 세션 데이터 저장
- 통계 계산
- 데이터 내보내기/가져오기
- 통계 시각화 데이터 생성

```javascript
class Statistics {
    constructor(storage) {
        this.storage = storage;
    }
    
    saveSession(session) { /* ... */ }
    getStatistics() { /* ... */ }
    exportToCSV() { /* ... */ }
    importFromCSV(data) { /* ... */ }
}
```

#### 알림 모듈 (Notification)
- 브라우저 알림 관리
- 소리 알림 관리
- 알림 설정 관리
- 알림 이벤트 처리

```javascript
class NotificationManager {
    constructor(settings) {
        this.settings = settings;
        this.soundManager = new SoundManager();
    }
    
    showNotification(title, message) { /* ... */ }
    playSound(soundType) { /* ... */ }
    stopSound() { /* ... */ }
}
```

#### 저장소 모듈 (Storage)
- Chrome Storage API 래핑
- 데이터 직렬화/역직렬화
- 저장소 오류 처리
- 데이터 마이그레이션

```javascript
class StorageManager {
    constructor() {
        this.storage = chrome.storage;
    }
    
    async get(key) { /* ... */ }
    async set(key, value) { /* ... */ }
    async remove(key) { /* ... */ }
    async clear() { /* ... */ }
}
```

### 1.1.3 의존성 주입 패턴 구현
- 각 모듈의 의존성을 명시적으로 주입
- 테스트 용이성 확보
- 모듈 간 결합도 감소

```javascript
class PomodoroApp {
    constructor(
        timer,
        settings,
        statistics,
        notification,
        storage
    ) {
        this.timer = timer;
        this.settings = settings;
        this.statistics = statistics;
        this.notification = notification;
        this.storage = storage;
    }
}
```

## 1.2 상태 관리 개선 계획

### 1.2.1 상태 관리 클래스 설계
```javascript
class TimerState {
    constructor() {
        this._state = {
            isRunning: false,
            timeLeft: 0,
            currentSession: null,
            sessionStartTime: null,
            pomodoroCount: 0
        };
        this._listeners = new Set();
    }
    
    get state() { return { ...this._state }; }
    
    setState(newState) {
        this._state = { ...this._state, ...newState };
        this._notifyListeners();
    }
    
    addListener(listener) {
        this._listeners.add(listener);
    }
    
    removeListener(listener) {
        this._listeners.delete(listener);
    }
    
    _notifyListeners() {
        this._listeners.forEach(listener => listener(this._state));
    }
}
```

### 1.2.2 상태 변경 추적 메커니즘
- 상태 변경 이벤트 발생
- 상태 변경 로깅
- 상태 변경 히스토리 관리
- 상태 롤백 기능

```javascript
class StateTracker {
    constructor() {
        this.history = [];
        this.maxHistorySize = 50;
    }
    
    trackChange(oldState, newState) {
        this.history.push({
            timestamp: Date.now(),
            oldState,
            newState
        });
        
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
    }
    
    getHistory() {
        return [...this.history];
    }
}
```

## 구현 순서 및 일정

### 1주차: 기본 구조 설정
1. 디렉토리 구조 생성
2. 기본 모듈 파일 생성
3. 의존성 주입 패턴 구현

### 2주차: 타이머 모듈 구현
1. Timer 클래스 구현
2. TimerState 클래스 구현
3. 타이머 이벤트 시스템 구현

### 3주차: 설정 및 저장소 모듈 구현
1. Settings 클래스 구현
2. StorageManager 클래스 구현
3. 설정 저장/로드 기능 구현

### 4주차: 통계 및 알림 모듈 구현
1. Statistics 클래스 구현
2. NotificationManager 클래스 구현
3. 통계 내보내기/가져오기 기능 구현

### 5주차: 통합 및 테스트
1. 모듈 통합
2. 단위 테스트 작성
3. 통합 테스트 작성
4. 버그 수정

## 성공 기준

1. 코드 구조
   - 각 모듈의 책임이 명확히 분리됨
   - 중복 코드가 제거됨
   - 의존성이 명시적으로 관리됨

2. 상태 관리
   - 전역 변수가 제거됨
   - 상태 변경이 추적 가능함
   - 상태 변경 이벤트가 적절히 처리됨

3. 테스트
   - 각 모듈에 대한 단위 테스트가 작성됨
   - 통합 테스트가 작성됨
   - 테스트 커버리지가 80% 이상

4. 성능
   - 메모리 사용량이 감소함
   - CPU 사용량이 감소함
   - 응답 시간이 개선됨

## 리스크 및 대응 방안

1. 리스크: 기존 기능 동작 중단
   - 대응: 단계적 마이그레이션
   - 대응: 철저한 테스트
   - 대응: 롤백 계획 수립

2. 리스크: 성능 저하
   - 대응: 성능 테스트 수행
   - 대응: 프로파일링 도구 사용
   - 대응: 최적화 작업 수행

3. 리스크: 브라우저 호환성 문제
   - 대응: 크로스 브라우저 테스트
   - 대응: 폴리필 적용
   - 대응: 브라우저별 대응 코드 작성 