const AudioEngine = {
    ctx: null,
    init() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); },
    playChipSound() {
        this.init(); const now = this.ctx.currentTime;
        this.createClink(now, 920, 0.025); this.createClink(now + 0.011, 740, 0.018);
    },
    createClink(time, freq, duration) {
        const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain(); const filter = this.ctx.createBiquadFilter();
        osc.type = 'triangle'; osc.frequency.setValueAtTime(freq, time); osc.frequency.exponentialRampToValueAtTime(120, time + duration);
        filter.type = 'bandpass'; filter.frequency.setValueAtTime(1500, time);
        gain.gain.setValueAtTime(0.25, time); gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        osc.connect(filter); filter.connect(gain); gain.connect(this.ctx.destination);
        osc.start(time); osc.stop(time + duration + 0.01);
    },
    playBallTick() {
        this.init(); const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(260, now); osc.frequency.exponentialRampToValueAtTime(95, now + 0.02);
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
let isSpinning = false;

let bets = { red: 0, black: 0 };
for(let i = 0; i <= 36; i++) { bets[`num_${i}`] = 0; }

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

// Отрисовка цифр на секторах рулетки
function drawWheelSectorsSVG() {
    let gradientParts = [];
    let svgContent = `<svg width="100%" height="100%" viewBox="0 0 200 200" style="position:absolute; top:0; left:0; z-index:2;">`;

    rouletteNumbers.forEach((sector, index) => {
        let startDeg = index * sectorDegrees;
        let endDeg = (index + 1) * sectorDegrees;
        let color = sector.c === 'zero' ? '#116936' : (sector.c === 'red' ? '#bd1c1c' : '#1a1a1a');
        gradientParts.push(`${color} ${startDeg}deg ${endDeg}deg`);

        // Считаем угол для текста в центре каждого кармана
        let textAngle = startDeg + (sectorDegrees / 2);
        let rad = (textAngle - 90) * Math.PI / 180;
        let tx = 100 + 78 * Math.cos(rad);
        let ty = 100 + 78 * Math.sin(rad);

        svgContent += `<text x="${tx}" y="${ty}" fill="#ffd700" font-size="7.5" font-weight="800" text-anchor="middle" dominant-baseline="central" transform="rotate(${textAngle}, ${tx}, ${ty})">${sector.n}</text>`;
    });

    svgContent += `</svg><div class="wheel-hub"></div>`;
    wheel.innerHTML = svgContent;
    wheel.style.background = `conic-gradient(${gradientParts.join(', ')})`;
}

function generateFeltGrid() {
    const grid = document.getElementById('numbers-grid');
    if (!grid) return;
    grid.innerHTML = "";
    for (let i = 1; i <= 36; i++) {
        const sec = rouletteNumbers.find(box => box.n === i);
        const colClass = sec.c === 'red' ? 'bg-red' : 'bg-black';
        const spot = document.createElement('div');
        spot.className = `bet-spot spot-number ${colClass} num-${i}`;
        spot.setAttribute('data-target', `num_${i}`);
        spot.innerHTML = `<span class="spot-title">${i}</span><div id="chip-space-num_${i}" class="chip-holder hidden"></div>`;
        grid.appendChild(spot);
    }
}

drawWheelSectorsSVG();
generateFeltGrid();

loginBtn.addEventListener('click', () => {
    AudioEngine.init();
    const name = usernameInput.value.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "");
    const password = passwordInput.value.trim();
    if (!name || !password) { authErrorMsg.textContent = "ЗАПОЛНИТЕ ВСЕ ПОЛЯ"; return; }

    const storageKey = 'grand_velvet_local_' + name;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.password === password) { user = parsed; enterCasino(); }
        else { authErrorMsg.textContent = "НЕВЕРНЫЙ ПАРОЛЬ"; }
    } else {
        user = { name: name, password: password, balance: 1000 };
        saveSession(); enterCasino();
    }
});

function enterCasino() { updateInterface(); authScreen.classList.remove('active'); setTimeout(() => { gameScreen.classList.add('active'); setupBetSpotListeners(); }, 400); }
function saveSession() { localStorage.setItem('grand_velvet_local_' + user.name, JSON.stringify(user)); }
function updateInterface() {
    userNameDisplay.textContent = user.name; userBalanceDisplay.textContent = user.balance.toLocaleString();
    Object.keys(bets).forEach(key => {
        const holder = document.getElementById('chip-space-' + key);
        if (holder) {
            if (bets[key] > 0) { holder.textContent = bets[key]; holder.classList.remove('hidden'); }
            else { holder.classList.add('hidden'); }
        }
    });
}

document.querySelectorAll('.casino-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
        if (isSpinning) return; AudioEngine.playChipSound();
        document.querySelectorAll('.casino-chip').forEach(c => c.classList.remove('active'));
        e.target.classList.add('active'); currentSelectedChip = parseInt(e.target.dataset.value);
    });
});

function setupBetSpotListeners() {
    document.querySelectorAll('.bet-spot').forEach(spot => {
        spot.addEventListener('click', () => {
            if (isSpinning) return;
            const target = spot.getAttribute('data-target');
            if (user.balance >= currentSelectedChip) {
                AudioEngine.playChipSound(); user.balance -= currentSelectedChip; bets[target] += currentSelectedChip; updateInterface(); statusMessage.textContent = "СТАВКА ПРИНЯТА";
            } else { statusMessage.textContent = "НЕДОСТАТОЧНО СРЕДСТВ"; }
        });
    });
}

clearBtn.addEventListener('click', () => {
    if (isSpinning) return; AudioEngine.playChipSound();
    Object.keys(bets).forEach(key => { user.balance += bets[key]; bets[key] = 0; });
    updateInterface(); statusMessage.textContent = "СТАВКИ СБРОШЕНЫ";
});

globalLeaderboardBtn.addEventListener('click', () => { AudioEngine.init(); leaderboardModal.classList.add('active'); renderLeaderboard(); });
closeLeaderboardBtn.addEventListener('click', () => { leaderboardModal.classList.remove('active'); });

function renderLeaderboard() {
    let players = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith("grand_velvet_local_")) {
            try { players.push(JSON.parse(localStorage.getItem(key))); } catch(e){}
        }
    }
    players.sort((a, b) => b.balance - a.balance); leaderboardRows.innerHTML = "";
    players.forEach((p, idx) => {
        const row = document.createElement('tr'); row.innerHTML = '<td>#' + (idx + 1) + '</td><td>' + p.name + (p.name === user.name ? ' <span style="color:#22c55e">(Вы)</span>' : '') + '</td><td>' + parseInt(p.balance).toLocaleString() + ' \$</td>'; leaderboardRows.appendChild(row);
    });
}

cheatConsoleBtn.addEventListener('click', () => {
    if (isSpinning) return; const inputCode = prompt("ВВЕДИТЕ СЕКРЕТНЫЙ VIP-КОД:"); if (!inputCode) return; const cleanCode = inputCode.trim().toLowerCase();
    if (cleanCode === "cashin") { user.balance += 5000; saveSession(); updateInterface(); alert("Зачислено +5,000 \$"); }
    else if (cleanCode === "cashout") { user.balance = Math.max(0, user.balance - 500); saveSession(); updateInterface(); alert("Списано -500 \$"); }
    else if (cleanCode.startsWith("deleteplayer ")) {
        const target = inputCode.substring(13).trim().toUpperCase(); if (!target) return;
        localStorage.removeItem('grand_velvet_local_' + target); alert('Игрок ' + target + ' удален.'); if (target === user.name) location.reload();
    } else { alert("Неверный VIP-код!"); }
});

let wheelRotation = 0;
spinBtn.addEventListener('click', () => {
    if (isSpinning) return;
    let activeBet = 0; Object.keys(bets).forEach(k => activeBet += bets[k]);
    if (activeBet === 0) { statusMessage.textContent = "СДЕЛАЙТЕ СТАВКУ НА СУКНО"; return; }

    isSpinning = true; toggleControls(true);
    document.querySelectorAll('.bet-spot').forEach(spot => spot.classList.remove('winning-highlight'));
    statusMessage.textContent = "СТАВКИ СДЕЛАНЫ. КОЛЕСО ЗАПУЩЕНО";

    const winningIndex = Math.floor(Math.random() * 37); const resultSector = rouletteNumbers[winningIndex]; const duration = 6500; const startTime = performance.now();
    const wheelTargetAngle = winningIndex * sectorDegrees; const wheelSpins = 2160; const startWheelAngle = wheelRotation; const endWheelAngle = wheelRotation + wheelSpins + (360 - wheelTargetAngle); wheelRotation = endWheelAngle;
    wheel.style.transform = 'rotate(' + wheelRotation + 'deg)'; ball.classList.remove('hidden'); let lastTickAngle = 0;

    function animateSimulation(now) {
        const elapsed = now - startTime; const progress = Math.min(elapsed / duration, 1); const easeOutQuint = 1 - Math.pow(1 - progress, 5); const currentWheelPos = startWheelAngle + (endWheelAngle - startWheelAngle) * easeOutQuint;
        const ballExtraOrbits = 1080; const currentBallExtra = ballExtraOrbits * Math.pow(1 - progress, 2.5); const currentBallPos = ((currentWheelPos % 360) + wheelTargetAngle + 180) - currentBallExtra; const currentRadius = 96 - (31 * easeOutQuint);
        ball.style.transform = 'translate(-50%, -50%) rotate(' + currentBallPos + 'deg) translate(' + currentRadius + 'px) rotate(' + (-currentBallPos) + 'deg)';
        const absoluteRelativeAngle = Math.abs(currentBallPos - currentWheelPos);
        if (absoluteRelativeAngle - lastTickAngle >= sectorDegrees) { if (progress < 0.85) AudioEngine.playBallTick(); lastTickAngle = absoluteRelativeAngle; }
        if (progress < 1) { requestAnimationFrame(animateSimulation); } else { finishRound(resultSector); }
    }
    requestAnimationFrame(animateSimulation);
});

function finishRound(resultSector) {
    let winSum = 0;
    if (bets[resultSector.c] > 0) winSum += bets[resultSector.c] * 2;
    if (bets[`num_${resultSector.n}`] > 0) winSum += bets[`num_${resultSector.n}`] * 36;

    user.balance += winSum; saveSession();
    if (winSum > 0) AudioEngine.playWinSound();

    const colorField = document.querySelector(`.spot-${resultSector.c}`);
    if (colorField) colorField.classList.add('winning-highlight');

    const numberField = document.querySelector(`.num-${resultSector.n}`);
    if (numberField) numberField.classList.add('winning-highlight');

    const colorText = resultSector.c === 'red' ? 'КРАСНОЕ' : (resultSector.c === 'black' ? 'ЧЕРНОЕ' : 'ЗЕРО');
    if (winSum > 0) { statusMessage.innerHTML = `ВЫПАЛО: <span style="color:#ffd700">${resultSector.n} (${colorText})</span>. ВЫИГРЫШ: <span style="color:#22c55e">+$${winSum}</span>!`; }
    else { statusMessage.innerHTML = `ВЫПАЛО: <span style="color:#ffffff">${resultSector.n} (${colorText})</span>. СТАВКА ПРОИГРАЛА.`; }

    setTimeout(() => {
        isSpinning = false; toggleControls(false);
        Object.keys(bets).forEach(k => bets[k] = 0); updateInterface();
        statusMessage.textContent = "СДЕЛАЙТЕ ВАШИ СТАВКИ";
    }, 3000);
}
function toggleControls(disabled) { spinBtn.disabled = disabled; clearBtn.disabled = disabled; cheatConsoleBtn.disabled = disabled; }
