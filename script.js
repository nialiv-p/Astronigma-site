document.addEventListener('DOMContentLoaded', () => {

    // Header Scroll Effect
    const header = document.querySelector('.main-header');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // Smooth Scroll for Anchors
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // Intersection Observer for Reveal on Scroll
    const observerOptions = {
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Add reveal class to elements you want to animate
    const animatedElements = document.querySelectorAll('.about-text, .visual-card, .section-header');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        observer.observe(el);
    });

    // Handle Reveal Logic
    setInterval(() => {
        document.querySelectorAll('.visible').forEach(el => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        });
    }, 100);

    /* =========================================
       IDENTITY POLISH FEATURES
       ========================================= */

    // 1. Parallax Starfield
    const canvas = document.getElementById('starfield');
    const ctx = canvas.getContext('2d');
    let width, height;
    let stars = [];

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        initStars();
    }

    function initStars() {
        stars = [];
        const numStars = Math.floor((width * height) / 4000); // Density
        for (let i = 0; i < numStars; i++) {
            stars.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 2,
                opacity: Math.random(),
                speed: Math.random() * 0.2 + 0.05
            });
        }
    }

    function animateStars() {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#fff';

        stars.forEach(star => {
            ctx.globalAlpha = star.opacity;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();

            // Move star slightly to left (drifting)
            star.x -= star.speed;

            // Wrap around
            if (star.x < 0) {
                star.x = width;
                star.y = Math.random() * height;
            }
        });

        requestAnimationFrame(animateStars);
    }

    window.addEventListener('resize', resize);
    resize();
    animateStars();

    /* =========================================
       AUDIO INTEGRATION
       ========================================= */

    class AudioManager {
        constructor() {
            this.muted = localStorage.getItem('astronigma_muted') === 'true';
            this.sounds = {
                tap: new Audio('assets/audio/tap.wav'),
                click: new Audio('assets/audio/click.wav'),
                win: new Audio('assets/audio/win.wav'),
                reveal: new Audio('assets/audio/reveal.wav')
            };

            // Preload and volume
            Object.values(this.sounds).forEach(s => {
                s.volume = 0.4;
                s.load();
            });
            this.sounds.tap.volume = 0.6; // Slightly louder tap

            this.initUI();

            // Play reveal sound on load if allowed (usually blocked by browser, but we try)
            if (!this.muted) {
                // Browsers block autoplay, so this might not work without interaction first
                // We'll leave it for the first interaction instead or just skip
            }
        }

        initUI() {
            const toggleBtn = document.getElementById('sound-toggle');
            if (!toggleBtn) return;

            this.udpateIcon();

            toggleBtn.addEventListener('click', () => {
                this.muted = !this.muted;
                localStorage.setItem('astronigma_muted', this.muted);
                this.udpateIcon();

                if (!this.muted) {
                    this.play('click');
                }
            });

            // UI Button Clicks
            document.querySelectorAll('a, button').forEach(el => {
                el.addEventListener('mouseenter', () => {
                    // Subtle hover click or maybe nothing to avoid annoyance
                });

                el.addEventListener('click', () => {
                    if (el.id !== 'sound-toggle') this.play('click');
                });
            });
        }

        udpateIcon() {
            const onIcon = document.querySelector('.icon-sound-on');
            const offIcon = document.querySelector('.icon-sound-off');

            if (this.muted) {
                onIcon.classList.add('hidden');
                offIcon.classList.remove('hidden');
            } else {
                onIcon.classList.remove('hidden');
                offIcon.classList.add('hidden');
            }
        }

        play(soundName) {
            if (this.muted || !this.sounds[soundName]) return;

            // Clone/Reset to allow rapid overlapping playback (especially for grid)
            const sound = this.sounds[soundName].cloneNode();
            sound.volume = this.sounds[soundName].volume;
            sound.play().catch(e => console.log('Audio playback prevented:', e));
        }
    }

    // Initialize Audio
    const audio = new AudioManager();

    // 2. Hero Interactive Grid (Lights Out)
    const gridContainer = document.getElementById('lights-out-grid');
    const gridSize = 5;

    // Create Grid
    if (gridContainer) {
        for (let i = 0; i < gridSize * gridSize; i++) {
            const cell = document.createElement('div');
            cell.classList.add('grid-cell');
            cell.dataset.index = i;
            cell.addEventListener('click', () => {
                toggleLights(i);
                audio.play('tap'); // Play sound
            });
            gridContainer.appendChild(cell);
        }

        // Randomly activate some cells to start
        randomizeGrid();
    }

    function toggleLights(index) {
        const row = Math.floor(index / gridSize);
        const col = index % gridSize;

        // Toggle clicked and neighbors (Up, Down, Left, Right)
        toggleCell(row, col);
        toggleCell(row - 1, col);
        toggleCell(row + 1, col);
        toggleCell(row, col - 1);
        toggleCell(row, col + 1);

        checkWin();
    }

    function toggleCell(r, c) {
        if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
            const index = r * gridSize + c;
            const cells = document.querySelectorAll('.grid-cell');
            cells[index].classList.toggle('active');
        }
    }

    function randomizeGrid() {
        // Simulate clicks to ensure solvable state
        for (let i = 0; i < 10; i++) {
            const randomIdx = Math.floor(Math.random() * (gridSize * gridSize));
            // Don't play sound during randomization

            const r = Math.floor(randomIdx / gridSize);
            const c = randomIdx % gridSize;
            toggleCell(r, c);
            toggleCell(r - 1, c);
            toggleCell(r + 1, c);
            toggleCell(r, c - 1);
            toggleCell(r, c + 1);
        }
    }

    function checkWin() {
        const cells = document.querySelectorAll('.grid-cell');
        const activeCount = Array.from(cells).filter(c => c.classList.contains('active')).length;

        if (activeCount === 0) {
            // Win animation
            gridContainer.style.boxShadow = '0 0 50px var(--primary-color)';
            audio.play('win'); // Play win sound

            setTimeout(() => {
                gridContainer.style.boxShadow = 'none';
                randomizeGrid(); // Restart
                audio.play('reveal'); // Play restart sound
            }, 1500);
        }
    }
});
