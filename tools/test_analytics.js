#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

class MockElement {
    constructor(id) {
        this.id = id;
        this.hidden = id === 'analytics-consent';
        this.textContent = '';
        this.dataset = {};
        this.listeners = {};
        this.classList = { add() {}, remove() {} };
    }

    addEventListener(type, listener) {
        this.listeners[type] = listener;
    }

    click() {
        this.listeners.click?.();
    }

    focus() {}
    remove() {}
}

function createEnvironment(savedConsent = null) {
    const ids = [
        'analytics-consent',
        'analytics-consent-title',
        'analytics-consent-description',
        'analytics-consent-accept',
        'analytics-consent-reject',
        'analytics-settings'
    ];
    const elements = Object.fromEntries(ids.map(id => [id, new MockElement(id)]));
    const scripts = [];
    const storage = new Map();
    if (savedConsent) storage.set('astronigma_analytics_consent_v1', savedConsent);
    const windowListeners = {};
    const domListeners = {};

    const document = {
        cookie: '',
        documentElement: { lang: 'en' },
        title: 'Astronigma',
        head: {
            appendChild(element) {
                scripts.push(element);
                element.remove = () => scripts.splice(scripts.indexOf(element), 1);
            }
        },
        addEventListener(type, listener) {
            domListeners[type] = listener;
        },
        createElement() {
            return new MockElement('script');
        },
        getElementById(id) {
            return elements[id] || null;
        },
        querySelector(selector) {
            return selector === 'script[data-astronigma-ga4]' ? scripts[0] || null : null;
        },
        querySelectorAll(selector) {
            if (selector === 'script[data-astronigma-ga4]') return scripts;
            if (selector === 'a[data-store]') return [];
            return [];
        }
    };

    const window = {
        ASTRONIGMA_GA4_MEASUREMENT_ID: 'G-TEST1234',
        document,
        location: {
            href: 'https://astronigma.net/?utm_source=test',
            hostname: 'astronigma.net'
        },
        addEventListener(type, listener) {
            windowListeners[type] = listener;
        }
    };
    const localStorage = {
        getItem(key) { return storage.get(key) || null; },
        setItem(key, value) { storage.set(key, value); }
    };
    const context = { console, document, localStorage, window };
    window.window = window;
    window.localStorage = localStorage;
    window.console = console;

    return { context, domListeners, elements, scripts, storage, window, windowListeners };
}

function boot(savedConsent = null) {
    const environment = createEnvironment(savedConsent);
    const source = fs.readFileSync(path.join(__dirname, '..', 'analytics.js'), 'utf8');
    vm.runInNewContext(source, environment.context, { filename: 'analytics.js' });
    environment.domListeners.DOMContentLoaded();
    return environment;
}

{
    const env = boot();
    assert.equal(env.elements['analytics-consent'].hidden, false, 'first visit opens consent');
    assert.equal(env.scripts.length, 0, 'GA4 is absent before consent');

    env.elements['analytics-consent-accept'].click();
    assert.equal(env.elements['analytics-consent'].hidden, true, 'accept closes consent');
    assert.equal(env.scripts.length, 1, 'accept loads one Google Tag script');
    assert.equal(env.storage.get('astronigma_analytics_consent_v1'), 'accepted');

    env.elements['analytics-settings'].click();
    env.elements['analytics-consent-accept'].click();
    assert.equal(env.scripts.length, 1, 'accepting again does not duplicate Google Tag');

    const commands = env.window.dataLayer.map(args => Array.from(args));
    assert.equal(commands.filter(command => command[0] === 'event' && command[1] === 'page_view').length, 1, 'page_view is sent once');

    env.window.astronigmaAnalytics.track('store_click', { store: 'app_store', placement: 'hero' });
    const storeEvent = env.window.dataLayer.map(args => Array.from(args)).find(command => command[1] === 'store_click');
    assert.equal(storeEvent[2].store, 'app_store');
    assert.equal(storeEvent[2].placement, 'hero');

    env.window.localizationManager = { currentLang: 'ru' };
    env.windowListeners['astronigma:languagechange']({
        detail: { previousLanguage: 'en', language: 'ru' }
    });
    const languageEvent = env.window.dataLayer.map(args => Array.from(args)).find(command => command[1] === 'language_change');
    assert.equal(languageEvent[2].from_language, 'en');
    assert.equal(languageEvent[2].to_language, 'ru');
    assert.equal(env.elements['analytics-consent-accept'].textContent, 'Принять');

    env.window.astronigmaAnalytics.track('demo_start');
    env.window.astronigmaAnalytics.track('demo_complete', { moves_count: 12, duration_ms: 4500 });
    const demoComplete = env.window.dataLayer.map(args => Array.from(args)).find(command => command[1] === 'demo_complete');
    assert.equal(demoComplete[2].moves_count, 12);
    assert.equal(demoComplete[2].duration_ms, 4500);

    env.elements['analytics-settings'].click();
    env.elements['analytics-consent-reject'].click();
    assert.equal(env.scripts.length, 0, 'reject removes the Google Tag script');
    assert.equal(env.window['ga-disable-G-TEST1234'], true, 'reject disables GA4');
}

{
    const env = boot('rejected');
    assert.equal(env.elements['analytics-consent'].hidden, true, 'saved rejection survives reload');
    assert.equal(env.scripts.length, 0, 'saved rejection does not load GA4');
}

{
    const env = boot('accepted');
    assert.equal(env.elements['analytics-consent'].hidden, true, 'saved acceptance survives reload');
    assert.equal(env.scripts.length, 1, 'saved acceptance loads GA4 once');
}

console.log('Analytics consent tests passed.');
