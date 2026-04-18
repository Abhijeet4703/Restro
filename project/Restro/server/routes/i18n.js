const router = require('express').Router();
const { translations, languageNames } = require('../utils/i18n');

// Public - get available languages
router.get('/languages', (req, res) => {
  res.json({ languages: languageNames });
});

// Public - get translations for a language
router.get('/:lang', (req, res) => {
  const lang = req.params.lang;
  const t = translations[lang] || translations.en;
  res.json({ lang, translations: t });
});

module.exports = router;
