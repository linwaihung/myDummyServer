//Lets require/import the HTTP module
var http = require('http');
var emv = require('node-emv');
var Dukpt = require('dukpt');

const encryptionBDK = '0123456789ABCDEFFEDCBA9876543210';
const options = {
    outputEncoding: 'hex',
    encryptionMode: '3DES',
	trimOutput: false
};

//Lets define a port we want to listen to
const PORT=8080; 

//Lets use our dispatcher
function handleRequest(request, response){
    try {
        //log the request on console
        //console.log(request.url);
		//console.log(request.method);
		//console.log(request.headers);

		var body = "";
		var c2ksn ="";
		request.on('data', function (chunk) {
			body += chunk;
		});
		request.on('end', function () {
			console.log('received: ' + body);
			// Parse EMV data
			emv.parse(body,function(data){
				if (data != null){
					//console.log('Parse: ');
					//console.log(data);
					// Decrypt the C2 below
					data.forEach(function(item, index){
						if (item.tag == 'C0') {
							//console.log('KSN: ' + data[index].value);
							c2ksn = data[index].value;
						}
						else if (item.tag == 'C2'){
							//console.log('Data: ' + data[index].value);
							var dukpt = new Dukpt(encryptionBDK, c2ksn);
							var decryptedCardData = dukpt.dukptDecrypt(data[index].value, options);
							//Stripe out the pending zero
							while (decryptedCardData.length > 0)
								if (decryptedCardData.endsWith('00'))
									decryptedCardData = decryptedCardData.substring(0,decryptedCardData.length-2);
								else
									break;
							emv.parse(decryptedCardData,function(data2){
								data = data.concat(data2);  // append the decrypted result to the original data
							});
						}
					});
					
					//console.log("Parse:" + JSON.stringify(data));
					console.log("Parse:");
					console.log(data);
				}
			});
			
			var reply = '8A023030';
			console.log('send: ' + reply);
			response.end(reply);		})

    } catch(err) {
        console.log(err);
    }
}

//Create a server
var server = http.createServer(handleRequest);

//Lets start our server
server.listen(PORT, function(){
    //Callback triggered when server is successfully listening. Hurray!
    console.log("Server listening on: http://localhost:%s", PORT);
	//console.log("Windows host name is : ", window.location.hostname);
});