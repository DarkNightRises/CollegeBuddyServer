var Sequelize = require('sequelize')
    

config = require("./config");
//db = config.database;
//console.log(db)
var sequelize = new Sequelize(config.development.database, config.development.username, config.development.password, {
 dialect: "postgres", // or 'sqlite', 'postgres', 'mariadb'
      port:    5432, // or 5432 (for postgres)
   	pool: {
	max: 5,
	min: 0,
	idle: 10000
},
    }

    );

exports.sequelize = sequelize;