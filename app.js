// --- КОНФИГУРАЦИЯ СТАБИЛЬНОГО МИРОВОГО ОБЛАКА (KVDB.IO) ---
// Генерируем уникальный постоянный ключ для базы данных казино
const BUCKET_ID = "kvd_grandvelvet_casino_prod_v2";
const CLOUD_URL = `https://kvdb.io{BUCKET_ID}`;

async function saveToCloud(playerName, playerData) {
    try {
        await fetch(`${CLOUD_URL}/${playerName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(playerData)
        });
    } catch (e) { console.error("Ошибка сохранения в облако:", e); }
}

async function getFromCloud(playerName) {
    try {
        const response = await fetch(`${CLOUD_URL}/${playerName}`);
        if (!response.ok) return null;
        return await response.json();
    } catch (e) { console.error("Ошибка чтения из облака:", e); return null; }
}

// --- УЛУЧШЕННЫЙ ЗВУКОВОЙ ДВИЖОК ---
const AudioEngine = {
    ctx: null,
    init() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); },

    // Реалистичный звук соударения тяжелых глиняных фишек (двойной пластиковый клик с эхом)
    playChipSound() {
        this.init();
        const now = this.ctx.currentTime;

        // Первая фишка падает
        this.createSingleChipImpact(now);
        // Вторая фишка ударяется о неё с микрозадержкой в 0.012 сек
        this.createSingleChipImpact(now + 0.012);
    },

    createSingleChipImpact(time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(850, time);
        osc.frequency.exponentialRampToValueAtTime(150, time + 0.03);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1200, time);

        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.035);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(time);
        osc.stop(time + 0.04);
    },

    playBallTick() {
        this.init(); const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(240, now);
        osc.frequency.exponentialRampToValueAtTime(90, now + 0.025);
        gain.gain.setValueAtTime(0.18, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(now); osc.stop(now + 0.025);
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

let user = { name: "", balance: 1000 };
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

loginBtn.addEventListener('click', async () => {
    AudioEngine.init();
    const name = usernameInput.value.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "");
    const password = passwordInput.value.trim();

    if (!name || !password) {
        authErrorMsg.textContent = "ЗАПОЛНИТЕ ВСЕ ПОЛЯ";
        return;
    }

    loginBtn.disabled = true;
    authErrorMsg.textContent = "ПОДКЛЮЧЕНИЕ К ОБЛАКУ...";

    const cloudSave = await getFromCloud(name);

    if (cloudSave) {
        if (cloudSave.password === password) {
            user = cloudSave;
            authErrorMsg.textContent = "";
            enterCasino();
        } else {
            authErrorMsg.textContent = "НЕВЕРНЫЙ ПАРОЛЬ";
            loginBtn.disabled = false;
        }
    } else {
        user = { name: name, password: password, balance: 1000 };
        await saveSession();
        authErrorMsg.textContent = "";
        enterCasino();
    }
});

function enterCasino() {
    updateInterface();
    authScreen.classList.remove('active');
    setTimeout(() => gameScreen.classList.add('active'), 400);
}

async function saveSession() {
    localStorage.setItem(`gv_user_${user.name}`, JSON.stringify(user));
    await saveToCloud(user.name, user);
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

globalLeaderboardBtn.addEventListener('click', async () => {
    AudioEngine.init();
    leaderboardModal.classList.add('active');
    leaderboardRows.innerHTML = `<tr><td colspan="3" style="text-align:center; opacity:0.5;">СКАЧИВАНИЕ ТОП-ЛИСТА...</td></tr>`;
    await renderLeaderboard();
});

closeLeaderboardBtn.addEventListener('click', () => { leaderboardModal.classList.remove('active'); });

// Исправленный метод запроса списка ключей для нового облака KVDB.IO
async function renderLeaderboard() {
    try {
        const response = await fetch(`${CLOUD_URL}/?format=json`);
        if (!response.ok) throw new Error();

        const keysList = await response.json();
        let players = [];

        // Скачиваем данные каждого зарегистрированного в мире игрока
        for (let item of keysList) {
            if (item.key) {
                const pData = await getFromCloud(item.key);
                if (pData && pData.balance !== undefined) players.push(pData);
            }
        }

        players.sort((a, b) => b.balance - a.balance);
        leaderboardRows.innerHTML = "";

        if (players.length === 0) {
            leaderboardRows.innerHTML = `<tr><td colspan="3" style="text-align:center; opacity:0.5;">Нет VIP-гостей</td></tr>`;
            return;
        }

        players.forEach((p, idx) => {
            const row = document.createElement('tr');
            row.innerHTML = `<td>#${idx + 1}</td><td>${p.name} ${p.name === user.name ? '<span style="color:#22c55e">(Вы)</span>' : ''}</td><td>${p.balance.toLocaleString()} $</td>`;
            leaderboardRows.appendChild(row);
        });
    } catch(e) {
        leaderboardRows.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#ff4d4d;">ОШИБКА ОБЛАКА (ПОВТОРИТЕ ПОЗЖЕ)</td></tr>`;
    }
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
        try {
            await fetch(`${CLOUD_URL}/${target}`, { method: 'DELETE' });
            localStorage.removeItem(`gv_user_${target}`);
            alert(`Игрок ${target} удален.`);
            if (target === user.name) location.reload();
        } catch(e) { alert("Ошибка удаления."); }
    } else { alert("Неверный VIP-код!"); }
});

// --- ДОКАЧЕННАЯ СИНХРОННАЯ АНИМАЦИЯ ШАРИКА И ДЕЙСТВИТЕЛЬНЫЙ РЕЗУЛЬТАТ КРУТКИ ---
let wheelRotation = 0;

spinBtn.addEventListener('click', () => {
    if (isSpinning) return;
    const activeBet = bets.red + bets.black + bets.zero;
    if (activeBet === 0) { statusMessage.textContent = "СДЕЛАЙТЕ СТАВКУ НА СУКНО"; return; }

    isSpinning = true; toggleControls(true);

    // Сбрасываем подсвечивания перед новой круткой
    document.querySelectorAll('.bet-spot').forEach(spot => spot.classList.remove('winning-highlight'));
    statusMessage.textContent = "СТАВКИ СДЕЛАНЫ. КОЛЕСО ЗАПУЩЕНО";

    const winningIndex = Math.floor(Math.random() * 37);
    const resultSector = rouletteNumbers[winningIndex];
    const duration = 6500; // Увеличили до 6.5 секунд для экстра-плавного затухания
    const startTime = performance.now();

    const wheelTargetAngle = winningIndex * sectorDegrees;
    const wheelSpins = 2160;
    wheelRotation += wheelSpins + (360 - wheelTargetAngle);
    wheel.style.transform = `rotate(${wheelRotation}deg)`;

    ball.classList.remove('hidden');
    let lastTickAngle = 0;

    function animateSimulation(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Математическая функция затухания 4-й степени: шарик плавно «влипает» в ячейку в конце без рывков
        const easeOutQuint = 1 - Math.pow(1 - progress, 5);

        // Вращение колеса
        const currentWheelPos = (wheelRotation - (wheelSpins + (360 - wheelTargetAngle))) + (wheelSpins + (360 - wheelTargetAngle)) * easeOutQuint;

        // Шарик катится по борту, а затем замедляется и падает строго на угол своего сектора
        const totalBallOrbits = 2520; // 7 полных оборотов
        const currentBallPos = -(totalBallOrbits * easeOutQuint) + (wheelTargetAngle * progress);

        // Идеальное сужение орбиты без колебаний
        const currentRadius = 96 - (31 * easeOutQuint);

        ball.style.transform = `translate(-50%, -50%) rotate(${currentBallPos}deg) translate(${currentRadius}px) rotate(${-currentBallPos}deg)`;

        // Треск
        const absoluteRelativeAngle = Math.abs(currentBallPos - currentWheelPos);
        if (Math.abs(absoluteRelativeAngle - lastTickAngle) >= sectorDegrees) {
            if (progress < 0.82) AudioEngine.playBallTick(); // Звуки затихают чуть раньше посадки в гнездо
            lastTickAngle = absoluteRelativeAngle;
        }

        if (progress < 1) { requestAnimationFrame(animateSimulation); }
        else { finishRound(resultSector); }
    }
    requestAnimationFrame(animateSimulation);
});

function finishRound(resultSector) {
    let winSum = 0;
    if (bets[resultSector.c] > 0 && (resultSector.c === 'red' || resultSector.c === 'black')) winSum += bets[resultSector.c] * 2;
    if (resultSector.c === 'zero' && bets.zero > 0) winSum += bets.zero * 36;

    user.balance += winSum;
    saveSession();

    if (winSum > 0) AudioEngine.playWinSound();

    // ФИКСАЦИЯ ДЕЙСТВИТЕЛЬНОГО РЕЗУЛЬТАТА КРУТКИ НА ИГРОВОМ ПОЛЕ
    // Выделяется ровно то поле (Красное, Черное или Зеро), к типу которого принадлежит сектор
    const winningFieldElement = document.querySelector(`.spot-${resultSector.c}`);
    if (winningFieldElement) {
        winningFieldElement.classList.add('winning-highlight');
    }

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
