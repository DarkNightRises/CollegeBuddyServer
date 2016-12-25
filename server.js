/***
Module for managing Teacher API
***/
var express = require('express');
var app = express();
var fs = require("fs");
var pg = require("pg");
var bodyParser = require("body-parser");
var router = express.Router();
connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/collegebuddy';
 require('./models/database');
// var db = require('./models/database');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


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
			client.query('INSERT INTO Teacher(name, email, mob_no, password, College_Id, gcm_id, device_id,api_token) values($1, $2, $3, $4, $5, 0, 0, $6)',
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
			client.query('INSERT INTO Teacher(name, email, mob_no, password, College_Id, gcm_id, device_id,api_token) values($1, $2, $3, $4, $5, 0, 0, $6)',
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


//Test API for hosting check
app.get('/checkApi',function(req,res)
{
	console.log("Hosted on Heoku"); 
	return res.end("Got result");
}
);

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
			console.log('auth token '+results[0].api_token+'   auth_of_user '+auth_token+'   query '+connectionquery);
		if(results[0].api_token == auth_token){
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

