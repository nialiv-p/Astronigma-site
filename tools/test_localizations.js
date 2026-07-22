'use strict';

const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('stage2-localization.js', 'utf8');
const context = { window: {} };
vm.runInNewContext(source, context);
const translations = context.window.stageTwoTranslations;
const locales = ['en','ru','sr','es','pt','de','fr','ja','ko','tr','th','id','zh'];
const englishKeys = Object.keys(translations.en).sort();

if (Object.keys(translations).sort().join(',') !== locales.sort().join(',')) throw new Error('Stage 2 locale set is incomplete.');
for (const locale of locales) {
    const keys = Object.keys(translations[locale]).sort();
    if (keys.join(',') !== englishKeys.join(',')) throw new Error(`${locale} does not contain the complete Stage 2 key set.`);
    let identicalEnglishValues = 0;
    for (const key of keys) {
        if (!String(translations[locale][key]).trim()) throw new Error(`${locale}.${key} is empty.`);
        if (locale !== 'en' && translations[locale][key] === translations.en[key]) identicalEnglishValues += 1;
    }
    if (locale !== 'en' && identicalEnglishValues > 3) throw new Error(`${locale} contains too much English fallback copy.`);
}
console.log(`Localization test passed: ${locales.length} locales × ${englishKeys.length} Stage 2 keys.`);
