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

const canonicalProductTerms = {
    en: ['Key of Dreams', 'Daily Challenge', 'Missions', 'Practice', 'Constellation archive'],
    ru: ['Ключ Снов', 'Ежедневное испытание', 'Миссии', 'Тренировка', 'Архив созвездий'],
    sr: ['Ključ Snova', 'Dnevni izazov', 'Misije', 'Trening', 'Arhiva sazvežđa'],
    es: ['Llave de los Sueños', 'Reto Diario', 'Misiones', 'Entrenamiento', 'Archivo de constelaciones'],
    pt: ['Chave dos Sonhos', 'Desafio Diário', 'Missões', 'Treinamento', 'Arquivo de constelações'],
    de: ['Schlüssel der Träume', 'Tägliche Herausforderung', 'Missionen', 'Training', 'Sternbildarchiv'],
    fr: ['Clé des Rêves', 'Défi Quotidien', 'Missions', 'Entraînement', 'Archive des constellations'],
    ja: ['夢の鍵', 'デイリーチャレンジ', 'ミッション', 'トレーニング', '星座アーカイブ'],
    ko: ['꿈의 열쇠', '데일리 챌린지', '미션', '연습 모드', '별자리 아카이브'],
    tr: ['Rüyaların Anahtarı', 'Günlük Görev', 'Görevler', 'Antrenman', 'Takımyıldız arşivi'],
    th: ['กุญแจแห่งความฝัน', 'ภารกิจประจำวัน', 'ภารกิจ', 'ฝึกฝน', 'คลังกลุ่มดาว'],
    id: ['Kunci Mimpi', 'Tantangan Harian', 'Misi', 'Latihan', 'Arsip rasi bintang'],
    zh: ['梦之钥匙', '每日挑战', '任务', '训练模式', '星座档案'],
};
const canonicalKeys = ['demo_reveal_title', 'feature_daily_title', 'feature_missions_title', 'feature_practice_title', 'collection_eyebrow'];
for (const locale of locales) {
    canonicalKeys.forEach((key, index) => {
        const expected = canonicalProductTerms[locale][index];
        if (translations[locale][key] !== expected) {
            throw new Error(`${locale}.${key} must match the in-game term "${expected}".`);
        }
    });
}

const naturalHeroHeadlines = {
    en: 'Tap a cell.<br>Reveal the cosmos.',
    ru: 'Меняйте клетки.<br>Открывайте созвездия.',
    sr: 'Menjaj polja.<br>Otkrivaj sazvežđa.',
    es: 'Cambia casillas.<br>Revela constelaciones.',
    pt: 'Alterne as células.<br>Revele constelações.',
    de: 'Schalte Felder um.<br>Enthülle Sternbilder.',
    fr: 'Inversez des cases.<br>Révélez des constellations.',
    ja: 'マスを切り替えて、<br>星座を見つけよう。',
    ko: '칸을 전환해<br>별자리를 밝혀 보세요.',
    tr: 'Kareleri değiştir.<br>Takımyıldızları keşfet.',
    th: 'สลับช่องในตาราง<br>ค้นพบกลุ่มดาว',
    id: 'Ubah petak.<br>Ungkap rasi bintang.',
    zh: '切换方块，<br>探索星座。',
};
for (const locale of locales) {
    if (translations[locale].hero_title_stage2 !== naturalHeroHeadlines[locale]) {
        throw new Error(`${locale}.hero_title_stage2 must use the reviewed, locale-native headline.`);
    }
}
console.log(`Localization test passed: ${locales.length} locales × ${englishKeys.length} Stage 2 keys.`);
