/**
 * Kozminski Escape: Polowanie na ECTS
 * js/game.js - Główna logika gry, renderowanie Canvas 800x540, sterowanie i interakcja
 */

import { SoundSystem } from './audio.js';

// --- STAN GRY ---
const TARGET_ECTS = 30;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 540;

const PROFESSOR_QUOTES = [
  '„Panie kolego! Termin minął, proszę natychmiast podejść z indeksem!”',
  '„Widzę pana za filarem w Budynku D! Proszę się nie chować!”',
  '„Czy ma pan chociaż obecności na ćwiczeniach?!”',
  '„Gdzie jest projekt zaliczeniowy z mikroekonomii?!”',
  '„W regulaminie studiów nie ma mowy o takich ucieczkach!”',
  '„Na poprawce w sali B5 nie będzie już tak łatwo!”'
];

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');

    // Elementy HUD
    this.ectsCounterEl = document.getElementById('ects-counter');
    this.ectsProgressEl = document.getElementById('ects-progress');
    this.staminaBarEl = document.getElementById('stamina-bar');
    this.staminaPercentEl = document.getElementById('stamina-percent');
    this.campusStatusEl = document.getElementById('campus-status');
    this.soundToggleBtn = document.getElementById('btn-sound-toggle');
    this.pauseToggleBtn = document.getElementById('btn-pause-toggle');

    // Dymek profesora
    this.speechBubble = document.getElementById('professor-speech-bubble');
    this.speechTextEl = document.getElementById('professor-speech-text');
    this.speechTimeout = null;

    // Modale
    this.modalStart = document.getElementById('modal-start');
    this.modalGameOver = document.getElementById('modal-gameover');
    this.modalVictory = document.getElementById('modal-victory');
    this.btnStart = document.getElementById('btn-start');
    this.btnRestartGameOver = document.getElementById('btn-restart-gameover');
    this.btnRestartVictory = document.getElementById('btn-restart-victory');

    // Statystyki w modalach
    this.statsEctsLostEl = document.getElementById('stats-ects-lost');
    this.statsTimeSurvivedEl = document.getElementById('stats-time-survived');
    this.statsVictoryTimeEl = document.getElementById('stats-victory-time');

    // Przyciski dotykowe
    this.touchUp = document.getElementById('touch-up');
    this.touchDown = document.getElementById('touch-down');
    this.touchLeft = document.getElementById('touch-left');
    this.touchRight = document.getElementById('touch-right');
    this.touchSprint = document.getElementById('touch-sprint');

    // Stan rozgrywki
    this.state = 'START'; // 'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'VICTORY'
    this.ects = 0;
    this.startTime = 0;
    this.elapsedSeconds = 0;

    // Gracz (Student)
    this.player = {
      x: 100,
      y: 270,
      size: 26,
      baseSpeed: 3.2,
      sprintSpeed: 5.6,
      speed: 3.2,
      stamina: 100,
      maxStamina: 100,
      isSprinting: false,
      coffeeTimer: 0,
      vx: 0,
      vy: 0,
      facing: 'right'
    };

    // Egzaminator (Profesor)
    this.professor = {
      x: 700,
      y: 270,
      size: 30,
      speed: 2.2,
      alertRange: 220,
      speechCooldown: 0
    };

    // Obiekty na mapie
    this.ectsItems = [];
    this.coffeeItems = [];
    this.obstacles = [];

    // Klawisze i wejście
    this.keys = {
      up: false,
      down: false,
      left: false,
      right: false,
      sprint: false
    };

    this.initWorld();
    this.bindEvents();
    this.lastFrameTime = performance.now();
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  initWorld() {
    // Architektura kampusu ALK (Budynek D, Aule, Zielone Patio)
    this.obstacles = [
      // Krawędzie i ściany zewnętrzne
      { x: 0, y: 0, w: CANVAS_WIDTH, h: 20 },
      { x: 0, y: CANVAS_HEIGHT - 20, w: CANVAS_WIDTH, h: 20 },
      { x: 0, y: 0, w: 20, h: CANVAS_HEIGHT },
      { x: CANVAS_WIDTH - 20, y: 0, w: 20, h: CANVAS_HEIGHT },

      // Aula Główna (góra lewa)
      { x: 140, y: 20, w: 18, h: 140 },
      { x: 140, y: 140, w: 120, h: 18 },

      // Biblioteka ALK (dół lewa)
      { x: 140, y: 380, w: 120, h: 18 },
      { x: 140, y: 380, w: 18, h: 140 },

      // Filary i przegrody Budynku D
      { x: 420, y: 80, w: 24, h: 100 },
      { x: 420, y: 360, w: 24, h: 100 },
      { x: 620, y: 160, w: 18, h: 220 }
    ];

    // Strefa Zielonego Patio (centrum mapy: x: 280-520, y: 200-340)
    this.patioZone = { x: 280, y: 190, w: 240, h: 160 };

    this.spawnCollectibles();
  }

  spawnCollectibles() {
    this.ectsItems = [];
    this.coffeeItems = [];

    // Generowanie punktów ECTS
    for (let i = 0; i < 12; i++) {
      this.spawnEcts();
    }

    // Generowanie kawy z Patio
    for (let i = 0; i < 3; i++) {
      this.spawnCoffee();
    }
  }

  getRandomFreePosition(size) {
    let x, y, collides;
    let attempts = 0;
    do {
      collides = false;
      x = 50 + Math.random() * (CANVAS_WIDTH - 100);
      y = 50 + Math.random() * (CANVAS_HEIGHT - 100);
      for (const obs of this.obstacles) {
        if (
          x + size > obs.x - 10 &&
          x < obs.x + obs.w + 10 &&
          y + size > obs.y - 10 &&
          y < obs.y + obs.h + 10
        ) {
          collides = true;
          break;
        }
      }
      attempts++;
    } while (collides && attempts < 100);

    return { x, y };
  }

  spawnEcts() {
    const pos = this.getRandomFreePosition(18);
    this.ectsItems.push({
      x: pos.x,
      y: pos.y,
      size: 18,
      bob: Math.random() * Math.PI * 2
    });
  }

  spawnCoffee() {
    // Kawa najczęściej pojawia się w strefie Patio
    const inPatio = Math.random() > 0.3;
    let x, y;
    if (inPatio) {
      x = this.patioZone.x + 30 + Math.random() * (this.patioZone.w - 60);
      y = this.patioZone.y + 30 + Math.random() * (this.patioZone.h - 60);
    } else {
      const pos = this.getRandomFreePosition(20);
      x = pos.x;
      y = pos.y;
    }
    this.coffeeItems.push({
      x,
      y,
      size: 20,
      bob: Math.random() * Math.PI * 2
    });
  }

  bindEvents() {
    // Przyciski modali
    this.btnStart?.addEventListener('click', () => this.startGame());
    this.btnRestartGameOver?.addEventListener('click', () => this.restartGame());
    this.btnRestartVictory?.addEventListener('click', () => this.restartGame());

    // Dźwięk & Pauza
    this.soundToggleBtn?.addEventListener('click', () => {
      SoundSystem.init();
      const isMuted = SoundSystem.toggleMute();
      this.soundToggleBtn.innerHTML = isMuted
        ? '<span class="icon-speaker" aria-hidden="true">🔇</span>'
        : '<span class="icon-speaker" aria-hidden="true">🔊</span>';
    });

    this.pauseToggleBtn?.addEventListener('click', () => this.togglePause());

    // Klawiatura PC
    window.addEventListener('keydown', (e) => {
      SoundSystem.init();
      if (e.code === 'KeyW' || e.code === 'ArrowUp') this.keys.up = true;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') this.keys.down = true;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') this.keys.left = true;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') this.keys.right = true;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.keys.sprint = true;

      if (e.code === 'KeyP' || e.code === 'Space') {
        if (this.state === 'PLAYING' || this.state === 'PAUSED') {
          e.preventDefault();
          this.togglePause();
        }
      }

      if (e.code === 'KeyM') {
        this.soundToggleBtn.click();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') this.keys.up = false;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') this.keys.down = false;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') this.keys.left = false;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') this.keys.right = false;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.keys.sprint = false;
    });

    // Wirtualne przyciski dotykowe (Mobile D-pad & Sprint)
    const bindTouch = (el, key) => {
      if (!el) return;
      const start = (ev) => {
        ev.preventDefault();
        SoundSystem.init();
        this.keys[key] = true;
        el.classList.add('active');
      };
      const end = (ev) => {
        ev.preventDefault();
        this.keys[key] = false;
        el.classList.remove('active');
      };
      el.addEventListener('touchstart', start, { passive: false });
      el.addEventListener('touchend', end, { passive: false });
      el.addEventListener('mousedown', start);
      el.addEventListener('mouseup', end);
      el.addEventListener('mouseleave', end);
    };

    bindTouch(this.touchUp, 'up');
    bindTouch(this.touchDown, 'down');
    bindTouch(this.touchLeft, 'left');
    bindTouch(this.touchRight, 'right');
    bindTouch(this.touchSprint, 'sprint');
  }

  startGame() {
    SoundSystem.init();
    this.modalStart.classList.remove('modal-active');
    this.modalStart.classList.add('modal-hidden');
    this.state = 'PLAYING';
    this.startTime = performance.now();
    this.showProfessorSpeech('„Zaczynamy egzamin! Życzę powodzenia, przyda się panu!”', 4000);
  }

  restartGame() {
    SoundSystem.init();
    this.modalGameOver.classList.add('modal-hidden');
    this.modalGameOver.classList.remove('modal-active');
    this.modalVictory.classList.add('modal-hidden');
    this.modalVictory.classList.remove('modal-active');

    this.ects = 0;
    this.player.x = 80;
    this.player.y = 270;
    this.player.stamina = 100;
    this.player.coffeeTimer = 0;

    this.professor.x = 720;
    this.professor.y = 270;
    this.professor.speechCooldown = 0;

    this.spawnCollectibles();
    this.updateHUD();
    this.state = 'PLAYING';
    this.startTime = performance.now();
    this.showProfessorSpeech('„Poprawka! Niech pan uważa na moje pytania!”', 3500);
  }

  togglePause() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      this.pauseToggleBtn.innerHTML = '<span class="icon-pause" aria-hidden="true">▶</span>';
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      this.pauseToggleBtn.innerHTML = '<span class="icon-pause" aria-hidden="true">⏸</span>';
    }
  }

  showProfessorSpeech(text, duration = 3500) {
    if (this.speechTimeout) clearTimeout(this.speechTimeout);
    this.speechTextEl.textContent = text;
    this.speechBubble.classList.remove('speech-bubble-hidden');
    SoundSystem.play('freeze');

    this.speechTimeout = setTimeout(() => {
      this.speechBubble.classList.add('speech-bubble-hidden');
    }, duration);
  }

  updateHUD() {
    // ECTS counter & progress
    this.ectsCounterEl.textContent = this.ects;
    const ectsPercent = Math.min(100, Math.round((this.ects / TARGET_ECTS) * 100));
    this.ectsProgressEl.style.width = `${ectsPercent}%`;

    // Stamina
    const staminaRounded = Math.round(this.player.stamina);
    this.staminaBarEl.style.width = `${staminaRounded}%`;
    this.staminaPercentEl.textContent = `${staminaRounded}%`;

    if (this.player.stamina < 25) {
      this.staminaBarEl.classList.add('low');
    } else {
      this.staminaBarEl.classList.remove('low');
    }

    // Status Kampusu wg współrzędnych gracza
    if (
      this.player.x >= this.patioZone.x &&
      this.player.x <= this.patioZone.x + this.patioZone.w &&
      this.player.y >= this.patioZone.y &&
      this.player.y <= this.patioZone.y + this.patioZone.h
    ) {
      this.campusStatusEl.textContent = 'Lokalizacja: Zielone Patio ALK (Odpoczynek)';
      this.campusStatusEl.style.color = '#22c55e';
    } else if (this.player.x < 240 && this.player.y < 180) {
      this.campusStatusEl.textContent = 'Lokalizacja: Budynek D – Aula Główna';
      this.campusStatusEl.style.color = 'var(--color-alk-gold)';
    } else if (this.player.x < 240 && this.player.y > 360) {
      this.campusStatusEl.textContent = 'Lokalizacja: Biblioteka ALK & Czytelnia';
      this.campusStatusEl.style.color = 'var(--color-alk-gold)';
    } else {
      this.campusStatusEl.textContent = 'Lokalizacja: Budynek D – Korytarz Główny';
      this.campusStatusEl.style.color = 'var(--color-alk-gold)';
    }
  }

  update(dt) {
    if (this.state !== 'PLAYING') return;

    this.elapsedSeconds = Math.floor((performance.now() - this.startTime) / 1000);

    // Kawa / Turbo timer
    if (this.player.coffeeTimer > 0) {
      this.player.coffeeTimer -= dt;
      this.player.stamina = Math.min(this.player.maxStamina, this.player.stamina + 25 * dt);
    }

    // Sprint & Stamina
    const wantsSprint = this.keys.sprint && this.player.stamina > 0;
    if (wantsSprint && (this.keys.up || this.keys.down || this.keys.left || this.keys.right)) {
      this.player.isSprinting = true;
      this.player.speed = this.player.sprintSpeed;
      this.player.stamina = Math.max(0, this.player.stamina - 30 * dt);
    } else {
      this.player.isSprinting = false;
      this.player.speed = this.player.baseSpeed;
      // Regeneracja staminy (na Patio szybciej!)
      const onPatio =
        this.player.x >= this.patioZone.x &&
        this.player.x <= this.patioZone.x + this.patioZone.w &&
        this.player.y >= this.patioZone.y &&
        this.player.y <= this.patioZone.y + this.patioZone.h;
      const regenRate = onPatio ? 25 : 14;
      this.player.stamina = Math.min(this.player.maxStamina, this.player.stamina + regenRate * dt);
    }

    // Ruch gracza z wektorem
    let dx = 0;
    let dy = 0;
    if (this.keys.up) dy -= 1;
    if (this.keys.down) dy += 1;
    if (this.keys.left) {
      dx -= 1;
      this.player.facing = 'left';
    }
    if (this.keys.right) {
      dx += 1;
      this.player.facing = 'right';
    }

    if (dx !== 0 && dy !== 0) {
      const invLen = 1 / Math.sqrt(2);
      dx *= invLen;
      dy *= invLen;
    }

    const nextX = this.player.x + dx * this.player.speed * (dt * 60);
    const nextY = this.player.y + dy * this.player.speed * (dt * 60);

    if (!this.checkCollision(nextX, this.player.y, this.player.size)) {
      this.player.x = nextX;
    }
    if (!this.checkCollision(this.player.x, nextY, this.player.size)) {
      this.player.y = nextY;
    }

    // Ruch Profesora (śledzenie gracza z dynamiką)
    const pDx = this.player.x - this.professor.x;
    const pDy = this.player.y - this.professor.y;
    const distToPlayer = Math.hypot(pDx, pDy);

    // Stopniowe zwiększanie prędkości profesora wraz z zebranymi ECTS
    const profSpeedBonus = (this.ects / TARGET_ECTS) * 0.9;
    const currentProfSpeed = (this.professor.speed + profSpeedBonus) * (dt * 60);

    if (distToPlayer > 5) {
      const stepX = (pDx / distToPlayer) * currentProfSpeed;
      const stepY = (pDy / distToPlayer) * currentProfSpeed;

      // Proste omijanie ścian
      if (!this.checkCollision(this.professor.x + stepX, this.professor.y, this.professor.size)) {
        this.professor.x += stepX;
      }
      if (!this.checkCollision(this.professor.x, this.professor.y + stepY, this.professor.size)) {
        this.professor.y += stepY;
      }
    }

    // Profesor rzuca cytat gdy się zbliży
    this.professor.speechCooldown -= dt;
    if (distToPlayer < this.professor.alertRange && this.professor.speechCooldown <= 0) {
      const quote = PROFESSOR_QUOTES[Math.floor(Math.random() * PROFESSOR_QUOTES.length)];
      this.showProfessorSpeech(quote, 3000);
      this.professor.speechCooldown = 9.0;
    }

    // Sprawdzenie kolizji ze studentem (Porażka)
    if (distToPlayer < (this.player.size + this.professor.size) / 2) {
      this.handleGameOver();
      return;
    }

    // Zbieranie ECTS
    for (let i = this.ectsItems.length - 1; i >= 0; i--) {
      const item = this.ectsItems[i];
      if (Math.hypot(this.player.x - item.x, this.player.y - item.y) < this.player.size / 2 + item.size / 2) {
        this.ectsItems.splice(i, 1);
        this.ects += 1;
        SoundSystem.play('ects');

        // Respawn nowego ECTS
        this.spawnEcts();

        if (this.ects >= TARGET_ECTS) {
          this.handleVictory();
          return;
        }
      }
    }

    // Zbieranie Kawy z Patio
    for (let i = this.coffeeItems.length - 1; i >= 0; i--) {
      const coffee = this.coffeeItems[i];
      if (Math.hypot(this.player.x - coffee.x, this.player.y - coffee.y) < this.player.size / 2 + coffee.size / 2) {
        this.coffeeItems.splice(i, 1);
        this.player.stamina = this.player.maxStamina;
        this.player.coffeeTimer = 4.5; // 4.5s turbo regeneracji
        SoundSystem.play('coffee');
        setTimeout(() => this.spawnCoffee(), 6000);
      }
    }

    this.updateHUD();
  }

  checkCollision(x, y, size) {
    const half = size / 2;
    for (const obs of this.obstacles) {
      if (
        x + half > obs.x &&
        x - half < obs.x + obs.w &&
        y + half > obs.y &&
        y - half < obs.y + obs.h
      ) {
        return true;
      }
    }
    return false;
  }

  formatTime(totalSec) {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  handleGameOver() {
    this.state = 'GAMEOVER';
    SoundSystem.play('hit');
    this.statsEctsLostEl.textContent = `${this.ects} / ${TARGET_ECTS}`;
    this.statsTimeSurvivedEl.textContent = this.formatTime(this.elapsedSeconds);
    this.modalGameOver.classList.remove('modal-hidden');
    this.modalGameOver.classList.add('modal-active');
  }

  handleVictory() {
    this.state = 'VICTORY';
    SoundSystem.play('win');
    this.statsVictoryTimeEl.textContent = this.formatTime(this.elapsedSeconds);
    this.modalVictory.classList.remove('modal-hidden');
    this.modalVictory.classList.add('modal-active');
  }

  render() {
    const { ctx } = this;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 1. Podłoże kampusu (Korytarze i posadzka)
    ctx.fillStyle = '#0b1928';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Kafelki korytarza
    ctx.strokeStyle = '#12263d';
    ctx.lineWidth = 1;
    const tileSize = 40;
    for (let x = 0; x < CANVAS_WIDTH; x += tileSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += tileSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }

    // 2. Zielone Patio ALK (Środek mapy)
    const { patioZone } = this;
    ctx.fillStyle = 'rgba(21, 128, 61, 0.28)';
    ctx.fillRect(patioZone.x, patioZone.y, patioZone.w, patioZone.h);
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.strokeRect(patioZone.x, patioZone.y, patioZone.w, patioZone.h);

    // Napis na Patio
    ctx.fillStyle = 'rgba(34, 197, 94, 0.6)';
    ctx.font = 'bold 12px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ZIELONE PATIO ALK', patioZone.x + patioZone.w / 2, patioZone.y + 24);

    // 3. Ściany i przeszkody kampusu
    ctx.fillStyle = '#1e3a5f';
    for (const obs of this.obstacles) {
      ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
    }

    // 4. Punkty ECTS (Złote zwoje z literami ECTS)
    const nowSec = performance.now() / 1000;
    for (const item of this.ectsItems) {
      const bobY = Math.sin(nowSec * 4 + item.bob) * 3;
      ctx.save();
      ctx.translate(item.x, item.y + bobY);

      // Złota poświata
      ctx.shadowColor = '#e5a823';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#e5a823';
      ctx.beginPath();
      ctx.arc(0, 0, item.size / 2, 0, Math.PI * 2);
      ctx.fill();

      // Ikona ECTS
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#001428';
      ctx.font = 'bold 8px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ECTS', 0, 0);

      ctx.restore();
    }

    // 5. Kawa z Patio
    for (const coffee of this.coffeeItems) {
      const bobY = Math.sin(nowSec * 3 + coffee.bob) * 2;
      ctx.save();
      ctx.translate(coffee.x, coffee.y + bobY);
      ctx.font = '16px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('☕', 0, 0);
      ctx.restore();
    }

    // 6. Rysowanie Studenta (Gracz)
    ctx.save();
    ctx.translate(this.player.x, this.player.y);

    // Poświata sprintu / kawy
    if (this.player.coffeeTimer > 0) {
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 16;
    } else if (this.player.isSprinting) {
      ctx.shadowColor = '#0284c7';
      ctx.shadowBlur = 8;
    }

    // Ciało studenta (kolor granatowy z akcentem)
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(0, 0, this.player.size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Czapka studencka / biret symbol
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎓', 0, -1);

    ctx.restore();

    // 7. Rysowanie Egzaminatora (Profesor)
    ctx.save();
    ctx.translate(this.professor.x, this.professor.y);

    // Czerwony okrąg ostrzegawczy / zasięg
    ctx.strokeStyle = 'rgba(225, 29, 72, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, this.professor.alertRange, 0, Math.PI * 2);
    ctx.stroke();

    // Profesor
    ctx.shadowColor = '#e11d48';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#e11d48';
    ctx.beginPath();
    ctx.arc(0, 0, this.professor.size / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('👨‍🏫', 0, 0);

    ctx.restore();
  }

  gameLoop(currentTime) {
    const dt = Math.min((currentTime - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = currentTime;

    this.update(dt);
    this.render();

    requestAnimationFrame((t) => this.gameLoop(t));
  }
}

// Uruchomienie gry po załadowaniu DOM
window.addEventListener('DOMContentLoaded', () => {
  window.kozminskiGame = new Game();
});
