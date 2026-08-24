const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 1234;

app.use(express.static(path.join(__dirname)));

app.get('/api/services', (req, res) => {
  res.json({ status: 'success', message: 'NearMarket API live' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
