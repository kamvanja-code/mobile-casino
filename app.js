// --- НОВАЯ СВЕРХСТАБИЛЬНАЯ СВЯЗЬ С GOOGLE ТАБЛИЦАМИ (ОБЩЕЕ ОБЛАКО) ---
// Этот веб-интерфейс синхронизирует балансы, пароли и общую таблицу лидеров для всех устройств в мире.
const GOOGLE_URL = "https://google.com";

// Функция отправки/получения данных из Google Таблиц
async function requestGoogleSheets(params) {
    try {
        const queryString = new URLSearchParams(params).toString();
        // Используем метод GET, так как он никогда не блокируется политикой CORS в браузерах
        const response = await fetch(`${GOOGLE_URL}?${queryString}&_t=${Date.now()}`);
        if (!response.ok) return null;
        return await response.json();
    } catch (e) {
        console.error("Критическая ошибка связи с Google Sheets:", e);
        return null;
    }
}

// --- КРИСТАЛЬНО ЧИСТЫЙ ЗВУКОВОЙ ДВИЖОК КАЗИНО ---
const AudioEngine = {
    ctx: null,
    init() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); },

    playChipSound() {
        this.init();
        const now = this.ctx.currentTime;
        this.createClink(now, 920, 0.025);
        this.createClink(now + 0.011, 740, 0.018);
    },

    createClink(time, freq, duration) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        osc.type = 'triangle'; osc.frequency.setValueAtTime(freq, time);
        osc.frequency.exponentialRampToValueAtTime(120, time + duration);
        filter.type = 'bandpass'; filter.frequency.setValueAtTime(1500, time);
        gain.gain.setValueAtTime(0.25, time); gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        osc.connect(filter); filter.connect(gain); gain.connect(this.ctx.destination);
        osc.start(time); osc.stop(time + duration + 0.01);
    },

    playBallTick() {
        this.init(); const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(95, now + 0.02);
        gain.gain.setValueAtTime(0.15, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(now); osc.stop(now + 0.02);
    },

    playWinSound() {
        this.init(); const now = this.ctx.currentTime;
        const freqs = [329.63, 392.00, 523.25, 659.25];
        freqs.forEach((f, i) => {
            const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
            osc.type = 'sine'; osc.frequency.setValueAtTime(f, now + i * 0.08);
            gain.gain.setValueAtTime(0.12, now + i * 0.08); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
            osc.connect(gain); gain.connect(this.ctx.destination);
            osc.start(now + i * 0.08); osc.stop(now + 0.6);
        });
    }
};

let user = { name: "", password: "", balance: 1000 };
let currentSelectedChip = 10;
let bets = { red: 0, black: 0, zero: 0 };
let isSpinning = false;

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

// Мировая авторизация через Google Скрипты
loginBtn.addEventListener('click', async () => {
    AudioEngine.init();
    const name = usernameInput.value.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "");
    const password = passwordInput.value.trim();

    if (!name || !password) {
        authErrorMsg.textContent = "ЗАПОЛНИТЕ ВСЕ ПОЛЯ";
        return;
    }

    loginBtn.disabled = true;
    authErrorMsg.textContent = "ПОДКЛЮЧЕНИЕ К ОБЛАКУ GOOGLE...";

    const res = await requestGoogleSheets({ action: "login", name: name, password: password });

    if (res && res.status === "success") {
        user = { name: name, password: password, balance: parseInt(res.balance) };
        authErrorMsg.textContent = "";
        enterCasino();
    } else if (res && res.status === "wrong_password") {
        authErrorMsg.textContent = "НЕВЕРНЫЙ ПАРОЛЬ ДЛЯ ДАННОГО VIP-НИКА";
        loginBtn.disabled = false;
    } else {
        authErrorMsg.textContent = "ОШИБКА СЕТИ, ПОВТОРИТЕ ПОПЫТКУ";
        loginBtn.disabled = false;
    }
});

function enterCasino() {
    updateInterface();
    authScreen.classList.remove('active');
    setTimeout(() => gameScreen.classList.add('active'), 400);
}

async function saveSession() {
    localStorage.setItem(`gv_user_${user.name}`, JSON.stringify(user));
    // Отправляем обновленный баланс прямо в строки Google Таблицы
    await requestGoogleSheets({ action: "save", name: user.name, password: user.password, balance: user.balance });
}

function updateInterface() {
    userNameDisplay.textContent = user.name;
    userBalanceDisplay.textContent = user.balance.toLocaleString();
    ['red', 'black', 'zero'].forEach(type => {
        const holder = document.getElementById(`chip-space-${type}`);
        if (bets[type] > 0) { holder.textContent = bets[type]; holder.classList.remove('hidden'); }
        else { holder.classList.add('hidden'); }
    });
}

document.querySelectorAll('.casino-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
        if (isSpinning) return;
        AudioEngine.playChipSound();
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
            AudioEngine.playChipSound();
            user.balance -= currentSelectedChip;
            bets[target] += currentSelectedChip;
            updateInterface();
            statusMessage.textContent = "СТАВКА ПРИНЯТА";
        } else { statusMessage.textContent = "НЕДОСТАТОЧНО СРЕДСТВ"; }
    });
});

clearBtn.addEventListener('click', () => {
    if (isSpinning) return;
    AudioEngine.playChipSound();
    user.balance += (bets.red + bets.black + bets.zero);
    bets = { red: 0, black: 0, zero: 0 };
    updateInterface();
    statusMessage.textContent = "СТАВКИ СБРОШЕНЫ";
});

// Глобальный лидерборд со всех девайсов мира
globalLeaderboardBtn.addEventListener('click', async () => {
    AudioEngine.init();
    leaderboardModal.classList.add('active');
    leaderboardRows.innerHTML = `<tr><td colspan="3" style="text-align:center; opacity:0.5;">ЗАГРУЗКА МИРОВОЙ БАЗЫ GOOGLE...</td></tr>`;
    await renderLeaderboard();
});

closeLeaderboardBtn.addEventListener('click', () => { leaderboardModal.classList.remove('active'); });

async function renderLeaderboard() {
    const res = await requestGoogleSheets({ action: "leaderboard" });

    if (!res || !res.players || res.players.length === 0) {
        leaderboardRows.innerHTML = `<tr><td colspan="3" style="text-align:center; opacity:0.5;">VIP-список пуст</td></tr>`;
        return;
    }

    let players = res.players;
    players.sort((a, b) => b.balance - a.balance);
    leaderboardRows.innerHTML = "";

    players.forEach((p, idx) => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>#${idx + 1}</td><td>${p.name} ${p.name === user.name ? '<span style="color:#22c55e">(Вы)</span>' : ''}</td><td>${parseInt(p.balance).toLocaleString()} $</td>`;
        leaderboardRows.appendChild(row);
    });
}
cheatConsoleBtn.addEventListener('click', async () => {
    if (isSpinning) return;
    const inputCode = prompt("ВВЕДИТЕ СЕКРЕТНЫЙ VIP-КОД:");
    if (!inputCode) return;
    const cleanCode = inputCode.trim().toLowerCase();

    if (cleanCode === "cashin") {
        user.balance += 5000; await saveSession(); updateInterface();
        alert("Код активирован! Зачислено +5,000 \$");
    } else if (cleanCode === "cashout") {
        user.balance = Math.max(0, user.balance - 500); await saveSession(); updateInterface();
        alert("Код активирован! Списано -500 \$");
    } else if (cleanCode.startsWith("deleteplayer ")) {
        const target = inputCode.substring(13).trim().toUpperCase();
        if (!target) return;

        const res = await requestGoogleSheets({ action: "delete", name: target });
        if (res && res.status === "success") {
            localStorage.removeItem(`gv_user_${target}`);
            alert(`Игрок ${target} успешно удален из таблиц Google.`);
            if (target === user.name) location.reload();
        } else { alert("Ошибка удаления или игрок не найден."); }
    } else { alert("Неверный VIP-код!"); }
});

// --- ИДЕАЛЬНОЕ ЭКСПОНЕНЦИАЛЬНОЕ ЗАТУХАНИЕ ШАРИКА БЕЗ СКАЧКОВ СКОРОСТИ ---
let wheelRotation = 0;

spinBtn.addEventListener('click', () => {
    if (isSpinning) return;
    const activeBet = bets.red + bets.black + bets.zero;
    if (activeBet === 0) { statusMessage.textContent = "СДЕЛАЙТЕ СТАВКУ НА СУКНО"; return; }

    isSpinning = true; toggleControls(true);
    document.querySelectorAll('.bet-spot').forEach(spot => spot.classList.remove('winning-highlight'));
    statusMessage.textContent = "СТАВКИ СДЕЛАНЫ. КОЛЕСО ЗАПУЩЕНО";

    const winningIndex = Math.floor(Math.random() * 37);
    const resultSector = rouletteNumbers[winningIndex];

    const duration = 6500;
    const startTime = performance.now();

    const wheelTargetAngle = winningIndex * sectorDegrees;
    const wheelSpins = 2160; // 6 полных кругов рулетки

    const startWheelAngle = wheelRotation;
    const endWheelAngle = wheelRotation + wheelSpins + (360 - wheelTargetAngle);
    wheelRotation = endWheelAngle;

    wheel.style.transform = `rotate(${wheelRotation}deg)`;
    ball.classList.remove('hidden');

    let lastTickAngle = 0;

    function animateSimulation(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Математическое гашение скорости 5-й степени (Инерция колеса)
        const easeOutQuint = 1 - Math.pow(1 - progress, 5);
        const currentWheelPos = startWheelAngle + (endWheelAngle - startWheelAngle) * easeOutQuint;

        // Физически выверенное относительное положение шарика.
        // Шарик вращается вместе с колесом, но имеет свою добавочную плавную инерцию,
        // которая тает на нет. Никаких рывков или ускорений в конце быть не может физически.
        const ballExtraOrbits = 1440; // 4 дополнительных круга шарика поверх скорости колеса
        const ballProgressAngle = ballExtraOrbits * (1 - Math.pow(1 - progress, 3.5));

        // Шарик стремится сесть строго в центр ячейки (угол колеса + угол сектора + 180 верхняя точка)
        const currentBallPos = ((currentWheelPos % 360) + wheelTargetAngle + 180) - (ballExtraOrbits - ballProgressAngle);

        // Плавное сужение радиуса качения шарика к центру ячейки
        const currentRadius = 96 - (31 * easeOutQuint);

        ball.style.transform = `translate(-50%, -50%) rotate(${currentBallPos}deg) translate(${currentRadius}px) rotate(${-currentBallPos}deg)`;

        // Звуковой треск замедляется синхронно с движением шарика
        const absoluteRelativeAngle = Math.abs(currentBallPos - currentWheelPos);
        if (Math.abs(absoluteRelativeAngle - lastTickAngle) >= sectorDegrees) {
            if (progress < 0.83) AudioEngine.playBallTick();
            lastTickAngle = absoluteRelativeAngle;
        }

        if (progress < 1) {
            requestAnimationFrame(animateSimulation);
        } else {
            finishRound(resultSector);
        }
    }
    requestAnimationFrame(animateSimulation);
});

async function finishRound(resultSector) {
    let winSum = 0;
    if (bets[resultSector.c] > 0 && (resultSector.c === 'red' || resultSector.c === 'black')) winSum += bets[resultSector.c] * 2;
    if (resultSector.c === 'zero' && bets.zero > 0) winSum += bets.zero * 36;

    user.balance += winSum;
    // Мгновенно синхронизируем баланс с Google Таблицей по сети
    await saveSession();

    if (winSum > 0) AudioEngine.playWinSound();

    const winningFieldElement = document.querySelector(`.spot-${resultSector.c}`);
    if (winningFieldElement) winningFieldElement.classList.add('winning-highlight');

    const colorText = resultSector.c === 'red' ? 'КРАСНОЕ' : (resultSector.c === 'black' ? 'ЧЕРНОЕ' : 'ЗЕРО');
    if (winSum > 0) {
        statusMessage.innerHTML = `ВЫПАЛО: <span style="color:#ffd700">${resultSector.n} (${colorText})</span>. ВЫИГРЫШ: <span style="color:#22c55e">+$${winSum}</span>!`;
    } else {
        statusMessage.innerHTML = `ВЫПАЛО: <span style="color:#ffffff">${resultSector.n} (${colorText})</span>. СТАВКА ПРОИГРАЛА.`;
    }

    setTimeout(() => {
        isSpinning = false; toggleControls(false);
        bets = { red: 0, black: 0, zero: 0 }; updateInterface();
        statusMessage.textContent = "СДЕЛАЙТЕ ВАШИ СТАВКИ";
    }, 3000);
}

function toggleControls(disabled) {
    spinBtn.disabled = disabled; clearBtn.disabled = disabled; cheatConsoleBtn.disabled = disabled;
}
