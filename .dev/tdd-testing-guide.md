# TDD 테스트 가이드

## 1. 테스트 환경 설정

### 1.1 필요한 패키지
```json
{
  "devDependencies": {
    "@testing-library/jest-dom": "^5.16.5",
    "@testing-library/user-event": "^14.4.3",
    "jest": "^29.5.0",
    "jest-environment-jsdom": "^29.5.0",
    "@babel/core": "^7.22.0",
    "@babel/preset-env": "^7.22.0",
    "babel-jest": "^29.5.0"
  }
}
```

### 1.2 Jest 설정
```javascript
// jest.config.js
module.exports = {
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    moduleNameMapper: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
    },
    testMatch: ['**/tests/**/*.test.js'],
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov'],
    verbose: true
};
```

## 2. 테스트 작성 가이드

### 2.1 테스트 파일 구조
```
tests/
├── unit/                    # 단위 테스트
│   ├── timer/              # 타이머 관련 테스트
│   ├── settings/           # 설정 관련 테스트
│   └── statistics/         # 통계 관련 테스트
├── integration/            # 통합 테스트
└── e2e/                    # E2E 테스트
```

### 2.2 테스트 작성 패턴
```javascript
describe('컴포넌트/기능 이름', () => {
    // 테스트 전 설정
    beforeEach(() => {
        // 초기화 코드
    });

    // 테스트 후 정리
    afterEach(() => {
        // 정리 코드
    });

    // 개별 테스트 케이스
    test('테스트 설명', () => {
        // 테스트 코드
    });
});
```

## 3. 주요 테스트 케이스

### 3.1 타이머 기능 테스트
```javascript
describe('Timer', () => {
    test('타이머 시작', () => {
        // 시작 버튼 클릭
        // 타이머가 실행 중인지 확인
        // 남은 시간이 감소하는지 확인
    });

    test('타이머 일시정지', () => {
        // 일시정지 버튼 클릭
        // 타이머가 멈췄는지 확인
        // 남은 시간이 유지되는지 확인
    });

    test('타이머 리셋', () => {
        // 리셋 버튼 클릭
        // 타이머가 초기화되는지 확인
        // 남은 시간이 초기값으로 돌아가는지 확인
    });
});
```

### 3.2 설정 기능 테스트
```javascript
describe('Settings', () => {
    test('설정 저장', () => {
        // 설정 변경
        // 저장 버튼 클릭
        // 설정이 저장소에 저장되는지 확인
    });

    test('설정 로드', () => {
        // 저장된 설정 로드
        // UI에 올바르게 표시되는지 확인
    });

    test('설정 유효성 검사', () => {
        // 잘못된 설정 입력
        // 에러 메시지 표시 확인
    });
});
```

### 3.3 통계 기능 테스트
```javascript
describe('Statistics', () => {
    test('세션 기록', () => {
        // 세션 완료
        // 통계에 기록되는지 확인
    });

    test('통계 계산', () => {
        // 여러 세션 데이터
        // 통계가 올바르게 계산되는지 확인
    });

    test('통계 내보내기', () => {
        // CSV 내보내기
        // 파일이 올바른 형식으로 생성되는지 확인
    });
});
```

## 4. 테스트 실행 및 커버리지

### 4.1 테스트 실행 명령어
```bash
# 모든 테스트 실행
npm test

# 특정 테스트 파일 실행
npm test tests/unit/timer.test.js

# 테스트 감시 모드
npm run test:watch

# 커버리지 리포트 생성
npm run test:coverage
```

### 4.2 커버리지 기준
- 라인 커버리지: 80% 이상
- 브랜치 커버리지: 70% 이상
- 함수 커버리지: 90% 이상

## 5. 모의(Mock) 객체 사용

### 5.1 Chrome API 모의
```javascript
// jest.setup.js
global.chrome = {
    storage: {
        local: {
            get: jest.fn(),
            set: jest.fn(),
            remove: jest.fn(),
            clear: jest.fn()
        }
    },
    runtime: {
        sendMessage: jest.fn(),
        onMessage: {
            addListener: jest.fn()
        }
    }
};
```

### 5.2 이벤트 모의
```javascript
// 이벤트 발생 모의
const clickEvent = new MouseEvent('click', {
    bubbles: true,
    cancelable: true
});
element.dispatchEvent(clickEvent);

// 이벤트 리스너 모의
const clickHandler = jest.fn();
element.addEventListener('click', clickHandler);
expect(clickHandler).toHaveBeenCalled();
```

## 6. TDD 워크플로우

### 6.1 기본 워크플로우
1. 실패하는 테스트 작성
2. 테스트를 통과하는 최소한의 코드 작성
3. 코드 리팩토링
4. 모든 테스트가 통과하는지 확인

### 6.2 기능 개발 워크플로우
1. 기능 요구사항 분석
2. 테스트 케이스 작성
3. 테스트 실행 (실패 확인)
4. 기능 구현
5. 테스트 실행 (성공 확인)
6. 코드 리팩토링
7. 테스트 재실행

## 7. 테스트 작성 시 주의사항

### 7.1 테스트 격리
- 각 테스트는 독립적으로 실행되어야 함
- 테스트 간 상태 공유 금지
- beforeEach/afterEach를 활용한 테스트 환경 초기화

### 7.2 테스트 가독성
- 명확한 테스트 설명 작성
- 테스트 코드 구조화
- 적절한 변수명 사용

### 7.3 테스트 유지보수
- 테스트 코드도 리팩토링 필요
- 중복 코드 제거
- 테스트 유틸리티 함수 활용

## 8. 디버깅

### 8.1 테스트 디버깅
```javascript
// 테스트 중 디버깅
test('디버깅 예시', () => {
    debugger; // 브라우저 개발자 도구에서 중단점
    // 테스트 코드
});
```

### 8.2 Jest 디버깅
```bash
# 디버깅 모드로 테스트 실행
node --inspect-brk node_modules/.bin/jest --runInBand
```

## 9. CI/CD 통합

### 9.1 GitHub Actions 설정
```yaml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm test
```

### 9.2 커버리지 리포트
- Jest 커버리지 리포트를 CI/CD 파이프라인에 통합
- 커버리지 임계값 설정
- 커버리지 리포트 자동 생성 및 배포 