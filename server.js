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


// //Push Notification Test
// app.get('/api/push',function(req,res){

// });

function sendMessages(data_subject){
var messageAddress = data_subject.subject_name+data_subject.section+data_subject.branch_name+data_subject.year;
console.log(messageAddress);
	return new Promise(function(resolve,reject){

	var message = { //this may vary according to the message type (single recipient, multicast, topic, et cetera)
		to: '/topics/'+messageAddress, 

		notification: {
			title: 'FCM', 
			body: 'CollegeBuddy' 
		},
		
    data: {  //you can send only notification or only data(or include both)
    	my_key: 'my life',
    	my_another_key: 'my rules'
    }
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


//Api for sending notification to class 
app.post('/api/sendClass',function(req,res){
	pg.connect(connectionString,function(err,client,done){
		checkForError(err);
		var data ={
			description: req.body.description,
			sst_id: req.body.sst_id
		};
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
				var sendPromise = sendMessages(data);
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
	});
});

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
//API To upload subjects by teacher
app.post('/api/uploadSubject',function(req,res){
	var faculty_id = req.body.id;

	var inputs = [];
	var results = [];
	inputs = req.body.subjects;
	console.log(req.body+"  "+inputs.length);
	pg.connect(connectionString,function(err,client,done){
		var count =0;
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
});

});
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

function checkForError(err){
	if(err) {
		done();
		console.log(err);
		return res.status(500).json({success: false, data: err});
	}
}
//Api for teacher sign up
app.post('/api/signupTeacher', function(req, res) {
	var results = [];
	// Grab data from http request
	
	var data = {
		name: req.body.name, 
		email: req.body.email, 
		mobile_no: req.body.mobile_no,password: 
		req.body.password,
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
			return res.json({sucess: true, data: results});
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
			return res.json({sucess: true, data: results});
		});		
		
	}	
})

}
});
});
});


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

//API for gcm id update
app.post('/api/gcmidUpdate',function(req,res){
	var data = [];
	data.gcm_id= req.body.gcm_id;
	data.device_id = req.body.device_id;
	/***
	Dataflow 0 for Teacher 
	Dataflow 1 for Student
	***/
	data.dataflow = req.body.dataflow;					
	data.email = req.body.email;
	pg.connect(connectionString,function(err,client,done){
		if(err){
			done();
			console.log(err);
			return res.status(500).json({success: false, data: err});
		}

		
		var api_token = req.headers['auth-token'];
		var checkVaildUser = checkAuthToken(api_token,client,data);
		checkVaildUser.then(function(value){
			console.log(value);
			if(value == 'Valid'){
				var insertionPromise = insertinTable(data,client);
				insertionPromise.then(function(value){
					console.log('final value of promise is '+value);
					if(value == 'done'){
						console.log('Header of request are '+req.headers['auth-token'])
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

//Promise for insert query
function insertinTable(data,client){
	return new Promise(function	(resolve,reject)
	{

		var connectionquery ;
		if(data.dataflow == 0){
			connectionquery = client.query('Update Teacher SET gcm_id=$1,device_id=$2 where email=$3',[data.gcm_id,data.device_id,data.email]);
		}
		else if(data.dataflow == 1){
			connectionquery = client.query('Update Student SET gcm_id=$1,device_id=$2 where email=$3',[data.gcm_id,data.device_id,data.email]);	
		}
		connectionquery.on('end',function(){
			return resolve('done');	
		}
		);
	}
	);
}
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
//Promise to check auth token
function checkAuthToken(auth_token,client,data){
	return new Promise(function(resolve,reject){
		var connectionquery ;
		if(data.dataflow == 0){
			connectionquery = client.query('Select api_token from Teacher where email = $1',[data.email]);
		}
		else if(data.dataflow == 1){
			connectionquery = client.query('Select api_token from Student where email = $1',[data.email]);	
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


var server = app.listen(process.env.PORT || 8082, function () {

	var host = server.address().address
	var port = server.address().port

	console.log("Example app listening at http://%s:%s", host, port)

})

