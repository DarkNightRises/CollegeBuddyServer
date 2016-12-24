const pg = require('pg');
const connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/collegebuddy';

const client = new pg.Client(connectionString);
client.connect();
var Sequelize = require('sequelize')
// sequelize = new Sequelize('collegebuddy', 'kartikey', 'glassgow161', {
//       dialect: "postgres", // or 'sqlite', 'postgres', 'mariadb'
//       port:    5432, // or 5432 (for postgres)
//    	pool: {
// 	max: 5,
// 	min: 0,
// 	idle: 10000
// },
//     }

//     );

// sequelize
//   .authenticate()
//   .then(function(err) {
//     console.log('Connection has been established successfully.');
//   }, function (err) { 
//     console.log('Unable to connect to the database:', err);
//   });
var sequelize = require('../config/dbconfig').sequelize;
var query = client.query(
  'CREATE TABLE IF NOT EXISTS items(id SERIAL PRIMARY KEY, text VARCHAR(40) not null, complete BOOLEAN)');
 query = client.query('create table if not exists Teacher(ID serial primary key,Name Text NOT NULL,Email Text NOT NULL,Mob_No Text NOT NULL,Password Text NOT NULL,College Text not null,gcm_id text,device_id text)');
 query = client.query('create table if not exists Student(ID serial primary key,Name Text NOT NULL,Branch Text not null,Section Text Not Null,College Text not null,Year Text NOT NULL,Email Text NOT NULL,Mob_No Text NOT NULL,Password Text NOT NULL,gcm_id text,device_id text)');
 
query.on('end', () => { client.end(); });

var test = sequelize.define('test',{
username: Sequelize.STRING,
password: Sequelize.STRING
},{
	table_name: 'test'
});
sequelize.sync().then(function(){
test.create({ 
	username: 'john-doe',
  password: 'i-am-so-great'
}).then(function(value){
	console.log('done');
}
);});