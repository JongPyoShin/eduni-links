const fs = require('node:fs/promises');
const path = require('node:path');

const LOG_PATH = path.resolve(__dirname, '..', 'watcher.log');

async function log(message, level = 'INFO') {
  const line = new Date().toISOString() + ' [' + level + '] ' + message;
  if (level === 'ERROR') console.error(line);
  else console.log(line);
  await fs.appendFile(LOG_PATH, line + '\n', 'utf8');
}

module.exports = log;
