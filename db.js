const { Sequelize } = require('sequelize');
const dataBaseConnectionURI = process.env.DATABASE_URI;
const connection = new Sequelize(dataBaseConnectionURI);
module.exports =  connection;