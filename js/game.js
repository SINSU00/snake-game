// ========================================
// 캔버스(게임 화면) 기본 설정
// ========================================

// HTML에서 게임에 필요한 요소들을 가져온다
const canvas = document.getElementById('gameCanvas');           // 게임이 그려지는 캔버스
const ctx = canvas.getContext('2d');                            // 캔버스에 그림을 그리는 도구
const overlay = document.getElementById('overlay');             // 시작/게임오버 화면 덮개
const overlayText = document.getElementById('overlayText');     // 덮개 위 큰 글씨
const overlaySubtext = document.getElementById('overlaySubtext'); // 덮개 위 작은 안내 글씨
const scoreEl = document.getElementById('score');               // 현재 점수 표시 영역
const highScoreEl = document.getElementById('highScore');       // 최고 점수 표시 영역
const comboTextEl = document.getElementById('comboText');       // 콤보 텍스트 표시 영역
const currentDifficultyEl = document.getElementById('currentDifficulty'); // 현재 난이도 표시 영역
const pauseOverlay = document.getElementById('pauseOverlay');   // 일시정지 오버레이
const specialFoodTextEl = document.getElementById('specialFoodText'); // 특수 먹이 안내 텍스트

// ========================================
// 난이도 설정값 정의
// ========================================
// 각 난이도별로 시작 속도, 최대 속도, 속도 증가량이 다르다
const DIFFICULTY_SETTINGS = {
    easy: {
        label: 'Easy',             // 화면에 표시할 이름
        startInterval: 160,        // 시작 이동 간격 (밀리초, 클수록 느림)
        minInterval: 90,           // 최대 속도일 때 이동 간격 (밀리초)
        speedIncrease: 0.3,        // 점수 1점당 빨라지는 정도
        comboWindow: 3000,         // 콤보 인정 시간 (3초 이내 연속 먹이)
    },
    normal: {
        label: 'Normal',
        startInterval: 125,        // 기본 속도
        minInterval: 62.5,
        speedIncrease: 0.5,
        comboWindow: 2000,         // 콤보 인정 시간 (2초)
    },
    hard: {
        label: 'Hard',
        startInterval: 85,         // 처음부터 빠름
        minInterval: 40,           // 최대 속도도 매우 빠름
        speedIncrease: 0.8,        // 점수 올라갈수록 급격히 빨라짐
        comboWindow: 1500,         // 콤보 인정 시간 (1.5초, 더 빡빡함)
    }
};

// ========================================
// 뱀 스킨(색상) 설정값 정의
// ========================================
// 각 스킨별로 뱀 색상과 발광 색상이 다르다
const SKIN_SETTINGS = {
    green: {
        label: 'Green',
        color: '#00ff41',       // 네온 초록 (기본)
        rgb: '0, 255, 65',     // rgba용 RGB 값
    },
    blue: {
        label: 'Blue',
        color: '#41c8ff',       // 사이버 블루
        rgb: '65, 200, 255',
    },
    pink: {
        label: 'Pink',
        color: '#ff69b4',       // 핫 핑크
        rgb: '255, 105, 180',
    },
    gold: {
        label: 'Gold',
        color: '#ffd700',       // 골드
        rgb: '255, 215, 0',
    }
};

// ========================================
// 특수 먹이 설정값 정의
// ========================================
const SPECIAL_FOOD_SETTINGS = {
    golden: {
        label: 'Golden Food',          // 화면에 표시할 이름
        color: '#ffd700',            // 금색
        points: 50,                  // 기본 점수 50점
        duration: 5000,              // 화면에 5초간 유지
        spawnChance: 0.15,           // 일반 먹이 먹을 때 15% 확률로 등장
    },
    slow: {
        label: 'Slow Food',
        color: '#00ffff',            // 시안(하늘색)
        speedReduction: 0.5,         // 속도를 절반으로 줄임
        slowDuration: 5000,          // 5초 동안 느려짐
        duration: 7000,              // 화면에 7초간 유지
        spawnChance: 0.10,           // 10% 확률로 등장
    }
};

// ========================================
// 게임 상수 (변하지 않는 값)
// ========================================
const GRID_SIZE = 20; // 가로세로 20칸짜리 격자

// 한 칸의 크기를 화면에 맞게 자동 계산 (화면이 작으면 칸도 작아짐)
const CELL_SIZE = Math.min(
    Math.floor((window.innerWidth - 100) / GRID_SIZE),
    Math.floor((window.innerHeight - 300) / GRID_SIZE)
);

// 캔버스 크기 = 격자 수 x 칸 크기
canvas.width = GRID_SIZE * CELL_SIZE;
canvas.height = GRID_SIZE * CELL_SIZE;

// ========================================
// 게임 상태 변수 (게임 중 계속 바뀌는 값들)
// ========================================
let snake = [];                        // 뱀의 몸체 좌표 배열 (머리가 0번)
let direction = { x: 1, y: 0 };       // 현재 이동 방향 (오른쪽)
let nextDirection = { x: 1, y: 0 };   // 다음에 바뀔 방향 (키 입력 시 저장)
let food = { x: 0, y: 0 };            // 먹이의 좌표
let score = 0;                         // 현재 점수
let gameRunning = false;               // 게임이 진행 중인지 여부
let gamePaused = false;                // 게임이 일시정지 중인지 여부
let lastMoveTime = 0;                  // 마지막으로 뱀이 움직인 시간
let moveInterval = 125;                // 뱀이 움직이는 간격 (밀리초)
let baseMoveInterval = 125;            // 속도 감소 효과 적용 전의 원래 이동 간격
let particles = [];                    // 먹이 먹었을 때 터지는 효과 입자들
let lastFoodTime = 0;                  // 마지막으로 먹이를 먹은 시간
let comboMultiplier = 1;               // 콤보 배율 (빠르게 연속으로 먹으면 증가)
let comboTimer = null;                 // 콤보 타이머 (사용 예정)
let currentDifficulty = 'normal';      // 현재 선택된 난이도
// 난이도별 베스트 스코어를 객체로 관리 (currentDifficulty 선언 이후에 위치해야 함)
const bestScores = {
    easy:   parseInt(localStorage.getItem('snakeBestScore_easy'))   || 0,
    normal: parseInt(localStorage.getItem('snakeBestScore_normal')) || 0,
    hard:   parseInt(localStorage.getItem('snakeBestScore_hard'))   || 0,
};
let highScore = bestScores[currentDifficulty]; // 현재 난이도(normal)의 최고 점수
let wallPassMode = false;              // 벽 통과 모드 켜기/끄기
let currentSkin = 'green';             // 현재 선택된 뱀 스킨
let pausedTimestamp = 0;               // 일시정지한 시점의 타임스탬프 (시간 보정용)

// ========================================
// 특수 먹이 상태 변수
// ========================================
let specialFood = null;                // 현재 특수 먹이 정보 (없으면 null)
let specialFoodTimer = null;           // 특수 먹이 사라지는 타이머
let slowEffectActive = false;          // 속도 감소 효과 활성화 여부
let slowEffectTimer = null;            // 속도 감소 효과 타이머

// ========================================
// 사운드 시스템 (Web Audio API 사용)
// ========================================
// 외부 음악 파일 없이 코드로 직접 소리를 만든다
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// 먹이를 먹었을 때 나는 소리 (높은 톤으로 올라가는 '뿅' 소리)
function playEatSound() {
    const oscillator = audioCtx.createOscillator();  // 소리를 만드는 장치
    const gainNode = audioCtx.createGain();          // 볼륨을 조절하는 장치

    oscillator.connect(gainNode);           // 소리 -> 볼륨 연결
    gainNode.connect(audioCtx.destination); // 볼륨 -> 스피커 연결

    // 400Hz에서 800Hz로 올라가는 소리 (0.1초 동안)
    oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.1);

    // 볼륨: 0.3에서 시작해서 0.01로 줄어듦 (자연스럽게 사라짐)
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

    oscillator.start(audioCtx.currentTime);       // 소리 시작
    oscillator.stop(audioCtx.currentTime + 0.1);  // 0.1초 후 정지
}

// 게임 오버 소리 (낮은 톤으로 내려가는 '뚜웅' 소리)
function playGameOverSound() {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    // 300Hz에서 100Hz로 내려가는 소리 (0.5초 동안)
    oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.5);

    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.5);
}

// 특수 먹이를 먹었을 때 나는 소리 (더 높은 '삐리링' 소리)
function playSpecialEatSound() {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    // 600Hz에서 1200Hz로 빠르게 올라가는 소리
    oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.15);

    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.15);
}

// ========================================
// 파티클(입자) 효과 클래스
// ========================================
// 먹이를 먹으면 작은 조각들이 터져 나가는 효과를 만든다
class Particle {
    // 입자 생성: x, y 좌표에서 시작, color는 선택 (기본: 빨강~분홍)
    constructor(x, y, color) {
        this.x = x;                                    // 현재 X 위치
        this.y = y;                                    // 현재 Y 위치
        this.vx = (Math.random() - 0.5) * 8;          // X방향 속도 (랜덤)
        this.vy = (Math.random() - 0.5) * 8;          // Y방향 속도 (랜덤)
        this.life = 1.0;                               // 생명력 (1.0 = 완전히 보임)
        // 색상이 지정되면 그 색상 사용, 아니면 빨강~분홍 랜덤
        this.color = color || `hsl(${Math.random() * 60 + 330}, 100%, 50%)`;
    }

    // 매 프레임마다 입자의 위치와 상태를 갱신
    update() {
        this.x += this.vx;     // X방향으로 이동
        this.y += this.vy;     // Y방향으로 이동
        this.life -= 0.02;     // 점점 사라짐
        this.vy += 0.2;        // 아래로 떨어지는 중력 효과
    }

    // 입자를 캔버스에 그리기
    draw() {
        ctx.save();                         // 현재 그리기 설정 저장
        ctx.globalAlpha = this.life;        // 투명도 = 남은 생명력
        ctx.shadowBlur = 10;               // 빛나는 효과
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, 4, 4); // 4x4 크기의 작은 사각형
        ctx.restore();                      // 그리기 설정 복원
    }

    // 입자가 수명을 다했는지 확인
    isDead() {
        return this.life <= 0;
    }
}

// ========================================
// 난이도 선택 버튼 이벤트
// ========================================
// 모든 난이도 버튼을 가져온다
const diffButtons = document.querySelectorAll('.diff-btn');

// 각 버튼에 클릭 이벤트를 등록
diffButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation(); // 버튼 클릭이 다른 이벤트에 전파되지 않도록 막기

        // 이전에 선택된 버튼의 'active' 표시 제거
        diffButtons.forEach(b => b.classList.remove('active'));

        // 클릭한 버튼에 'active' 표시 추가
        btn.classList.add('active');

        // 선택된 난이도를 변수에 저장 (easy, normal, hard 중 하나)
        currentDifficulty = btn.dataset.difficulty;

        // 점수판에 현재 난이도 이름 표시
        currentDifficultyEl.textContent = DIFFICULTY_SETTINGS[currentDifficulty].label;

        // 오버레이에 해당 난이도의 베스트 스코어 표시
        highScore = bestScores[currentDifficulty];
        highScoreEl.textContent = highScore;
        document.getElementById('overlayBestScoreValue').textContent = highScore;
    });
});

// ========================================
// 벽 통과 모드 버튼 이벤트
// ========================================
const wallButtons = document.querySelectorAll('.wall-btn');

wallButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation(); // 이벤트 전파 방지

        // 이전 선택 해제
        wallButtons.forEach(b => b.classList.remove('active'));

        // 클릭한 버튼 활성화
        btn.classList.add('active');

        // 벽 통과 모드 ON/OFF 설정 ('on'이면 true)
        wallPassMode = btn.dataset.wall === 'on';
    });
});

// ========================================
// 뱀 스킨 선택 버튼 이벤트
// ========================================
const skinButtons = document.querySelectorAll('.skin-btn');

skinButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation(); // 이벤트 전파 방지

        // 이전 선택 해제
        skinButtons.forEach(b => b.classList.remove('active'));

        // 클릭한 버튼 활성화
        btn.classList.add('active');

        // 선택된 스킨 저장 (green, blue, pink, gold 중 하나)
        currentSkin = btn.dataset.skin;
    });
});

// ========================================
// 게임 초기화 함수
// ========================================
// 게임을 처음 시작하거나 재시작할 때 모든 값을 초기 상태로 되돌린다
function init() {
    // 뱀의 시작 위치 (3칸짜리, 화면 중앙 부근)
    snake = [
        { x: 5, y: 10 },  // 머리
        { x: 4, y: 10 },  // 몸통
        { x: 3, y: 10 }   // 꼬리
    ];
    direction = { x: 1, y: 0 };       // 오른쪽으로 이동 시작
    nextDirection = { x: 1, y: 0 };
    score = 0;                          // 점수 초기화
    gamePaused = false;                 // 일시정지 해제
    pauseOverlay.classList.add('hidden'); // 일시정지 오버레이 숨기기

    // 선택된 난이도에 맞는 설정값 가져오기
    const settings = DIFFICULTY_SETTINGS[currentDifficulty];
    moveInterval = settings.startInterval; // 난이도에 맞는 시작 속도 적용
    baseMoveInterval = settings.startInterval; // 원래 속도도 같이 저장

    particles = [];       // 파티클 초기화
    comboMultiplier = 1;  // 콤보 배율 초기화

    // 특수 먹이 초기화
    clearSpecialFood();
    slowEffectActive = false;
    if (slowEffectTimer) clearTimeout(slowEffectTimer);
    slowEffectTimer = null;
    specialFoodTextEl.classList.remove('show');

    updateScore();        // 화면에 점수 반영
    spawnFood();          // 먹이 생성
}

// ========================================
// 먹이 생성 함수
// ========================================
// 뱀의 몸체와 겹치지 않는 빈 칸에 먹이를 배치한다
function spawnFood() {
    let validPosition = false; // 유효한 위치를 찾았는지 여부

    // 유효한 위치를 찾을 때까지 반복
    while (!validPosition) {
        // 0 ~ 19 사이의 랜덤 좌표 생성
        food.x = Math.floor(Math.random() * GRID_SIZE);
        food.y = Math.floor(Math.random() * GRID_SIZE);

        // 뱀의 몸체와 겹치지 않으면 유효한 위치
        validPosition = !snake.some(segment =>
            segment.x === food.x && segment.y === food.y
        );

        // 특수 먹이와도 겹치지 않아야 함
        if (validPosition && specialFood) {
            validPosition = !(food.x === specialFood.x && food.y === specialFood.y);
        }
    }
    lastFoodTime = Date.now(); // 먹이가 생성된 시간 기록 (콤보 계산용)
}

// ========================================
// 특수 먹이 생성 함수
// ========================================
// 일반 먹이를 먹었을 때 확률적으로 특수 먹이를 생성한다
function trySpawnSpecialFood() {
    // 이미 특수 먹이가 있으면 생성하지 않음
    if (specialFood) return;

    // 랜덤 값으로 어떤 특수 먹이가 나올지 결정
    const rand = Math.random();

    let type = null;
    if (rand < SPECIAL_FOOD_SETTINGS.slow.spawnChance) {
        type = 'slow';       // 10% 확률: 느림 먹이
    } else if (rand < SPECIAL_FOOD_SETTINGS.slow.spawnChance + SPECIAL_FOOD_SETTINGS.golden.spawnChance) {
        type = 'golden';     // 15% 확률: 황금 먹이
    }

    // 특수 먹이 타입이 정해졌으면 생성
    if (type) {
        const settings = SPECIAL_FOOD_SETTINGS[type];
        let validPosition = false;
        let sx, sy;

        // 뱀, 일반 먹이와 겹치지 않는 위치 찾기
        while (!validPosition) {
            sx = Math.floor(Math.random() * GRID_SIZE);
            sy = Math.floor(Math.random() * GRID_SIZE);

            validPosition = !snake.some(seg => seg.x === sx && seg.y === sy) &&
                            !(sx === food.x && sy === food.y);
        }

        // 특수 먹이 객체 생성
        specialFood = {
            x: sx,
            y: sy,
            type: type,         // 'golden' 또는 'slow'
            spawnTime: Date.now(), // 생성 시간 (제한시간 계산용)
        };

        // 안내 텍스트 표시
        specialFoodTextEl.textContent = type === 'golden' ? 'Golden Food!' : 'Slow Food!';
        specialFoodTextEl.classList.add('show');

        // 제한 시간 후 특수 먹이 사라짐
        specialFoodTimer = setTimeout(() => {
            clearSpecialFood();
        }, settings.duration);
    }
}

// ========================================
// 특수 먹이 제거 함수
// ========================================
function clearSpecialFood() {
    specialFood = null;
    if (specialFoodTimer) {
        clearTimeout(specialFoodTimer);
        specialFoodTimer = null;
    }
    specialFoodTextEl.classList.remove('show');
}

// ========================================
// 점수 업데이트 함수
// ========================================
// 화면에 점수를 반영하고, 최고 점수를 갱신한다
function updateScore() {
    scoreEl.textContent = score; // 현재 점수를 화면에 표시

    // 현재 점수가 현재 난이도의 최고 점수보다 높으면 갱신
    if (score > bestScores[currentDifficulty]) {
        bestScores[currentDifficulty] = score;
        highScore = score;
        highScoreEl.textContent = highScore;
        localStorage.setItem('snakeBestScore_' + currentDifficulty, score); // 난이도별로 저장
    }
}

// ========================================
// 콤보 텍스트 표시 함수
// ========================================
// 연속으로 먹이를 빠르게 먹으면 콤보 텍스트를 화면에 띄운다
function showCombo(multiplier) {
    comboTextEl.textContent = `Combo x${multiplier}!`;
    comboTextEl.classList.remove('show');
    void comboTextEl.offsetWidth; // 애니메이션을 다시 시작시키기 위한 트릭
    comboTextEl.classList.add('show');

    // 1초 후에 콤보 텍스트 숨기기
    setTimeout(() => {
        comboTextEl.classList.remove('show');
    }, 1000);
}

// ========================================
// 일시정지 토글 함수
// ========================================
// 게임 진행 중에 P키나 ESC키를 누르면 일시정지/재개한다
function togglePause() {
    // 게임이 실행 중이 아니면 (시작 전 or 게임오버) 무시
    if (!gameRunning) return;

    gamePaused = !gamePaused; // 일시정지 상태 반전

    if (gamePaused) {
        // 일시정지 시작: 현재 시간 기록 (나중에 시간 보정용)
        pausedTimestamp = performance.now();
        pauseOverlay.classList.remove('hidden'); // 일시정지 화면 보이기
    } else {
        // 재개: 일시정지하고 있던 시간만큼 보정 (뱀이 갑자기 이동하는 것 방지)
        const pausedDuration = performance.now() - pausedTimestamp;
        lastMoveTime += pausedDuration;
        pauseOverlay.classList.add('hidden'); // 일시정지 화면 숨기기
    }
}

// ========================================
// 뱀 이동 함수 (핵심 게임 로직)
// ========================================
// 매 이동 간격마다 호출되어 뱀을 한 칸 앞으로 이동시킨다
function moveSnake() {
    // 방향 전환 (반대 방향 입력은 무시)
    // 예: 오른쪽으로 가고 있을 때 왼쪽 입력은 무시
    if (Math.abs(direction.x) !== Math.abs(nextDirection.x) ||
        Math.abs(direction.y) !== Math.abs(nextDirection.y)) {
        direction = { ...nextDirection };
    }

    // 새로운 머리 위치 계산 (현재 머리 + 이동 방향)
    const newHead = {
        x: snake[0].x + direction.x,
        y: snake[0].y + direction.y
    };

    // 벽 충돌 처리: 벽 통과 모드에 따라 다르게 동작
    if (newHead.x < 0 || newHead.x >= GRID_SIZE ||
        newHead.y < 0 || newHead.y >= GRID_SIZE) {

        if (wallPassMode) {
            // 벽 통과 모드 ON: 반대편에서 나온다 (좌표를 감싸기)
            if (newHead.x < 0) newHead.x = GRID_SIZE - 1;          // 왼쪽 벽 -> 오른쪽 끝
            else if (newHead.x >= GRID_SIZE) newHead.x = 0;         // 오른쪽 벽 -> 왼쪽 끝
            if (newHead.y < 0) newHead.y = GRID_SIZE - 1;          // 위쪽 벽 -> 아래쪽 끝
            else if (newHead.y >= GRID_SIZE) newHead.y = 0;         // 아래쪽 벽 -> 위쪽 끝
        } else {
            // 벽 통과 모드 OFF: 게임 오버
            gameOver();
            return;
        }
    }

    // 자기 몸에 부딪혔는지 확인 (머리가 몸통과 같은 위치면 게임 오버)
    if (snake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
        gameOver();
        return;
    }

    // 새 머리를 뱀 배열 맨 앞에 추가
    snake.unshift(newHead);

    // 특수 먹이를 먹었는지 확인
    if (specialFood && newHead.x === specialFood.x && newHead.y === specialFood.y) {
        handleSpecialFood(); // 특수 먹이 처리
        // 특수 먹이를 먹으면 뱀 길이가 늘어남 (꼬리 유지)
    }
    // 일반 먹이를 먹었는지 확인 (머리 위치 = 먹이 위치)
    else if (newHead.x === food.x && newHead.y === food.y) {
        handleNormalFood(); // 일반 먹이 처리
    } else {
        // 먹이를 안 먹었으면 꼬리 제거 (길이 유지)
        snake.pop();
    }
}

// ========================================
// 일반 먹이 처리 함수
// ========================================
function handleNormalFood() {
    // 현재 난이도 설정 가져오기
    const settings = DIFFICULTY_SETTINGS[currentDifficulty];

    // 콤보 계산: 마지막 먹이 이후 경과 시간 확인
    const timeSinceLastFood = Date.now() - lastFoodTime;
    if (timeSinceLastFood < settings.comboWindow) {
        // 난이도별 콤보 시간 안에 먹으면 콤보 배율 증가 (최대 x5)
        comboMultiplier = Math.min(comboMultiplier + 1, 5);
        if (comboMultiplier > 1) {
            showCombo(comboMultiplier); // 화면에 콤보 표시
        }
    } else {
        comboMultiplier = 1; // 시간 초과하면 콤보 리셋
    }

    // 점수 = 기본 10점 x 콤보 배율
    const points = 10 * comboMultiplier;
    score += points;
    updateScore();

    // 난이도에 따라 속도 증가 (점수가 올라갈수록 빨라짐)
    baseMoveInterval = Math.max(
        settings.minInterval,
        settings.startInterval - score * settings.speedIncrease
    );

    // 속도 감소 효과가 활성화되어 있으면 느린 속도 유지
    if (slowEffectActive) {
        moveInterval = baseMoveInterval / SPECIAL_FOOD_SETTINGS.slow.speedReduction;
    } else {
        moveInterval = baseMoveInterval;
    }

    playEatSound(); // 먹이 먹는 소리 재생

    // 먹이 위치에서 파티클(폭발 효과) 생성
    const foodX = food.x * CELL_SIZE + CELL_SIZE / 2;
    const foodY = food.y * CELL_SIZE + CELL_SIZE / 2;
    for (let i = 0; i < 15; i++) {
        particles.push(new Particle(foodX, foodY)); // 15개의 입자 생성
    }

    spawnFood();          // 새로운 먹이 생성
    trySpawnSpecialFood(); // 특수 먹이 등장 시도
}

// ========================================
// 특수 먹이 처리 함수
// ========================================
function handleSpecialFood() {
    const type = specialFood.type;
    playSpecialEatSound(); // 특수 먹이 소리 재생

    // 파티클 생성 (특수 먹이 색상으로)
    const fx = specialFood.x * CELL_SIZE + CELL_SIZE / 2;
    const fy = specialFood.y * CELL_SIZE + CELL_SIZE / 2;
    const particleColor = SPECIAL_FOOD_SETTINGS[type].color;
    for (let i = 0; i < 20; i++) {
        particles.push(new Particle(fx, fy, particleColor));
    }

    if (type === 'golden') {
        // 황금 먹이: 50점 x 콤보 배율 획득
        const points = SPECIAL_FOOD_SETTINGS.golden.points * comboMultiplier;
        score += points;
        updateScore();

        // 콤보 텍스트로 보너스 표시
        comboTextEl.textContent = `+${points}pts!`;
        comboTextEl.classList.remove('show');
        void comboTextEl.offsetWidth;
        comboTextEl.classList.add('show');
        setTimeout(() => comboTextEl.classList.remove('show'), 1000);

    } else if (type === 'slow') {
        // 느림 먹이: 속도를 절반으로 줄여줌 (5초간)
        slowEffectActive = true;
        moveInterval = baseMoveInterval / SPECIAL_FOOD_SETTINGS.slow.speedReduction;

        // 안내 텍스트 표시
        specialFoodTextEl.textContent = 'Speed Down!';
        specialFoodTextEl.classList.add('show');

        // 이전 느림 효과 타이머 제거 (중복 방지)
        if (slowEffectTimer) clearTimeout(slowEffectTimer);

        // 5초 후 속도 원복
        slowEffectTimer = setTimeout(() => {
            slowEffectActive = false;
            moveInterval = baseMoveInterval; // 원래 속도로 복귀
            specialFoodTextEl.classList.remove('show');
            slowEffectTimer = null;
        }, SPECIAL_FOOD_SETTINGS.slow.slowDuration);
    }

    // 특수 먹이 제거
    clearSpecialFood();
}

// ========================================
// 게임 오버 함수
// ========================================
// 벽이나 자기 몸에 부딪히면 호출된다
function gameOver() {
    gameRunning = false;       // 게임 정지
    gamePaused = false;        // 일시정지 해제
    pauseOverlay.classList.add('hidden'); // 일시정지 오버레이 숨기기
    playGameOverSound();       // 게임 오버 소리 재생

    // 특수 먹이 관련 정리
    clearSpecialFood();
    if (slowEffectTimer) clearTimeout(slowEffectTimer);
    slowEffectActive = false;
    specialFoodTextEl.classList.remove('show');

    // 오버레이에 결과 표시
    overlayText.textContent = 'Game Over';
    overlaySubtext.textContent = `Score: ${score} | Press Space to Restart`;
    overlay.classList.remove('hidden'); // 오버레이 보이기
}

// ========================================
// 그리기 함수들
// ========================================

// 격자(바둑판 무늬) 그리기
function drawGrid() {
    // 현재 스킨 색상으로 격자 색상 결정
    const skin = SKIN_SETTINGS[currentSkin];
    ctx.strokeStyle = `rgba(${skin.rgb}, 0.1)`; // 아주 연한 스킨 색 선
    ctx.lineWidth = 1;
    ctx.beginPath(); // 하나의 경로로 모든 선을 그려서 성능 최적화

    for (let i = 0; i <= GRID_SIZE; i++) {
        // 세로 선
        ctx.moveTo(i * CELL_SIZE, 0);
        ctx.lineTo(i * CELL_SIZE, canvas.height);
        // 가로 선
        ctx.moveTo(0, i * CELL_SIZE);
        ctx.lineTo(canvas.width, i * CELL_SIZE);
    }

    ctx.stroke(); // 한 번에 모든 선 그리기
}

// 뱀 그리기 (빛나는 효과 + 눈) - 선택된 스킨 색상 적용
function drawSnake() {
    const skin = SKIN_SETTINGS[currentSkin]; // 현재 스킨 정보

    snake.forEach((segment, index) => {
        const x = segment.x * CELL_SIZE; // 격자 좌표를 픽셀 좌표로 변환
        const y = segment.y * CELL_SIZE;

        // 네온 발광 효과 (스킨 색상 적용)
        ctx.shadowBlur = 15;
        ctx.shadowColor = skin.color;

        // 머리가 가장 밝고, 꼬리로 갈수록 어두워진다
        const brightness = index === 0 ? 1 : 0.8 - (index / snake.length) * 0.3;
        ctx.fillStyle = `rgba(${skin.rgb}, ${brightness})`;

        // 뱀 몸통 한 칸 그리기 (약간 안쪽으로 패딩을 줘서 칸 사이 간격 표현)
        ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);

        // 머리에만 눈 그리기
        if (index === 0) {
            ctx.shadowBlur = 0; // 눈에는 발광 효과 끄기
            ctx.fillStyle = '#1a1a2e'; // 어두운 색 눈
            const eyeSize = CELL_SIZE / 6;    // 눈 크기
            const eyeOffset = CELL_SIZE / 3;  // 눈 위치 오프셋

            // 이동 방향에 따라 눈의 위치가 달라진다
            if (direction.x !== 0) {
                // 좌우 이동 시: 눈이 위아래로 배치
                ctx.fillRect(x + eyeOffset, y + eyeSize, eyeSize, eyeSize);
                ctx.fillRect(x + eyeOffset, y + CELL_SIZE - eyeSize * 2, eyeSize, eyeSize);
            } else {
                // 상하 이동 시: 눈이 좌우로 배치
                ctx.fillRect(x + eyeSize, y + eyeOffset, eyeSize, eyeSize);
                ctx.fillRect(x + CELL_SIZE - eyeSize * 2, y + eyeOffset, eyeSize, eyeSize);
            }
        }
    });

    ctx.shadowBlur = 0; // 발광 효과 초기화
}

// 먹이 그리기 (펄스(맥박)치듯 빛나는 원)
function drawFood() {
    const x = food.x * CELL_SIZE;
    const y = food.y * CELL_SIZE;
    // 시간에 따라 밝기가 왔다갔다 하는 펄스 효과 (sin 함수 사용)
    const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7;

    ctx.shadowBlur = 20 * pulse;   // 빛 번짐 크기도 같이 변화
    ctx.shadowColor = '#ff0040';   // 빨간 빛
    ctx.fillStyle = `rgba(255, 0, 64, ${pulse})`; // 빨간색, 투명도 변화

    // 원형 먹이 그리기
    ctx.beginPath();
    ctx.arc(
        x + CELL_SIZE / 2,     // 칸 중앙 X
        y + CELL_SIZE / 2,     // 칸 중앙 Y
        CELL_SIZE / 2 - 2,     // 반지름 (칸보다 살짝 작게)
        0,                      // 시작 각도
        Math.PI * 2            // 끝 각도 (360도 = 완전한 원)
    );
    ctx.fill();

    ctx.shadowBlur = 0; // 발광 효과 초기화
}

// ========================================
// 특수 먹이 그리기 함수
// ========================================
function drawSpecialFood() {
    if (!specialFood) return; // 특수 먹이가 없으면 그리지 않음

    const x = specialFood.x * CELL_SIZE;
    const y = specialFood.y * CELL_SIZE;
    const settings = SPECIAL_FOOD_SETTINGS[specialFood.type];

    // 빠르게 깜빡이는 펄스 (일반 먹이보다 빠름)
    const pulse = Math.sin(Date.now() / 100) * 0.3 + 0.7;

    // 남은 시간 계산 (사라지기 직전엔 더 빠르게 깜빡임)
    const elapsed = Date.now() - specialFood.spawnTime;
    const remaining = settings.duration - elapsed;
    const urgencyFlicker = remaining < 2000 ? Math.sin(Date.now() / 50) * 0.5 + 0.5 : 1; // 2초 남으면 빠르게 깜빡

    ctx.shadowBlur = 25 * pulse;
    ctx.shadowColor = settings.color;

    if (specialFood.type === 'golden') {
        // 황금 먹이: 별 모양으로 그리기
        ctx.fillStyle = settings.color;
        ctx.globalAlpha = pulse * urgencyFlicker;
        drawStar(x + CELL_SIZE / 2, y + CELL_SIZE / 2, 5, CELL_SIZE / 2 - 2, CELL_SIZE / 4);
        ctx.globalAlpha = 1;
    } else {
        // 느림 먹이: 다이아몬드(마름모) 모양으로 그리기
        ctx.fillStyle = settings.color;
        ctx.globalAlpha = pulse * urgencyFlicker;
        ctx.beginPath();
        ctx.moveTo(x + CELL_SIZE / 2, y + 2);                // 위쪽 꼭짓점
        ctx.lineTo(x + CELL_SIZE - 2, y + CELL_SIZE / 2);    // 오른쪽 꼭짓점
        ctx.lineTo(x + CELL_SIZE / 2, y + CELL_SIZE - 2);    // 아래쪽 꼭짓점
        ctx.lineTo(x + 2, y + CELL_SIZE / 2);                // 왼쪽 꼭짓점
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    ctx.shadowBlur = 0;
}

// ========================================
// 별 모양 그리기 헬퍼 함수
// ========================================
// cx, cy: 중심 좌표, spikes: 꼭짓점 수, outerR: 바깥 반지름, innerR: 안쪽 반지름
function drawStar(cx, cy, spikes, outerR, innerR) {
    let rot = Math.PI / 2 * 3; // 시작 각도 (위쪽부터)
    const step = Math.PI / spikes; // 꼭짓점 간 각도

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerR); // 첫 번째 꼭짓점

    for (let i = 0; i < spikes; i++) {
        // 바깥 꼭짓점
        ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
        rot += step;
        // 안쪽 꼭짓점
        ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
        rot += step;
    }

    ctx.closePath();
    ctx.fill();
}

// 파티클(폭발 입자) 업데이트 및 그리기
function updateParticles() {
    // 뒤에서부터 순회 (중간에 삭제해도 인덱스가 꼬이지 않도록)
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update(); // 위치, 속도, 생명력 갱신
        particles[i].draw();   // 화면에 그리기

        // 수명이 다한 입자는 배열에서 제거
        if (particles[i].isDead()) {
            particles.splice(i, 1);
        }
    }
}

// ========================================
// 메인 게임 루프
// ========================================
// requestAnimationFrame을 사용해 매 프레임(약 60fps) 실행된다
let animationFrameId;
function gameLoop(timestamp) {
    // 1단계: 캔버스 전체를 어두운 배경색으로 덮어서 이전 프레임 지우기
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2단계: 격자 그리기 (배경 무늬)
    drawGrid();

    // 3단계: 먹이 그리기
    drawFood();

    // 4단계: 특수 먹이 그리기
    drawSpecialFood();

    // 5단계: 뱀 그리기
    drawSnake();

    // 6단계: 파티클 효과 그리기
    updateParticles();

    // 7단계: 일정 시간 간격마다 뱀 이동 (렌더링과 로직 분리)
    // 일시정지 중에는 뱀을 움직이지 않음
    if (gameRunning && !gamePaused && timestamp - lastMoveTime >= moveInterval) {
        moveSnake();
        lastMoveTime = timestamp;
    }

    // 다음 프레임 예약 (무한 반복)
    animationFrameId = requestAnimationFrame(gameLoop);
}

// ========================================
// 게임 시작 함수
// ========================================
function startGame() {
    init();                              // 게임 상태 초기화
    gameRunning = true;                  // 게임 실행 상태로 전환
    overlay.classList.add('hidden');      // 오버레이(시작 화면) 숨기기
    lastMoveTime = performance.now();    // 현재 시간 기록 (이동 타이밍 기준)
}

// ========================================
// 키보드 조작 설정
// ========================================
document.addEventListener('keydown', (e) => {
    // P키 또는 ESC키: 일시정지 토글
    if (e.code === 'KeyP' || e.code === 'Escape') {
        e.preventDefault();
        togglePause();
        return;
    }

    // 스페이스바: 게임 시작 또는 재시작
    if (e.code === 'Space') {
        e.preventDefault(); // 페이지 스크롤 방지
        if (!gameRunning) {
            startGame();
        }
        return;
    }

    // 게임이 진행 중이 아니거나 일시정지 중이면 방향키 무시
    if (!gameRunning || gamePaused) return;

    // 방향키(화살표) 또는 WASD로 뱀 방향 전환
    switch(e.key) {
        case 'ArrowUp':    // 위 화살표
        case 'w':          // W키
        case 'W':
            if (direction.y === 0) nextDirection = { x: 0, y: -1 }; // 위로 (현재 세로 이동 중이 아닐 때만)
            break;
        case 'ArrowDown':  // 아래 화살표
        case 's':          // S키
        case 'S':
            if (direction.y === 0) nextDirection = { x: 0, y: 1 };  // 아래로
            break;
        case 'ArrowLeft':  // 왼쪽 화살표
        case 'a':          // A키
        case 'A':
            if (direction.x === 0) nextDirection = { x: -1, y: 0 }; // 왼쪽으로
            break;
        case 'ArrowRight': // 오른쪽 화살표
        case 'd':          // D키
        case 'D':
            if (direction.x === 0) nextDirection = { x: 1, y: 0 };  // 오른쪽으로
            break;
    }
});

// ========================================
// 모바일 터치 조작 설정
// ========================================
let touchStartX = 0; // 터치 시작 X좌표
let touchStartY = 0; // 터치 시작 Y좌표

// 터치 시작: 손가락을 올려놓은 위치 기억
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
}, { passive: false });

// 터치 이동: 스크롤 방지
canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
}, { passive: false });

// 터치 끝: 손가락을 뗀 위치와 시작 위치의 차이로 방향 판단
canvas.addEventListener('touchend', (e) => {
    e.preventDefault();

    // 게임이 진행 중이 아니면 게임 시작
    if (!gameRunning) {
        startGame();
        return;
    }

    // 일시정지 중이면 터치로 재개
    if (gamePaused) {
        togglePause();
        return;
    }

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartX; // X방향 이동 거리
    const deltaY = touch.clientY - touchStartY; // Y방향 이동 거리
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // 최소 30px 이상 스와이프해야 방향 전환 인식
    if (absDeltaX > 30 || absDeltaY > 30) {
        if (absDeltaX > absDeltaY) {
            // 가로 스와이프가 더 길면: 좌우 이동
            if (direction.x === 0) {
                nextDirection = deltaX > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
            }
        } else {
            // 세로 스와이프가 더 길면: 상하 이동
            if (direction.y === 0) {
                nextDirection = deltaY > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
            }
        }
    }
}, { passive: false });

// ========================================
// 초기 설정 및 게임 루프 시작
// ========================================
highScore = bestScores[currentDifficulty];                                    // 초기 난이도(normal)의 최고 점수 설정
highScoreEl.textContent = highScore;                                         // 저장된 최고 점수 표시
document.getElementById('overlayBestScoreValue').textContent = highScore;   // 오버레이 베스트 스코어 표시
currentDifficultyEl.textContent = DIFFICULTY_SETTINGS[currentDifficulty].label; // 초기 난이도 표시
gameLoop(0);                                                                  // 게임 루프 시작!
