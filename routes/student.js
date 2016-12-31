/***
Module for Student API
***/
//Requirements
var express = require('express');
var app = express();
var fs = require("fs");
var pg = require("pg");
var bodyParser = require("body-parser");
var router = express.Router();
var Promise = require('promise')
var connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/collegebuddy'

//For parsing post json data in API
//Pushing
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
module.exports = function(app)
{

	app.get('/print', function(req, res){
		res.end('Hello babay')
	});

//API for Login Student
app.post('/api/loginStudent',function(req,res){
	pg.connect(connectionString, function(err,client,done){	
		var results = [];
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

app.get('/api/getCollegeList',function(req,res){
	pg.connect(connectionString,function(err,client,done){
			if(err){
			done();
			console.log(err)
			return res.status(500).json({success: false, data: 'Connection to database failed'});
		}	
		var results = [];
		var query = 'Select * from College';
		var executePromise = executeQuery(query,client);
		executePromise.then(function(value){
		results = value;
		if(results.length == 0)
		{
			return res.status(200).json({success:true, data:'No college yet'});
		}
		else{
				return res.status(200).json({success:true, data:results});
		
		}
		});
	});
});
app.get('/api/getBranch',function(req,res){
	pg.connect(connectionString,function(err,client,done){
			if(err){
			done();
			console.log(err)
			return res.status(500).json({success: false, data: 'Connection to database failed'});
		}	
		var results = [];
		var query = 'Select * from Branch';
		var executePromise = executeQuery(query,client);
		executePromise.then(function(value){
		results = value;
		if(results.length == 0)
		{
			return res.status(200).json({success:true, data:'No branches yet'});
		}
		else{
				return res.status(200).json({success:true, data:results});
		
		}
		});
	});
});

/***
Api for student to upload his attendance
***/
app.post('/api/uploadAttendance',function(req,res){
	pg.connect(connectionString,function(err,client,done){
		var data ={		
			id:req.body.id,	
			dataflow: 1,
			subject_id: req.body.subject_id,
			datetime: 	req.body.datetime,
			present: req.body.present
		};
	
var api_token = req.headers['auth-token'];
		var checkVaildUser = checkAuthToken(api_token,client,data);
		checkVaildUser.then(function(value){
			console.log(value);
			if(value == 'Valid'){
		var uploadPromise = uploadAttendace(data,client);
		// var currentTime = Date.now();
		// console.log(currentTime.getTime());
		uploadPromise.then(function(value){
			if(value == 'done'){
				done();
				return res.status(200).json({success:true,data:"Attendance Upload Succesfull"});
			}
			else{
				done();
				return res.status(200).json({success:false,data:"Reload your attendance again"});
			}
		});		
			}
		else if(value == 'Invalid'){
				done();
				res.status(403).json({success:false, data: 'Invalid User'})
			}
		});

	
	});
});

function uploadAttendace(data,client)
{
	return new Promise(function(resolve,reject){
		var executeQuery = client.query('Insert into Attendance(student_id,subject_id,datetime,present) values($1,$2,$3,$4)',
			[data.id,data.subject_id,data.datetime,data.present]);
		executeQuery.on('end',function(){
			return resolve('done');
		});
	});
}



app.post('/api/signupStudent',function(req,res){
	var results = [];
	var data = {
		name: req.body.name, 
		branch_id: req.body.branch_id,
		section: req.body.section,
		year: req.body.year,
		email: req.body.email, 
		mobile_no: req.body.mobile_no,
		password: req.body.password,
		college_id: req.body.college_id,
		student_number: req.body.student_number
	};	
pg.connect(connectionString, function(err,client,done){
		if(err){
			done();
			console.log(err)
			return res.status(500).json({success: false, data: 'Connection to database failed'});
		}
		var email = '\''+data.email+'\'';
		var queryString = 'SELECT * from Student where email = '+email;
		var promise=executeQuery(queryString,client);
		promise.then(function(value){
			results = value
			if(value.length>0){
				done();
				return res.status(403).json({success: false, data:'Email already exists'}); 
			}
			var section = data.section;
			var year = data.year;
			var branch_id = data.branch_id;
			var sectionGetQuery = ('Select id from section where section = '+section+' AND branch_id = '+branch_id+
				' AND year = '+year);
			var sectionPromise = executeQuery(sectionGetQuery,client);
			sectionPromise.then(function(value){
				console.log('Section promise value is '+value);
				var results = [];
				results = value;
				if(results.length>0){
					var sec_arr = results[0]
					var section_id = sec_arr['id'];
					data.section_id = section_id;
					var executeSign  = executeSignUpQuery(data,client);
					console.log('got section_i '+data.section_id);
					executeSign.then(function(value){
					console.log('Results in signup is '+value);
						promise = executeQuery(queryString,client);
						promise.then(function(value){
					console.log("Fuccccc    "+data.section_id+"	"+value[0]['id']);
					var insertSectionStudentQuery = client.query('Insert into section_students(section_id,student_id) values($1,$2)',[data.section_id,value[0]['id']]);
						insertSectionStudentQuery.on('end',function(){
				return res.status(200).json({success:true,data: value});
						});
							


						});
					});
				}
				else{
				var insertSectionQuery = ('Insert into section(branch_id,section,year) values ('+branch_id+','+section+','+year+')');
				var insertSectionPromise = executeInsertQuery(insertSectionQuery,client);
				insertSectionPromise.then(function(value){
					
					// results = [];
					// results = value;
					// var sec_arr = results[0];
					
					//  section_id = sec_arr['id'];
					console.log('inside isp new');
					// data.section_id = section_id;
					sectionGetQuery = ('Select id from section where section = '+section+' AND branch_id = '+branch_id+
				' AND year = '+year);
					sectionPromise = executeQuery(sectionGetQuery,client);
					sectionPromise.then(function(value){
						 results = [];
					 results = value;
					 var sec_arr = results[0];
						var section_id = sec_arr['id'];
						data.section_id = section_id;
						console.log('got section_id in'+section_id);
					var executeSignQuery  = executeSignUpQuery(data,client);
					executeSignQuery.then(function(value){
						promise = executeQuery(queryString,client);
						console.log('inside 2dd');
						promise.then(function(value){
						console.log('inside dd');
						var insertSectionStudentQuery = client.query('Insert into section_students(section_id,student_id) values($1::int,$2::int)',[data.section_id,value[0]['id']]);
						insertSectionStudentQuery.on('end',function(){
						done();
						return res.status(200).json({success:true,data: value});
						});
							
						});
					});
					});
				});					
				}
			})
		});

	});

});



//Promises for Select Query
function executeQuery(quer,client){
	console.log('Inside ec'+quer)
	return new Promise(function (resolve,reject){
		var results = [];
		var query = client.query(quer);
		query.on('row', function(row) {
			console.log(row);
			results.push(row);
		});
		query.on('end', function()  {
		
			return resolve(results);
		});
	});
}
function executeInsertQuery(querString,client){

	return new Promise(function (resolve,reject){
		var query = client.query(querString);
		query.on('end',function(){
			return resolve('done');
		});
	});
}
//Promises to check during sign up whether email already exists
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

//Promises to post data during signup
function executeSignUpQuery(data,client){
	console.log('Inside IC')
	return new Promise(function(resolve,reject){
		console.log('Sign up started');
		var uuid = require("uuid/v1");

		var newquery = client.query('INSERT INTO Student(name, section_id, college_id, email, mob_no, password, gcm_id, device_id, api_token) values($1, $2, $3, $4, $5, $6, 0, 0, $7)',
			[data.name, data.section_id, data.college_id, data.email, data.mobile_no, data.password,uuid()]);
		newquery.on('end',function(){
			console.log('done');
			return resolve('done');});
		
	});
}
//Promise to check auth token
function checkAuthToken(auth_token,client,data){
	return new Promise(function(resolve,reject){
		var connectionquery ;
		if(data.dataflow == 0){
			connectionquery = client.query('Select api_token from Teacher where id = $1',[data.id]);
		}
		else if(data.dataflow == 1){
			connectionquery = client.query('Select api_token from Student where id = $1',[data.id]);	
		}
		
		var results = [];
		connectionquery.on('row',function(row){
			console.log('Row is '+ row);
			results.push(row);
		});
		connectionquery.on('end',function(){
			//console.log('auth token '+results[0].api_token+'   auth_of_user '+auth_token+'   query '+connectionquery);
			if(results.length!=0 && results[0].api_token == auth_token){
				console.log('valid');
				return resolve('Valid');
			}
			else{
				console.log('invalid');
				return resolve('Invalid');
			}
		});
		
	});
}
}
