const {Permissions} = require('discord.js');

const bypassSlowmode = Permissions.FLAGS.MANAGE_MESSAGES | Permissions.FLAGS.MANAGE_CHANNELS;

const lastMessageTimestamp = new Map();

const messageHandler = (message) => {
  const {member, channel} = message;
  if (!member || !channel.rateLimitPerUser || message.author.bot) {
    return;
  }

  if (channel.permissionsFor(member).any(bypassSlowmode)) {
    const key = [channel.id, member.id].join('|');

    if (lastMessageTimestamp.has(key)) {
      const msSinceLastMessage = message.createdTimestamp - lastMessageTimestamp.get(key);
      if ((msSinceLastMessage / 1000) < channel.rateLimitPerUser) {
        message.react('❌');
      }
    }

    const reaction = message.react('🕐');

    setTimeout(async () => {
      (await reaction).users.remove(/* client.user */);
    }, channel.rateLimitPerUser * 1000);

    lastMessageTimestamp.set(key, message.createdTimestamp);
  }
}

module.exports = { messageHandler };