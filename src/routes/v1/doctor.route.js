const router = require('express').Router();

router.get('/', (req, res) => {
  res.json({ message: 'Doctor routes' });
});

module.exports = router;