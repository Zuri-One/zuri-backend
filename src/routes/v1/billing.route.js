const router = require('express').Router();

router.get('/', (req, res) => {
  res.json({ message: 'Billing routes' });
});

module.exports = router;