const set = require('../set');

module.exports = [
  {
    name: 'ping', category: 'Général', desc: 'Vitesse de réponse',
    async run({ sock, jid, m }) {
      const t = Date.now();
      const sent = await sock.sendMessage(jid, { text: '🏓 Pong...' }, { quoted: m });
      await sock.sendMessage(jid, { text: `🏓 Pong ! ${Date.now() - t} ms`, edit: sent.key });
    },
  },
  {
    name: 'alive', category: 'Général', desc: 'Vérifie que le bot est en ligne',
    async run({ reply }) {
      const s = process.uptime();
      reply(`✅ *${set.botName}* est en ligne\n⏱️ Uptime : ${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}min\n⚙️ Mode : ${set.mode}`);
    },
  },
  {
    name: 'owner', category: 'Général', desc: 'Contact du propriétaire',
    async run({ reply }) {
      reply(`👑 *${set.ownerName}*\nwa.me/${set.ownerNumber}`);
    },
  },
  {
    name: 'menu', aliases: ['help'], category: 'Général', desc: 'Liste des commandes',
    async run({ reply, commands }) {
      const groups = {};
      for (const c of new Set(commands.values())) (groups[c.category] ||= []).push(c);
      let out = `╭─── *${set.botName}* ───╮\n│ Préfixe : ${set.prefix}\n│ Mode : ${set.mode}\n╰────────────────╯\n`;
      for (const [cat, list] of Object.entries(groups)) {
        out += `\n*${cat}*\n` + list.map((c) => `• ${set.prefix}${c.name} — ${c.desc}`).join('\n') + '\n';
      }
      reply(out.trim());
    },
  },
];
