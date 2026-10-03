// Состояние сессии игрока
let user = { name: "", balance: 1000 };
let currentSelectedChip = 10;
let bets = { red: 0, black: 0, zero: 0 };
let isSpinning = false;

// Полное европейское колесо (37 секторов)
const rouletteNumbers = [
    { n: 0, c: 'zero' },  { n: 32, c: 'red' },   { n: 15, c: 'black' }, { n: 19, c: 'red' },
    { n: 4, c: 'black' },  { n: 21, c: 'red' },   { n: 2, c: 'black' },  { n: 25, c: 'red' },
    { n: 17, c: 'black' }, { n: 34, c: 'red' },   { n: 6, c: 'black' },  { n: 27, c: 'red' },
    { n: 13, c: 'black' }, { n: 36, c: 'red' },   { n: 11, c: 'black' }, { n: 30, c: 'red' },
    { n: 8, c: 'black' },  { n: 23, c: 'red' },   { n: 10, c: 'black' }, { n: 5, c: 'red' },
    { n: 24, c: 'black' }, { n: 16, c: 'red' },   { n: 33, c: 'black' }, { n: 1, c: 'red' },
    { n: 20, c: 'black' }, { n: 14, c: 'red' },   { n: 31, c: 'black' }, { n: 9, c: 'red' },
    { n: 22, c: 'black' }, { n: 18, c: 'red' },   { n: 29, c: 'black' }, { n: 7, c: 'red' },
    { n: 28, c: 'black' }, { n: 12, c: 'red' },   { n: 35, c: 'black' }, { n: 3, c: 'red' },
    { n: 26, c: 'black' }
];

const sectorDegrees = 360 / 37;

// DOM Элементы
const authScreen = document.getElementById('auth-screen');
const gameScreen = document.getElementById('game-screen');
const usernameInput = document.getElementById('username-input');
const loginBtn = document.getElementById('login-btn');
const userNameDisplay = document.getElementById('user-name');
const userBalanceDisplay = document.getElementById('user-balance');
const wheel = document.getElementById('wheel');
const ball = document.getElementById('roulette-ball');
const statusMessage = document.getElementById('status-message');
const spinBtn = document.getElementById('spin-btn');
const clearBtn = document.getElementById('clear-btn');
const refillBtn = document.getElementById('refill-btn');

// Генерация текстуры секторов колеса рулетки
function renderWheelSectors() {
    let gradientParts = [];
    rouletteNumbers.forEach((sector, index) => {
        let startDeg = index * sectorDegrees;
        let endDeg = (index + 1) * sectorDegrees;
        let color = sector.c === 'zero' ? '#116936' : (sector.c === 'red' ? '#bd1c1c' : '#1a1a1a');
        gradientParts.push(`${color} ${startDeg}deg ${endDeg}deg`);
    });
    wheel.style.background = `conic-gradient(${gradientParts.join(', ')})`;
}
renderWheelSectors();

// --- СИСТЕМА РЕГИСТРАЦИИ (LOCALSTORAGE) ---
loginBtn.addEventListener('click', () => {
    const name = usernameInput.value.trim().toUpperCase();
    if (!name) {
        statusMessage.textContent = "ВВЕДИТЕ ИМЯ ДЛЯ ВХОДА";
        return;
    }

    user.name = name;
    const cloudSave = localStorage.getItem(`grand_velvet_user_${name}`);

    if (cloudSave) {
        user = JSON.parse(cloudSave);
    } else {
        user.balance = 1000;
        saveSession();
    }

    updateInterface();
    authScreen.classList.remove('active');
    setTimeout(() => gameScreen.classList.add('active'), 400);
});

function saveSession() {
    localStorage.setItem(`grand_velvet_user_${user.name}`, JSON.stringify(user));
}

function updateInterface() {
    userNameDisplay.textContent = user.name;
    userBalanceDisplay.textContent = user.balance.toLocaleString();

    // Обновление фишек на столе
    ['red', 'black', 'zero'].forEach(type => {
        const holder = document.getElementById(`chip-space-${type}`);
        if (bets[type] > 0) {
            holder.textContent = bets[type];
            holder.classList.remove('hidden');
        } else {
            holder.classList.add('hidden');
        }
    });
}

// --- СТАВКИ И ФИШКИ ---
document.querySelectorAll('.casino-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
        if (isSpinning) return;
        document.querySelectorAll('.casino-chip').forEach(c => c.classList.remove('active'));
        e.target.classList.add('active');
        currentSelectedChip = parseInt(e.target.dataset.value);
    });
});

document.querySelectorAll('.bet-spot').forEach(spot => {
    spot.addEventListener('click', () => {
        if (isSpinning) return;
        const target = spot.dataset.target;

        if (user.balance >= currentSelectedChip) {
            user.balance -= currentSelectedChip;
            bets[target] += currentSelectedChip;
            updateInterface();
            statusMessage.textContent = "СТАВКА ПРИНЯТА";
        } else {
            statusMessage.textContent = "НЕДОСТАТОЧНО СРЕДСТВ";
        }
    });
});

clearBtn.addEventListener('click', () => {
    if (isSpinning) return;
    user.balance += (bets.red + bets.black + bets.zero);
    bets = { red: 0, black: 0, zero: 0 };
    updateInterface();
    statusMessage.textContent = "СТАВКИ СБРОШЕНЫ";
});

refillBtn.addEventListener('click', () => {
    if (isSpinning) return;
    user.balance += 500;
    saveSession();
    updateInterface();
    statusMessage.textContent = "ДЕПОЗИТ ПОПОЛНЕН: +500\$";
});

// --- СИНХРОННАЯ КИНЕМАТИКА РУЛЕТКИ И ШАРИКА ---
let wheelRotation = 0;

spinBtn.addEventListener('click', () => {
    if (isSpinning) return;

    const activeBet = bets.red + bets.black + bets.zero;
    if (activeBet === 0) {
        statusMessage.textContent = "СДЕЛАЙТЕ СТАВКУ НА СУКНО";
        return;
    }

    isSpinning = true;
    toggleControls(true);
    statusMessage.textContent = "СТАВКИ СДЕЛАНЫ. КОЛЕСО ЗАПУЩЕНО";

    // 1. Выбираем случайное число
    const winningIndex = Math.floor(Math.random() * 37);
    const resultSector = rouletteNumbers[winningIndex];

    // 2. Рассчитываем вращение самого колеса (по часовой стрелке)
    const wheelTargetAngle = winningIndex * sectorDegrees;
    const wheelSpins = 1440; // 4 полных оборота колеса
    wheelRotation += wheelSpins + (360 - wheelTargetAngle);
    wheel.style.transform = `rotate(${wheelRotation}deg)`;

    // 3. Запуск шарика (против часовой стрелки на внешней орбите)
    ball.classList.remove('hidden');

    // Создаем кастомный путь анимации для шарика через CSS переменные
    // Шарик должен сделать несколько кругов на радиусе 95px, а в конце упасть на радиус 65px в нужный сектор колеса.
    const ballFinalAngle = -1440 - wheelTargetAngle;

    // Динамически инжектим ключевые кадры для падения шарика
    const styleSheet = document.createElement("style");
    styleSheet.id = "ball-animation-runtime";
    styleSheet.innerHTML = `
        @keyframes orbitBallDynamic {
            0% { transform: translate(-50%, -50%) rotate(0deg) translate(95px) rotate(0deg); }
            70% { transform: translate(-50%, -50%) rotate(-1080deg) translate(92px) rotate(1080deg); }
            85% { transform: translate(-50%, -50%) rotate(-1260deg) translate(80px) rotate(1260deg); }
            100% { transform: translate(-50%, -50%) rotate(${ballFinalAngle}deg) translate(65px) rotate(${-ballFinalAngle}deg); }
        }
    `;
    document.head.appendChild(styleSheet);
    ball.style.animation = "orbitBallDynamic 4s cubic-bezier(0.1, 0.5, 0.15, 1) forwards";

    // 4. Окончание вращения через 4 секунды
    setTimeout(() => {
        isSpinning = false;
        toggleControls(false);

        // Расчет результатов
        let winSum = 0;
        if (bets[resultSector.c] > 0 && (resultSector.c === 'red' || resultSector.c === 'black')) {
            winSum += bets[resultSector.c] * 2;
        }
        if (resultSector.c === 'zero' && bets.zero > 0) {
            winSum += bets.zero * 36;
        }

        user.balance += winSum;
        saveSession();

        const colorText = resultSector.c === 'red' ? 'КРАСНОЕ' : (resultSector.c === 'black' ? 'ЧЕРНОЕ' : 'ЗЕРО');
        if (winSum > 0) {
            statusMessage.innerHTML = `ВЫПАЛО: <span style="color:#ffd700">${resultSector.n} (${colorText})</span>. ВЫИГРЫШ: <span style="color:#22c55e">+$${winSum}</span>!`;
        } else {
            statusMessage.innerHTML = `ВЫПАЛО: <span style="color:#ffffff">${resultSector.n} (${colorText})</span>. СТАВКА ПРОИГРАЛА.`;
        }

        // Очистка анимационных стилей и обновление данных
        const oldStyle = document.getElementById("ball-animation-runtime");
        if (oldStyle) oldStyle.remove();

        bets = { red: 0, black: 0, zero: 0 };
        updateInterface();

    }, 4000);
});

function toggleControls(disabled) {
    spinBtn.disabled = disabled;
    clearBtn.disabled = disabled;
    refillBtn.disabled = disabled;
}