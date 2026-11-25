require('dotenv').config();

module.exports = {
  botName: process.env.NOM_BOT || '🤖 Novax-bot',
  prefix: process.env.PREFIXE || '.',
  ownerName: process.env.NOM_OWNER || 'Owner',
  ownerNumber: (process.env.NUMERO_OWNER || '').replace(/\D/g, ''),
  mode: (process.env.MODE || 'public').toLowerCase(), // public | private
  sessionId: process.env.SESSION_ID || '',
  stickerPack: process.env.STICKER_PACK_NAME || 'Novax-bot',
  stickerAuthor: process.env.STICKER_AUTHOR_NAME || 'Novax',
};
