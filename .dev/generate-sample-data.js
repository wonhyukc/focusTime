// generate-sample-data.js
// 포모도로 타이머 통계를 위한 다양한 샘플 데이터 생성

// 프로젝트 리스트
const projects = [
    '자바스크립트 공부',
    '리액트 프로젝트',
    '알고리즘 연습',
    '블로그 글쓰기',
    '영어 공부',
    '디자인 작업',
    '코드 리팩토링',
    '취업 준비',
    '포트폴리오 작업'
];

// 지속 시간 (분)
const durations = [15, 25, 30, 45, 60];

// 세션 유형
const types = ['focus', 'shortBreak', 'longBreak'];

// 생성할 데이터 기간 (1년)
const startDate = new Date();
startDate.setFullYear(startDate.getFullYear() - 1);
const endDate = new Date();

// 집중 세션 분포 패턴 (요일별 가중치)
// 0: 일요일, 1: 월요일, ..., 6: 토요일
const dayWeights = [0.5, 1.2, 1.3, 1.4, 1.3, 1.0, 0.7];

// 시간별 가중치 (하루 중 시간대별 집중도)
const hourWeights = Array(24).fill(0).map((_, hour) => {
    if (hour >= 22 || hour < 6) return 0.1;  // 밤/새벽
    if (hour >= 9 && hour < 12) return 1.5;  // 오전 집중
    if (hour >= 14 && hour < 18) return 1.3; // 오후 집중
    return 0.7;  // 기타 시간대
});

// 월별 가중치 (계절/시험 기간 등 반영)
const monthWeights = [
    0.7,  // 1월 (겨울방학)
    0.8,  // 2월 (개강 준비)
    1.2,  // 3월 (학기 초)
    1.3,  // 4월
    1.5,  // 5월 (중간고사)
    1.0,  // 6월
    0.6,  // 7월 (여름방학)
    0.5,  // 8월 (여름방학)
    1.2,  // 9월 (학기 초)
    1.3,  // 10월
    1.5,  // 11월 (기말고사)
    0.8   // 12월 (겨울방학)
];

// 샘플 데이터 생성 함수
function generateSampleData() {
    const history = [];
    const currentDate = new Date(startDate);
    
    // 날짜별로 반복
    while (currentDate <= endDate) {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const day = currentDate.getDate();
        const dayOfWeek = currentDate.getDay(); // 0: 일요일, 6: 토요일
        
        // 해당 날짜에 대한 가중치 계산
        const dateWeight = dayWeights[dayOfWeek] * monthWeights[month];
        
        // 평균 세션 수 계산 (가중치 기반)
        let sessionCount = Math.round(dateWeight * 8);
        sessionCount = Math.max(0, Math.min(15, sessionCount)); // 최대 15개 세션/일
        
        // 해당 날짜의 세션 생성
        const dailySessions = [];
        
        // 먼저 Focus 세션 생성
        for (let i = 0; i < sessionCount; i++) {
            // 시간 분포 (가중치 기반으로 시간 선택)
            let hour = selectWeighted(hourWeights);
            
            // 집중 세션 생성
            const focusSession = {
                type: 'focus',
                startTime: new Date(year, month, day, hour, Math.floor(Math.random() * 60)),
                durationMinutes: selectRandom(durations),
                projectName: selectRandom(projects)
            };
            dailySessions.push(focusSession);
        }
        
        // 세션 시간순 정렬
        dailySessions.sort((a, b) => a.startTime - b.startTime);
        
        // 집중 세션 사이에 휴식 세션 추가
        let breakIndex = 0;
        const sessionsWithBreaks = [];
        
        dailySessions.forEach((session, index) => {
            sessionsWithBreaks.push(session);
            
            // 휴식 세션 추가 (집중 세션 다음에)
            if (index < dailySessions.length - 1) {
                breakIndex++;
                const isLongBreak = breakIndex % 4 === 0; // 4번째마다 긴 휴식
                const breakDuration = isLongBreak ? 15 : 5;
                
                // 휴식 시작 시간은 집중 세션 종료 시간
                const breakStartTime = new Date(session.startTime);
                breakStartTime.setMinutes(breakStartTime.getMinutes() + session.durationMinutes);
                
                const breakSession = {
                    type: isLongBreak ? 'longBreak' : 'shortBreak',
                    startTime: breakStartTime,
                    durationMinutes: breakDuration,
                    projectName: session.projectName
                };
                
                // 다음 세션과 시간이 겹치지 않는 경우만 추가
                const nextSession = dailySessions[index + 1];
                const breakEndTime = new Date(breakStartTime);
                breakEndTime.setMinutes(breakEndTime.getMinutes() + breakDuration);
                
                if (breakEndTime < nextSession.startTime) {
                    sessionsWithBreaks.push(breakSession);
                }
            }
        });
        
        // 최종 히스토리에 추가
        history.push(...sessionsWithBreaks);
        
        // 다음 날짜로 이동
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return history;
}

// 배열에서 가중치 기반으로 인덱스 선택
function selectWeighted(weights) {
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < weights.length; i++) {
        random -= weights[i];
        if (random <= 0) return i;
    }
    return weights.length - 1;
}

// 배열에서 무작위 항목 선택
function selectRandom(array) {
    return array[Math.floor(Math.random() * array.length)];
}

// 날짜를 'YYYY-MM-DD HH:mm' 형식으로 변환
function formatDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// 데이터를 CSV 형식으로 변환
function convertToCSV(data) {
    // CSV 헤더 - 사용자가 요청한 포맷으로 변경
    const header = "시작시각(년월일시분),세션,지속시간,프로젝트";
    
    // 데이터 행 생성 - 사용자가 요청한 포맷으로 변경
    const rows = data.map(item => {
        const startTime = formatDateTime(item.startTime);
        return `${startTime},${item.type},${item.durationMinutes},${item.projectName}`;
    });
    
    // 헤더와 데이터 행 결합
    return [header, ...rows].join('\n');
}

// 데이터 생성 및 CSV 저장
const sampleData = generateSampleData();



// CSV 형식으로 변환
const csvData = convertToCSV(sampleData);

// 파일로 저장 (브라우저 환경)
if (typeof document !== 'undefined') {
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'pomodoro_sample_data.csv');
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    
} else {
    // Node.js 환경일 경우
    
} 