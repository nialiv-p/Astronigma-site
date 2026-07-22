document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    const t = (key, replacements = {}) => {
        const value = window.localizationManager?.translate(key) || key;
        return Object.entries(replacements).reduce((copy, [name, replacement]) => copy.replace(`{${name}}`, replacement), value);
    };

    const header = document.querySelector('.main-header');
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    const closeMenu = () => {
        menuToggle?.setAttribute('aria-expanded', 'false');
        menuToggle?.setAttribute('aria-label', t('menu_open'));
        navLinks?.classList.remove('active');
        document.body.classList.remove('noscroll');
    };
    window.addEventListener('scroll', () => header?.classList.toggle('scrolled', window.scrollY > 28), { passive: true });
    menuToggle?.addEventListener('click', () => {
        const expanded = menuToggle.getAttribute('aria-expanded') !== 'true';
        menuToggle.setAttribute('aria-expanded', String(expanded));
        menuToggle.setAttribute('aria-label', t(expanded ? 'menu_close' : 'menu_open'));
        navLinks?.classList.toggle('active', expanded);
        document.body.classList.toggle('noscroll', expanded);
    });
    navLinks?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && menuToggle?.getAttribute('aria-expanded') === 'true') {
            closeMenu();
            menuToggle.focus();
        }
    });

    class Starfield {
        constructor(canvas) {
            this.canvas = canvas;
            this.context = canvas?.getContext('2d');
            this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            this.running = false;
            this.startedAt = performance.now();
            if (!this.context || this.reducedMotion) return;
            this.resize = this.resize.bind(this);
            this.frame = this.frame.bind(this);
            window.addEventListener('resize', this.resize, { passive: true });
            document.addEventListener('visibilitychange', () => document.hidden ? this.stop() : this.start());
            this.resize();
            this.start();
        }
        resize() {
            const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.canvas.width = Math.floor(this.width * dpr);
            this.canvas.height = Math.floor(this.height * dpr);
            this.canvas.style.width = `${this.width}px`;
            this.canvas.style.height = `${this.height}px`;
            this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        hash(x, y) { const value = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return Math.abs(value - Math.floor(value)); }
        start() { if (this.running || document.hidden) return; this.running = true; this.animationFrame = requestAnimationFrame(this.frame); }
        stop() { this.running = false; cancelAnimationFrame(this.animationFrame); }
        frame(now) {
            if (!this.running) return;
            const context = this.context;
            const time = (now - this.startedAt) / 1000;
            context.clearRect(0, 0, this.width, this.height);
            context.fillStyle = '#79e9ef';
            const columns = Math.max(10, Math.ceil(this.width / 90));
            const rows = Math.max(8, Math.ceil(this.height / 90));
            const cellWidth = this.width / columns;
            const cellHeight = this.height / rows;
            for (let column = -1; column <= columns; column += 1) {
                for (let row = -1; row <= rows; row += 1) {
                    const x = column * cellWidth + this.hash(column, row) * cellWidth;
                    const y = (row * cellHeight + this.hash(row, column + 31) * cellHeight + time * 3) % (this.height + cellHeight) - cellHeight;
                    context.globalAlpha = .28 + .48 * (.5 + .5 * Math.sin(time + this.hash(column + 9, row) * 8));
                    context.beginPath();
                    context.arc(x, y, .55 + this.hash(row, column) * .8, 0, Math.PI * 2);
                    context.fill();
                }
            }
            context.globalAlpha = 1;
            this.animationFrame = requestAnimationFrame(this.frame);
        }
    }
    new Starfield(document.getElementById('starfield'));

    class AudioManager {
        constructor() {
            this.enabled = localStorage.getItem('astronigma_sound_enabled') === 'true';
            this.sounds = null;
            this.toggle = document.getElementById('sound-toggle');
            this.render();
            this.toggle?.addEventListener('click', () => {
                this.enabled = !this.enabled;
                localStorage.setItem('astronigma_sound_enabled', String(this.enabled));
                if (this.enabled) { this.ensureSounds(); this.play('click'); }
                this.render();
            });
        }
        ensureSounds() {
            if (this.sounds) return;
            this.sounds = Object.fromEntries(['tap', 'click', 'win', 'reveal'].map(name => [name, new Audio(`assets/audio/${name}.wav`)]));
            Object.values(this.sounds).forEach(sound => { sound.preload = 'none'; sound.volume = .38; });
        }
        play(name) {
            if (!this.enabled) return;
            this.ensureSounds();
            const sound = this.sounds[name]?.cloneNode();
            if (!sound) return;
            sound.volume = name === 'tap' ? .55 : .38;
            sound.play().catch(() => {});
        }
        render() {
            if (!this.toggle) return;
            this.toggle.setAttribute('aria-pressed', String(this.enabled));
            this.toggle.setAttribute('aria-label', t(this.enabled ? 'sound_off' : 'sound_on'));
        }
    }
    const audio = new AudioManager();

    class Demo {
        constructor() {
            this.api = window.AstronigmaLightsOut;
            this.grid = document.getElementById('lights-out-grid');
            this.playPanel = document.getElementById('demo-play');
            this.revealPanel = document.getElementById('demo-reveal');
            this.movesLabel = document.getElementById('demo-moves');
            this.round = 0;
            this.startedAt = null;
            if (!this.api || !this.grid) return;
            this.cells = Array.from({ length: this.api.CELL_COUNT }, (_, index) => this.createCell(index));
            this.game = this.api.createGame(this.round);
            this.render();
            document.getElementById('demo-reset')?.addEventListener('click', () => this.reset());
            document.getElementById('demo-new-game')?.addEventListener('click', () => this.newGame());
            document.addEventListener('keydown', event => {
                if (event.key === 'Escape' && !this.revealPanel.hidden && this.revealPanel.contains(document.activeElement)) {
                    this.newGame();
                }
            });
        }
        createCell(index) {
            const cell = document.createElement('button');
            cell.type = 'button';
            cell.className = 'grid-cell';
            cell.addEventListener('click', () => this.move(index));
            cell.addEventListener('pointerenter', () => this.preview(index, true));
            cell.addEventListener('pointerleave', () => this.preview(index, false));
            cell.addEventListener('focus', () => this.preview(index, true));
            cell.addEventListener('blur', () => this.preview(index, false));
            this.grid.appendChild(cell);
            return cell;
        }
        preview(index, visible) { this.api.affectedIndices(index).forEach(cellIndex => this.cells[cellIndex].classList.toggle('preview', visible)); }
        move(index) {
            if (this.game.complete) return;
            if (this.startedAt === null) {
                this.startedAt = performance.now();
                window.astronigmaAnalytics?.track('demo_start');
            }
            this.game = this.api.playMove(this.game, index);
            audio.play('tap');
            this.render();
            if (this.game.complete) this.complete();
        }
        reset() {
            this.game = this.api.resetGame(this.game);
            this.startedAt = null;
            this.render();
            this.cells[0]?.focus();
            audio.play('click');
        }
        newGame() {
            this.round += 1;
            this.game = this.api.createGame(this.round);
            this.startedAt = null;
            this.playPanel.hidden = false;
            this.revealPanel.hidden = true;
            this.render();
            this.cells[0]?.focus();
            audio.play('reveal');
        }
        complete() {
            window.astronigmaAnalytics?.track('demo_complete', {
                moves_count: this.game.moves,
                duration_ms: Math.max(0, Math.round(performance.now() - this.startedAt))
            });
            audio.play('win');
            window.setTimeout(() => {
                this.playPanel.hidden = true;
                this.revealPanel.hidden = false;
                this.revealPanel.focus({ preventScroll: true });
                audio.play('reveal');
            }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 280);
        }
        render() {
            this.cells.forEach((cell, index) => {
                const on = this.game.board[index];
                const row = Math.floor(index / this.api.SIZE) + 1;
                const column = index % this.api.SIZE + 1;
                cell.setAttribute('aria-pressed', String(on));
                cell.setAttribute('aria-label', t('demo_cell_label', { row, column, state: t(on ? 'demo_state_on' : 'demo_state_off') }));
            });
            this.movesLabel.textContent = t(this.game.moves === 1 ? 'demo_move_one' : 'demo_moves', { count: this.game.moves });
        }
    }
    const demo = new Demo();

    class Lightbox {
        constructor() {
            this.element = document.getElementById('lightbox');
            this.image = document.getElementById('lightbox-img');
            this.caption = document.getElementById('lightbox-caption');
            this.closeButton = document.getElementById('lightbox-close');
            this.trigger = null;
            this.close = this.close.bind(this);
            this.closeButton?.addEventListener('click', this.close);
            this.element?.addEventListener('click', event => { if (event.target === this.element) this.close(); });
            document.addEventListener('keydown', event => {
                if (event.key === 'Escape' && !this.element.hidden) this.close();
                if (event.key === 'Tab' && !this.element.hidden) event.preventDefault(), this.closeButton.focus();
            });
        }
        open(src, caption, trigger) {
            this.trigger = trigger;
            this.image.src = src;
            this.image.alt = caption;
            this.caption.textContent = caption;
            this.element.hidden = false;
            document.body.classList.add('dialog-open');
            this.closeButton.focus();
        }
        close() {
            if (this.element.hidden) return;
            this.element.hidden = true;
            this.image.removeAttribute('src');
            document.body.classList.remove('dialog-open');
            this.trigger?.focus();
        }
    }
    const lightbox = new Lightbox();
    window.openLightbox = (src, caption, trigger) => lightbox.open(src, caption, trigger);

    window.addEventListener('astronigma:languagechange', () => {
        closeMenu();
        audio.render();
        demo.render();
    });
});
