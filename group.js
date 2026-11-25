const num = (j = '') => j.split('@')[0].split(':')[0];

async function adminCheck({ sock, jid, isGroup, sender, isOwner, reply }) {
  if (!isGroup) { reply('Commande réservée aux groupes.'); return null; }
  const meta = await sock.groupMetadata(jid);
  const isAdmin = meta.participants.some((p) => num(p.id) === num(sender) && p.admin);
  if (!isAdmin && !isOwner) { reply('Réservé aux admins du groupe.'); return null; }
  return meta;
}

module.exports = [
  {
    name: 'tagall', category: 'Groupe', desc: 'Mentionne tous les membres',
    async run(ctx) {
      const meta = await adminCheck(ctx);
      if (!meta) return;
      const text = ctx.args.join(' ') || 'Attention tout le monde !';
      const lines = meta.participants.map((p) => `• @${num(p.id)}`).join('\n');
      await ctx.sock.sendMessage(ctx.jid, { text: `📢 ${text}\n\n${lines}`, mentions: meta.participants.map((p) => p.id) });
    },
  },
  {
    name: 'kick', category: 'Groupe', desc: 'Retire un membre (mentionne-le ou cite son message)',
    async run(ctx) {
      const meta = await adminCheck(ctx);
      if (!meta) return;
      const targets = ctx.mentioned.length ? ctx.mentioned : ctx.quotedParticipant ? [ctx.quotedParticipant] : [];
      if (!targets.length) return ctx.reply('Mentionne ou cite la personne à retirer.');
      await ctx.sock.groupParticipantsUpdate(ctx.jid, targets, 'remove');
      ctx.reply('✅ Membre(s) retiré(s).');
    },
  },
];
