const router = require('express').Router();

router.get('/', (req, res) => {
  res.json({ message: 'Patient routes' });
});

module.exports = router;