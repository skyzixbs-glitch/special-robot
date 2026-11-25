const pino = require('pino');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { Sticker } = require('wa-sticker-formatter');
const { getJSON, getText } = require('../lib/http');

module.exports = [
  {
    name: 'sticker', aliases: ['s'], category: 'Outils', desc: 'Image/vidéo → sticker (envoie ou cite un média)',
    async run({ sock, m, msg, jid, reply, set }) {
      const quoted = msg.extendedTextMessage?.contextInfo?.quotedMessage;
      let target = null;
      if (msg.imageMessage || msg.videoMessage) target = m;
      else if (quoted?.imageMessage || quoted?.videoMessage) target = { key: m.key, message: quoted };
      if (!target) return reply('Envoie ou cite une image/vidéo avec la commande.');
      const buffer = await downloadMediaMessage(target, 'buffer', {}, {
        logger: pino({ level: 'silent' }),
        reuploadRequest: sock.updateMediaMessage,
      });
      const sticker = new Sticker(buffer, { pack: set.stickerPack, author: set.stickerAuthor, type: 'full', quality: 60 });
      await sock.sendMessage(jid, await sticker.toMessage(), { quoted: m });
    },
  },
  {
    name: 'meteo', aliases: ['weather'], category: 'Outils', desc: 'Météo d’une ville',
    async run({ args, reply, prefix }) {
      const city = args.join(' ');
      if (!city) return reply(`Usage : ${prefix}meteo <ville>`);
      const q = encodeURIComponent(city);
      try {
        const d = await getJSON([`https://wttr.in/${q}?format=j1&lang=fr`]);
        const c = d.current_condition[0];
        const area = d.nearest_area?.[0]?.areaName?.[0]?.value || city;
        return reply(
          `🌍 *Météo — ${area}*\n` +
          `${c.lang_fr?.[0]?.value || c.weatherDesc?.[0]?.value}\n` +
          `🌡️ ${c.temp_C}°C (ressenti ${c.FeelsLikeC}°C)\n` +
          `💧 Humidité : ${c.humidity}%\n💨 Vent : ${c.windspeedKmph} km/h`
        );
      } catch {
        try { return reply(await getText([`https://wttr.in/${q}?format=3`])); }
        catch { return reply('❌ Service météo indisponible, réessaie plus tard.'); }
      }
    },
  },
  {
    name: 'wiki', category: 'Outils', desc: 'Résumé Wikipédia',
    async run({ args, reply, prefix }) {
      const q = args.join(' ');
      if (!q) return reply(`Usage : ${prefix}wiki <sujet>`);
      const e = encodeURIComponent(q);
      try {
        const d = await getJSON([
          `https://fr.wikipedia.org/api/rest_v1/page/summary/${e}`,
          `https://en.wikipedia.org/api/rest_v1/page/summary/${e}`,
        ], 0);
        reply(`📚 *${d.title}*\n\n${d.extract}\n\n${d.content_urls?.mobile?.page || ''}`);
      } catch {
        reply('❌ Aucun article trouvé pour ce sujet.');
      }
    },
  },
  {
    name: 'calc', category: 'Outils', desc: 'Calculatrice',
    async run({ args, reply, prefix }) {
      const expr = args.join(' ').replace(/,/g, '.').replace(/\^/g, '**');
      if (!expr) return reply(`Usage : ${prefix}calc 2*(3+4)`);
      if (!/^[0-9+\-*/().%\s]+$/.test(expr)) return reply('❌ Expression non valide.');
      try {
        const r = Function(`"use strict"; return (${expr})`)();
        reply(`🧮 ${args.join(' ')} = *${r}*`);
      } catch { reply('❌ Expression non valide.'); }
    },
  },
];
