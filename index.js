require('dotenv').config()

const fs = require('fs');
const fm = require('front-matter');
const keyBy = require('lodash/keyBy');

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

const choiceList = (list) => list.map(i => ({name: i, value: i}));

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
  },
  whomst: {
    name: 'who',
    description,
    type: 'STRING',
    required: false,
    choices: choiceList([
      'jenna',
      'mods',
    ])
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
  const options = keyBy(event.options, 'name');

  const template = command.body;
  let body = '';

  const blocks = {
    user: options.person2,
    no_user: !options.person2,
    jenna: options.who?.value === 'jenna',
    mods: options.who?.value === 'mods',
  }

  const blockHeaders = [...template.matchAll(/\n?^\[(\w+)\]$\n?/gm)];
  if (blockHeaders) {
    const initialString = template.substring(0, blockHeaders[0].index);
    body += initialString;

    for (var i = 0; i < blockHeaders.length; i++) {
      const match = blockHeaders[i];
      const [header, blockName] = match;
      const nextMatch = blockHeaders[i + 1];

      if (!blockName in blocks) {
        console.log(`missing block ${blockName}`);
      }

      if (blocks[blockName]) {
        const blockBody = template.substring(match.index + header.length, nextMatch?.index);
        body += blockBody;
      }
    }
  } else {
    body += template;
  }

  body = body.replace(/@name\b/g, event.member);

  if (options.person2) {
    const {member} = options.person2;
    body = body.replace(/@name2\b/g, member);
    mentions.push(member.id);
  }

  if (options.thought) {
    body = body.replace("[thought]", options.thought.value);
  }

  event.reply(body, {
    allowedMentions: {
      users: mentions
    }
  });
})


client.login(process.env.BOT_TOKEN);