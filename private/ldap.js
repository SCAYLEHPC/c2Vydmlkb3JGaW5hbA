const ldap = require('ldapjs');


var client = ldap.createClient({
	url: process.env.LDAP_SERVER_URL
});


exports.Login = {
  
  authenticateUser: function(username, password) {

    
    client.bind(process.env.LDAP_SEARCH_USER, process.env.LDAP_SEARCH_PSW, function(err) {
      if (err) {

	 console.log("Reader bind failed " + err);
	 return;
      }
	
      console.log("Reader bind succeeded\n");
	
      var filter = process.env.LDAP_FILTER;
	
      console.log('LDAP filter: '+filter+'\n');
	
      client.search(process.env.LDAP_BASE, {filter:filter, scope:"sub"},
        (err, searchRes) => {
	   var searchList = [];
			
	   if (err) {
	     console.log("Search failed " + err);
	     return;
	   }
			
	   searchRes.on("searchEntry", (entry) => {
	     console.log("Found entry: " + entry + "\n");
	     searchList.push(entry);
	   });

	   searchRes.on("error", (err) => {
	     console.log("Search failed with " + err);
	   });
			
	   searchRes.on("end", (retVal) => {
	     console.log("Search results length: " + searchList.length + "\n");
	     for(var i=0; i<searchList.length; i++) 
	       console.log("DN:" + searchList[i].objectName + "\n");
	       console.log("Search retval:" + retVal + "\n");			

               if (searchList.length === 1) {
		  client.bind(searchList[0].objectName, password, function(err) {
		
		  if (err) 
		    console.log("Bind with real credential error: " + err);
		  else
		    console.log("Bind with real credential is a success");
							
		});  // client.bind (real credential)
					
					
		} else { // if (searchList.length === 1)
		  console.log("No unique user to bind");
		}

	   });   // searchRes.on("end",...)
			
      });   // client.search
	
    }); // client.bind  (reader account)
  }
  
}
