const pg = require('pg');
const connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/collegebuddy';
const client = new pg.Client(connectionString);
client.connect();

var query = client.query('CREATE TABLE IF NOT EXISTS items(ID SERIAL PRIMARY KEY, text VARCHAR(40) not null, complete BOOLEAN)');
 query = client.query('create table if not exists College(ID serial primary key, name Text NOT NULL)');
 query = client.query('create table if not exists Branch(ID serial primary key, name Text NOT NULL)');
 query = client.query('create table if not exists Section(ID serial primary key,branch_id int,section int NOT NULL,year int NOT NULL,FOREIGN KEY (branch_id) REFERENCES Branch(ID) on delete cascade on update cascade)');
 
 query = client.query('create table if not exists Teacher(ID serial primary key, name Text NOT NULL,email Text NOT NULL,mob_No Text NOT NULL,password Text NOT NULL,college_id int not null,gcm_id text,device_id text,FOREIGN KEY (college_Id) REFERENCES College(ID) on delete cascade on update cascade,api_token text not NULL)');
 query = client.query('create table if not exists Student(ID serial primary key, name Text NOT NULL,section_Id int Not Null,college_id int not null,email Text NOT NULL,mob_no Text NOT NULL,password Text NOT NULL,gcm_id text,device_id text,api_token text not NULL,FOREIGN KEY (college_id) REFERENCES College(ID) on delete cascade on update cascade,FOREIGN KEY (section_id) REFERENCES Section(ID) on delete cascade on update cascade)');
 
 query = client.query('create table if not exists Subject(ID serial primary key, name text NOT NULL, code text NOT NULL)');
 query = client.query('create table if not exists Section_Students(ID serial primary key, student_id int,section_id int ,FOREIGN KEY (student_id) REFERENCES Student(ID) on delete cascade on update cascade,FOREIGN KEY (section_id) REFERENCES Section(ID) on delete cascade on update cascade)');
 query = client.query('create table if not exists Section_Subject_Teacher(ID serial primary key,section_id int ,subject_id int,teacher_id int, FOREIGN KEY (section_id) REFERENCES Section(ID) on delete cascade on update cascade, FOREIGN KEY (subject_id) REFERENCES Subject(ID) on delete cascade on update cascade, FOREIGN KEY (teacher_id) REFERENCES Teacher(ID) on delete cascade on update cascade)'); 
 query = client.query('create table if not exists Attendance(Id serial primary key,student_id int,subject_id int,datetime bigint default null,present BOOLEAN default FALSE,FOREIGN KEY (student_id) REFERENCES Student(ID) on delete cascade on update cascade,FOREIGN KEY (subject_id) REFERENCES Subject(ID) on delete cascade on update cascade)');
 query = client.query('create table if not exists Question(ID serial primary key,question_text text NOT NULL)');
 query = client.query('create table if not exists Choices(id serial primary key,choice_text text NOT NULL, question_id int not null,FOREIGN KEY (question_id) REFERENCES Question(ID) on delete cascade on update cascade)');
 query = client.query('create table if not exists Test(ID serial primary key,nameofTest text NOT NULL, sst_id int,FOREIGN KEY (sst_id) REFERENCES Section_Subject_Teacher(ID) on delete cascade on update cascade)');
query = client.query('create table if not exists Test_Question(ID serial primary key,test_id int, question_id int, FOREIGN KEY (test_id) REFERENCES Test(ID) on delete cascade on update cascade,FOREIGN KEY (question_id) REFERENCES Question(ID) on delete cascade on update cascade)');
//Question id added in table to map question to answer
console.log("done");
query = client.query('create table if not exists Answer(ID serial primary key,test_id int,student_id int,choice_id int,FOREIGN KEY (choice_id) REFERENCES Choices(ID) on delete cascade on update cascade,FOREIGN KEY (test_id) REFERENCES Test(ID) on delete cascade on update cascade,FOREIGN KEY (student_id) REFERENCES Student(ID) on delete cascade on update cascade)');
 query = client.query('create table if not exists Notification(ID serial primary key,notification_text text NOT NULL, sst_id int,FOREIGN KEY (sst_id) REFERENCES Section_Subject_Teacher(ID) on delete cascade on update cascade)');
 query = client.query('create table if not exists Review(ID serial PRIMARY KEY,student_id int, review_text text NOT NULL, teacher_id int,FOREIGN KEY (student_id) REFERENCES Student(ID) on delete cascade on update cascade,FOREIGN KEY (teacher_id) REFERENCES Teacher(ID) on delete cascade on update cascade)');
 query = client.query('create table if not exists Query(ID serial PRIMARY KEY,query_text text NOT NULL,student_id int,teacher_id int,response text , issolved BOOLEAN not null,FOREIGN KEY (teacher_id) REFERENCES Teacher(ID) on delete cascade on update cascade,FOREIGN KEY (student_id) REFERENCES Student(ID) on delete cascade on update cascade)');
console.log("done");
query.on('end', () => { client.end(); });

