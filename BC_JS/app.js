const HDWalletProvider = require("@truffle/hdwallet-provider");
const Web3 = require('web3');
const fs = require('fs');

const privateKey = process.env.PRIV_KEY_LOCAL
const node = process.env.BLOCKCHAIN_LOCATION_LOCAL;
var accountObject = null;
var account = null;
var contract = {};
var provider = null;
var web3 = null;

exports.App = {

	init: async function() {
	    return await this.initWeb3();
	},


	initWeb3: async function() {

	    provider = new HDWalletProvider(privateKey, node);
	    web3 = new Web3(provider);

	    accountObject = await web3.eth.accounts.privateKeyToAccount(privateKey);
	    account = accountObject.address;

	    return this.initContract();
	},


	initContract: function() {

	    const contractJson = fs.readFileSync(process.env.BLOCKCHAIN_CONTRACT_DIR);
	    const abi = JSON.parse(contractJson);

	    contract.RI = new web3.eth.Contract(abi.abi);
	    contract.RI.options.address = process.env.BLOCKCHAIN_CONTRACT_ADDRESS_LOCAL;

	    contract.RI.setProvider(provider);

	    console.log("\tContrato registrado en la red localizado e inicializado");

	},

	  
	registrarInvestigacion: async function(jsonObject) {

	      	var jsonParsed = JSON.parse(jsonObject);
		var RI_NombreInstitucion = jsonParsed.nombre_institucion;
		var RI_IdentificadorInstitucion = jsonParsed.identificador_institucion;
		var RI_NombreInvestigador = jsonParsed.nombre_investigador;
		var RI_Apellido1Investigador = jsonParsed.apellido1_investigador;
		var RI_Apellido2Investigador = jsonParsed.apellido2_investigador;
		var RI_Timestamp = jsonParsed.timestamp;
		var RI_Hash = jsonParsed.hash;


		await contract.RI.methods.registrarInvestigacion(RI_NombreInstitucion, RI_IdentificadorInstitucion, RI_NombreInvestigador, RI_Apellido1Investigador, RI_Apellido2Investigador, RI_Timestamp, RI_Hash).send({from: account, /*gasPrice: 0x0*/}, function(error, result){

		  if(error) {
		    console.log("Error: "+error);
		  } else {
		    console.log("\tDatos registrados con exito");
		    console.log("\tIdentificador de la transaccion: "+result);
		  }
	      	});
	}
};
