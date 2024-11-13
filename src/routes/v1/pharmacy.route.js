const router = require('express').Router();

router.get('/', (req, res) => {
  res.json({ message: 'Pharmacy routes' });
});

module.exports = router;