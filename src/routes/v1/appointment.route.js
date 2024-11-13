const router = require('express').Router();

router.get('/', (req, res) => {
  res.json({ message: 'Appointment routes' });
});

module.exports = router;