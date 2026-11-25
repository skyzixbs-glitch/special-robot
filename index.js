const http = require('http');
const pino = require('pino');
const {
  default: makeWASocket, useMultiFileAuthState, DisconnectReason,
  fetchLatestBaileysVersion, Browsers, makeCacheableSignalKeyStore,
} = require('@whiskeysockets/baileys');

const set = require('./set');
const { AUTH_DIR, restoreSession, hasSession } = require('./lib/session');
const { loadCommands } = require('./lib/loader');

const logger = pino({ level: 'silent' });
const commands = loadCommands();
const num = (j = '') => j.split('@')[0].split(':')[0];

// Petit serveur pour les hébergeurs qui exigent un port ouvert (Koyeb, Render...)
http.createServer((_, res) => res.end('Novax-bot en ligne')).listen(process.env.PORT || 3000);

const unwrap = (message = {}) =>
  message.ephemeralMessage?.message || message.viewOnceMessage?.message || message.documentWithCaptionMessage?.message || message;

const getText = (msg) =>
  msg.conversation || msg.extendedTextMessage?.text || msg.imageMessage?.caption || msg.videoMessage?.caption || '';

async function handle(sock, m) {
  if (!m.message || m.key.remoteJid === 'status@broadcast') return;
  const msg = unwrap(m.message);
  const text = getText(msg).trim();
  if (!text.startsWith(set.prefix)) return;

  const [name, ...args] = text.slice(set.prefix.length).trim().split(/\s+/);
  const cmd = commands.get(name.toLowerCase());
  if (!cmd) return;

  const jid = m.key.remoteJid;
  const isGroup = jid.endsWith('@g.us');
  const sender = isGroup ? m.key.participant || '' : jid;
  const isOwner = m.key.fromMe || num(sender) === set.ownerNumber;
  if (set.mode === 'private' && !isOwner) return;

  const info = msg.extendedTextMessage?.contextInfo;
  const ctx = {
    sock, m, msg, jid, isGroup, sender, isOwner, args, text, set, commands, prefix: set.prefix,
    mentioned: info?.mentionedJid || [],
    quotedParticipant: info?.participant,
    reply: (t) => sock.sendMessage(jid, { text: t }, { quoted: m }),
  };
  try {
    await cmd.run(ctx);
  } catch (e) {
    console.error(`Erreur commande ${name} :`, e);
    ctx.reply('❌ Une erreur est survenue pendant l’exécution de la commande.');
  }
}

async function start() {
  restoreSession(set.sessionId);
  if (!hasSession()) {
    console.error('❌ Aucune session. Génère un SESSION_ID sur ton site de session et mets-le dans .env.');
    return;
  }
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version, logger,
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
    browser: Browsers.ubuntu('Chrome'),
    printQRInTerminal: false,
    markOnlineOnConnect: false,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'open') console.log(`✅ ${set.botName} connecté (${num(sock.user?.id)})`);
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        console.error('🚪 Session déconnectée : génère un nouveau SESSION_ID et supprime le dossier auth/.');
        process.exit(1);
      }
      console.log(`⚠️ Connexion fermée (${code}), nouvelle tentative...`);
      setTimeout(start, 3000);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const m of messages) await handle(sock, m).catch((e) => console.error(e));
  });
}

start().catch((e) => { console.error(e); process.exit(1); });
