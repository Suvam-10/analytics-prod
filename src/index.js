//require('dotenv').config();
const app = require('./app');
const config = require('./config');

app.listen(config.port, () => {
  console.log(`Analytics backend listening on port ${config.port}`);
});
