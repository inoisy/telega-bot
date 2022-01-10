/* eslint-disable no-inner-declarations,no-case-declarations */
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();
const { countryListNumeric } = require('./countries.js');
const sequelize = require('./db.js');
const models = require('./models.js');


const { TOKEN, SERVER_URL, PORT } = process.env;

const APP_PORT = PORT || 5000;


const FIND_BUTTON_TEXT = 'Найти жилье';
const GIVE_BUTTON_TEXT = 'Предоставить жилье';
const INFO_BUTTON_TEXT = 'Информация';

const contryTransformed = Object.entries(countryListNumeric).reduce((acc, [key, val]) => {
  acc.push([{ text: val, callback_data: `GIVE:${key}` }]);
  return acc;
}, []);

const giveOptions = {
  reply_markup: JSON.stringify({
    inline_keyboard: contryTransformed
  })
};

async function getInfoHandler(bot, chatId) {
  const user = await models.User.findOne({ where: { chatId: String(chatId) } });
  if (!user || !user.dataValues) {
    return bot.sendMessage(chatId, 'User not found');
  }
  const { id: inInDB, chatId: chatIdInDB } = user.dataValues;
  const ads = await models.Ad.findAll({
    where: {
      UserId: String(inInDB)
    },
    include: [
      {
        model: models.Country
      }
    ]
  });
  const adsOptions = ads.reduce((acc, val) => {
    acc.push([
      { text: `${val.dataValues.Country.name}: ${val.dataValues.text}`, callback_data: `EDIT:${val.dataValues.id}` }
    ]);
    return acc;
  }, []);
  adsOptions.push([
    { text: 'Назад', callback_data: 'START' }
  ]);
  const adsOptionsSpecified = {
    reply_markup: JSON.stringify({
      inline_keyboard: adsOptions
    })
  };
  return bot.sendMessage(chatId, `Ваши обьявления. id пользователя: ${inInDB}, chatId: ${chatIdInDB}`, adsOptionsSpecified);
}

async function startHandler(bot, chatId) {
  const startOptions = {
    reply_markup: JSON.stringify({
      inline_keyboard: [
        [{ text: FIND_BUTTON_TEXT, callback_data: 'FIND:START' }],
        [{ text: GIVE_BUTTON_TEXT, callback_data: 'GIVE:START' }],
        [{ text: INFO_BUTTON_TEXT, callback_data: 'INFO' }]
      ]
    })
  };
  let user = await models.User.findOne({ where: { chatId: String(chatId) } });
  if (!user) {
    user = await models.User.create({ chatId: String(chatId) });
  }
  await bot.sendMessage(chatId, 'Привет! Это бот для помощи застрявшим за границей. Вы можете разместить своё обьявление, посмотреть обьявления других пользователей. И отредактировать/удалить свои обьявления.', startOptions);
}

async function findHandler(bot, chatId) {

  const countries = await models.Country.findAll({
    include: [
      {
        model: models.Ad
      }
    ]
  });
  const filteredCountries = countries.filter(item => {
    return item.dataValues.Ads.length;
  });
  const adsOptions = filteredCountries.reduce((acc, val) => {
    acc.push([
      { text: val.dataValues.name, callback_data: `FIND:${val.dataValues.number}` }
    ]);
    return acc;
  }, []);
  adsOptions.push([
    { text: 'Назад', callback_data: 'START' }
  ]);
  const findOptionsSpecified = {
    reply_markup: JSON.stringify({
      inline_keyboard: adsOptions
    })
  };
  await bot.sendMessage(chatId, 'Find place to you', findOptionsSpecified);
}

async function getCountry(data) {
  const findedCountry = await models.Country.findOne({ where: { number: String(data) } });

  if (!findedCountry) {
    console.error('🚀 ~ file: index.js ~ line 128 ~ getCountry ~ !findedCountry', findedCountry);
    return null;
  }
  return findedCountry.dataValues;

}

async function main() {
  try {
    await sequelize.authenticate();
    await sequelize.sync();

  } catch (error) {
    console.log('🚀 ~ file: index.js ~ line 59 ~ main ~ error', error);

  }

  const bot = new TelegramBot(TOKEN, {
    polling: false,
    webHook: {
      port: APP_PORT
    }
  });

  bot.setWebHook(`${SERVER_URL}/bot${TOKEN}`);
  bot.setMyCommands([
    { command: '/start', description: 'Начать' },
    { command: '/find', description: FIND_BUTTON_TEXT },
    { command: '/give', description: GIVE_BUTTON_TEXT },
    { command: '/info', description: INFO_BUTTON_TEXT }
  ]);

  bot.on('callback_query', async query => {

    const chatId = query.from.id;
    const user = await models.User.findOne({ where: { chatId: String(query.message.chat.id) } });
    if (!user) {
      return;
    }
    const userId = user.dataValues.id;
    const [type, data] = query.data.split(':');
    switch (type) {
      case 'FIND':
        if (data === 'START') {
          await findHandler(bot, chatId);
          break;
        }
        await bot.sendMessage(chatId, `id of FIND contry ${type} - ${data}`);
        const country = await getCountry(data);
        const ads = await models.Ad.findAll({ where: { CountryId: String(country.id) } });

        await bot.sendMessage(chatId, `Обьявления по стране ${country.name} id: ${country.id}`);
        const adsLength = ads.length;
        if (!adsLength) {
          const backOptionsSpecified = {
            reply_markup: JSON.stringify({
              inline_keyboard: [
                [{ text: 'Назад', callback_data: 'FIND:START' }]
              ]
            })
          };
          await bot.sendMessage(chatId, 'Обьявления не найдены', backOptionsSpecified);
          break;
        }
        ads.forEach(async (val, index) => {
          if (adsLength === index + 1) {
            const backOptionsSpecified = {
              reply_markup: JSON.stringify({
                inline_keyboard: [
                  [{ text: 'Назад', callback_data: 'START' }]
                ]
              })
            };
            await bot.sendMessage(chatId, val.dataValues.text, backOptionsSpecified);
            return;
          }
          await bot.sendMessage(chatId, val.dataValues.text);
        });
        break;
      case 'GIVE':
        if (data === 'START') {
          await bot.sendMessage(chatId, 'give place to you', giveOptions);
          break;
        }
        await bot.sendMessage(chatId, 'Введите текст обьявления');
        let findCountry = await models.Country.findOne({ where: { number: String(data) } });
        if (!findCountry) {
          console.warn('🚀 ~ file: index.js ~ line 115 ~ main ~  NO findCountry - CREATE NEW ONE');
          findCountry = await models.Country.create({ number: data, name: countryListNumeric[data] });
        }

        async function giveHandler(msg) {
          if (msg.text.length < 5) {
            await bot.sendMessage(chatId, 'Обьявление слишком короткое');
            return;
          }
          try {
            const createdAd = await models.Ad.create({ text: msg.text, CountryId: String(findCountry.dataValues.id), UserId: String(userId) });
            console.log('🚀 ~ file: index.js ~ line 245 ~ giveHandler ~ createdAd', createdAd);
            if(!createdAd){
              throw new Error('Ошибка при создании обьявления');
            }
            await bot.sendMessage(chatId, `${findCountry.dataValues.name}: Обьявление с текстом "${msg.text}" было создано`);
          } catch (error) {
            console.log('🚀 ~ file: index.js ~ line 252 ~ giveHandler ~ error', error);
          }
          await bot.removeListener('message', giveHandler);
          await getInfoHandler(bot, chatId);
        }
        await bot.removeAllListeners('message');
        await bot.addListener('message', giveHandler);
        break;
      case 'EDIT':
        const adFind = await models.Ad.findOne({ where: { id: String(data) } });
        console.log('🚀 ~ file: index.js ~ line 174 ~ bot.onText ~ ads', adFind);
        const editOptionsSpecified = {
          reply_markup: JSON.stringify({
            inline_keyboard: [
              [{ text: 'Редактировать', callback_data: `CHANGE:${data}` },],
              [{ text: 'Удалить', callback_data: `DELETE:${data}` }],
              [{ text: 'Назад', callback_data: 'INFO' }],
            ]
          })
        };
        await bot.sendMessage(chatId, `Редактирование объявления ${adFind.dataValues.id} с текстом "${adFind.dataValues.text}"`, editOptionsSpecified);
        break;
      case 'DELETE':
        const deleteOptionsSpecified = {
          reply_markup: JSON.stringify({
            inline_keyboard: [
              [
                { text: 'Да', callback_data: `DELETECONFIRM:${data}` },
                { text: 'Нет', callback_data: `EDIT:${data}` }
              ]
            ]
          })
        };
        await bot.sendMessage(chatId, `Вы уверены что хотите удалить ad ${data}?`, deleteOptionsSpecified);
        break;
      case 'DELETECONFIRM':
        const deleteQuery = await models.Ad.destroy({ where: { id: String(data) } });
        console.log('🚀 ~ file: index.js ~ line 200 ~ main ~ deleteQuery', deleteQuery);
        const adFindAfter = await models.Ad.findOne({ where: { id: String(data) } });
        console.log('🚀 ~ file: index.js ~ line 198 ~ main ~ adFind', adFindAfter);
        await bot.sendMessage(chatId, 'Успешно удалено обьявление');
        await getInfoHandler(bot, chatId);
        break;
      case 'INFO':
        await getInfoHandler(bot, chatId);
        break;
      case 'START':
        await startHandler(bot, chatId);
        break;
      case 'CHANGE':
        const adFindChange = await models.Ad.findOne({ where: { id: String(data) } });
        await bot.sendMessage(chatId, `Редактирование объявления ${adFindChange.dataValues.id} с текстом "${adFindChange.dataValues.text}"`);
        await bot.sendMessage(chatId, 'Пожалуйста введите новое объявления');
        async function giveHandlerChange(msg) {
          if (msg.text.length < 5) {
            await bot.sendMessage(chatId, 'Объявления слишком короткое');
            return;
          }
          try {
            const adUpdated = await models.Ad.update({ text: msg.text }, { where: { id: String(data) } });
            console.log('🚀 ~ file: index.js ~ line 333 ~ giveHandlerChange ~ ad', adUpdated);
            if(!adUpdated){
              throw new Error('ошибка при сохранении');
            }
            await bot.sendMessage(chatId, `Текст объявления ${adFindChange.dataValues.id} был изменен с "${adFindChange.dataValues.text}" на "${msg.text}" `);
            await bot.removeListener('message', giveHandlerChange);
            await getInfoHandler(bot, chatId);
          } catch (error) {
            console.error('🚀 ~ file: index.js ~ line 341 ~ giveHandlerChange ~ error', error);
          }
        }
        await bot.removeAllListeners('message');
        await bot.addListener('message', giveHandlerChange);
        break;
      default:
        break;
    }
    return bot.answerCallbackQuery(query.id);
  });

  bot.onText(/\/start/, async (msg) => {
    const { chat: { id: chatId } } = msg;
    return startHandler(bot, chatId);
  });
  bot.onText(/\/info/, async (msg) => {
    const { chat: { id: chatId } } = msg;
    return getInfoHandler(bot, chatId);
  });
  bot.onText(/\/find/, async (msg) => {
    const { chat: { id: chatId } } = msg;
    return findHandler(bot, chatId);
  });

  bot.onText(/\/give/, async (msg) => {
    const { chat: { id: chatId } } = msg;
    await bot.sendMessage(chatId, 'give place to you', giveOptions);
  });
}
main();
