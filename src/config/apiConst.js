const config = require('./config');

const PORT = config.get('server.port');
const DB_URL = config.get('database');

module.exports = {
    PORT,
    DB_URL
};
