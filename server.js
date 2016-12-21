//  var stormpath = require('stormpath')
var express = require('express');
var app = express();
var fs = require("fs");
var pg = require("pg");
var bodyParser = require("body-parser");
var router = express.Router();
connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/collegebuddy';

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.get('/listUsers', function (req, res) {
 fs.readFile( __dirname + "/" + "users.json", 'utf8', function (err, data) {
   console.log( data );
   res.end( data );
 });
})

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
    // SQL Query > Insert Data
    client.query('INSERT INTO Teacher(name, email, mob_no, password, college) values($1, $2, $3, $4, $5)',
      [data.name, data.email, data.mobile_no,data.password,data.college_name]);
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
});
  });
});
app.post('/api/loginTeacher',function(req,res){
  var results = [];
  var email=req.body.email;
  var password=req.body.password;
 // console.log("User name = "+user_name+", password is "+password);
 // res.end("yes");
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
      results.push(row);
    });
    // After all data is returned, close connection and return results
    query.on('end', function()  {
      done();
      if(results>0){
        return res.json(results);
        
      }
      else{
        return res.end("No such user exists");
      }
    });
  });
});
app.get('/checkApi',function(req,res)
{
  console.log("Hosted on Heoku"); 
  return res.end("Got result");
}

);

require('./routes/student')(app);
var server = app.listen(process.env.PORT || 8082, function () {

  var host = server.address().address
  var port = server.address().port

  console.log("Example app listening at http://%s:%s", host, port)

})

