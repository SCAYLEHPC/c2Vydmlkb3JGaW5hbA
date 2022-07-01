const ldap = require('ldapjs');


var client = ldap.createClient({
	url: process.env.LDAP_SERVER_URL
});


exports.Login = {
  
  authenticateUser: async function(username, password) {
  
    var searchRes = "";
    var authRes = {'resultado': false, 'old': false, 'nombre': '', 'apellido1': '', 'apellido2': '','inst': null,'IDinst': null};
    
    return new Promise((resolve) => {
      client.bind(process.env.LDAP_SEARCH_USER, process.env.LDAP_SEARCH_PSW, function(err) {
        
        if (err) {

	   console.log("LDAP Reader bind failed " + err);
	   resolve(JSON.stringify(authRes));
        }
	
        var filter = process.env.LDAP_FILTER1 + username + process.env.LDAP_FILTER2;
      
        searchRes += 'LDAP filter: '+filter+'\n';
	
        client.search(process.env.LDAP_BASE, {filter:filter, scope:"sub"},
        (err, searchRes) => {
	     var searchList = [];
			
	     if (err) {
	       console.log("LDAP user search failed " + err);
	       return;
	     }
			
	     searchRes.on("searchEntry", (entry) => {
	       searchRes += "Found entry: " + entry + "\n";
	       searchList.push(entry);
	     });

	     searchRes.on("error", (err) => {
	       searchRes += "Search failed with " + err;
	     });
			
	     searchRes.on("end", (retVal) => {
	       searchRes += "Search results length: " + searchList.length + "\n";
	       for(var i=0; i<searchList.length; i++) 
	         searchRes += "DN:" + searchList[i].objectName + "\n";
	         searchRes += "Search retval:" + retVal + "\n";

                 if (searchList.length === 1 && password!="") {
		    client.bind(searchList[0].objectName, password, function(err) {
		
		    if (err) {
		     // console.log("Bind with real credential error: " + err);
		      authRes.resultado = false;
		      resolve(JSON.stringify(authRes));
		    }
		    else {
		     // console.log("Bind with real credential is a success");
		      const ldapEntry = JSON.parse(searchList[0]);
		      const grupos = ldapEntry.attributes;
		      var listaGrupos = [];
		      var nombreCompleto = '';
		      
		      for(var i=0; i<grupos.length; i++) {

		        if(grupos[i].type == "memberOf") {
		          listaGrupos = grupos[i].vals;
		        }

		        if(grupos[i].type == "cn") {
		          nombreCompleto = grupos[i].vals[0];
		        }
		      }
		      
		      
		      for(var i=0; i<listaGrupos.length; i++) {
		        var listaSplit = listaGrupos[i].split(',');
		        
		        if(listaSplit[0] == process.env.LDAP_GRUPO_01) {
		          authRes.inst = 'ULE';
		          authRes.IDinst = 0;
		          //console.log("Usuario de la ULE");
		        }
		        if(listaSplit[0] == process.env.LDAP_GRUPO_02) {
		          authRes.inst = 'USAL';
		          authRes.IDinst = 1;
		          //console.log("Usuario de la USAL");
		        }
		      }

		      var nombrePartes = nombreCompleto.split(' ');
		      authRes.nombre = nombrePartes[0];
		      authRes.apellido1 = nombrePartes[1];
		      authRes.apellido2 = nombrePartes[2];
		        
		      authRes.resultado = true;
		      resolve(JSON.stringify(authRes));
		    }

		  });  // client.bind (real credential)


		  } else { // if (searchList.length === 1)
		    searchRes += "No unique user to bind";
		    authRes.resultado = false;
		    resolve(JSON.stringify(authRes));
		  }

	     });   // searchRes.on("end",...)
			
       });   // client.search
      
      }); // client.bind  (reader account)
    });

  }
  
}
