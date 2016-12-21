const pg = require('pg');
const connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/collegebuddy';

const client = new pg.Client(connectionString);
client.connect();
var query = client.query(
  'CREATE TABLE IF NOT EXISTS items(id SERIAL PRIMARY KEY, text VARCHAR(40) not null, complete BOOLEAN)');
 query = client.query('create table if not exists Teacher(ID serial primary key,Name Text NOT NULL,Email Text NOT NULL,Mob_No Text NOT NULL,Password Text NOT NULL,College Text not null,gcm_id text,device_id text)');
 query = client.query('create table if not exists Student(ID serial primary key,Name Text NOT NULL,Branch Text not null,Section Text Not Null,College Text not null,Year Text NOT NULL,Email Text NOT NULL,Mob_No Text NOT NULL,Password Text NOT NULL,gcm_id text,device_id text)');
 
query.on('end', () => { client.end(); });