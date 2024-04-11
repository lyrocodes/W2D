const pino =  require('pino');

const discordHandler =  require('./handler_lyrocodes.js');
const state =  require('./db_lyrocodes.js');
const utils =  require('./utils_lyrocodes.js');
const storage = require('./storage_lyrocodes.js');
const whatsappHandler =  require('./wp_handler_lyrocodes.js');

(async () => {
  const version = 'v0.10.25';
  state.logger = pino({ mixin() { return { version }; } }, pino.destination('logs.txt'));
  let autoSaver = setInterval(() => storage.save(), 5 * 60 * 1000);
  ['SIGINT', 'uncaughtException', 'SIGTERM'].forEach((eventName) => process.on(eventName, async (err) => {
    clearInterval(autoSaver);
    state.logger.error(err);
    state.logger.info('Exiting!');
    if (['SIGINT', 'SIGTERM'].includes(err)) {
      await storage.save();
    }
    process.exit();
  }));

  state.logger.info('[ W2D ] Starting');

  await utils.updater.run(version);
  state.logger.info('[ W2D ] Update checked.');

  const conversion = await utils.sqliteToJson.convert();
  if (!conversion) {
    state.logger.error('[ W2D ] Conversion failed!');
    process.exit(1);
  }
  state.logger.info('[ W2D ] Conversion completed.');

  state.settings = await storage.parseSettings();
  state.logger.info('[ W2D ] Loaded settings.');

  clearInterval(autoSaver);
  autoSaver = setInterval(() => storage.save(), state.settings.autoSaveInterval * 1000);
  state.logger.info('[ W2D ] Changed auto save interval.');

  state.contacts = await storage.parseContacts();
  state.logger.info('[ W2D ] Loaded contacts.');

  state.chats = await storage.parseChats();
  state.logger.info('[ W2D ] Loaded chats.');

  state.lastMessages = await storage.parseLastMessages();
  state.logger.info('[ W2D ] Loaded last messages.');

  state.dcClient = await discordHandler.start();
  state.logger.info('[ W2D ] Discord client started.');

  await utils.discord.repairChannels();
  await discordHandler.setControlChannel();
  state.logger.info('[ W2D ] Repaired channels.');

  await whatsappHandler.start();
  state.logger.info('[ W2D ] WhatsApp client started.');


  console.log('[ W2D ] Your Bot is currently online and working fine, Thanks for using W2D to enhance your exeperience on whatsapp and discord at same time, it is great to take a minute and give a start for the project, this bot is fully made with ♥ by LyroCodes (discord : lyrocodes). Press CTRL-C to exit.');
})();
