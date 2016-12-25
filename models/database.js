const pg = require('pg');
const connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/collegebuddy';
const client = new pg.Client(connectionString);
client.connect();

var query = client.query('CREATE TABLE IF NOT EXISTS items(id SERIAL PRIMARY KEY, text VARCHAR(40) not null, complete BOOLEAN)');
 query = client.query('create table if not exists College(ID serial primary key, Name Text NOT NULL)');
 query = client.query('create table if not exists Branch(ID serial primary key, Name Text NOT NULL)');
 query = client.query('create table if not exists Section(ID serial primary key,branch_id int,section int NOT NULL,year int NOT NULL,FOREIGN KEY (branch_id) REFERENCES Branch(ID) on delete cascade on update cascade)');
 
 query = client.query('create table if not exists Teacher(ID serial primary key, Name Text NOT NULL,Email Text NOT NULL,Mob_No Text NOT NULL,Password Text NOT NULL,College_Id int not null,gcm_id text,device_id text,FOREIGN KEY (College_Id) REFERENCES College(ID) on delete cascade on update cascade,api_token text not NULL)');
 query = client.query('create table if not exists Student(ID serial primary key, Name Text NOT NULL,Branch Text not null,section_Id int Not Null,College_Id int not null,Year Text NOT NULL,Email Text NOT NULL,Mob_No Text NOT NULL,Password Text NOT NULL,gcm_id text,device_id text,FOREIGN KEY (College_Id) REFERENCES College(ID) on delete cascade on update cascade,FOREIGN KEY (section_Id) REFERENCES Section(ID) on delete cascade on update cascade)');
 
 query = client.query('create table if not exists Subject(ID serial primary key, name text NOT NULL, code text NOT NULL)');
 query = client.query('create table if not exists Section_Students(ID serial primary key, student_Id int,section_Id int ,FOREIGN KEY (student_Id) REFERENCES Student(ID) on delete cascade on update cascade,FOREIGN KEY (section_Id) REFERENCES Section(ID) on delete cascade on update cascade)');
 query = client.query('create table if not exists Section_Subject_Teacher(ID serial primary key,section_Id int ,subject_Id int,teacher_id int, FOREIGN KEY (section_Id) REFERENCES Section(ID) on delete cascade on update cascade, FOREIGN KEY (subject_Id) REFERENCES Subject(ID) on delete cascade on update cascade, FOREIGN KEY (teacher_id) REFERENCES Teacher(ID) on delete cascade on update cascade)'); 
 query = client.query('create table if not exists Attendance(Id serial primary key,student_Id int,subject_Id int,datetime timestamp default null,present BOOLEAN default FALSE,FOREIGN KEY (student_Id) REFERENCES Student(ID) on delete cascade on update cascade,FOREIGN KEY (subject_Id) REFERENCES Subject(ID) on delete cascade on update cascade)');
 query = client.query('create table if not exists Question(ID serial primary key,question_text text NOT NULL)');
 query = client.query('create table if not exists Choices(id serial primary key,choice_text text NOT NULL, question_Id int not null,FOREIGN KEY (question_Id) REFERENCES Question(ID) on delete cascade on update cascade)');
 query = client.query('create table if not exists Test(ID serial primary key,nameofTest text NOT NULL, sst_id int,FOREIGN KEY (sst_id) REFERENCES Section_Subject_Teacher(ID) on delete cascade on update cascade)');
query = client.query('create table if not exists Test_Question(id serial primary key,test_id int, question_Id int, FOREIGN KEY (test_id) REFERENCES Test(ID) on delete cascade on update cascade,FOREIGN KEY (question_Id) REFERENCES Question(ID) on delete cascade on update cascade)');
//Question id added in table to map question to answer
console.log("done");
query = client.query('create table if not exists Answer(id serial primary key,test_id int,student_Id int,choice_id int,FOREIGN KEY (choice_id) REFERENCES Choices(ID) on delete cascade on update cascade,FOREIGN KEY (test_id) REFERENCES Test(ID) on delete cascade on update cascade,FOREIGN KEY (student_Id) REFERENCES Student(ID) on delete cascade on update cascade)');
 query = client.query('create table if not exists Notification(ID serial primary key,notification_text text NOT NULL, sst_id int,FOREIGN KEY (sst_id) REFERENCES Section_Subject_Teacher(ID) on delete cascade on update cascade)');
 query = client.query('create table if not exists Review(ID serial PRIMARY KEY,student_Id int, review_text text NOT NULL, teacher_id int,FOREIGN KEY (teacher_id) REFERENCES Teacher(ID) on delete cascade on update cascade)');
 query = client.query('create table if not exists Query(ID serial PRIMARY KEY,query_text text NOT NULL,student_Id int,teacher_id int,response text , issolved BOOLEAN not null,FOREIGN KEY (teacher_id) REFERENCES Teacher(ID) on delete cascade on update cascade,FOREIGN KEY (student_Id) REFERENCES Student(ID) on delete cascade on update cascade)');
console.log("done");
query.on('end', () => { client.end(); });

