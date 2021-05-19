require('dotenv').config()

const fs = require('fs');
const fm = require('front-matter');
const keyBy = require('lodash/keyBy');
const uniqBy = require('lodash/uniqBy');
const {stripIndents} = require('common-tags');
const {Client, Intents} = require('discord.js');
const {formatMessage} = require('./formatting');

const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
  allowedMentions: {
    parse: [],
  },
});
client.on('debug', console.log);

const commands = Object.fromEntries(fs.readdirSync('./commands').flatMap(fileName => {
  const file = fs.readFileSync(`commands/${fileName}`, 'utf8');
  const commandName = fileName.replace(/.md$/, '');
  const command = fm(file);
  const {aliases} = command.attributes;
  command.attributes.name = commandName;
  const commandsAndAliases = [commandName].concat(aliases || []);

  return commandsAndAliases.map(commandName => ([commandName, {
    ...command.attributes,
    body: command.body
  }]));
}));

const choiceList = (list) => list.map(i => ({name: i, value: i}));

const NOT_AFRAID_OF_LIST = ['jenna', 'mods'];
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
  afraid_of: {
    name: 'who',
    description,
    type: 'STRING',
    required: false,
    choices: choiceList(NOT_AFRAID_OF_LIST)
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
  ninuan.commands.set(commandSet);
});

client.on('interaction', (event) => {
  if (!event.isCommand()) return;

  const command = commands[event.commandName];
  const options = keyBy(event.options, 'name');

  const {body, allowedMentions} = formatMessage({
    template: command.body,
    user: event.member,
    options,
  })

  event.reply(body, {
    allowedMentions,
  });
});

const commandRegex = new RegExp(`^!(${Object.keys(commands).join("|")})`);
const helpRegex = /^!help(?: ([\w+_-]+))?/

client.on('message', message => handleMessage(message).catch(error => console.error(error)));

async function handleMessage(message) {
  if (helpRegex.test(message)) {
    const [_, commandName] = helpRegex.exec(message);
    if (commandName) {
      const command = commands[commandName];
      let usage = `!${command.name}`;
      command.params.forEach(param => {
        if (param === 'user') {
          usage += ' @name';
        } else if (param === 'potential_user') {
          usage = [usage, `   ${usage} @name`].join("\n");
        } else if (param === 'thought') {
          usage += ' thought';
        } else if (param === 'afraid_of') {
          usage = [
            usage,
            ...NOT_AFRAID_OF_LIST.map(i => ['  ', usage, i].join(" "))
          ].join("\n");
        }
      });
      message.channel.send(stripIndents`
        **${command.title}**
        _${command.description}_

        Usage: ${usage}
        ${command.aliases ? `Aliases: ${command.aliases.map(i => '!' + i).join(", ")}\n` : ''
        }
        What happens:
        ${command.body.split("\n").map(line => '> ' + line).join("\n")}`
      );
    } else {
      const mainCommands = uniqBy(Object.values(commands), 'name');
      message.channel.send(`Available commands:\n${
        mainCommands.map(c => `!${c.name} ${
          c.aliases ? `(or ${c.aliases.join(", or ")})` : ''
        }`).join('\n')
      }`);
    }
  }

  if (commandRegex.test(message)) {
    message.channel.startTyping();
    const [prefix, commandName] = commandRegex.exec(message);
    const command = commands[commandName];
    const options = {};

    const lookForArgs = keyBy(command.params, i => i);
    let args = message.content.substring(prefix.length);

    if (lookForArgs.user || lookForArgs.potential_user) {
      const firstMention = message.mentions.users.first();
      if (firstMention) {
        options.person2 = {
          member: firstMention,
        };
        args = args.replace(new RegExp(` *<@!?${firstMention.id}> *`), '');
      }
    }

    if (lookForArgs.thought) {
      options.thought = {
        value: args.replace(/^\s+/, ''),
      };
    }

    if (lookForArgs.afraid_of) {
      NOT_AFRAID_OF_LIST.forEach(person => {
        if (new RegExp(`\\b${person}\\b`).test(args)) {
          options.who = {value: person};
        }
      });
    }

    const {body, allowedMentions} = formatMessage({
      template: command.body,
      user: message.author,
      options,
    });

    const reply = await message.channel.send(body, {
      allowedMentions,
    });
    await message.channel.stopTyping();
    console.log(reply.id);
  }
}


client.login(process.env.BOT_TOKEN);