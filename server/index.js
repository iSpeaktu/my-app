require('dotenv').config();
const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const { verifyToken } = require('./middleware/auth');

const PORT = process.env.PORT || 4000;
const app = express();

app.use(cors());
app.use(express.json());
// NOTE: do not apply verifyToken globally. Protected routes will explicitly use it.

app.get('/api/health', (req, res) => res.json({ success: true, status: 'ok' }));
app.use('/api', routes);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

module.exports = { app };
