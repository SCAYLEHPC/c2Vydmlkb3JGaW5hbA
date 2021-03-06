var mode=null;
var objFile=null;
switchdiv('encrypt');

function switchdiv(t) {
	
	if(t=='encrypt') {
		divEncryptfile.style.display='block';
		divDecryptfile.style.display='none';
		btnDivEncrypt.disabled=true;
		btnDivDecrypt.disabled=false;
		mode='encrypt';
	} else if(t=='decrypt') {
		divEncryptfile.style.display='none';
		divDecryptfile.style.display='block';
		btnDivEncrypt.disabled=false;
		btnDivDecrypt.disabled=true;
		mode='decrypt';
	}
}

function encvalidate() {
	if(txtEncpassphrase.value.length>=8 && txtEncpassphrase.value==txtEncpassphraseretype.value) { 
	  spnCheckretype.classList.add("greenspan");
	  spnCheckretype.classList.remove("redspan");
	  spnCheckretype.innerHTML='&#10004;';
	} else { 
	  spnCheckretype.classList.remove("greenspan");
	  spnCheckretype.classList.add("redspan");
	  spnCheckretype.innerHTML='&#10006;';
	}

	if( txtEncpassphrase.value.length>=8 && txtEncpassphrase.value==txtEncpassphraseretype.value && objFile ) { btnEncrypt.disabled=false; } else { btnEncrypt.disabled=true; }
}

function decvalidate() {
	if( txtDecpassphrase.value.length>0 && objFile ) { btnDecrypt.disabled=false; } else { btnDecrypt.disabled=true; }
}


function drop_handler(ev) {

	ev.preventDefault();
	// If dropped items aren't files, reject them
	var dt = ev.dataTransfer;
	if (dt.items) {
		// Use DataTransferItemList interface to access the file(s)
		for (var i=0; i < dt.items.length; i++) {
			if (dt.items[i].kind == "file") {
				var f = dt.items[i].getAsFile();
				objFile=f;
			}
		}
	} else {
		// Use DataTransfer interface to access the file(s)
		objFile=file[0];
	}		 
	displayfile()
	if(mode=='encrypt') { encvalidate(); } else if(mode=='decrypt') { decvalidate(); }
}

function dragover_handler(ev) {
	// Prevent default select and drag behavior
	ev.preventDefault();
}

function dragend_handler(ev) {
	// Remove all of the drag data
	var dt = ev.dataTransfer;
	if (dt.items) {
		// Use DataTransferItemList interface to remove the drag data
		for (var i = 0; i < dt.items.length; i++) {
			dt.items.remove(i);
		}
	} else {
		// Use DataTransfer interface to remove the drag data
		ev.dataTransfer.clearData();
	}
}

function selectfile(Files) {
	objFile=Files[0];
	displayfile()
	if(mode=='encrypt') { encvalidate(); } else if(mode=='decrypt') { decvalidate(); }
}

function displayfile() {
	var s;
	var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
	var bytes=objFile.size;
	var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
	if(i==0) { s=bytes + ' ' + sizes[i]; } else { s=(bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i]; }

	if(mode=='encrypt') { 
		spnencfilename.textContent=objFile.name + ' (' + s + ')'; 
	} else if(mode=='decrypt') {  
		spndecfilename.textContent=objFile.name + ' (' + s + ')'; 
	} 
}

function readfile(file){
	return new Promise((resolve, reject) => {
		var fr = new FileReader();  
		fr.onload = () => {
			resolve(fr.result )
		};
		fr.readAsArrayBuffer(file);
	});
}

async function encryptfile() {
	btnEncrypt.disabled=true;

	var plaintextbytes=await readfile(objFile)
	.catch(function(err){
		console.error(err);
	});
	
	plaintextbytes=new Uint8Array(plaintextbytes);

	var pbkdf2iterations=10000;
	var passphrasebytes=new TextEncoder("utf-8").encode(txtEncpassphrase.value);
	var pbkdf2salt=window.crypto.getRandomValues(new Uint8Array(8));

	var passphrasekey=await window.crypto.subtle.importKey('raw', passphrasebytes, {name: 'PBKDF2'}, false, ['deriveBits'])
	.catch(function(err){
		console.error(err);
	});

	var pbkdf2bytes=await window.crypto.subtle.deriveBits({"name": 'PBKDF2', "salt": pbkdf2salt, "iterations": pbkdf2iterations, "hash": 'SHA-256'}, passphrasekey, 384)		
	.catch(function(err){
		console.error(err);
	});
	pbkdf2bytes=new Uint8Array(pbkdf2bytes);

	keybytes=pbkdf2bytes.slice(0,32);
	ivbytes=pbkdf2bytes.slice(32);

	var key=await window.crypto.subtle.importKey('raw', keybytes, {name: 'AES-CBC', length: 256}, false, ['encrypt']) 
	.catch(function(err){
		console.error(err);
	});

	var cipherbytes=await window.crypto.subtle.encrypt({name: "AES-CBC", iv: ivbytes}, key, plaintextbytes)
	.catch(function(err){
		console.error(err);
	});

	if(!cipherbytes) {
	 	spnEncstatus.classList.add("redspan");
		spnEncstatus.innerHTML='<p>Error encrypting file.  See console log.</p>';
		return;
	}

	cipherbytes=new Uint8Array(cipherbytes);


        var resultbytes=new Uint8Array(cipherbytes.length+16)
	resultbytes.set(new TextEncoder("utf-8").encode('Salted__'));
	resultbytes.set(pbkdf2salt, 8);
	resultbytes.set(cipherbytes, 16);

	
	
	var date = new Date();
	var fileName = date.getFullYear()+ "-" +(date.getMonth()+1)+ "-" +date.getDate()+ "_" +date.getHours()+ "-" +date.getMinutes()+ "-" +date.getSeconds()+ "_" +objFile.name+ '.enc';
	var fileTimestamp = date.getFullYear()+ "-" +(date.getMonth()+1)+ "-" +date.getDate()+ "_" +date.getHours()+ ":" +date.getMinutes()+ ":" +date.getSeconds();
	
	
	var blob=new Blob([resultbytes], {type: 'application/download'});
	var blobUrl=URL.createObjectURL(blob);
		
	aEncsavefile.href=blobUrl;
	aEncsavefile.download= fileName;

	spnEncstatus.classList.add("greenspan");
	spnEncstatus.innerHTML='<p>File encrypted.</p>';
	aEncsavefile.hidden=false;	
	
	//GENERATE HASH FROM FILE
	var hashBuffer = await window.crypto.subtle.digest("SHA-256", resultbytes);
	var hashArray = Array.from(new Uint8Array(hashBuffer));
	var hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
	console.log(hashHex);	
	
	
	//var blobFile=new Blob([plaintextbytes], {type: 'application/pdf'});
	var blobFile=new Blob([resultbytes], {type: 'application/pdf'});
	
	
	let msg = {
	  nombre_investigador: 'N_Inv',		//
	  apellido1_investigador: 'A1_Inv',		// GET data from sso
	  apellido2_investigador: 'A2_Inv',		//
	  timestamp: fileTimestamp,
	  hash: hashHex.toString()	
	}
	
	
	await fetch('/postData',
	{
		method: 'post',
		headers: {
		  'headerFileName': fileName,
		  'jsonData': JSON.stringify(msg)
		},
		body: blobFile
	}).then(function(dataRes) {
		//alert(dataRes).headers['message'];
		window.location.reload();
	});
	
	console.log("Envio de datos del cliente\n");
	
}

async function decryptfile() {
	btnDecrypt.disabled=true;

	var cipherbytes=await readfile(objFile)
	.catch(function(err){
		console.error(err);
	});	
	cipherbytes=new Uint8Array(cipherbytes);

	var pbkdf2iterations=10000;
	var passphrasebytes=new TextEncoder("utf-8").encode(txtDecpassphrase.value);
	var pbkdf2salt=cipherbytes.slice(8,16);


	var passphrasekey=await window.crypto.subtle.importKey('raw', passphrasebytes, {name: 'PBKDF2'}, false, ['deriveBits'])
	.catch(function(err){
		console.error(err);

	});

	var pbkdf2bytes=await window.crypto.subtle.deriveBits({"name": 'PBKDF2', "salt": pbkdf2salt, "iterations": pbkdf2iterations, "hash": 'SHA-256'}, passphrasekey, 384)		
	.catch(function(err){
		console.error(err);
	});
	pbkdf2bytes=new Uint8Array(pbkdf2bytes);

	keybytes=pbkdf2bytes.slice(0,32);
	ivbytes=pbkdf2bytes.slice(32);
	cipherbytes=cipherbytes.slice(16);

	var key=await window.crypto.subtle.importKey('raw', keybytes, {name: 'AES-CBC', length: 256}, false, ['decrypt']) 
	.catch(function(err){
		console.error(err);
	});

	var plaintextbytes=await window.crypto.subtle.decrypt({name: "AES-CBC", iv: ivbytes}, key, cipherbytes)
	.catch(function(err){
		console.error(err);
	});

	if(!plaintextbytes) {
	 	spnDecstatus.classList.add("redspan");
		spnDecstatus.innerHTML='<p>Error decrypting file.  Password may be incorrect.</p>';
		return;
	}

	plaintextbytes=new Uint8Array(plaintextbytes);

	var blob=new Blob([plaintextbytes], {type: 'application/download'});
	var blobUrl=URL.createObjectURL(blob);
	aDecsavefile.href=blobUrl;
	aDecsavefile.download=objFile.name + '.dec';

 	spnDecstatus.classList.add("greenspan");
	spnDecstatus.innerHTML='<p>File decrypted.</p>';
	aDecsavefile.hidden=false;
}

async function logout() {
  
  await fetch('/logout',
  {
  
    method: 'post'
    
  }).then(function(dataRes) {
    console.log("Res: ");
    console.log(dataRes);
    window.location.reload();
  });
}
