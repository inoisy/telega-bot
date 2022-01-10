const  sequelize  = require('./db.js') ;
const { DataTypes } = require( 'sequelize');
const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, unique: true, autoIncrement: true, allowNull: false, },
  chatId: { type: DataTypes.STRING, unique: true },
}, {
  timestamps: true
});

const Ad = sequelize.define('Ad', {
  id: { type: DataTypes.INTEGER, primaryKey: true, unique: true, autoIncrement: true, allowNull: false, },
  text: { type: DataTypes.STRING, unique: true, allowNull: false, },
}, {
  timestamps: true
});

const Country = sequelize.define('Country', {
  id: { type: DataTypes.INTEGER, primaryKey: true, unique: true, autoIncrement: true, allowNull: false, },
  name: { type: DataTypes.STRING, unique: true },
  number: { type: DataTypes.INTEGER, unique: true, allowNull: false, },
}, {
  timestamps: true
});
User.hasMany(Ad);
Ad.belongsTo(User);
Country.hasMany(Ad);
Ad.belongsTo(Country);
sequelize.sync({ alter: true}); //force: true 
module.exports = {
  User,
  Ad,
  Country
};