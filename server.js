/***
Module for managing Teacher API
***/
var express = require('express');
var app = express();
var fs = require("fs");
var pg = require("pg");
var FCM = require('fcm-node');
var serverKey = 'AIzaSyAcfb4UmBBpoJd_gE5-hl478JKSVS_teKU';
var fcm = new FCM(serverKey);
var bodyParser = require("body-parser");
var router = express.Router();
connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/collegebuddy';
require('./models/database');
// var db = require('./models/database');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


//Function to send message to class subscribed to a particular topic
function sendMessages(data_subject,reason_for_meesage){
	var messageAddress = data_subject.subject_name+data_subject.section+data_subject.branch_name+data_subject.year;
	
	
	var jsonData = data_subject;
	console.log('Go tjson data'+jsonData+'	'+messageAddress);
	if(reason_for_meesage == 'attendance'){
		var payloadString = {
			"reason": ""+reason_for_meesage,
			"data": jsonData
		};
		dataPayload = {payload:(payloadString)};
		console.log("Data Subject"+data_subject);
	}
	else if(reason_for_meesage == 'sendTest'){
		var payloadString = {
			"reason": ""+reason_for_meesage,
			"data": jsonData
		};
		dataPayload = {payload:(payloadString)};
		console.log("Data Subject"+data_subject);
//8755954627
	}
	else{
		var payloadString = {
			"reason":""+ reason_for_meesage,
			"data": "Just fun with notification"
		};
		dataPayload = {payload:(payloadString)};
	}
	console.log(messageAddress);
	return new Promise(function(resolve,reject){

		var message = {
			to: '/topics/'+messageAddress, 

			notification: {
				title: 'FCM', 
				body: 'CollegeBuddy' 
			},

			data: dataPayload
		};

		fcm.send(message, function(err, response){
			if (err) {
				console.log("Something has gone wrong!"+err);
				return reject(err);
			} else {
				console.log("Successfully sent with response: ", response);
				return resolve('Sent');
			}
		});		
	});
}


/***
API to get unsolved queries
***/
app.post('/api/getQueries',function(req,res){
	pg.connect(connectionString,function(err,client,done){
		checkForError(err);
		var data = {
			id: req.body.id,
			dataflow: 0

		};	

		var api_token = req.headers['auth_token'];
		var checkVaildUser = checkAuthToken(api_token,client,data);
		checkVaildUser.then(function(value){
			if(value == 'Valid'){
				var getQueriesPromise = getQueries(data,client);
				getQueriesPromise.then(function(value){
					done();
					return res.status(200).json({success: true, data: value});
				});
			}
			else if (value == 'Invalid'){
				done();
				return res.status(403).json({success:false, data: 'Invalid User'});
			}
		});
	});
});

function getQueries(data,client){
	return new Promise(function(resolve,reject){
		var queriesList = [];
		var getQueriesQuery = client.query('Select * from Query where teacher_id = $1 and issolved = $2',[data.id,false]);
		getQueriesQuery.on('row',function(row){
			console.log('row'+JSON.stringify(row));
			var test_data = {
				query_id: row.id,
				query_text: row.query_text,
				student_id: row.student_id
			};
			console.log('row'+JSON.stringify(test_data));
			queriesList.push(test_data);
		});
		getQueriesQuery.on('end',function(){
			return resolve(queriesList);
		})
	});
}

/***
API to give response for queries 
***/
app.post('/api/sendQueryResponse',function(req,res){
	pg.connect(connectionString,function(err,client,done){
		checkForError(err);
		var data = {
			id:req.body.id,
			student_id: req.body.student_id,
			response: req.body.response,
			query_id: req.body.query_id,
			dataflow: 0
		};
		var api_token = req.headers['auth_token'];
		var checkVaildUser = checkAuthToken(api_token,client,data);
		checkVaildUser.then(function(value){
			if(value == 'Valid'){
				var insertQueryResponsePromise = insertQueryResponse(data,client);
				insertQueryResponsePromise.then(function(value){
					if(value == 'done'){
						done();
						return res.status(200).json({success: true, data: 'Response Successfully Sent'});

/***


Todo


Send GCM here with use of id of student and get his student id....

***/
}
});
			}
			else if(value == 'Invalid'){
				done();
				return res.status(403).json({success: false, data: 'Invalid User'});
			}
		});
	});
});


function insertQueryResponse(data,client){
	return new Promise(function(resolve,reject){
		//var subquery = ('INSERT INTO Subject(name, code) SELECT * FROM (SELECT '+name+', '+code+') AS tmp WHERE NOT EXISTS (SELECT name FROM Subject WHERE code = '+code+') LIMIT 1');

		var queryResponseQuery = client.query('Insert into QueryResponse(query_id,response) Select * from (Select $1::int,$2::text) AS tmp where not exists (Select id from QueryResponse where query_id = $1 and response =$2) LIMIT 1',[data.query_id,data.response]);
		queryResponseQuery.on('end',function(value){
			var insertIsSolvedQuery = client.query('Update Query Set issolved = $1 where id = $2',[true,data.query_id]);
			insertIsSolvedQuery.on('end',function(){
				
				return resolve('done');	
			});
			
		});
	});
}

/*** 
API to stop test 
***/
app.post('/api/stopTest',function(req,res){
	pg.connect(connectionString,function(err,client,done){
		checkForError(err);
		var data = {
			id: req.body.id,
			dataflow: 0,
			sst_id: req.body.sst_id,
			test_id: req.body.test_id
		}
		var api_token = req.headers['auth_token'];
		var checkVaildUser = checkAuthToken(api_token,client,data);
		checkVaildUser.then(function(value){
			if(value == 'Valid'){
				var stopTestPromise = stopTest(data,client);
				stopTestPromise.then(function(value){
					if(value == 'done'){
						done();
						return res.status(200).json({success:true, data: 'Test Successfully stopped'});
					}
				});
			}
			else if(value == 'Invalid'){
				return res.status(403).json({success: false, data:'Invalid User'});
			}
		});
	});
});

function stopTest(data,client){
	return new Promise(function(resolve,reject){
		var stopTestQuery = client.query('Update Test set isactive = $1 where id = $2 and sst_id = $3',[false,data.test_id,data.sst_id]);
		stopTestQuery.on('end',function(){
			return resolve('done');
		});
	});
}
function startTest(data,client){
	return new Promise(function(resolve,reject){
		var startTestQuery = client.query('Update Test set isactive = $1 where id = $2 and sst_id=$3',[true,data.test_id,data.sst_id]); 
		startTestQuery.on('end',function(){
			return resolve('done');
		});
	});
}
/***return of json of uploadQuestion will be the input for send test api***/
app.post('/api/sendTest',function(req,res){
	pg.connect(connectionString,function(err,client,done){
		checkForError(err);
		var data = {
			id: req.body.id,
			dataflow: 0,
			test_id : req.body.test_id,
			sst_id: req.body.sst_id
		};
		var api_token = req.headers['auth_token'];
		var checkVaildUser = checkAuthToken(api_token,client,data);
		checkVaildUser.then(function(value){
			console.log('Auth token '+value);
			if(value == 'Valid'){
				var startTestPromise = startTest(data,client);
				startTestPromise.then(function(value){
					if(value == 'done'){
						var sstinfoPromise = getinfoSST(data.sst_id,client);
						sstinfoPromise.then(function(value){
							var result = value[0];
							console.log('Result is '+JSON.stringify(result));
			//SBSC ----> Subject Branch Section College
			var getSBSCpromise = getSubBranchSectCollege(result,client);
			getSBSCpromise.then(function(value){
				var finaldata = value;
				finaldata.subject_id = result.subject_id;
				finaldata.sst_id = data.sst_id;
				finaldata.test_id = data.test_id;
				var sendPromise = sendMessages(finaldata,'sendTest');
				sendPromise.then(function(value){
					console.log(value);
					if(value == 'Sent'){
						done();
						return res.end('done');
					}
				})
				.catch(function(err){
					done();
					return res.status(403).json({success:false, data: err});
				});
			});		
		});
					}
				});



			}
			else if(value == 'Invalid'){
				done();
				res.status(403).json({success:false, data: 'Invalid User'});
			}
		});		
});
});

/***
API to upload test questions and create an entry in test
***/
app.post('/api/uploadQuestions',function(req,res){

	pg.connect(connectionString,function(err,client,done){
		checkForError(err);
		var data = {
			id: req.body.id,
			sst_id: req.body.sst_id,
			nameoftest: req.body.nameoftest,
			question:req.body.question,
			datetime: Date.now(),
			dataflow: 0
		};
		console.log('Inside insandet Test Id ');
		var api_token = req.headers['auth_token'];
		console.log(api_token+'	'+data.id+'	'+data.dataflow);
		var checkVaildUser = checkAuthToken(api_token,client,data);
		checkVaildUser.then(function(value){
			console.log('Inside insandet Test Id ');

			if(value == 'Valid'){
				var insertAndGetFromTestPromise = insertAndGetFromTest(data,client);
				insertAndGetFromTestPromise.then(function(value){
					console.log('done');
					res.status(200).json({success:true, data: value});
				});
			}
			else if (value == 'Invalid'){
				done();
				res.status(403).json({success:false, data: 'Invalid User'});
			}
		});
	});
});

function insertAndGetFromTest(data,client){
	return new Promise(function(resolve,reject){
		console.log('Inside insandet Test Id ');

		var insertNameOfTest = client.query('Insert into Test(nameoftest,sst_id,datetime) values ($1,$2,$3)',[data.nameoftest,data.sst_id,data.datetime]);
		insertNameOfTest.on('end',function(){
			var getIdOfTest = client.query('Select id from Test where nameoftest = $1 and datetime = $2',[data.nameoftest,data.datetime]);
			getIdOfTest.on('row',function(row){
				data.test_id = row['id'];
			});
			getIdOfTest.on('end',function(){
				var count =0,i=0,j=0;
				var final_list_of_Question =[];
				var final_list_of_Answer = [];
				var questions = data.question;
				console.log('Test Id '+data.test_id);
				for (i=0;i<questions.length;i++){
					
//var subquery = ('INSERT INTO Subject(name, code) SELECT * FROM (SELECT '+name+', '+code+') AS tmp WHERE NOT EXISTS (SELECT name FROM Subject WHERE code = '+code+') LIMIT 1');
var insertQuestionQuery = client.query('Insert into question(question_text) Select * from (Select $1::text) AS tmp where not exists (Select id from question where question_text = $1::text) LIMIT 1',[questions[i].question_text]);					
insertQuestionQuery.on('end',function(){
	count = count+1;
	if(count == questions.length){
		count =0;
		for (i=0;i<questions.length;i++){
			var getQuestionId = client.query('Select id from question where question_text = $1',[questions[i].question_text]);
			getQuestionId.on('row',function(row){
				final_list_of_Question.push(row);
			});
			getQuestionId.on('end',function(){
				count = count+1;
				if(count == questions.length){
					console.log(JSON.stringify(final_list_of_Question));

					count = 0;
					for(i=0;i<questions.length;i++){
						var insertQuestionWithTest = client.query('Insert into Test_question(test_id,question_id) Select * from (Select $1::int,$2::int) AS tmp where not exists (Select id from test_question where test_id = $1 and question_id = $2) LIMIT 1',
							[data.test_id,final_list_of_Question[i].id]);
						insertQuestionWithTest.on('end',function(){
							count = count +1;
							if(count == questions.length){
								count = 0;
								for (i=0;i<questions.length;i++){
									console.log('Length '+(questions[i].choices.length));

									for (j=0;j<questions[i].choices.length;j++){
										var choices = [];
										choices = questions[i].choices;
										console.log('Inside i and j '+choices[j].choice_text);
										var insertAnswerQuery = client.query('Insert into choices(choice_text,question_id) Select * from (Select $1::text,$2::int) AS tmp where not exists (Select id from choices where choice_text = $1::text and question_id = $2::int) LIMIT 1',[(questions[i].choices)[j].choice_text,final_list_of_Question[i]['id']]);			
										insertAnswerQuery.on('end',function(){
											count = count+1;
											if(count == questions.length*4){
												count =0;
												for(i=0;i<questions.length;i++){
													var getAnswerIdQuery = client.query('Select * from choices where question_id = $1::int',[(final_list_of_Question[i]).id]);
													getAnswerIdQuery.on('row',function(row){
														var test_ans = {};
														test_ans.answer_id = row.id;
														test_ans.question_id = final_list_of_Question[Math.floor(count%4)]['id']; 
														final_list_of_Answer.push(test_ans);
													});
													getAnswerIdQuery.on('end',function(){
														count = count+1;
														if(count == questions.length){
															console.log('Question\n '+JSON.stringify(final_list_of_Question));
															console.log('Answers\n  '+JSON.stringify(final_list_of_Answer));
															count = 0;
											//				var insertAnswerQuery = client.query('Insert into choices(choice_text,question_id) Select * from (Select $1::text,$2::int) AS tmp where not exists (Select id from choices where choice_text = $1::text and question_id = $2::int)',[(questions[i].choices)[j].choice_text,final_list_of_Question[i].id]);			
											
											for (i=0;i<questions.length;i++){
												var correctChoiceofquestion  = questions[i].correctchoice +(i*4)-1;
												console.log('Correct choice of question'+ correctChoiceofquestion);
												var insertCorrectAnsweerQuery = client.query('Insert into CorrectChoice(choice_id,question_id) Select * from (Select $1::int,$2::int) AS tmp where not exists (Select id from CorrectChoice where choice_id = $1::int and question_id = $2::int) LIMIT 1',[final_list_of_Answer[correctChoiceofquestion].answer_id,final_list_of_Question[i].id]);
												insertCorrectAnsweerQuery.on('end',function(){
													count = count+1;
													if(count == questions.length)
													{
														var test_idObject = {
															test_id: data.test_id
														};
														final_list_of_Answer.push(test_idObject)
														return resolve(final_list_of_Answer);
													}			
												});
											}

										}
									});
}
}
});										
} 
}
}
});
}



}
});
}
}
});
}
});
});
});
}


/***
Api for teacher to get a class attendance after 5 minutes of request
***/

app.post('/api/getAttendance',function(req,res){
	pg.connect(connectionString,function(err,client,done){
		checkForError(err);
		var data = {
			//datetime at which request of taking attendance by teacher was sent to all students
			datetime: req.body.datetime	,
			sst_id: req.body.sst_id,
			id: req.body.id,
			dataflow: 0
		};

		var api_token = req.headers['auth_token'];
		var checkVaildUser = checkAuthToken(api_token,client,data);
		checkVaildUser.then(function(value){
			console.log(value);
			if(value == 'Valid'){
				var sstinfoPromise = getinfoSST(data.sst_id,client);
				sstinfoPromise.then(function(value){
					var result = value[0];
					result.datetime = data.datetime;
					console.log('In getAttendance '+JSON.stringify(result)+'		'+result.subject_id+'		'+result.datetime);
					var istAndStdntAttPromise = insertAndgetStudentAttendanceFromSection(result,client);
					istAndStdntAttPromise.then(function(value){
						var result = value;
						done();
						res.status(200).json({success:true,data:result});
					});
				});	
			}
			else if(value == 'Invalid'){
				done();
				res.status(403).json({success:false, data: 'Invalid User'});
			}
		});

		
	});
});
function insertAndgetStudentAttendanceFromSection(data,client){
	return new Promise(function(resolve,reject){
		var results = [];
		var getAbsentQuery = client.query('Select id from student where section_id = $3 AND id not in (Select student_id from attendance where subject_id = $1 and datetime = $2)',[data.subject_id,data.datetime,data.section_id]);


		getAbsentQuery.on('row',function(row){
			results.push(row);
		});
		getAbsentQuery.on('end',function(){
			console.log(JSON.stringify(results));
			var count = 0;
			if(results.length>0){
				for (var i=0;i<results.length;i++){
					var insertStudent = results[i];
					var insertStudentQuery = client.query('Insert into Attendance(student_id,subject_id,present,datetime) values($1,$2,$3,$4)',
						[insertStudent['id'],data.subject_id,false,data.datetime]);
					insertStudentQuery.on('end',function(){
						count = count+1;
						if(count == results.length)
						{
							results = [];
							var getClassAttendanceQuery = client.query('Select id,name from student where id in (Select student_id from attendance where subject_id = $1 and datetime = $2)',[data.subject_id,data.datetime]);
							getClassAttendanceQuery.on('row',function(row){
								results.push(row);
							});
							getClassAttendanceQuery.on('end',function(){
								console.log('Inside if'+JSON.stringify(results));
								for(var j=0;j<results.length;j++){
									count = 0;
									var final_result=[];
									var studentintest = results[j];
									console.log('Student j id '+studentintest['id']);
									var getStudentQuery = client.query('Select present from Attendance where student_id=$1',[results[count]['id']]);
									getStudentQuery.on('row',function(row){
										studentintest = results[count];
										studentintest.present = row['present'];
										console.log(JSON.stringify(studentintest));
										final_result.push(studentintest);
									});
									getStudentQuery.on('end',function(){
										count = count+1;
										if(count == results.length){
											console.log(final_result);
											return resolve(final_result);		
										}
									});
								}

							});	
						}
					});
}
}
else{
	results = [];
	var getClassAttendanceQuery = client.query('Select id,name from student where id in (Select student_id from attendance where subject_id = $1 and datetime = $2)',[data.subject_id,data.datetime]);
	getClassAttendanceQuery.on('row',function(row){
		results.push(row);
	});
	getClassAttendanceQuery.on('end',function(){
		console.log('Inside'+JSON.stringify(results));
		for(var j=0;j<results.length;j++){
			count = 0;
			var final_result=[];
			var studentintest = results[j];
			console.log('Student j id '+studentintest['id']);
			var getStudentQuery = client.query('Select present from Attendance where student_id=$1',[results[count]['id']]);
			getStudentQuery.on('row',function(row){
				studentintest = results[count];
				studentintest.present = row['present'];
				console.log(JSON.stringify(studentintest));
				final_result.push(studentintest);
			});
			getStudentQuery.on('end',function(){
				count = count+1;
				if(count == results.length){
					console.log(final_result);
					return resolve(final_result);		
				}
			});
		}

	});	
}



});
});
}

function getStudentFromSection(section_id,client){
	return new Promise(function(resolve,reject){
		var results = [];
		var getStudentQuery = client.query('Select * from student where section_id = $1',[section_id]);
		getStudentQuery.on('row',function(row){
			results.push('row');
		});
		getStudentQuery.on('end',function(){
			return resolve(results);
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
Api for teacher to send a class attendance request
***/
app.post('/api/getReview',function(req,res){
	pg.connect(connectionString,function(err,client,done){
		checkForError(err);
		var data = {
			id: req.body.id,
			dataflow:0,			
		};
		var api_token = req.headers['auth_token'];
		var checkVaildUser = checkAuthToken(api_token,client,data);
		checkVaildUser.then(function(value){
			console.log(value);
			if(value == 'Valid'){
				var getReviewInfoPromise = getReviewInfo(data,client);
				getReviewInfoPromise.then(function(value){
					var results = value;
					var getSubjectAndStudentNamePromise = getSubjectAndStudentName(results,client);
					getSubjectAndStudentNamePromise.then(function(value){
						console.log(JSON.stringify(value));
						return res.status(200).json({success:true, data:value});
					})
			
				});
			}
			else if(value == 'Invalid'){
				done();
				res.status(403).json({success:false, data: 'Invalid User'})

			}
		});
	});
});
/***
Promise to get subject name and student name
***/
function getSubjectAndStudentName(data,client){
	return new Promise(function(resolve,reject){
		var count = 0;
		var resultswithsubjectName = [];
		var final_result = [];
		for (var i =0;i<data.length;i++){
			var getSubjectNameQuery = client.query('Select name from Subject where id = $1',[data[i].subject_id]);
			getSubjectNameQuery.on('row',function(row){
				var test_data = row;
				test_data.review_text = data[count].review_text;
				resultswithsubjectName.push(test_data);
			})
			getSubjectNameQuery.on('end',function(){
				count = count+1;
				if(count == data.length){
					count =0;
					for(var j=0;j<data.length;j++){
						var getStudentNameQuery = client.query('Select name from student where id = $1',[data[j].student_id]);
						getStudentNameQuery.on('row',function(row){
							var test_data = {};
							test_data.student_name = row['name'];
							test_data.review_text = resultswithsubjectName[count].review_text;
							test_data.subject_name = resultswithsubjectName[count].name;
							final_result.push(test_data);
						});
						getStudentNameQuery.on('end',function(){
							count = count+1;
							if(count == data.length){
								return resolve(final_result);
							}
						});

					}

				}
			});
		}
	});

}
/***
Promise to get all reviews for a particular teacher
***/
function getReviewInfo(data,client){
	return new Promise(function(resolve,reject){
		var results = [];
		var getReviewsQuery = client.query('SELECT * from review where teacher_id = $1',[data.id]);
		getReviewsQuery.on('row',function(row){
			results.push(row);
		});
		getReviewsQuery.on('end',function(){
			return resolve(results);
		});
	});
}



/***
API to stop attendance 
***/


app.post('/api/stopAttendance',function(req,res){
	pg.connect(connectionString,function(err,client,done){
		checkForError(err);
		var data = {
			id: req.body.id,
			sst_id: req.body.sst_id,
			dataflow: 0
		};
		var api_token = req.headers['auth_token'];
		var checkVaildUser = checkAuthToken(api_token,client,data);
		checkVaildUser.then(function(value){
			if(value == 'Valid'){
				var stopAttendancePromise = stopAttendance(data,client);
				stopAttendancePromise.then(function(value){
					if(value == 'done'){

						done();
						return res.status(200).json({success: true, data: 'Attendance stopped'});
					}
					else{

						done();
						return res.status(201).json({success: true, data: 'Error'});
					}
				});
			}
			else if (value == 'Invalid'){
				done();
				return res.status(403).json({success:false, data: 'Invalid User'});
			}
		});
	});
});


/***
Api for teacher to send a class attendance request
***/
app.post('/api/takeAttendance',function(req,res){
	pg.connect(connectionString,function(err,client,done){
		checkForError(err);
		var data = {
			location: req.body.location,
			sst_id: req.body.sst_id,
			id: req.body.id,
			dataflow: 0
		};
		var api_token = req.headers['auth_token'];
		var checkVaildUser = checkAuthToken(api_token,client,data);
		checkVaildUser.then(function(value){
			console.log(value);
			if(value == 'Valid'){
				data.datetime = Date.now();
				var insertinAttendancePromise  = insertinAttendance(data,client);
				insertinAttendancePromise.then(function(value){
					console.log('Inside take attendance');
					if(value == 'done'){
						var sstinfoPromise = getinfoSST(data.sst_id,client);
						sstinfoPromise.then(function(value){
							var result = value[0];
							console.log()
			//SBSC ----> Subject Branch Section College
			
			var getSBSCpromise = getSubBranchSectCollege(result,client);
			getSBSCpromise.then(function(value){
				var finaldata = value;
				finaldata.subject_id = result.subject_id;
				finaldata.sst_id = data.sst_id;
				finaldata.datetime = data.datetime;
				finaldata.location = data.location;
				console.log("End result "+finaldata.subject_name+"  "+finaldata.branch_name+"  "+finaldata.section+"  "+finaldata.year);
				var sendPromise = sendMessages(finaldata,'attendance');
				sendPromise.then(function(value){
					if(value == 'Sent'){
						done();
						return res.end('done');
					}
				})
				.catch(function(err){
					done();
					return res.status(403).json({success:false, data: err});
				});
			});
		});
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


function insertinAttendance(data,client){
	return new Promise(function(resolve,reject){
		console.log('Inside take attendance');
		//INSERT INTO Subject(name, code) SELECT * FROM (SELECT '+name+', '+code+') AS tmp WHERE NOT EXISTS (SELECT name FROM Subject WHERE code = '+code+') LIMIT 1'
		var insertinAttendanceQuery = client.query('Insert into ActiveAttendance(sst_id) Select * from (Select $1::int) AS tmp where not exists (Select id from ActiveAttendance where sst_id = $1::int) LIMIT 1',[data.sst_id]);
		insertinAttendanceQuery.on('end',function(){
			console.log('Inside take attendance');
			var updateAttendanceQuery = client.query('Update ActiveAttendance SET isactive = $1 where sst_id = $2',[true,data.sst_id]);
			updateAttendanceQuery.on('end',function(){
				console.log('Inside take attendance');
				return resolve('done');	
			})

		});
	});
}
function stopAttendance(data,client){
	return new Promise(function(resolve,reject){
		var stopAttendancequery = client.query('update ActiveAttendance set isactive = false where sst_id = $1',[data.sst_id]);
		stopAttendancequery.on('end',function(){
			return resolve('done');
		});
	});
}
//Api for sending notification to class 
app.post('/api/sendClass',function(req,res){
	pg.connect(connectionString,function(err,client,done){
		checkForError(err);
		var data ={
			description: req.body.description,
			section_id: req.body.section_id,
			id: req.body.id,
			sst_id: req.body.sst_id,
			dataflow: 0
		};
		var api_token = req.headers['auth-token'];
		var checkVaildUser = checkAuthToken(api_token,client,data);
		checkVaildUser.then(function(value){
			console.log(value);
			if(value == 'Valid'){
				var sstinfoPromise = getinfoSST(data.sst_id,client);
				sstinfoPromise.then(function(value){
					var result = value[0];
					console.log()
			//SBSC ----> Subject Branch Section College
			var getSBSCpromise = getSubBranchSectCollege(result,client);
			getSBSCpromise.then(function(value){
				var data = value;
				console.log("End result "+data.subject_name+"  "+data.branch_name+"  "+data.section+"  "+data.year);
				// done();

				// return res.end('done');
				var sendPromise = sendMessages(data,'notification');
				sendPromise.then(function(value){
					if(value == 'Sent'){
						done();
						return res.end('done');
					}
				}).catch(function(err){
					done();
					return res.status(403).json({success:false, data: err});
				});
			});

		});
			}
			else if(value == 'Invalid'){
				done();
				res.status(403).json({success:false, data: 'Invalid User'})
			}
		});
		
	});
});

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
//API to get subject id from subject name and code
app.post('/api/getSubjectId',function(req,res){
	pg.connect(connectionString,function(err,client,done){
		checkForError(err);
		var data = {
				id: req.body.id,
				subject_code: req.body.subject_code,
				dataflow: 0
		};
		var api_token = req.headers['auth-token'];
		var checkVaildUser = checkAuthToken(api_token,client,data);
		checkVaildUser.then(function(value){
				if(value == 'Valid'){
					var results = [];
						var getSubjectIdPromise = getSubjectId(data.subject_code,client,results);
						getSubjectIdPromise.then(function(value){
							done();
							return res.status(200).json({success: true, data: results});
						})
				}
				else if(value == 'Invalid'){
					done();
					return res.status(403).json({success:false, data: 'Invalid User'});
				}
		});
	});
});

//API to get section id 
app.post('/api/getSectionId',function(req,res){
	pg.connect(connectionString,function(err,client,done){
		checkForError(err);
		console.log(req.body);
		
		var data = {
			sections : req.body.sections,
			id : req.body.id,
			dataflow: 0
		};
		console.log(data);
			console.log('Came inside');
	var api_token = req.headers['auth-token'];
	console.log(api_token);
		var checkVaildUser = checkAuthToken(api_token,client,data);
		checkVaildUser.then(function(value){
				console.log('Came inside'+value);

			if(value == 'Valid'){
				console.log('Came inside');
		var insSecAndIdPromise = insertSectionAndGetId(data,client);
				insSecAndIdPromise.then(function(value){
					done();
					return res.status(200).json({success: true, data: value});
				});
			}
			else if(value == 'Invalid'){
				done();
				return res.status(403).json({success: false, data: 'Invalid User'});
			}
		});
	});
});
	//INSERT INTO Subject(name, code) SELECT * FROM (SELECT '+name+', '+code+') AS tmp WHERE NOT EXISTS (SELECT name FROM Subject WHERE code = '+code+') LIMIT 1'

function insertSectionAndGetId(data,client){
	return new Promise(function(resolve,reject){
		console.log('Came inside new');		
		var sectionArray = data.sections;
		var idArray = [];
		console.log('Came inside new'+sectionArray);
				var count = 0;

			for(var i=0;i< sectionArray.length;i++){
				var section = sectionArray[i];
				console.log('Came inside');
				var insertOrUpdateSectionQuery = client.query('Insert into section(branch_id,section,year) Select * from (Select $1::int,$2::int,$3::int) AS tmp WHERE NOT EXISTS (Select id from section where branch_id = $1 and section = $2 and year = $3) LIMIT 1',[section.branch_id,section.section,section.year]);
				insertOrUpdateSectionQuery.on('end',function(){
					count = count+1;
					if(count == sectionArray.length){
						count = 0;
						for(var i=0;i<sectionArray.length;i++){
							var section = sectionArray[i];
						var getSectionIdQuery = client.query('Select id from section where branch_id = $1 and section = $2 and year = $3',[section.branch_id,section.section,section.year]);	
							getSectionIdQuery.on('row',function(row){
								idArray.push(row);
							});
							getSectionIdQuery.on('end',function(){
								count = count +1;
								if(count == sectionArray.length){
									return resolve(idArray);
								}
							});
						}
						
					}
				});
			}
	});
}
//API To upload subjects by teacher
app.post('/api/uploadSubject',function(req,res){
	var faculty_id = req.body.id;
	var inputs = [];
	var results = [];
	inputs = req.body.subjects;
	console.log(req.body+"  "+inputs.length);
	pg.connect(connectionString,function(err,client,done){
		var count =0;
		var data ={
			dataflow: 0,
			id: req.body.id
		}
		console.log('data is'+data);
		var api_token = req.headers['auth-token'];
		console.log(api_token);
		var checkVaildUser = checkAuthToken(api_token,client,data);

		checkVaildUser.then(function(value){
			console.log(value);
			if(value == 'Valid'){
				for (var i=0 ;i < inputs.length;i++){

					var object = inputs[i];
					console.log(object.name);
					var name = '\''+object.name+'\'';
					var code = '\''+object.subject_code+'\'';
					var subquery = ('INSERT INTO Subject(name, code) SELECT * FROM (SELECT '+name+', '+code+') AS tmp WHERE NOT EXISTS (SELECT name FROM Subject WHERE code = '+code+') LIMIT 1');
					console.log(subquery+" \n "+i);
					var insertionPromise = insertSubject(subquery,client);
					insertionPromise.then(function(value){
						count = count+1;
						console.log('count is '+count);
						if(count==inputs.length){
							console.log('Inside insert subjid end ');
							count = 0;
							for (i=0;i<inputs.length;i++){
								var object = inputs[i];
								var getIdPromise = getSubjectId(object.subject_code,client,results);
								getIdPromise.then(function(value){
									results = value;
									count = count+1;
									if(count == inputs.length){
							//	return res.status(200).json({success:true, data:results});
							console.log('Inside get subjid end '+results);
							count = 0;
							var final_result = [];
							for (i=0;i<inputs.length;i++){
								var test_data = {
									teacher_id: faculty_id,
									subject_id: results[i].id,
									section_id: inputs[i].section_id
								};
								console.log('Inside get subjid end cc'+i);
								var sst_idpromise = insertAndGetsst_id(test_data,client,final_result);
								sst_idpromise.then(function(value){
									console.log('Inside get subjid end '+count);
									final_result = value;
									count = count+1;
									if(count == inputs.length ){
										return res.status(200).json({success: true, data: final_result});
									}
								});}
							}
						});
							}

						}
					});
}

}
else if(value == 'Invalid'){
	done();
	res.status(403).json({success:false, data: 'Invalid User'})
}
});
});

});



/***
	function to insert subject branch and section to
	Section_Subject_teacher and
	get id of new row inserted
	***/
	function insertAndGetsst_id(data,client,results){
		return new Promise(function(resolve,reject){
			console.log('Inside promise'+data.section_id+"   "+data.subject_id+"  "+data.teacher_id);
			var newQuery = client.query('INSERT INTO Section_Subject_Teacher(section_id, subject_id, teacher_id) SELECT * FROM (SELECT $1::int, $2::int, $3::int) AS tmp WHERE NOT EXISTS (SELECT id FROM Section_Subject_Teacher WHERE section_id = $1::int AND subject_id = $2::int AND teacher_id = $3::int) LIMIT 1;',[data.section_id,data.subject_id,data.teacher_id]);
			newQuery.on('end',function(){
				
				console.log('Inside promise end');

				newQuery = client.query('Select id,subject_id from Section_Subject_Teacher where section_id = $1 AND subject_id =$2 AND teacher_id =$3',[data.section_id,data.subject_id,data.teacher_id]);
				newQuery.on('row',function(row){
					console.log('Inside promise'+row);
					results.push(row);
				});
				newQuery.on('end',function(){
					return resolve(results);
				});
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
/***
Api for teacher sign up
***/
app.post('/api/signupTeacher', function(req, res) {
	var results = [];
	// Grab data from http request
	
	var data = {
		name: req.body.name, 
		email: req.body.email, 
		mobile_no: req.body.mobile_no,
		password: req.body.password,
		college_name: req.body.college_name};
		
		console.log(data)
	// Get a Postgres client from the connection pool
	pg.connect(connectionString, function(err, client, done) {
		// Handle connection errors
		if(err) {
			done();
			console.log(err);
			return res.status(500).json({success: false, data: err});
		}
		var query = client.query('SELECT * from Teacher where email= $1 ',[data.email]);
		// Stream results back one row at a time
		query.on('row', function(row) {
			results.push(row);
		});
		query.on('end', function()  {
			console.log(results)
			

			if(results.length>0){
				done();
				
				return res.status(200).json({success: false, data:'Email already exists'}); 
			}
			else{
				results = [];
				var uuid = require("uuid/v1")
		// SQL Query > Insert Data
		console.log('College insertion'+data.college_name);
		
		query = client.query('Select id from College where name=$1',[data.college_name]);
		var id_of_college=0;

		query.on('row',function(row){
			
			id_of_college = row['id'];
		});
		query.on('end',function(){
			if(id_of_college == 0){
				console.log('Inside new addition');
				query=client.query('Insert into College(name) values ($1)',[data.college_name]);
				query.on('end',function(){
					console.log('College insertion done');
					query = client.query('Select id from College where name=$1',[data.college_name]);
					query.on('row',function(row){
						id_of_college = row['id'];
						
					});
					query.on('end',function(){
						client.query('INSERT INTO Teacher(name, email, mob_no, password, college_id, gcm_id, device_id,api_token) values($1, $2, $3, $4, $5, 0, 0, $6)',
							[data.name, data.email, data.mobile_no,data.password,id_of_college, uuid()]);
		// SQL Query > Select Data
		query = client.query('SELECT * from Teacher where email= $1 AND password= $2',[data.email,data.password]);
		// Stream results back one row at a time
		query.on('row', function(row) {
			results.push(row);
		});
		// After all data is returned, close connection and return results
		query.on('end', function()  {
			done();
			return res.json({success: true, data: results});
		});		

	});
					
				});	
			}
			else{
				client.query('INSERT INTO Teacher(name, email, mob_no, password, college_id, gcm_id, device_id,api_token) values($1, $2, $3, $4, $5, 0, 0, $6)',
					[data.name, data.email, data.mobile_no,data.password,id_of_college, uuid()]);
		// SQL Query > Select Data
		query = client.query('SELECT * from Teacher where email= $1 AND password= $2',[data.email,data.password]);
		// Stream results back one row at a time
		query.on('row', function(row) {
			results.push(row);
		});
		// After all data is returned, close connection and return results
		query.on('end', function()  {
			done();
			return res.json({success: true, data: results});
		});		
		
	}	
})

}
});
});
});

/***
Api for teacher login
***/

app.post('/api/loginTeacher',function(req,res){
	var results = [];
	var email=req.body.email;
	var password=req.body.password;
	pg.connect(connectionString, function(err, client, done) {
		// Handle connection errors
		if(err) {
			done();
			console.log(err);
			return res.status(500).json({success: false, data: err});
		}
		// SQL Query > Insert Data
		// SQL Query > Select Data
		const query = client.query('SELECT * from Teacher where email= $1 AND password= $2',[email,password]);
		// Stream results back one row at a time
		query.on('row', function(row) {
			console.log("Teacher is "+row);
			results.push(row);
		});
		// After all data is returned, close connection and return results
		query.on('end', function()  {
			done();
			if(results.length>0){
				return res.status(200).json({success:true, data:results});
				
			}
			else{
				return res.status(403).end("No such user exists");
			}
		});
	});
});

/***
API for gcm id update
***/
app.post('/api/gcmidUpdate',function(req,res){
	var data = [];
	data.gcm_id= req.body.gcm_id;
	data.device_id = req.body.device_id;
	/***
	Dataflow 0 for Teacher 
	Dataflow 1 for Student
	***/
	data.dataflow = req.body.dataflow;					
	data.id = req.body.id;
	pg.connect(connectionString,function(err,client,done){
		if(err){
			done();
			console.log(err);
			return res.status(500).json({success: false, data: err});
		}

		
		var api_token = req.headers['auth_token'];
		var checkVaildUser = checkAuthToken(api_token,client,data);
		checkVaildUser.then(function(value){
			console.log(value);
			if(value == 'Valid'){
				var insertionPromise = insertinTable(data,client);
				insertionPromise.then(function(value){
					console.log('final value of promise is '+value);
					if(value == 'done'){
						console.log('Header of request are '+req.headers['auth_token'])
						done();
						return res.status(200).json({success: true,data: 'Update successfull'})
					}
					else{	
						done();
						return res.status(501).json({success: false,data: 'Update Unsuccessfull'})
					}
				}).catch(function(e){
					console.log('Got error '+e);
				});	
			}
			else if(value == 'Invalid'){
				done();
				res.status(403).json({success:false, data: 'Invalid User'})
			}
		});
		
	});
});


function getSubjectId(code,client,results){
	return new Promise(function(resolve,reject){
		var newQuery = client.query('Select * from Subject where code =$1',[code]);
		newQuery.on('row',function(row){
			results.push(row);
		});
		newQuery.on('end',function(){
			return resolve(results);
		}
		);
	});
}

function insertSubject(quer,client){
	return new Promise(function(resolve,reject){
		var newQuery = client.query(quer);
		newQuery.on('end',function(){
			return resolve('done');
		})
	});
}


/***
function to get id of college from college_name
***/
function getCollegeId(client,college_name){
	return new Promise(function(reolve,reject){
		var College_Id = 0;
		var query = client.query('Select id from College where name = $1',[college_name]);
		query.on('row',function(row){
			College_Id = row['id'];
		});
		query.on('end',function(){
			return resolve(College_Id);
		})
	});
}
/***
function to get id of college from college_name
***/
function getCollegeId(client,dataflow,data){
	return new Promise(function(resolve,reject){
		query = client.query('Select id from College where name = $1',[data.college_name]);
		var id_of_college = 0;
		query.on('row',function(row){
			id_of_college = row['id'];
		});
		query.on('end',function(){
			return resolve(id_of_college);
		});
	});
}
//Promise for insert query
function insertinTable(data,client){
	return new Promise(function	(resolve,reject)
	{

		var connectionquery ;
		if(data.dataflow == 0){
			connectionquery = client.query('Update Teacher SET gcm_id=$1,device_id=$2 where id=$3::int',[data.gcm_id,data.device_id,data.id]);
		}
		else if(data.dataflow == 1){
			connectionquery = client.query('Update Student SET gcm_id=$1,device_id=$2 where id=$3::int',[data.gcm_id,data.device_id,data.id]);	
		}
		connectionquery.on('end',function(){
			return resolve('done');	
		}
		);
	}
	);
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

//Route for student API
require('./routes/student')(app);


var server = app.listen(process.env.PORT || 8081, function () {

	var host = server.address().address
	var port = server.address().port

	console.log("Example app listening at http://%s:%s", host, port)

})

