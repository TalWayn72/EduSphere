const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '..', 'packages', 'i18n', 'src', 'locales');

const translations = {
  en: 'Agent templates unavailable — using offline mode',
  he: '\u05ea\u05d1\u05e0\u05d9\u05d5\u05ea \u05e1\u05d5\u05db\u05df \u05d0\u05d9\u05e0\u05df \u05e0\u05d2\u05d9\u05e9\u05d5\u05ea \u2014 \u05e4\u05d5\u05e2\u05dc \u05d1\u05de\u05d5\u05d3 \u05dc\u05dc\u05d0 \u05d7\u05d9\u05d1\u05d5\u05e8',
  es: 'Plantillas de agentes no disponibles \u2014 usando modo sin conexi\u00f3n',
  fr: 'Mod\u00e8les d\'agents indisponibles \u2014 utilisation du mode hors ligne',
  hi: '\u090f\u091c\u0947\u0902\u091f \u091f\u0947\u092e\u094d\u092a\u0932\u0947\u091f \u0905\u0928\u0941\u092a\u0932\u092c\u094d\u0927 \u2014 \u0911\u092b\u093c\u0932\u093e\u0907\u0928 \u092e\u094b\u0921 \u092e\u0947\u0902 \u0909\u092a\u092f\u094b\u0917 \u0915\u0930 \u0930\u0939\u0947 \u0939\u0948\u0902',
  id: 'Template agen tidak tersedia \u2014 menggunakan mode offline',
  pt: 'Modelos de agente indispon\u00edveis \u2014 usando modo offline',
  ru: '\u0428\u0430\u0431\u043b\u043e\u043d\u044b \u0430\u0433\u0435\u043d\u0442\u043e\u0432 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b \u2014 \u0440\u0430\u0431\u043e\u0442\u0430 \u0432 \u043e\u0444\u0444\u043b\u0430\u0439\u043d-\u0440\u0435\u0436\u0438\u043c\u0435',
  bn: '\u098f\u099c\u09c7\u09a8\u09cd\u099f \u099f\u09c7\u09ae\u09aa\u09cd\u09b2\u09c7\u099f \u0985\u09a8\u09c1\u09aa\u09b2\u09ac\u09cd\u09a7 \u2014 \u0985\u09ab\u09b2\u09be\u0987\u09a8 \u09ae\u09cb\u09a1 \u09ac\u09cd\u09af\u09ac\u09b9\u09be\u09b0 \u0995\u09b0\u0986 \u09b9\u099a\u09cd\u099b\u09c7',
  'zh-CN': '\u4ee3\u7406\u6a21\u677f\u4e0d\u53ef\u7528 \u2014 \u4f7f\u7528\u79bb\u7ebf\u6a21\u5f0f',
};

const locales = fs.readdirSync(localesDir);
let updated = 0;

for (const locale of locales) {
  const agentsFile = path.join(localesDir, locale, 'agents.json');
  if (!fs.existsSync(agentsFile)) continue;

  const content = JSON.parse(fs.readFileSync(agentsFile, 'utf8'));

  if (content.templatesUnavailable) {
    console.log(locale + ': already has templatesUnavailable, skipping');
    continue;
  }

  const msg = translations[locale] || translations.en;

  // Insert after 'devMode' key if it exists, otherwise at root level before 'modes'
  const keys = Object.keys(content);
  const newContent = {};

  for (const key of keys) {
    newContent[key] = content[key];
    if (key === 'devMode') {
      newContent.templatesUnavailable = msg;
    }
  }

  if (!newContent.templatesUnavailable) {
    newContent.templatesUnavailable = msg;
  }

  fs.writeFileSync(agentsFile, JSON.stringify(newContent, null, 2) + '\n');
  console.log(locale + ': updated');
  updated++;
}

console.log('Done. Updated ' + updated + ' agents locale files.');
