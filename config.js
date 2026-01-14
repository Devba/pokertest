const dotenv = require('dotenv')

// Load env vars if env is not production
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: './.env' })  // Cambiar ruta
}

module.exports = {
  PORT: process.env.PORT || 7777,
  JWT_SECRET: process.env.JWT_SECRET || 'default_secret',
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/poker_db',
  NODE_ENV: process.env.NODE_ENV || 'development',
  INITIAL_CHIPS_AMOUNT: 100000,
}