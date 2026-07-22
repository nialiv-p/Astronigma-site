(() => {
    'use strict';

    // Public client-side identifier. Keep empty until a GA4 Web Data Stream is created.
    const DEFAULT_GA4_MEASUREMENT_ID = '';
    const GA4_MEASUREMENT_ID = window.ASTRONIGMA_GA4_MEASUREMENT_ID || DEFAULT_GA4_MEASUREMENT_ID;
    const CONSENT_KEY = 'astronigma_analytics_consent_v1';
    const ACCEPTED = 'accepted';
    const REJECTED = 'rejected';

    const consentTranslations = {
        en: {
            title: 'Help improve Astronigma',
            description: 'With your permission, we use Google Analytics to understand visits and interactions on this website. Analytics stays off until you accept.',
            accept: 'Accept', reject: 'Reject', settings: 'Analytics settings'
        },
        ru: {
            title: 'Помогите улучшить Astronigma',
            description: 'С вашего разрешения мы используем Google Analytics, чтобы понимать посещения и действия на этом сайте. Аналитика отключена, пока вы не согласитесь.',
            accept: 'Принять', reject: 'Отклонить', settings: 'Настройки аналитики'
        },
        sr: {
            title: 'Pomozite da poboljšamo Astronigma',
            description: 'Uz vašu dozvolu koristimo Google Analytics da razumemo posete i radnje na ovom sajtu. Analitika je isključena dok ne prihvatite.',
            accept: 'Prihvati', reject: 'Odbij', settings: 'Podešavanja analitike'
        },
        es: {
            title: 'Ayúdanos a mejorar Astronigma',
            description: 'Con tu permiso usamos Google Analytics para entender las visitas y las interacciones en este sitio. Las analíticas permanecen desactivadas hasta que aceptes.',
            accept: 'Aceptar', reject: 'Rechazar', settings: 'Ajustes de analíticas'
        },
        pt: {
            title: 'Ajude a melhorar o Astronigma',
            description: 'Com sua permissão, usamos o Google Analytics para entender visitas e interações neste site. A análise permanece desativada até você aceitar.',
            accept: 'Aceitar', reject: 'Recusar', settings: 'Configurações de análise'
        },
        de: {
            title: 'Hilf uns, Astronigma zu verbessern',
            description: 'Mit deiner Erlaubnis nutzen wir Google Analytics, um Besuche und Interaktionen auf dieser Website zu verstehen. Die Analyse bleibt bis zu deiner Zustimmung deaktiviert.',
            accept: 'Akzeptieren', reject: 'Ablehnen', settings: 'Analyse-Einstellungen'
        },
        fr: {
            title: 'Aidez-nous à améliorer Astronigma',
            description: 'Avec votre autorisation, nous utilisons Google Analytics pour comprendre les visites et interactions sur ce site. Les analyses restent désactivées jusqu’à votre accord.',
            accept: 'Accepter', reject: 'Refuser', settings: 'Paramètres d’analyse'
        },
        ja: {
            title: 'Astronigma の改善にご協力ください',
            description: '許可いただいた場合のみ、Google Analytics を使用してこのサイトの訪問や操作を把握します。同意するまで分析は無効です。',
            accept: '同意する', reject: '拒否する', settings: '分析設定'
        },
        ko: {
            title: 'Astronigma 개선에 참여해 주세요',
            description: '허용하신 경우에만 Google Analytics를 사용해 이 사이트의 방문과 상호작용을 파악합니다. 동의하기 전에는 분석이 꺼져 있습니다.',
            accept: '동의', reject: '거부', settings: '분석 설정'
        },
        tr: {
            title: 'Astronigma’yı geliştirmemize yardımcı olun',
            description: 'İzninizle bu sitedeki ziyaretleri ve etkileşimleri anlamak için Google Analytics kullanırız. Siz kabul edene kadar analiz kapalı kalır.',
            accept: 'Kabul et', reject: 'Reddet', settings: 'Analiz ayarları'
        },
        th: {
            title: 'ช่วยเราพัฒนา Astronigma',
            description: 'เมื่อคุณอนุญาต เราจะใช้ Google Analytics เพื่อทำความเข้าใจการเข้าชมและการใช้งานเว็บไซต์นี้ ระบบวิเคราะห์จะปิดอยู่จนกว่าคุณจะยอมรับ',
            accept: 'ยอมรับ', reject: 'ปฏิเสธ', settings: 'การตั้งค่าการวิเคราะห์'
        },
        id: {
            title: 'Bantu kami meningkatkan Astronigma',
            description: 'Dengan izin Anda, kami menggunakan Google Analytics untuk memahami kunjungan dan interaksi di situs ini. Analitik tetap nonaktif sampai Anda menyetujuinya.',
            accept: 'Setujui', reject: 'Tolak', settings: 'Pengaturan analitik'
        },
        zh: {
            title: '帮助我们改进 Astronigma',
            description: '经您允许后，我们会使用 Google Analytics 了解此网站的访问和互动情况。在您同意之前，分析功能保持关闭。',
            accept: '接受', reject: '拒绝', settings: '分析设置'
        }
    };

    class AstronigmaAnalytics {
        constructor() {
            this.measurementId = GA4_MEASUREMENT_ID.trim();
            this.enabled = false;
            this.pageViewTracked = false;
            this.scriptElement = null;
            this.dialog = document.getElementById('analytics-consent');
            this.title = document.getElementById('analytics-consent-title');
            this.description = document.getElementById('analytics-consent-description');
            this.acceptButton = document.getElementById('analytics-consent-accept');
            this.rejectButton = document.getElementById('analytics-consent-reject');
            this.settingsButton = document.getElementById('analytics-settings');

            this.bindUi();
            this.bindStoreLinks();
            this.renderConsentCopy(this.currentLanguage());

            const consent = this.readConsent();
            if (consent === ACCEPTED) {
                this.enable();
            } else if (consent !== REJECTED) {
                this.openSettings();
            }
        }

        currentLanguage() {
            return window.localizationManager?.currentLang || document.documentElement.lang || 'en';
        }

        readConsent() {
            try {
                return localStorage.getItem(CONSENT_KEY);
            } catch (_error) {
                return null;
            }
        }

        writeConsent(value) {
            try {
                localStorage.setItem(CONSENT_KEY, value);
            } catch (_error) {
                // Consent remains valid for the current page even if storage is unavailable.
            }
        }

        bindUi() {
            this.acceptButton?.addEventListener('click', () => {
                this.writeConsent(ACCEPTED);
                this.closeSettings();
                this.enable();
            });

            this.rejectButton?.addEventListener('click', () => {
                this.writeConsent(REJECTED);
                this.disable();
                this.closeSettings();
            });

            this.settingsButton?.addEventListener('click', () => this.openSettings());

            window.addEventListener('astronigma:languagechange', event => {
                const { previousLanguage, language } = event.detail;
                this.renderConsentCopy(language);
                this.track('language_change', {
                    from_language: previousLanguage,
                    to_language: language
                });
            });
        }

        bindStoreLinks() {
            document.querySelectorAll('a[data-store]').forEach(link => {
                link.addEventListener('click', () => {
                    this.track('store_click', {
                        store: link.dataset.store,
                        placement: link.dataset.placement
                    });
                });
            });
        }

        renderConsentCopy(language) {
            const copy = consentTranslations[language] || consentTranslations.en;
            if (this.title) this.title.textContent = copy.title;
            if (this.description) this.description.textContent = copy.description;
            if (this.acceptButton) this.acceptButton.textContent = copy.accept;
            if (this.rejectButton) this.rejectButton.textContent = copy.reject;
            if (this.settingsButton) this.settingsButton.textContent = copy.settings;
        }

        openSettings() {
            if (!this.dialog) return;
            this.dialog.hidden = false;
            this.dialog.classList.add('is-visible');
            this.acceptButton?.focus({ preventScroll: true });
        }

        closeSettings() {
            if (!this.dialog) return;
            this.dialog.classList.remove('is-visible');
            this.dialog.hidden = true;
        }

        hasValidMeasurementId() {
            return /^G-[A-Z0-9]+$/i.test(this.measurementId) && this.measurementId !== 'G-XXXXXXXXXX';
        }

        enable() {
            if (this.enabled) return;

            if (!this.hasValidMeasurementId()) {
                console.info('Astronigma analytics is ready but disabled until a GA4 Measurement ID is configured.');
                return;
            }

            window[`ga-disable-${this.measurementId}`] = false;
            window.dataLayer = window.dataLayer || [];
            window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
            window.gtag('js', new Date());
            window.gtag('config', this.measurementId, {
                send_page_view: false,
                allow_google_signals: false,
                allow_ad_personalization_signals: false
            });

            if (!document.querySelector('script[data-astronigma-ga4]')) {
                this.scriptElement = document.createElement('script');
                this.scriptElement.async = true;
                this.scriptElement.dataset.astronigmaGa4 = 'true';
                this.scriptElement.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(this.measurementId)}`;
                this.scriptElement.onerror = () => {
                    console.info('Google Analytics could not be loaded. The website will continue without analytics.');
                };
                document.head.appendChild(this.scriptElement);
            }

            this.enabled = true;
            if (!this.pageViewTracked) {
                this.pageViewTracked = true;
                this.track('page_view', {
                    page_location: window.location.href,
                    page_title: document.title
                });
            }
        }

        disable() {
            this.enabled = false;
            if (this.hasValidMeasurementId()) {
                window[`ga-disable-${this.measurementId}`] = true;
            }
            document.querySelectorAll('script[data-astronigma-ga4]').forEach(script => script.remove());
            this.scriptElement = null;
            this.deleteAnalyticsCookies();
        }

        deleteAnalyticsCookies() {
            const hostParts = window.location.hostname.split('.');
            const domains = ['', window.location.hostname, `.${window.location.hostname}`];
            if (hostParts.length > 1) domains.push(`.${hostParts.slice(-2).join('.')}`);

            document.cookie.split(';').forEach(cookie => {
                const name = cookie.split('=')[0].trim();
                if (name !== '_ga' && !name.startsWith('_ga_')) return;
                domains.forEach(domain => {
                    const domainPart = domain ? `; domain=${domain}` : '';
                    document.cookie = `${name}=; Max-Age=0; path=/${domainPart}; SameSite=Lax`;
                });
            });
        }

        track(eventName, parameters = {}) {
            if (!this.enabled || typeof window.gtag !== 'function') return;
            window.gtag('event', eventName, {
                ...parameters,
                language: this.currentLanguage(),
                transport_type: 'beacon'
            });
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        window.astronigmaAnalytics = new AstronigmaAnalytics();
    });
})();
