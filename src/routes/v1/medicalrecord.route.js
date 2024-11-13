const router = require('express').Router();

router.get('/', (req, res) => {
  res.json({ message: 'Medical Record routes' });
});

module.exports = router;