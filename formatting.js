
const formatMessage = ({
  template,
  user,
  options
}) => {
  const allowedMentions = {users: [user.id]};
  let body = '';

  const blocks = {
    user: Boolean(options.person2),
    no_user: !Boolean(options.person2),
    jenna: options.who?.value === 'jenna',
    mods: options.who?.value === 'mods',
    nobody: !options.who,
  }

  const blockHeaders = [...template.matchAll(/\n?^\[(\w+)\]$\n?/gm)];
  if (blockHeaders.length) {
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

  body = body.replace(/@name\b/g, user);

  if (options.person2) {
    body = body.replace(/@name2\b/g, options.person2.member);
    allowedMentions.users.push(options.person2.member.id);
  }

  if (options.thought) {
    body = body.replace("[thought]", options.thought.value);
  }

  return {
    body,
    allowedMentions
  }
}

module.exports = {formatMessage};