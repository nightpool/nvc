require('dotenv').config()

const fs = require('fs');
const fm = require('front-matter');

const { Client, Intents } = require('discord.js');
const client = new Client({intents: [Intents.GUILDS]});
client.on('debug', console.log);


const commands = Object.fromEntries(fs.readdirSync('./commands').flatMap(fileName => {
  const file = fs.readFileSync(`commands/${fileName}`, 'utf8');
  const commandName = fileName.replace(/.md$/, '');
  const command = fm(file);
  const {aliases} = command.attributes;
  const names = [commandName].concat(aliases || []); 

  return names.map(n => ([n, {
    ...command.attributes,
    body: command.body
  }]));
}));

const param = (type, description) => ({
  user: {
    name: 'person2',
    description,
    type: 'USER',
    required: true,
  },
  potential_user: {
    name: 'person2',
    description,
    type: 'USER',
    required: false,
  },
  thought: {
    name: 'thought',
    description,
    type: 'STRING',
    required: true
  }
})[type];

client.once('ready', () => {
  console.log('ready');
  const ninuan = client.guilds.cache.get(process.env.GUILD);

  const commandSet = Object.entries(commands).map(([name, command]) => {
    const {params, aliases, description} = command;

    return {
      name,
      description,
      ...(params && {
        options: params.map(p => param(p, description)),
      }),
    };
  });

  console.log(commandSet);
  ninuan.commands.set(commandSet);
});

client.on('interaction', event => {
  if (!event.isCommand()) return;

  const command = commands[event.commandName];
  const mentions = [event.member.id];

  let body = command.body;
  body = body.replace(/@name\b/g, event.member);
  // command.options.forEach(option => {
  //   if (option.name === "person2") {
  //     body = body.replace(/@name2\b/g, option.member);
  //     mentions.push(option.member.id);
  //   } else if (option.name === "thought") {
  //     body = body.replace("[text]", option.value);
  //   }
  // });

  event.reply(body, {
    allowedMentions: {
      users: mentions
    }
  });
})


client.login(process.env.BOT_TOKEN);