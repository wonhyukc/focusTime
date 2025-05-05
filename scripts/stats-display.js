// scripts/stats-display.js

// Signal to dashboard.js that we'll handle chart initialization
window.statsDisplayLoaded = true;

// 차트 인스턴스 저장 변수
let dailyChartInstance = null;
let weeklyChartInstance = null;
let monthlyChartInstance = null;
let yearlyChartInstance = null;

// 선택된 시간 필터 (분 단위) - 변수 선언 및 초기화
let selectedDurationFilter = 25; // 기본값 (예: 25분)

// Chart.js 로딩 상태 확인 함수
function isChartJsLoaded() {
    if (typeof Chart === 'undefined') {
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
    try {
        const result = await chrome.storage.local.get('pomodoroHistory');
        let history = result.pomodoroHistory || [];
        
        // 데이터 포맷 변환 (필요한 경우)
        history = convertHistoryFormat(history);
        
        if (history.length > 0) {
        }

        // --- 요약 카드 데이터 처리 ---
        updateSummaryCards(history);

        // 오늘의 집중 시간(분) 시간대별/프로젝트별 집계 및 콘솔 출력
        logTodayFocusDetails(history);

        // --- 일 단위 분포 데이터 처리 ---
        const dailyData = processDailyData(history, selectedDurationFilter);
        updateDailyChart(dailyData);

        // --- 주 단위 분포 데이터 처리 ---
        const weeklyData = processWeeklyData(history);
        updateWeeklyChart(weeklyData);

        // --- 월별 히트맵 데이터 처리 ---
        const heatmapData = processHeatmapData(history);
        renderMonthlyHeatmap(heatmapData);

        // --- 월 단위 분포 데이터 처리 ---
        const monthlyData = processMonthlyData(history);
        updateMonthlyChart(monthlyData);

        // --- 연 단위 분포 데이터 처리 ---
        const yearlyData = processYearlyData(history);
        updateYearlyChart(yearlyData);

    } catch (error) {
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
    console.log('[LOG] updateSummaryCards 호출:', { historyLength: history.length });
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
        }

        // 총 카드 업데이트 (5번째 카드)
        const totalCard = document.querySelector('.stats-summary .stat-card:nth-child(5)');
        if (totalCard) {
            const totalFocusSessions = history.filter(entry => entry.type === 'focus');
            const totalMinutes = calculateTotalFocusMinutes(totalFocusSessions);
            const totalHours = totalMinutes / 60;
            
            totalCard.querySelector('.stat-value').textContent = totalMinutes;
            totalCard.querySelector('.stat-label').textContent = totalHours.toFixed(2);
        }
    } catch (error) {
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
        return null;
    }
}

// 오늘 세션 가져오기
function getSessionsToday(history) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 로컬 자정
    
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
        const hourlyTotals = Array(24).fill(0);
        const filteredHistory = history.filter(entry =>
            entry.type === 'focus' && entry.durationMinutes == durationFilter // 선택된 지속시간 필터 적용
        );

        filteredHistory.forEach(entry => {
            const entryDate = getDateFromEntry(entry);
            if (entryDate && !isNaN(entryDate)) {
                const hour = entryDate.getHours();
                hourlyTotals[hour] += entry.durationMinutes || 0;
            }
        });
        return hourlyTotals;
    } catch (error) {
        return Array(24).fill(0);
    }
}

function processWeeklyData(history) {
    try {
        const weeklyTotals = Array(7).fill(0);
        const focusHistory = history.filter(entry => entry.type === 'focus');

        focusHistory.forEach(entry => {
            const entryDate = getDateFromEntry(entry);
            if (entryDate && !isNaN(entryDate)) {
                const dayOfWeek = entryDate.getDay();
                weeklyTotals[dayOfWeek] += entry.durationMinutes || 0;
            }
        });
        return weeklyTotals;
     } catch (error) {
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
            }
        });
        return dailyFocusCounts;
    } catch (error) {
        return {};
    }
}

// 월별 데이터 집계 함수 (최근 12개월)
function processMonthlyData(history) {
    const now = new Date();
    const monthlyTotals = Array(12).fill(0);
    const focusHistory = history.filter(entry => entry.type === 'focus');
    focusHistory.forEach(entry => {
        const entryDate = getDateFromEntry(entry);
        if (entryDate && !isNaN(entryDate)) {
            const diffMonth = (now.getFullYear() - entryDate.getFullYear()) * 12 + (now.getMonth() - entryDate.getMonth());
            if (diffMonth >= 0 && diffMonth < 12) {
                monthlyTotals[11 - diffMonth] += entry.durationMinutes || 0;
            }
        }
    });
    return monthlyTotals;
}

// 연별 데이터 집계 함수 (최근 5년)
function processYearlyData(history) {
    const now = new Date();
    const startYear = now.getFullYear() - 4;
    const yearlyTotals = Array(5).fill(0);
    const focusHistory = history.filter(entry => entry.type === 'focus');
    focusHistory.forEach(entry => {
        const entryDate = getDateFromEntry(entry);
        if (entryDate && !isNaN(entryDate)) {
            const year = entryDate.getFullYear();
            if (year >= startYear && year <= now.getFullYear()) {
                yearlyTotals[year - startYear] += entry.durationMinutes || 0;
            }
        }
    });
    return yearlyTotals;
}

// --- 차트 업데이트 ---
function updateDailyChart(data) {
    try {
        const canvas = document.getElementById('daily-chart');
        if (!canvas) {
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
                    label: '집중 시간(분)',
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
                        min: 0,
                        stepSize: 1,
                        ticks: {
                            stepSize: 1,
                            font: { size: 11 }
                        },
                        grid: { color: 'rgba(0, 0, 0, 0.05)' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 10 }, maxRotation: 0 }
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
                                const minutes = context.parsed.y;
                                return `${minutes}분 집중`;
                            }
                        }
                    }
                }
            }
        };
        if (dailyChartInstance) {
            dailyChartInstance.data.labels = labels;
            dailyChartInstance.data.datasets[0].data = data;
            dailyChartInstance.data.datasets[0].label = '집중 시간(분)';
            dailyChartInstance.update();
        } else {
            dailyChartInstance = new Chart(ctx, chartConfig);
        }
    } catch (error) {}
}

function updateWeeklyChart(data) {
    try {
        const canvas = document.getElementById('weekly-chart');
        if (!canvas) {
            return;
        }
        const ctx = canvas.getContext('2d');
        const labels = ['일', '월', '화', '수', '목', '금', '토'];
        const colors = [
            '#F87171', '#60A5FA', '#34D399', '#A78BFA', '#FBBF24', '#F97316', '#A8A29E'
        ];
        const chartConfig = {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '집중 시간(분)',
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
                        min: 0,
                        stepSize: 1,
                        ticks: { stepSize: 1, font: { size: 11 } },
                        grid: { color: 'rgba(0, 0, 0, 0.05)' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 12, weight: 'bold' } }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.parsed.y}분 집중`
                        }
                    }
                }
            }
        };
        if (weeklyChartInstance) {
            weeklyChartInstance.data.labels = labels;
            weeklyChartInstance.data.datasets[0].data = data;
            weeklyChartInstance.data.datasets[0].label = '집중 시간(분)';
            weeklyChartInstance.update();
        } else {
            weeklyChartInstance = new Chart(ctx, chartConfig);
        }
    } catch (error) {}
}

// --- 월별 히트맵 렌더링 ---
function renderMonthlyHeatmap(dailyCounts) {
    try {
        const heatmapContainer = document.getElementById('yearly-heatmap');
        if (!heatmapContainer) {
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
    } catch (error) {
    }
}

function getHeatmapLevel(count) {
    if (count === 0) return 0;
    if (count <= 1) return 1; // 1 세션
    if (count <= 3) return 2; // 2-3 세션
    if (count <= 5) return 3; // 4-5 세션
    return 4; // 6+ 세션 (레벨 및 기준은 필요에 따라 조정 가능)
}

// 월별 차트 업데이트 함수
function updateMonthlyChart(data) {
    try {
        const canvas = document.getElementById('monthly-chart');
        if (!canvas) {
            return;
        }
        const ctx = canvas.getContext('2d');
        const now = new Date();
        const labels = [];
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            labels.push(`${d.getFullYear()}-${d.getMonth() + 1}`);
        }
        const chartConfig = {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '집중 시간(분)',
                    data: data,
                    backgroundColor: '#F59E42',
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
                        min: 0,
                        stepSize: 1,
                        ticks: { stepSize: 1, font: { size: 11 } },
                        grid: { color: 'rgba(0, 0, 0, 0.05)' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 12, weight: 'bold' } }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.parsed.y}분 집중`
                        }
                    }
                }
            }
        };
        if (monthlyChartInstance) {
            monthlyChartInstance.data.labels = labels;
            monthlyChartInstance.data.datasets[0].data = data;
            monthlyChartInstance.data.datasets[0].label = '집중 시간(분)';
            monthlyChartInstance.update();
        } else {
            monthlyChartInstance = new Chart(ctx, chartConfig);
        }
    } catch (error) {
    }
}

// 연별 차트 업데이트 함수
function updateYearlyChart(data) {
    try {
        const canvas = document.getElementById('yearly-chart');
        if (!canvas) {
            return;
        }
        const ctx = canvas.getContext('2d');
        const now = new Date();
        const labels = [];
        for (let i = 4; i >= 0; i--) {
            labels.push(`${now.getFullYear() - i}년`);
        }
        const chartConfig = {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '집중 시간(분)',
                    data: data,
                    backgroundColor: '#7C3AED',
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
                        min: 0,
                        stepSize: 1,
                        ticks: { stepSize: 1, font: { size: 11 } },
                        grid: { color: 'rgba(0, 0, 0, 0.05)' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 12, weight: 'bold' } }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.parsed.y}분 집중`
                        }
                    }
                }
            }
        };
        if (yearlyChartInstance) {
            yearlyChartInstance.data.labels = labels;
            yearlyChartInstance.data.datasets[0].data = data;
            yearlyChartInstance.data.datasets[0].label = '집중 시간(분)';
            yearlyChartInstance.update();
        } else {
            yearlyChartInstance = new Chart(ctx, chartConfig);
        }
    } catch (error) {
    }
}

// --- 이벤트 리스너 (DOMContentLoaded 사용) ---
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (typeof Chart !== 'undefined') {
            loadAndProcessStats();
        } else {
            setTimeout(() => {
                if (typeof Chart !== 'undefined') {
                    loadAndProcessStats();
                } else {
                    if (typeof showToast === 'function') {
                        showToast('차트 라이브러리를 로드하는 데 실패했습니다. 페이지를 새로고침해 보세요.', 'error');
                    }
                }
            }, 1000);
        }
    }, 300);
});

// Window load event for chart initialization - give Chart.js more time to load
window.addEventListener('load', () => {
    setTimeout(() => {
        if (typeof Chart !== 'undefined') {
            loadAndProcessStats();
        } else {
            setTimeout(() => {
                if (typeof Chart !== 'undefined') {
                    loadAndProcessStats();
                } else {
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
}

// ... (clearStatsDisplay 등) 