require('dotenv').config();
const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const { verifyToken } = require('./middleware/auth');

const PORT = process.env.PORT || 4000;
const app = express();

app.use(cors());
app.use(express.json());
// attach user if bearer token present
app.use(verifyToken);

app.get('/api/health', (req, res) => res.json({ success: true, status: 'ok' }));
app.use('/api', routes);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
