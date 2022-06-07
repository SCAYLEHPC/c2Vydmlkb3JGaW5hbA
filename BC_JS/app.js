const Web3 = require('web3');
const fs = require('fs');


exports.App = {
	web3Provider: null,
	contracts: {},
	account: process.env.BLOCKCHAIN_ACCOUNT,

	init: async function() {
	    return await this.initWeb3();
	},

	initWeb3: async function() {
	    
		this.web3Provider = new Web3.providers.HttpProvider(process.env.BLOCKCHAIN_LOCATION);
		
		web3 = new Web3(this.web3Provider);
		
	    return this.initContract();
	},

	initContract: function() {
	
	
	    const contractJson = fs.readFileSync(process.env.BLOCKCHAIN_CONTRACT_DIR);
	    const abi = JSON.parse(contractJson);
	    
	    this.contracts.RI = new web3.eth.Contract(abi.abi);
	    this.contracts.RI.options.address = process.env.BLOCKCHAIN_CONTRACT_ADDRESS;

	    this.contracts.RI.setProvider(this.web3Provider);
	    
	},

	  
	registrarInvestigacion: async function(jsonObject) {
		var RI_NombreInvestigador = jsonObject.nombre_investigador;
		var RI_Apellido1Investigador = jsonObject.apellido1_investigador;
		var RI_Apellido2Investigador = jsonObject.apellido2_investigador;
		var RI_Timestamp = jsonObject.timestamp;
		var RI_Hash = jsonObject.hash;		
		
		
		
		this.contracts.RI.methods.registrarInvestigacion(RI_NombreInvestigador, RI_Apellido1Investigador,RI_Apellido2Investigador,RI_Timestamp,RI_Hash).send({from: this.account, to: this.account, gas: 300000}, function(error, result){
		
		  if(error) {
		    console.log("Error: "+error);
		  } else {
		    console.log("Investigacion registrada con exito");
		    console.log("Identificador de la transaccion: "+result);
		  }
	      	});
	},
	
	getTotalInvestigaciones: function() {
		this.contracts.RI.methods.getNumeroTotalInvestigaciones().call({from: this.account}, function(error, result){
		console.log("Investigaciones registradas: "+result);
		});
	}
};
