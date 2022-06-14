const https = require('https');
const fs0 = require('fs');
const fs = require('fs').promises;
const request = require('request');

const express = require("express");
const app = express();
const router = express.Router();
const path = require("path");
const ldap = require('ldapjs');

const blockchainApp = require(process.env.BLOCKCHAIN_APP);
const LoginInterface = require(process.env.LOGIN_INTERFACE);

const host = process.env.SERVER_IP_ADDR;
const port = process.env.SERVER_PORT;

var sessions = {};
var sessionLifetime = 5;   // In minutes
const uuid = require('uuid');
var cookieParser = require("cookie-parser");
app.use(cookieParser());


if (process.env.NODE_ENV === "produccion") {
  app.use(express.static('public'));
  
  app.get("*", (req, res) => {
  
    if (sessions[req.cookies.sessionID] != undefined) {
      
      //sessionData = sessions[req.cookies.sessionID];
      res.setHeader("Content-Type", "text/html");
      res.sendFile(path.resolve(__dirname, "public", "encrypt-decrypt.html"));
      
    } else {
      res.sendFile(path.resolve(__dirname, "public", "login.html")); 
    }
  });
  
  app.post("/loginProcess", (req, res) => {
    
    req.on('data', async function(chunk) {
      
      var loginUser = JSON.parse(chunk);
      //console.log("Datos de inicio de sesion recibidos: ");
      //console.log(loginUser);
      
      var authRes = await LoginInterface.Login.authenticateUser(loginUser.name, loginUser.passw);      
      var authResParsed = JSON.parse(authRes);
      

      if(authResParsed.resultado) {
        // Login correcto => Redireccion al sitio + Cookie de sesion
        console.log("Login correcto => User: "+loginUser.name);
     
        var sessionID = uuid.v1();
        console.log("Sesion ID: "+sessionID);
        sessions[sessionID] = authResParsed;

        res.setHeader("Content-Type", "text/html");
        res.setHeader("Set-Cookie", "sessionID="+sessionID+";maxAge= 1 * 60 * 1000");
        res.redirect(200, "/");
        
      } else {
        // Login incorrecto => Redireccion al login
        console.log("Login incorrecto => User: "+loginUser.name);
        res.redirect("./public/login.html");
        res.end();
      }
      
    });

  });

  app.post("/postData", (req, res) => {

    if (sessions[req.cookies.sessionID] != undefined) {
    	var ts = new Date();
    	console.log("POST request received on server side at "+ts);
    
      	var filePath = 'fileBackUp/' + req.headers['headerfilename'];      	
	let writeStream = fs0.createWriteStream(filePath);
    
    	req.on('data', async function(chunk) {
	        
	      	writeStream.write(chunk);
	      	
	});
	
	req.on('end', () => {
	
		writeStream.on('finish', () => {
	      	  
	      	  postToRep(filePath, req.headers['headerfilename']).then(function() {
	      	    
	      	    var JSONdata = JSON.parse(req.headers['jsondata']);
	      	    //blockchainApp.App.registrarInvestigacion(JSONdata);
	      	    
	      	  })
	      	  .catch(function(error) {
		    console.error("Error on transaction to Blockchain: "+error);
		  });
	      	})
	      	.on('error', err => {
	      	  console.error("Error on file save to server: "+err);
	      	});
	      	
	      	writeStream.end();
	});
  
        res.writeHead(200);
        res.end();
        
     } else {
       console.log("Rececpcion de datos, pero usuario no autenticado");
       res.setHeader("message", "Sesion caducada");
       res.sendFile(path.resolve(__dirname, "public", "login.html"));
    } 
  });
}


https.createServer({key: fs0.readFileSync('certs/key.pem'), cert: fs0.readFileSync('certs/cert.pem')}, app).listen(port, host, () => {
  console.log('Server is running on https: '+host+':'+port);
  blockchainApp.App.init();
});


setInterval( () => periodicCheck(), sessionLifetime*60*1000);


function periodicCheck() {
  
  
  for(var sessionID in sessions) {
    
    if (sessions[sessionID].old) {
      delete sessions[sessionID];
    } else {
      sessions[sessionID].old = true;
      console.log("Session "+sessionID+" found set to old");
    }
  }
}

async function postToRep(file, fileName) {
	
	const repURL = await getAlfData();
	
	var r = request.post(repURL, function callback(err, httpResponse, body) {
	    if(err || JSON.parse(body).error) {
		return console.log('Upload failed: '+body)
	    }
		console.log('Upload success')
	    })

	var form = r.form()
	form.append("name", fileName)
	form.append("nodeType", "cm:content")
	form.append("relativePath", "Sites/test-site")
	form.append("filedata",fs0.createReadStream(file))
}

async function getAlfData() {
	var complete_url = '';
	var alf_url = process.env.REP_URL;
	var alf_tck = '';
	
	alf_tck = await doRequest();
	  
	complete_url += alf_url;
	complete_url += alf_tck;
	

	return complete_url;
}

function doRequest() {
	return new Promise(function (resolve, reject) {
		const options = {
		  url: process.env.REP_TCK_URL,
		  json: true,
		  body: {
		    "userId":process.env.REP_TCK_US,
		    "password":process.env.REP_TCK_PW
		  }
		};
		
		request.post(options, (err, res, body) => {
		  if (err) {
		    reject(err);
		  }
		  
		  resolve(body.entry.id);
		});
	});
}
