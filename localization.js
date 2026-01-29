const translations = {
    "en": {
        "nav_about": "How to Play",
        "nav_download": "Download",
        "hero_subtitle": "Solve Puzzles.<br>Adjust the Telescope.<br>Reveal the Constellations.",
        "store_apple_small": "Download on the",
        "store_apple_large": "App Store",
        "store_google_small": "GET IT ON",
        "store_google_large": "Google Play",
        "grid_hint": "TAP TO ALIGN THE STARS",
        "how_to_play_title": "How to Play",
        "story_title": "The Story",
        "story_text": "You found an ancient telescope that can reveal forgotten constellations. To look through it, you must adjust the lenses using Light Shards—collected by solving logic puzzles.",
        "rules_title": "The Rules",
        "rule_1": "The game is played on a 5x5 grid of lights.",
        "rule_2": "Tapping a light toggles it and its neighbors (creating a cross shape).",
        "rule_3": "Turn off all the lights to clear the board and collect Light Shards.",
        "gallery_title": "Gallery",
        "cta_title": "Ready to Play?",
        "cta_subtitle": "Available now on iOS and Android.",
        "cta_button": "Download Now",
        "footer_press": "Press Kit",
        "footer_privacy": "Privacy Policy",
        "footer_support": "Support",
        "footer_rights": "© 2026 Nikita Ivanov. All rights reserved."
    },
    "ru": {
        "nav_about": "Как играть",
        "nav_download": "Скачать",
        "hero_subtitle": "Решайте головоломки.<br>Настраивайте телескоп.<br>Открывайте созвездия.",
        "store_apple_small": "Загрузите в",
        "store_apple_large": "App Store",
        "store_google_small": "ДОСТУПНО В",
        "store_google_large": "Google Play",
        "grid_hint": "НАЖМИТЕ, ЧТОБЫ ВЫРОВНЯТЬ ЗВЕЗДЫ",
        "how_to_play_title": "Как играть",
        "story_title": "История",
        "story_text": "Вы нашли древний телескоп, позволяющий увидеть забытые созвездия. Чтобы использовать его, нужно настраивать линзы с помощью Осколков Света, которые вы получаете за решение головоломок.",
        "rules_title": "Правила",
        "rule_1": "Игра проходит на сетке огней 5x5.",
        "rule_2": "Нажатие на огонек переключает его и соседние (крестом).",
        "rule_3": "Погасите все огни, чтобы очистить доску и собрать Осколки Света.",
        "gallery_title": "Галерея",
        "cta_title": "Готовы играть?",
        "cta_subtitle": "Доступно на iOS и Android.",
        "cta_button": "Скачать Сейчас",
        "footer_press": "Пресс-кит",
        "footer_privacy": "Политика конфиденциальности",
        "footer_support": "Поддержка",
        "footer_rights": "© 2026 Никита Иванов. Все права защищены."
    }
};

class LocalizationManager {
    constructor() {
        this.supportedLangs = ['en', 'ru'];
        this.currentLang = this.determineLanguage();
        this.init();
    }

    determineLanguage() {
        // 1. Check URL parameter (highest priority)
        const urlParams = new URLSearchParams(window.location.search);
        const urlLang = urlParams.get('lang');
        if (urlLang && this.supportedLangs.includes(urlLang)) {
            localStorage.setItem('astronigma_lang', urlLang);
            return urlLang;
        }

        // 2. Check saved preference
        const savedLang = localStorage.getItem('astronigma_lang');
        if (savedLang && this.supportedLangs.includes(savedLang)) {
            return savedLang;
        }

        // 3. Check browser system language
        const systemLang = navigator.language || navigator.userLanguage;
        if (systemLang && (systemLang.startsWith('ru') || systemLang === 'ru-RU')) {
            return 'ru';
        }

        // 4. Default
        return 'en';
    }

    init() {
        this.updateContent();
        this.createLanguageSwitcher();
    }

    toggleLanguage() {
        this.currentLang = this.currentLang === 'en' ? 'ru' : 'en';
        localStorage.setItem('astronigma_lang', this.currentLang);
        this.updateContent();
        this.updateSwitcherState();
    }

    updateContent() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const str = translations[this.currentLang][key];
            if (str) {
                // If the string contains HTML tags, use innerHTML, otherwise textContent
                if (str.includes('<')) {
                    el.innerHTML = str;
                } else {
                    el.textContent = str;
                }
            }
        });

        // Update HTML lang attribute
        document.documentElement.lang = this.currentLang;
    }

    createLanguageSwitcher() {
        // Find the place to insert the switcher (e.g., inside nav)
        const navLinks = document.querySelector('.nav-links');
        if (!navLinks) return;

        // Check if already exists
        if (document.getElementById('lang-toggle')) return;

        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.id = 'lang-toggle';
        btn.className = 'lang-toggle';
        btn.onclick = () => this.toggleLanguage();

        li.appendChild(btn);
        // Insert before the download button (last item)
        navLinks.insertBefore(li, navLinks.lastElementChild);

        this.updateSwitcherState();
    }

    updateSwitcherState() {
        const btn = document.getElementById('lang-toggle');
        if (btn) {
            // Show the OTHER language as the option to switch to
            btn.textContent = this.currentLang === 'en' ? 'RU' : 'EN';
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.localization = new LocalizationManager();
});
