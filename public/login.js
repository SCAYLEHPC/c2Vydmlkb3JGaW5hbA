async function sendData(e) {
	
	e.preventDefault()
	let user = {
	  name: document.getElementById("username").value,
	  passw: document.getElementById("password").value
	};
	
	await fetch('/loginProcess',
	{
		method: 'post',
		body: JSON.stringify(user)
	});
	
}
