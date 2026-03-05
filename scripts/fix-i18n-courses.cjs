const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '..', 'packages', 'i18n', 'src', 'locales');

const translations = {
  en: { networkUnavailable: 'Server unavailable \u2014 showing backup data', retry: 'Retry' },
  he: { networkUnavailable: '\u05e9\u05e8\u05ea \u05dc\u05d0 \u05e0\u05d2\u05d9\u05e9 \u2014 \u05de\u05e6\u05d9\u05d2 \u05e0\u05ea\u05d5\u05e0\u05d9 \u05d2\u05d9\u05d1\u05d5\u05d9', retry: '\u05e0\u05e1\u05d4 \u05e9\u05d5\u05d1' },
  es: { networkUnavailable: 'Servidor no disponible \u2014 mostrando datos de respaldo', retry: 'Reintentar' },
  fr: { networkUnavailable: 'Serveur indisponible \u2014 affichage des donn\u00e9es de secours', retry: 'R\u00e9essayer' },
  hi: { networkUnavailable: '\u0938\u0930\u094d\u0935\u0930 \u0905\u0928\u0941\u092a\u0932\u092c\u094d\u0927 \u2014 \u092c\u0948\u0915\u0905\u092a \u0921\u0947\u091f\u093e \u0926\u093f\u0916\u093e\u092f\u093e \u091c\u093e \u0930\u0939\u093e \u0939\u0948', retry: '\u092a\u0941\u0928\u0903 \u092a\u094d\u0930\u092f\u093e\u0938 \u0915\u0930\u0947\u0902' },
  id: { networkUnavailable: 'Server tidak tersedia \u2014 menampilkan data cadangan', retry: 'Coba lagi' },
  pt: { networkUnavailable: 'Servidor indispon\u00edvel \u2014 exibindo dados de backup', retry: 'Tentar novamente' },
  ru: { networkUnavailable: '\u0421\u0435\u0440\u0432\u0435\u0440 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d \u2014 \u043e\u0442\u043e\u0431\u0440\u0430\u0436\u0430\u044e\u0442\u0441\u044f \u0440\u0435\u0437\u0435\u0440\u0432\u043d\u044b\u0435 \u0434\u0430\u043d\u043d\u044b\u0435', retry: '\u041f\u043e\u0432\u0442\u043e\u0440\u0438\u0442\u044c' },
  bn: { networkUnavailable: '\u09b8\u09be\u09b0\u09cd\u09ad\u09be\u09b0 \u0985\u09a8\u09c1\u09aa\u09b2\u09ac\u09cd\u09a7 \u2014 \u09ac\u09cd\u09af\u09be\u0995\u0986\u09aa \u09a1\u09c7\u099f\u09be \u09a6\u09c7\u0996\u09be\u09a8\u09cb \u09b9\u099a\u09cd\u099b\u09c7', retry: '\u09aa\u09c1\u09a8\u09b0\u09be\u09af\u09bc \u099a\u09c7\u09b7\u09cd\u099f\u09be \u0995\u09b0\u09c1\u09a8' },
  'zh-CN': { networkUnavailable: '\u670d\u52a1\u5668\u4e0d\u53ef\u7528 \u2014 \u663e\u793a\u5907\u7528\u6570\u636e', retry: '\u91cd\u8bd5' },
};

const locales = fs.readdirSync(localesDir);
let updated = 0;

for (const locale of locales) {
  const coursesFile = path.join(localesDir, locale, 'courses.json');
  if (!fs.existsSync(coursesFile)) continue;

  const content = JSON.parse(fs.readFileSync(coursesFile, 'utf8'));

  if (content.networkUnavailable) {
    console.log(locale + ': already has networkUnavailable, skipping');
    continue;
  }

  const trans = translations[locale] || translations.en;
  const keys = Object.keys(content);
  const newContent = {};

  for (const key of keys) {
    newContent[key] = content[key];
    if (key === 'showingCachedData') {
      newContent.networkUnavailable = trans.networkUnavailable;
      newContent.retry = trans.retry;
    }
  }

  if (!newContent.networkUnavailable) {
    newContent.networkUnavailable = trans.networkUnavailable;
    newContent.retry = trans.retry;
  }

  fs.writeFileSync(coursesFile, JSON.stringify(newContent, null, 2) + '\n');
  console.log(locale + ': updated');
  updated++;
}

console.log('Done. Updated ' + updated + ' locale files.');
