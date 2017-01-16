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
var connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/collegebuddy';
var config = {
  database: 'collegebuddy', //env var: PGDATABASE
  host: connectionString, // Server hosting the postgres database
  port: 5432, //env var: PGPORT
  max: 10, // max number of clients in the pool
  idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
};
//For parsing post json data in API
var pool = new pg.Pool(config);
	
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
module.exports = function(app)
{

	app.get('/print', function(req, res){
		res.end('Hello babay')
	});




/***
api to send query by student 
***/
app.post('/api/sendQuery',function(req,res){
	pg.connect(connectionString,function(err,client,done){
		checkForError(err);
		var data = {
			id : req.body.id,
			sst_id : req.body.sst_id,
			dataflow : 1,
			query_text : req.body.query_text
		};
		var api_token = req.headers['auth_token'];
		var checkVaildUser = checkAuthToken(api_token,client,data);
		checkVaildUser.then(function(value){
			if(value == 'Valid'){
				var getinfoSSTPromise = getinfoSST(data.sst_id,client);
				getinfoSSTPromise.then(function(value){
					var sst_data = value[0];
					console.log(sst_data);
					var insertQueryinQueryPromise = insertQueryinQuery(data,sst_data,client);
					insertQueryinQueryPromise.then(function(value){
							console.log(value);
									done();
							return res.status(200).json({success: true, data: 'Query Send.'});


/***

value received through function value contains gcm_id of teacher pn which the push notification is to be sent.

Todo

Send GCM to teacher_id still left

***/

});
				});	
			}
			else if(value == 'Invalid'){
				done();
				return res.status(403).json({success:false, data : 'Invalid User'});
			}
		});
	})
});
//var subquery = ('INSERT INTO Subject(name, code) SELECT * FROM (SELECT '+name+', '+code+') AS tmp WHERE NOT EXISTS (SELECT name FROM Subject WHERE code = '+code+') LIMIT 1');

function insertQueryinQuery(data,sst_data,client){
	return new Promise(function(resolve,reject){
		var insertQuery = client.query('Insert into Query(student_id,teacher_id,query_text) Select * from (Select $1::int,$2::int,$3::text) AS tmp where not exists (Select id from Query where student_id = $1 and teacher_id = $2 and query_text =$3) LIMIT 1',[data.id,sst_data.teacher_id,data.query_text]);
		insertQuery.on('end',function(){
			// var gcm_id=0;
			// var data = {};
			// var getTeacherInfo = client.query('Select gcm_id from teacher where id = $1',[sst_data.teacher_id]);
			// getTeacherInfo.on('row',function(row){
			// 	gcm_id = row.gcm_id;

			// });
			// getTeacherInfo.on('end',function(){
			// 	var getQueryId = client.query('Select id from Query where student_id = $1 and teacher_id = $2 and query_text =$3',[data.id,sst_data.teacher_id,data.query_text]);
			// 		getQueryId.on('row',function(row){
			// 			data = row;
			// 		});
			// 		getQueryId.on('end',function(){
			// 		data.gcm_id = gcm_id;
			// 		return resolve(data);	
			// 		});
					
			// });
			return resolve('done');

		});
	});
}
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
	console.log('API changed again'+connectionString);
	pg.connect(connectionString,function(err,client,done){
		if(err){
			done();
			console.log('Error is \n'+err)
			return res.status(500).json({success: false, data: 'Connection to database failed'});
		}	
		var results = [];
		var query = 'Select * from College';
		var executePromise = executeQuery(query,client);
		executePromise.then(function(value){
			results = value;
			if(results.length == 0)
			{
				done();
				return res.status(200).json({success:true, data:'No college yet'});
			}
			else{
				done();
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
			done();
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
API for student to post a review for a particular teacher
***/
app.post('/api/sendReview',function(req,res){
	pg.connect(connectionString,function(err,client,done){
		if(err){
			done();
			console.log(err)
			return res.status(500).json({success: false, data: 'Connection to database failed'});
		}	
		var data = {
			dataflow: 1,
			id:req.body.id,
			sst_id: req.body.sst_id,
			review_text: req.body.review_text
		};

		var api_token = req.headers['auth_token'];
		var checkVaildUser = checkAuthToken(api_token,client,data);
		checkVaildUser.then(function(value){
			if(value == 'Valid'){
				var getinfoSSTPromise = getinfoSST(data.sst_id,client);
				getinfoSSTPromise.then(function(value){
					var sst_data = value[0];
					var insertintoReviewPromise = insertintoReview(data,sst_data,client);
					insertintoReviewPromise.then(function(value){
						if(value == 'done'){
							done();
							return res.status(200).json({success:true, data: 'Your review has been Succesfully uploaded'});
						}
					});
				});
			}	
			else{
				done();
				res.status(403).json({success:false, data: 'Invalid User'})

			}
		});

	});
});

function insertintoReview(student_data,sst_data,client){
	return new Promise(function(resolve,reject){
		var insertQuery = client.query('Insert into Review(student_id,review_text,teacher_id,subject_id) values ($1,$2,$3,$4)',
			[student_data.id,student_data.review_text,sst_data.teacher_id,sst_data.subject_id]);
		insertQuery.on('end',function(){
			return resolve('done');
		})
	});
}

//function to get name of subject,branch , section with their respective ids 
function getSubBranchSectCollege(test_data,client)
{
	return new Promise(function(resolve,reject){
		var data = {};
		var getSubquery = client.query('Select name from subject where id = $1',[test_data.subject_id]);
		getSubquery.on('row',function(row){
			data.subject_name = row['name'];
		});
		getSubquery.on('end',function(){
			var getSecquery = client.query('Select * from section where id = $1',[test_data.section_id]);
			getSecquery.on('row',function(row){
				data.section = row['section'];
				data.year = row['year'];
				data.branch_id = row['branch_id'];
			});
			getSecquery.on('end',function(){
				var getBranchquery = client.query('Select name from branch where id = $1',[data.branch_id]);
				getBranchquery.on('row',function(row){
					data.branch_name = row['name'];
				});
				getBranchquery.on('end',function(){
					return resolve(data);
				});
			});
		});
	});
}
/***
	function to get branch_id , subject_id , section_id from Section_subject
	_teacher table with sst_id given
	***/
	function getinfoSST(id,client){
		return new Promise(function(resolve,reject){
			var result =[];
			var infoquery = client.query('Select * from Section_Subject_Teacher where id =$1',[id]);
			infoquery.on('row',function(row){
				console.log('row'+row['section_id']);
				result.push(row);
			});
			infoquery.on('end',function(){
				return resolve(result);
			});
		});
	}
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

		var api_token = req.headers['auth_token'];
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


/***
API to student to submit test
***/
app.post('/api/giveTest',function(req,res){
	pg.connect(connectionString,function(err,client,done){
		checkForError(err);
		var data = {
			id: req.body.id,
			dataflow: 1,
			test_id: req.body.test_id,
			choices: req.body.choices
		};
		var api_token = req.headers['auth_token'];
		var checkVaildUser = checkAuthToken(api_token,client,data);
		checkVaildUser.then(function(value){
			if(value == 'Valid'){
				var checkIsTestActivePromise = checkIsTestActive(data.test_id,client);
				checkIsTestActivePromise.then(function(value){
					if(value == true){
						var uploadAnswerPromise = uploadAnswer(data,client);
						uploadAnswerPromise.then(function(value){
							if(value == 'done'){
								done();
								return res.status(200).json({success:true,data: 'Test Upload Successful'});
							}
						});
					}
					else{
						return res.status(200).json({success:true,data: 'Test Already Over'});
						
					}
				})
				
			}
			else if(value == 'Invalid'){
				done();
				res.status(403).json({success:false, data: 'Invalid User'});
			}
		});
	});
});

app.post('/api/getTest',function(req,res){
	pg.connect(connectionString,function(err,client,done){
		checkForError(err);
		var data = {
			id: req.body.id,
			test_id: req.body.test_id,
			dataflow: 1
		};
		var api_token = req.headers['auth_token'];
		var checkVaildUser = checkAuthToken(api_token,client,data);
		checkVaildUser.then(function(value){
			if(value == 'Valid'){
				var checkIsTestActivePromise = checkIsTestActive(data.test_id,client);
				checkIsTestActivePromise.then(function(value){
					if(value == true){
						var getTestpromise = getTest(data,client);
						getTestpromise.then(function(value){
							return res.status(200).json({success:true, data: value});
						});
					}
					else{
						return res.status(200).json({success:true,data: 'Test Already Over'});

					}	
				});}
				else if (value == 'Invalid'){
					done();
					return res.status(403).json({success: false, data: 'Invalid User'});
				}
			});
	});
});
function getTest(data,client){
	return new Promise(function(resolve,reject){
		console.log('Inside get test');
		var finalQuestionList = [];
		var finalQuestionNamesList = [];
		var finalAnswerList = [];
		var getQuestionsList = client.query('Select * from test_question where test_id = $1 ',[data.test_id]);
		getQuestionsList.on('row',function(row){
			finalQuestionList.push(row);
		});
		getQuestionsList.on('end',function(){
			var count = 0,i=0;
			console.log('Inside get test'+JSON.stringify(finalQuestionList));
			for (i = 0;i<finalQuestionList.length;i++){
				var getQuestionNames = client.query('Select * from Question where id = $1',[finalQuestionList[i].question_id]);
				getQuestionNames.on('row',function(row){
					finalQuestionNamesList.push(row);
				});
				getQuestionNames.on('end',function(){
					count = count+1;
					if(count == finalQuestionList.length){
						console.log('Inside get test FQL'+JSON.stringify(finalQuestionNamesList));
						count=0;
						i=0;
						for(i=0;i<finalQuestionList.length;i++){
							console.log(finalQuestionList[i].question_id);
							var getAnswerQuery = client.query('Select * from choices where question_id = $1',[finalQuestionList[i].question_id]);
							getAnswerQuery.on('row',function(row){
								var test_data = {
									question_text: finalQuestionList[Math.floor(count/4)].question_text,
									answer:row
								};
								console.log(JSON.stringify(test_data)+'	'+JSON.stringify(row));
								
								finalAnswerList.push(test_data);
							});
							getAnswerQuery.on('end',function(){
								count = count+1;
								console.log('Counst is '+count);
								if(count == (finalQuestionList.length))
								{
									console.log('Inside get test'+finalAnswerList);

									return resolve(finalAnswerList);
								}
							});
						}

					}
				});
}
});
});
}
app.post('/api/getActiveTests',function(req,res){
	pg.connect(connectionString,function(err,client,done){
		checkForError(err);
		var data = {
			id: req.body.id,
			dataflow: 1,
			subjects:req.body.subjects
		};
		var api_token = req.headers['auth_token'];
		var checkVaildUser = checkAuthToken(api_token,client,data);
		checkVaildUser.then(function(value){
			if( value == 'Valid'){
				var subjects = data.subjects;
				var count = 0,i=0;
				console.log('Inside active tests');
				var activeSubjectsList = [];
				for (i=0;i<subjects.length;i++){
					console.log('Inside active tests'+subjects[i].sst_id);
					var checkIsTestForSubjectActivePromise = checkIsTestForSubjectActive(subjects[i].sst_id,client);
					checkIsTestForSubjectActivePromise.then(function(value){
						var subjectObject = {
							id: subjects[count].sst_id,
							data: value
						};
						activeSubjectsList.push(subjectObject);
						count = count+1;
						if(count == subjects.length){
							return res.status(200).json({success: true, data: activeSubjectsList});
						}
					});
				}
			}
			else if (value == 'Invalid'){
				done();
				return res.status(403).json({success:false, data:'Invalid User'});
			}
		});

	});
});

function checkIsTestForSubjectActive(sst_id,client){
	return new Promise(function(resolve,reject){
		var isactive = {};
		var checkIsTestForSubjectActiveQuery = client.query('Select * from test where sst_id = $1 and isactive = $2',[sst_id,true]);
		checkIsTestForSubjectActiveQuery.on('row',function(row){
			isactive.test_id = row.id;
			isactive.isactive = row.isactive
		});
		checkIsTestForSubjectActiveQuery.on('end',function(){
			return resolve(isactive);
		});
	});
}

function checkIsTestActive(test_id,client){
	return new Promise(function(resolve,reject){
		var isactive = false;
		var checkIsTestActiveQuery = client.query('Select isactive from Test where id = $1',[test_id]);
		checkIsTestActiveQuery.on('row',function(row){
			isactive = row.isactive;
		});
		checkIsTestActiveQuery.on('end',function(){
			return resolve(isactive);
		})
	});
}	
function uploadAnswer(data,client){
	return new Promise(function(resolve,reject){
		console.log('Inside upload answer');
		var choices_list = data.choices;
		var test_id = data.test_id;
		var i=0,count =0 ;
		for(i=0;i<choices_list.length;i++){
			console.log('Inside upload answer');
		//var insertQuestionQuery = client.query('Insert into question(question_text) Select * from (Select $1::text) AS tmp where not exists (Select id from question where question_text = $1::text) LIMIT 1',[questions[i].question_text]);					
		var insertAnswerQuery = client.query('Insert into answer(test_id,student_id,choice_id) Select * from (Select $1::int,$2::int,$3::int) AS tmp where not exists (Select id from answer where test_id = $1::int and student_id = $2::int and choice_id = $3::int) LIMIT 1',[test_id,data.id,choices_list[i].choice_id]);
		insertAnswerQuery.on('end',function(value){
			count = count+1;
			if(count == choices_list.length){
				return resolve('done');
			}
		});
	}

});
}




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


function checkForError(err){
	if(err) {
		done();
		console.log(err);
		return res.status(500).json({success: false, data: err});
	}
}
}
