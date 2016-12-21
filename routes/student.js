var express = require('express');
var app = express();
var fs = require("fs");
var pg = require("pg");
var bodyParser = require("body-parser");
var router = express.Router();
var Promise = require('promise')
var connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/collegebuddy'

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
module.exports = function(app){

	app.get('/print', function(req, res){
		res.end('Hello babay')
	});
	app.post('/api/loginStudent',function(req,res){
		pg.connect(connectionString, function(err,client,done){	
			if (err){
				done();
				console.log(err)
				return res.status(500).json({success: false, data: 'Connection to database failed'});
				
			}
			var email = req.body.email;
			var password = req.body.password;
			var queryString = 'Select * from Student where email=\''+email+'\' and password=\''+password+'\'';
			var promise = executeQuery(queryString,client);
			promise.then(function(value){
				if(value.length>0){
					return res.status(200).json({success:true,data: value});
				}
				else
					return res.status(200).json({success:false, data: 'Invalid email id or password'});
			});});
	});
	app.post('/api/signupStudent', function(req, res){
		var results = [];
		var data = {
			name: req.body.name, 
			branch: req.body.branch,
			section: req.body.section,
			year: req.body.year,
			email: req.body.email, 
			mobile_no: req.body.mobile_no,
			password: req.body.password,
			college_name: req.body.college_name
		};
		pg.connect(connectionString, function(err,client,done){
			if(err){
				done();
				console.log(err)
				return res.status(500).json({success: false, data: 'Connection to database failed'});
			}
			var queryString = ('SELECT * from Student where email = \''+data.email+'\'');
			var promise=executeQuery(queryString,client);
			console.log('Value is qs '+queryString);


			promise.then(function(value){
				console.log('Value is '+value);
				results = value
				if(value.length>0){
					done();
					return res.status(500).json({success: false, data:'Email already exists'}); 
				}
				//queryString = ('INSERT INTO Student(name, branch,section, college, year, email, mob_no, password) values($1, $2, $3, $4, $5, $6, $7, $8)',
				//[data.name, data.branch, data.section, data.college_name, data.year, data.email, data.mobile_no, data.password]);

			var insertPromise = executeSignUpQuery(data,client);
			insertPromise.then(function(value)
			{
				done();
				return res.status(200).json(data);
			});

		});


		});
});
function executeQuery(quer,client){
	console.log('Inside ec'+quer)
	return new Promise(function (resolve,reject){
		var results = [];
		var query = client.query(quer);
		query.on('row', function(row) {
			results.push(row);
		});
		query.on('end', function()  {
			console.log('Results\n'+results);
			return resolve(results);
		});
	});
}
function executeEmailQuery(quer,client,data){
	console.log('Inside ec')
	return new Promise(function (resolve,reject){
		var results = [];
		var query = client.query(quer,data.email);
		query.on('row', function(row) {
			results.push(row);
		});
		query.on('end', function()  {
			console.log('Results\n'+results);
			return resolve(results);
		});
	});
}
function executeSignUpQuery(data,client){
	console.log('Inside IC')
	return new Promise(function (resolve,reject){
		var results = [];
		var newquery = client.query('INSERT INTO Student(name, branch,section, college, year, email, mob_no, password) values($1, $2, $3, $4, $5, $6, $7, $8)',
			[data.name, data.branch, data.section, data.college_name, data.year, data.email, data.mobile_no, data.password]);
		return resolve('done');
	});
}
}
