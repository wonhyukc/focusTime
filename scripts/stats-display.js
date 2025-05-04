// scripts/stats-display.js

// Signal to dashboard.js that we'll handle chart initialization
window.statsDisplayLoaded = true;

// 차트 인스턴스 저장 변수
let dailyChartInstance = null;
let weeklyChartInstance = null;

// 선택된 시간 필터 (분 단위) - 변수 선언 및 초기화
let selectedDurationFilter = 25; // 기본값 (예: 25분)

// Chart.js 로딩 상태 확인 함수
function isChartJsLoaded() {
    if (typeof Chart === 'undefined') {
        console.error("[Stats Display] Chart.js is not loaded. Charts cannot be rendered.");
        if (typeof showToast === 'function') {
            showToast('차트 라이브러리가 로드되지 않았습니다. 페이지를 새로고침하거나 네트워크 연결을 확인하세요.', 'error');
        }
        return false;
    }
    return true;
}

// --- 데이터 로드 및 처리 ---
async function loadAndProcessStats() {
    // 현재 날짜/시각을 콘솔에 출력
    const now = new Date();
    console.log('[loadAndProcessStats] 현재 시스템 날짜/시각:', now, '| ISO:', now.toISOString());
    console.log("[Stats Display] Starting loadAndProcessStats..."); // 시작 로그
    try {
        const result = await chrome.storage.local.get('pomodoroHistory');
        let history = result.pomodoroHistory || [];
        console.log("[Stats Display] Loaded history count:", history.length);
        
        // 데이터 포맷 변환 (필요한 경우)
        history = convertHistoryFormat(history);
        
        if (history.length > 0) {
             console.log("[Stats Display] Sample history entry:", history[0]); // 샘플 데이터 확인
        }

        // --- 요약 카드 데이터 처리 ---
        console.log("[Stats Display] Updating summary cards...");
        updateSummaryCards(history);

        // 오늘의 집중 시간(분) 시간대별/프로젝트별 집계 및 콘솔 출력
        logTodayFocusDetails(history);

        // --- 일 단위 분포 데이터 처리 ---
        console.log("[Stats Display] Processing daily data...");
        const dailyData = processDailyData(history, selectedDurationFilter);
        console.log("[Stats Display] Daily data:", dailyData);
        updateDailyChart(dailyData);

        // --- 주 단위 분포 데이터 처리 ---
         console.log("[Stats Display] Processing weekly data...");
        const weeklyData = processWeeklyData(history);
        console.log("[Stats Display] Weekly data:", weeklyData);
        updateWeeklyChart(weeklyData);

        // --- 월별 히트맵 데이터 처리 ---
         console.log("[Stats Display] Processing heatmap data...");
        const heatmapData = processHeatmapData(history);
        console.log("[Stats Display] Heatmap data (sample):", Object.keys(heatmapData).length > 0 ? heatmapData[Object.keys(heatmapData)[0]] : 'empty');
        renderMonthlyHeatmap(heatmapData);

        console.log("[Stats Display] loadAndProcessStats completed successfully."); // 완료 로그

    } catch (error) {
        console.error("[Stats Display] Error in loadAndProcessStats:", error);
        // 사용자에게 오류 알림 (예: showToast 사용)
        if (typeof showToast === 'function') {
             showToast(`통계 로딩/처리 중 오류 발생: ${error.message}`, 'error');
        }
    }
}

// 가져온 데이터의 포맷 처리 (새로운 형식: 시작시각(년월일시분),세션,지속시간,프로젝트)
function convertHistoryFormat(history) {
    // 데이터가 이미 올바른 형식인지 확인
    if (history.length === 0) return history;
    
    // 첫 번째 항목 검사
    const firstItem = history[0];
    
    // 이미 변환된 형식인 경우 (type, startTime, durationMinutes, projectName 속성 있음)
    if (firstItem && typeof firstItem === 'object' && firstItem.type && firstItem.startTime && firstItem.durationMinutes !== undefined) {
        return history;
    }
    
    // 세션 타입 매핑 (한글 -> 영어)
    const sessionTypeMap = {
        '집중': 'focus',
        '휴식': 'shortBreak',
        '긴휴식': 'longBreak'
    };
    
    // 새로운 CSV 형식 (시작시각(년월일시분),세션,지속시간,프로젝트)에서 변환
    return history.map(item => {
        if (typeof item === 'string') {
            const parts = item.split(',');
            if (parts.length >= 4) {
                const koreanType = parts[1].trim();
                // 세션 타입 변환 (한글->영어)
                const englishType = sessionTypeMap[koreanType] || koreanType;
                
                return {
                    startTime: parts[0].trim(), // 시작시각
                    type: englishType,          // 세션 (영어로 변환)
                    durationMinutes: parseInt(parts[2].trim()), // 지속시간
                    projectName: parts[3].trim() // 프로젝트
                };
            }
        }
        return item; // 변환할 수 없는 경우 원래 항목 반환
    });
}

// 요약 카드 업데이트 함수
function updateSummaryCards(history) {
    try {
        // 오늘 카드 업데이트
        const todayFocusSessions = getSessionsToday(history);
        const todayMinutes = calculateTotalFocusMinutes(todayFocusSessions);
        const todayHours = Math.floor(todayMinutes / 60);
        const todayRemainMinutes = todayMinutes % 60;
        let todayLabel = '';
        if (todayMinutes === 0) {
            todayLabel = '0.00';
        } else {
            todayLabel = todayHours + ':' + String(todayRemainMinutes).padStart(2, '0');
        }
        document.querySelector('.stats-summary .stat-card:nth-child(1) .stat-value').textContent = todayMinutes;
        document.querySelector('.stats-summary .stat-card:nth-child(1) .stat-label').textContent = todayLabel;
        
        // 이번 주 카드 업데이트
        const thisWeekSessions = getSessionsThisWeek(history);
        const weekMinutes = calculateTotalFocusMinutes(thisWeekSessions);
        const weekHours = weekMinutes / 60;
        
        document.querySelector('.stats-summary .stat-card:nth-child(2) .stat-value').textContent = weekMinutes;
        document.querySelector('.stats-summary .stat-card:nth-child(2) .stat-label').textContent = 
            weekHours.toFixed(2);
        
        // 이번 달 카드 업데이트
        const thisMonthSessions = getSessionsThisMonth(history);
        const monthMinutes = calculateTotalFocusMinutes(thisMonthSessions);
        const monthHours = monthMinutes / 60;
        
        const currentMonth = new Date().getMonth();
        const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
        
        document.querySelector('.stats-summary .stat-card:nth-child(3) h3').textContent = monthNames[currentMonth];
        document.querySelector('.stats-summary .stat-card:nth-child(3) .stat-value').textContent = monthMinutes;
        document.querySelector('.stats-summary .stat-card:nth-child(3) .stat-label').textContent = 
            monthHours.toFixed(2);

        // 올해 카드 업데이트 (4번째 카드)
        const thisYearSessions = getSessionsThisYear(history);
        const yearMinutes = calculateTotalFocusMinutes(thisYearSessions);
        const yearHours = yearMinutes / 60;
        const yearCard = document.querySelector('.stats-summary .stat-card:nth-child(4)');
        if (yearCard) {
            yearCard.querySelector('.stat-value').textContent = yearMinutes;
            yearCard.querySelector('.stat-label').textContent = yearHours.toFixed(2);
        } else {
            console.warn('[Stats Display] 올해 카드(.stat-card:nth-child(4))를 찾을 수 없습니다!');
        }

        // 총 카드 업데이트 (5번째 카드)
        const totalCard = document.querySelector('.stats-summary .stat-card:nth-child(5)');
        if (totalCard) {
            const totalFocusSessions = history.filter(entry => entry.type === 'focus');
            const totalMinutes = calculateTotalFocusMinutes(totalFocusSessions);
            const totalHours = totalMinutes / 60;
            console.log('[DEBUG] totalMinutes:', totalMinutes, 'totalHours:', totalHours);
            
            totalCard.querySelector('.stat-value').textContent = totalMinutes;
            totalCard.querySelector('.stat-label').textContent = totalHours.toFixed(2);
        } else {
            console.warn('[Stats Display] 총 카드(.stat-card:nth-child(5))를 찾을 수 없습니다!');
        }
    } catch (error) {
        console.error("[Stats Display] Error updating summary cards:", error);
    }
}

// 총 집중 시간 계산 (분 단위)
function calculateTotalFocusMinutes(sessions) {
    return sessions.reduce((total, session) => {
        return total + (session.durationMinutes || 0);
    }, 0);
}

// 시작 시간에서 Date 객체 생성
function getDateFromEntry(entry) {
    if (!entry || !entry.startTime) return null;
    
    try {
        // ISO 형식인 경우 (기존 형식 - 'YYYY-MM-DDTHH:MM:SS.sssZ')
        if (entry.startTime.includes('T')) {
            return new Date(entry.startTime);
        }
        
        // 'YYYY-MM-DD HH:MM' 형식인 경우 (새 형식)
        if (entry.startTime.includes('-') && entry.startTime.includes(':')) {
            const [datePart, timePart] = entry.startTime.split(' ');
            if (datePart && timePart) {
                const [year, month, day] = datePart.split('-').map(num => parseInt(num));
                const [hour, minute] = timePart.split(':').map(num => parseInt(num));
                
                // 월은 JavaScript의 Date에서 0부터 시작 (0 = 1월)
                return new Date(year, month - 1, day, hour, minute, 0);
            }
        }
        
        // 다른 형식이거나 파싱 실패 시 Date 생성자 직접 적용
        return new Date(entry.startTime);
    } catch (error) {
        console.error("[Stats Display] Error parsing date:", entry.startTime, error);
        return null;
    }
}

// 오늘 세션 가져오기
function getSessionsToday(history) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 로컬 자정
    
    // 디버깅: 오늘 날짜와 각 entry의 날짜 출력 (로컬/UTC 모두)
    console.log('[getSessionsToday] 오늘(로컬):', today, '| 오늘(UTC):', today.toISOString());

    return history.filter(entry => {
        if (entry.type !== 'focus') return false;
        const entryDate = getDateFromEntry(entry);
        if (!entryDate) return false;
        const entryDay = new Date(entryDate);
        entryDay.setHours(0, 0, 0, 0); // 로컬 자정
        return entryDay.getTime() === today.getTime();
    });
}

// 이번 주 세션 가져오기 (일요일 시작)
function getSessionsThisWeek(history) {
    const today = new Date();
    const firstDayOfWeek = new Date(today);
    const day = today.getDay(); // 0: 일요일, 6: 토요일
    firstDayOfWeek.setDate(today.getDate() - day);
    firstDayOfWeek.setHours(0, 0, 0, 0);
    
    return history.filter(entry => {
        if (entry.type !== 'focus') return false;
        
        const entryDate = getDateFromEntry(entry);
        if (!entryDate) return false;
        
        return entryDate >= firstDayOfWeek;
    });
}

// 이번 달 세션 가져오기
function getSessionsThisMonth(history) {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    return history.filter(entry => {
        if (entry.type !== 'focus') return false;
        
        const entryDate = getDateFromEntry(entry);
        if (!entryDate) return false;
        
        return entryDate >= firstDayOfMonth;
    });
}

// getSessionsThisYear 함수 추가
function getSessionsThisYear(history) {
    const today = new Date();
    const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
    return history.filter(entry => {
        if (entry.type !== 'focus') return false;
        const entryDate = getDateFromEntry(entry);
        if (!entryDate) return false;
        return entryDate >= firstDayOfYear;
    });
}

function processDailyData(history, durationFilter) {
    try {
        console.log(`[Stats Display] Filtering daily data for duration: ${durationFilter}`);
        const hourlyCounts = Array(24).fill(0);
        const filteredHistory = history.filter(entry =>
            entry.type === 'focus' && entry.durationMinutes == durationFilter // 선택된 지속시간 필터 적용
        );
        console.log(`[Stats Display] Filtered daily history count: ${filteredHistory.length}`);

        filteredHistory.forEach(entry => {
            const entryDate = getDateFromEntry(entry);
            if (entryDate && !isNaN(entryDate)) { // 유효한 날짜인지 확인
                const hour = entryDate.getHours();
                hourlyCounts[hour]++;
            } else {
                 console.warn("[Stats Display] Invalid date found in daily processing:", entry.startTime);
            }
        });
        return hourlyCounts;
    } catch (error) {
        console.error("[Stats Display] Error in processDailyData:", error);
        return Array(24).fill(0); // 오류 시 빈 데이터 반환
    }
}

function processWeeklyData(history) {
    try {
        const weeklyCounts = Array(7).fill(0); // 0: Sunday, 6: Saturday
        const focusHistory = history.filter(entry => entry.type === 'focus');

        focusHistory.forEach(entry => {
            const entryDate = getDateFromEntry(entry);
            if (entryDate && !isNaN(entryDate)) {
                const dayOfWeek = entryDate.getDay(); // 0 = Sunday, 6 = Saturday
                weeklyCounts[dayOfWeek]++;
            } else {
                 console.warn("[Stats Display] Invalid date found in weekly processing:", entry.startTime);
            }
        });
        return weeklyCounts;
     } catch (error) {
        console.error("[Stats Display] Error in processWeeklyData:", error);
        return Array(7).fill(0);
    }
}

function processHeatmapData(history) {
    try {
        const dailyFocusCounts = {}; // { 'YYYY-MM-DD': count }
        const focusHistory = history.filter(entry => entry.type === 'focus');

        focusHistory.forEach(entry => {
            const entryDate = getDateFromEntry(entry);
            if (entryDate && !isNaN(entryDate)) {
                const dateString = entryDate.toISOString().split('T')[0]; // 'YYYY-MM-DD'
                dailyFocusCounts[dateString] = (dailyFocusCounts[dateString] || 0) + 1;
            } else {
                 console.warn("[Stats Display] Invalid date found in heatmap processing:", entry.startTime);
            }
        });
        return dailyFocusCounts;
    } catch (error) {
        console.error("[Stats Display] Error in processHeatmapData:", error);
        return {};
    }
}

// --- 차트 업데이트 ---
function updateDailyChart(data) {
    console.log("[Stats Display] Updating daily chart...");
    
    try {
        const canvas = document.getElementById('daily-chart');
        if (!canvas) {
            console.error("[Stats Display] Daily chart canvas element not found.");
            return;
        }
        
        const ctx = canvas.getContext('2d');
        
        const labels = Array.from({ length: 24 }, (_, i) => {
            return `${String(i).padStart(2, '0')}시`;
        });

        const chartConfig = {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '집중 세션 수',
                    data: data,
                    backgroundColor: '#3B82F6',
                    barPercentage: 0.8,
                    categoryPercentage: 0.7
                }]
            },
            options: { 
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1000,
                    easing: 'easeOutQuart'
                },
                scales: {
                    y: { 
                        beginAtZero: true, 
                        ticks: { 
                            stepSize: 1,
                            font: {
                                size: 11
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: { 
                        grid: { display: false },
                        ticks: {
                            font: {
                                size: 10
                            },
                            maxRotation: 0
                        }
                    }
                },
                plugins: { 
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            title: (tooltipItems) => {
                                const hour = parseInt(tooltipItems[0].label);
                                return `${hour}시 ~ ${(hour + 1) % 24}시`;
                            },
                            label: (context) => {
                                const count = context.parsed.y;
                                return `${count}개 세션`;
                            }
                        }
                    }
                }
            }
        };

        if (dailyChartInstance) {
            // 이미 차트가 있으면 데이터만 업데이트
            dailyChartInstance.data.labels = labels;
            dailyChartInstance.data.datasets[0].data = data;
            dailyChartInstance.update();
        } else {
            // 새로 차트 생성
            dailyChartInstance = new Chart(ctx, chartConfig);
        }
    } catch (error) {
        console.error("[Stats Display] Error in daily chart update function:", error);
    }
}

function updateWeeklyChart(data) {
    console.log("[Stats Display] Updating weekly chart...");
    
    try {
        const canvas = document.getElementById('weekly-chart');
        if (!canvas) {
            console.error("[Stats Display] Weekly chart canvas element not found.");
            return;
        }
        
        const ctx = canvas.getContext('2d');
        
        const labels = ['일', '월', '화', '수', '목', '금', '토'];
        const colors = [
            '#F87171', // 일요일 - 빨간색 톤
            '#60A5FA', // 월요일 - 파란색
            '#34D399', // 화요일 - 초록색
            '#A78BFA', // 수요일 - 보라색
            '#FBBF24', // 목요일 - 노란색
            '#F97316', // 금요일 - 주황색
            '#A8A29E'  // 토요일 - 회색 톤
        ];

        const chartConfig = {
            type: 'bar',
            data: { 
                labels: labels, 
                datasets: [{
                    label: '집중 세션 수',
                    data: data,
                    backgroundColor: colors,
                    barPercentage: 0.7,
                    categoryPercentage: 0.6
                }]
            },
            options: { 
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1000,
                    easing: 'easeOutQuart'
                },
                scales: {
                    y: { 
                        beginAtZero: true, 
                        ticks: { 
                            stepSize: 1,
                            font: {
                                size: 11
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: { 
                        grid: { display: false },
                        ticks: {
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        }
                    }
                },
                plugins: { 
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const count = context.parsed.y;
                                return `${count}개 세션`;
                            }
                        }
                    }
                }
            }
        };

        if (weeklyChartInstance) {
            // 이미 차트가 있으면 데이터만 업데이트
            weeklyChartInstance.data.labels = labels;
            weeklyChartInstance.data.datasets[0].data = data;
            weeklyChartInstance.update();
        } else {
            // 새로 차트 생성
            weeklyChartInstance = new Chart(ctx, chartConfig);
        }
    } catch (error) {
        console.error("[Stats Display] Error in weekly chart update function:", error);
    }
}

// --- 월별 히트맵 렌더링 ---
function renderMonthlyHeatmap(dailyCounts) {
    console.log('[Stats Display] Rendering monthly heatmap...');
    try {
        const heatmapContainer = document.getElementById('yearly-heatmap');
        if (!heatmapContainer) {
            console.error('[Stats Display] Could not find stats section to append heatmap');
            return;
        }

        heatmapContainer.innerHTML = ''; // 이전 내용 지우기
        const grid = document.createElement('div');
        grid.className = 'heatmap-grid';

        // 월 구분선 추가를 위한 헤더 생성
        const monthHeader = document.createElement('div');
        monthHeader.className = 'month-header';
        const dayLabels = document.createElement('div');
        dayLabels.className = 'day-labels';
        
        // 요일 레이블 (왼쪽)
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        dayNames.forEach(day => {
            const dayLabel = document.createElement('div');
            dayLabel.className = 'day-label';
            dayLabel.textContent = day;
            dayLabels.appendChild(dayLabel);
        });
        heatmapContainer.appendChild(dayLabels);

        const today = new Date();
        const nineMonthsAgo = new Date(today);
        nineMonthsAgo.setMonth(today.getMonth() - 8);
        nineMonthsAgo.setDate(1);

        // 월 이름 계산 (9개월치)
        const monthNames = [];
        for (let i = 0; i < 9; i++) {
            const monthDate = new Date(nineMonthsAgo);
            monthDate.setMonth(monthDate.getMonth() + i);
            const month = monthDate.getMonth();
            monthNames.push(`${month + 1}월`);
        }

        // 월 헤더 추가
        monthNames.forEach(name => {
            const monthLabel = document.createElement('div');
            monthLabel.className = 'month-label';
            monthLabel.textContent = name;
            monthHeader.appendChild(monthLabel);
        });
        heatmapContainer.appendChild(monthHeader);

        let currentDate = new Date(nineMonthsAgo);
        currentDate.setDate(currentDate.getDate() - currentDate.getDay());
        const endDate = new Date(today);
        
        // 히트맵 그리드 생성
        const cellsByWeek = {};
        let currentWeek = 0;
        
        while (currentDate <= endDate) {
            const dateString = currentDate.toISOString().split('T')[0];
            const count = dailyCounts[dateString] || 0;
            const level = getHeatmapLevel(count);
            
            const dayOfWeek = currentDate.getDay();
            if (dayOfWeek === 0) {
                currentWeek++;
            }
            
            if (!cellsByWeek[currentWeek]) {
                cellsByWeek[currentWeek] = document.createElement('div');
                cellsByWeek[currentWeek].className = 'heatmap-week';
                grid.appendChild(cellsByWeek[currentWeek]);
            }

            const cell = document.createElement('div');
            cell.className = 'heatmap-cell';
            cell.dataset.level = level;
            cell.dataset.date = dateString;
            cell.dataset.count = count;
            
            // 현재 달 구분
            const currentMonth = currentDate.getMonth();
            const nextDate = new Date(currentDate);
            nextDate.setDate(nextDate.getDate() + 1);
            if (currentMonth !== nextDate.getMonth()) {
                cell.classList.add('month-end');
            }
            
            // 오늘 표시
            if (dateString === today.toISOString().split('T')[0]) {
                cell.classList.add('today');
            }

            const tooltip = document.createElement('span');
            tooltip.className = 'heatmap-tooltip';
            
            // yyyy년 mm월 dd일 형식으로 변환
            const tooltipDate = new Date(dateString);
            const formattedDate = `${tooltipDate.getFullYear()}년 ${tooltipDate.getMonth() + 1}월 ${tooltipDate.getDate()}일`;
            
            tooltip.innerHTML = `<strong>${formattedDate}</strong><br>${count}개 세션`;
            cell.appendChild(tooltip);
            
            cellsByWeek[currentWeek].appendChild(cell);
            currentDate.setDate(currentDate.getDate() + 1);
        }

        heatmapContainer.appendChild(grid);

        // 스크롤 위치 조정 (최근 데이터 보이게)
        heatmapContainer.scrollLeft = heatmapContainer.scrollWidth;
         console.log("[Stats Display] Monthly heatmap rendered.");
    } catch (error) {
         console.error("[Stats Display] Error rendering monthly heatmap:", error);
    }
}

function getHeatmapLevel(count) {
    if (count === 0) return 0;
    if (count <= 1) return 1; // 1 세션
    if (count <= 3) return 2; // 2-3 세션
    if (count <= 5) return 3; // 4-5 세션
    return 4; // 6+ 세션 (레벨 및 기준은 필요에 따라 조정 가능)
}

// --- 이벤트 리스너 (DOMContentLoaded 사용) ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('\n\n---집중시간 앱 시작 ---------------');
    console.log("[Stats Display] DOMContentLoaded event fired.");
    
    // Canvas 요소 확인
    const dailyCanvas = document.getElementById('daily-chart');
    const weeklyCanvas = document.getElementById('weekly-chart');
    
    if (!dailyCanvas) {
        console.error("[Stats Display] Daily chart canvas element not found!");
    }
    
    if (!weeklyCanvas) {
        console.error("[Stats Display] Weekly chart canvas element not found!");
    }
    
    // 시간 필터 버튼 이벤트 리스너 설정
    const timeFilterButtons = document.querySelectorAll('.time-filter .time-button');
    timeFilterButtons.forEach(button => {
        button.addEventListener('click', () => {
            timeFilterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            selectedDurationFilter = parseInt(button.dataset.duration) || 25;
            
            // 데이터 다시 로드/처리 후 일간 차트만 업데이트
            chrome.storage.local.get('pomodoroHistory', (result) => {
                const history = result.pomodoroHistory || [];
                const convertedHistory = convertHistoryFormat(history);
                const dailyData = processDailyData(convertedHistory, selectedDurationFilter);
                updateDailyChart(dailyData);
            });
        });
    });
});

// Window load event for chart initialization - give Chart.js more time to load
window.addEventListener('load', () => {
    console.log("[Stats Display] Window load event fired.");
    
    // Wait a short time to make sure Chart.js is loaded
    setTimeout(() => {
        if (typeof Chart !== 'undefined') {
            console.log("[Stats Display] Chart.js is available, loading stats...");
            loadAndProcessStats();
        } else {
            console.error("[Stats Display] Chart.js is not available after window load. Will retry once more...");
            
            // Try once more after a longer delay
            setTimeout(() => {
                if (typeof Chart !== 'undefined') {
                    console.log("[Stats Display] Chart.js is now available on retry, loading stats...");
                    loadAndProcessStats();
                } else {
                    console.error("[Stats Display] Chart.js is still not available. Charts cannot be rendered.");
                    if (typeof showToast === 'function') {
                        showToast('차트 라이브러리를 로드하는 데 실패했습니다. 페이지를 새로고침해 보세요.', 'error');
                    }
                }
            }, 1000);
        }
    }, 300);
});

// 백그라운드에서 통계 업데이트 메시지 수신 (기존 리스너 유지)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "statsUpdated") {
        console.log("[Stats Display] Stats updated message received.");
        if (typeof Chart !== 'undefined') {
             loadAndProcessStats();
        } else {
             console.warn("[Stats Display] Received statsUpdated but Chart.js might not be ready.");
        }
        sendResponse({ success: true });
    }
});

// 오늘의 집중 시간(분) 시간대별/프로젝트별 집계 및 콘솔 출력
function logTodayFocusDetails(history) {
    // 오늘 집중 세션만 추출
    const todayFocusSessions = getSessionsToday(history);

    // 시간대별 합산
    const hourlyTotals = {};
    todayFocusSessions.forEach(entry => {
        const entryDate = getDateFromEntry(entry);
        if (!entryDate) return;
        const hour = entryDate.getHours();
        hourlyTotals[hour] = (hourlyTotals[hour] || 0) + (entry.durationMinutes || 0);
    });

    // 프로젝트별 합산
    const projectTotals = {};
    todayFocusSessions.forEach(entry => {
        const project = entry.projectName || '(미지정)';
        projectTotals[project] = (projectTotals[project] || 0) + (entry.durationMinutes || 0);
    });

    // 전체 합계
    const total = todayFocusSessions.reduce((sum, entry) => sum + (entry.durationMinutes || 0), 0);

    // 결과 출력
    console.log('[오늘 집중 시간 합계]', total + '분');
    console.log('[시간대별 집중 시간(분)]', hourlyTotals);
    console.log('[프로젝트별 집중 시간(분)]', projectTotals);
}

// ... (clearStatsDisplay 등) 