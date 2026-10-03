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
const passwordInput = document.getElementById('password-input');
const loginBtn = document.getElementById('login-btn');
const authErrorMsg = document.getElementById('auth-error-msg');
const userNameDisplay = document.getElementById('user-name');
const userBalanceDisplay = document.getElementById('user-balance');
const wheel = document.getElementById('wheel');
const ball = document.getElementById('roulette-ball');
const statusMessage = document.getElementById('status-message');
const spinBtn = document.getElementById('spin-btn');
const clearBtn = document.getElementById('clear-btn');
const cheatConsoleBtn = document.getElementById('cheat-console-btn');

const globalLeaderboardBtn = document.getElementById('global-leaderboard-btn');
const leaderboardModal = document.getElementById('leaderboard-modal');
const closeLeaderboardBtn = document.getElementById('close-leaderboard-btn');
const leaderboardRows = document.getElementById('leaderboard-rows');

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

// --- СИСТЕМА ЗАЩИТЫ ПАРОЛЕМ ---
loginBtn.addEventListener('click', () => {
    const name = usernameInput.value.trim().toUpperCase();
    const password = passwordInput.value.trim();

    if (!name || !password) {
        authErrorMsg.textContent = "ЗАПОЛНИТЕ ВСЕ ПОЛЯ";
        return;
    }

    const cloudSave = localStorage.getItem(`gv_user_${name}`);

    if (cloudSave) {
        const existingUser = JSON.parse(cloudSave);
        if (existingUser.password === password) {
            user = existingUser;
            authErrorMsg.textContent = "";
            enterCasino();
        } else {
            authErrorMsg.textContent = "НЕВЕРНЫЙ ПАРОЛЬ ДЛЯ ДАННОГО НИКНЕЙМА";
        }
    } else {
        user = { name: name, password: password, balance: 1000 };
        saveSession();
        authErrorMsg.textContent = "";
        enterCasino();
    }
});

function enterCasino() {
    updateInterface();
    authScreen.classList.remove('active');
    setTimeout(() => gameScreen.classList.add('active'), 400);
}

function saveSession() {
    localStorage.setItem(`gv_user_${user.name}`, JSON.stringify(user));
}
function updateInterface() {
    userNameDisplay.textContent = user.name;
    userBalanceDisplay.textContent = user.balance.toLocaleString();

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

// --- УПРАВЛЕНИЕ СТАВКАМИ ---
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

// --- ЛИДЕРБОРД И БАЗА ДАННЫХ ---
globalLeaderboardBtn.addEventListener('click', () => {
    renderLeaderboard();
    leaderboardModal.classList.add('active');
});

closeLeaderboardBtn.addEventListener('click', () => {
    leaderboardModal.classList.remove('active');
});

function renderLeaderboard() {
    leaderboardRows.innerHTML = "";
    let players = [];

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith("gv_user_")) {
            try {
                players.push(JSON.parse(localStorage.getItem(key)));
            } catch(e) {}
        }
    }

    players.sort((a, b) => b.balance - a.balance);

    if (players.length === 0) {
        leaderboardRows.innerHTML = `<tr><td colspan="3" style="text-align:center; opacity:0.5;">Нет зарегистрированных VIP-гостей</td></tr>`;
        return;
    }

    players.forEach((p, idx) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#${idx + 1}</td>
            <td>${p.name} ${p.name === user.name ? '<span style="color:#22c55e">(Вы)</span>' : ''}</td>
            <td>${p.balance.toLocaleString()} $</td>
        `;
        leaderboardRows.appendChild(row);
    });
}
// --- ЧИТ-КОДЫ И АДМИН-КОНСОЛЬ ---
cheatConsoleBtn.addEventListener('click', () => {
    if (isSpinning) return;

    const inputCode = prompt("ВВЕДИТЕ СЕКРЕТНЫЙ VIP-КОД ИЛИ АДМИН-КОМАНДУ:");
    if (!inputCode) return;

    const cleanCode = inputCode.trim().toLowerCase();

    if (cleanCode === "cashin") {
        user.balance += 5000;
        saveSession();
        updateInterface();
        alert("Код активирован! Зачислено +5,000 \$");
    }
    else if (cleanCode === "cashout") {
        user.balance = Math.max(0, user.balance - 500);
        saveSession();
        updateInterface();
        alert("Код активирован! Списано -500 \$");
    }
    else if (cleanCode.startsWith("deleteplayer ")) {
        const targetPlayerName = inputCode.substring(13).trim().toUpperCase();
        if (!targetPlayerName) return;

        const storageKey = `gv_user_${targetPlayerName}`;
        if (localStorage.getItem(storageKey)) {
            localStorage.removeItem(storageKey);
            alert(`Удален аккаунт игрока: ${targetPlayerName}`);
            if (targetPlayerName === user.name) location.reload();
        } else {
            alert("Игрок не найден.");
        }
    } else {
        alert("Неверный VIP-код!");
    }
});

// --- КИНЕМАТИКА РУЛЕТКИ (5.5 СЕК + 2.5 СЕК ОЖИДАНИЯ) ---
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

    const winningIndex = Math.floor(Math.random() * 37);
    const resultSector = rouletteNumbers[winningIndex];

    const wheelTargetAngle = winningIndex * sectorDegrees;
    const wheelSpins = 2160;
    wheelRotation += wheelSpins + (360 - wheelTargetAngle);

    wheel.style.transform = `rotate(${wheelRotation}deg)`;

    ball.classList.remove('hidden');
    const ballFinalAngle = -1800 - wheelTargetAngle;

    const styleSheet = document.createElement("style");
    styleSheet.id = "ball-animation-runtime";
    styleSheet.innerHTML = `
        @keyframes orbitBallDynamic {
            0% { transform: translate(-50%, -50%) rotate(0deg) translate(95px) rotate(0deg); }
            60% { transform: translate(-50%, -50%) rotate(-1440deg) translate(92px) rotate(1440deg); }
            80% { transform: translate(-50%, -50%) rotate(-1620deg) translate(78px) rotate(1620deg); }
            100% { transform: translate(-50%, -50%) rotate(${ballFinalAngle}deg) translate(65px) rotate(${-ballFinalAngle}deg); }
        }
    `;
    document.head.appendChild(styleSheet);
    ball.style.animation = "orbitBallDynamic 5.5s cubic-bezier(0.1, 0.6, 0.2, 1) forwards";

    setTimeout(() => {
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

        setTimeout(() => {
            isSpinning = false;
            toggleControls(false);

            const oldStyle = document.getElementById("ball-animation-runtime");
            if (oldStyle) oldStyle.remove();

            bets = { red: 0, black: 0, zero: 0 };
            updateInterface();
            statusMessage.textContent = "СДЕЛАЙТЕ ВАШИ СТАВКИ";
        }, 2500);

    }, 5500);
});

function toggleControls(disabled) {
    spinBtn.disabled = disabled;
    clearBtn.disabled = disabled;
    cheatConsoleBtn.disabled = disabled;
}
