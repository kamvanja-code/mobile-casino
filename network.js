// --- СЕТЕВОЙ МУЛЬТИПЛЕЕР И ЗВУКИ ---
const pubnub = new PubNub({
    publishKey: "pub-c-4dbfe728-6623-455b-801c-fe9ef51a027f",
    subscribeKey: "sub-c-57c2c892-947b-4029-bc55-e40656a84ef9",
    userId: "casino_user_" + Math.random().toString(36).substring(2, 9)
});

window.globalPlayersDatabase = {};
pubnub.subscribe({ channels: ["grand_velvet_network_v3"] });

pubnub.addListener({
    message: function(event) {
        const msg = event.message;
        if (!msg || !msg.action) return;

        if (msg.action === "update_user") {
            window.globalPlayersDatabase[msg.name] = { name: msg.name, password: msg.password, balance: parseInt(msg.balance) };
        }
        else if (msg.action === "request_database") {
            if (Object.keys(window.globalPlayersDatabase).length > 0) {
                pubnub.publish({ channel: "grand_velvet_network_v3", message: { action: "share_database", database: window.globalPlayersDatabase } });
            }
        }
        else if (msg.action === "share_database") {
            window.globalPlayersDatabase = Object.assign({}, window.globalPlayersDatabase, msg.database);
        }
        else if (msg.action === "delete_user") {
            if (window.globalPlayersDatabase[msg.name]) {
                delete window.globalPlayersDatabase[msg.name];
                if (window.user && window.user.name === msg.name) location.reload();
            }
        }
        if (window.user && window.user.name && window.globalPlayersDatabase[window.user.name]) {
            window.user.balance = window.globalPlayersDatabase[window.user.name].balance;
            const balDisplay = document.getElementById('user-balance');
            if (balDisplay) balDisplay.textContent = window.user.balance.toLocaleString();
        }
    }
});

setTimeout(() => { pubnub.publish({ channel: "grand_velvet_network_v3", message: { action: "request_database" } }); }, 500);

pubnub.history({ channel: "grand_velvet_network_v3", count: 25 }, function(status, response) {
    if (response && response.messages) {
        response.messages.forEach(item => {
            const msg = item.entry;
            if (msg && msg.action === "update_user") { window.globalPlayersDatabase[msg.name] = { name: msg.name, password: msg.password, balance: parseInt(msg.balance) }; }
            if (msg && msg.action === "delete_user" && window.globalPlayersDatabase[msg.name]) { delete window.globalPlayersDatabase[msg.name]; }
        });
    }
});

window.AudioEngine = {
    ctx: null,
    init() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); },
    playChipSound() { this.init(); const now = this.ctx.currentTime; this.createClink(now, 920, 0.025); this.createClink(now + 0.011, 740, 0.018); },
    createClink(time, freq, duration) {
        const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain(); const filter = this.ctx.createBiquadFilter();
        osc.type = 'triangle'; osc.frequency.setValueAtTime(freq, time); osc.frequency.exponentialRampToValueAtTime(120, time + duration);
        filter.type = 'bandpass'; filter.frequency.setValueAtTime(1500, time);
        gain.gain.setValueAtTime(0.25, time); gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        osc.connect(filter); filter.connect(gain); gain.connect(this.ctx.destination);
        osc.start(time); osc.stop(time + duration + 0.01);
    },
    playBallTick() { this.init(); const now = this.ctx.currentTime; const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain(); osc.type = 'sine'; osc.frequency.setValueAtTime(260, now); osc.frequency.exponentialRampToValueAtTime(95, now + 0.02); gain.gain.setValueAtTime(0.15, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02); osc.connect(gain); gain.connect(this.ctx.destination); osc.start(now); osc.stop(now + 0.02); },
    playWinSound() {
        this.init(); const now = this.ctx.currentTime; const freqs = [329.63, 392.00, 523.25, 659.25];
        freqs.forEach((f, i) => { const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain(); osc.type = 'sine'; osc.frequency.setValueAtTime(f, now + i * 0.08); gain.gain.setValueAtTime(0.12, now + i * 0.08); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6); osc.connect(gain); gain.connect(this.ctx.destination); osc.start(now + i * 0.08); osc.stop(now + 0.6); });
    }
};

window.sendBalanceUpdate = function() { pubnub.publish({ channel: "grand_velvet_network_v3", message: { action: "update_user", name: window.user.name, password: window.user.password, balance: window.user.balance } }); };
