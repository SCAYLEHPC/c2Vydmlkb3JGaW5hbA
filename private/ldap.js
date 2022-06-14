const ldap = require('ldapjs');


var client = ldap.createClient({
	url: process.env.LDAP_SERVER_URL
});


exports.Login = {
  
  authenticateUser: async function(username, password) {
  
    var searchRes = "";
    var authRes = {'resultado': false, 'old': false};
    
    return new Promise((resolve) => {
      client.bind(process.env.LDAP_SEARCH_USER, process.env.LDAP_SEARCH_PSW, function(err) {
        
        if (err) {

	   console.log("LDAP Reader bind failed " + err);
	   resolve(JSON.stringify(authRes));
        }
	
      //var filter = process.env.LDAP_FILTER;
        var filter =  '&(objectClass=user)(sAMAccountName='+username+')(memberOf=CN=blockchain,CN=Users,DC=scayletest,DC=local)';
      
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

                 if (searchList.length === 1) {
		    client.bind(searchList[0].objectName, password, function(err) {
		
		    if (err) {
		     // console.log("Bind with real credential error: " + err);
		      authRes.resultado = false;
		      resolve(JSON.stringify(authRes));
		    }
		    else {
		     // console.log("Bind with real credential is a success");
		      authRes.resultado = true;
		      resolve(JSON.stringify(authRes));
		    }
							
		  });  // client.bind (real credential)
					
					
		  } else { // if (searchList.length === 1)
		    searchRes += "No unique user to bind";
		  }

	     });   // searchRes.on("end",...)
			
       });   // client.search
      
      }); // client.bind  (reader account)
    });
    resolve(JSON.stringify(authRes));
  }
  
}
