var fs = require('fs')
var http = require("http")
var https = require("https")
var spawn = require('child_process').spawn
var path = require('path')
var crypto = require('crypto')

var log = function(message){	
    console.log('---------', new Date(), '---------')
    console.log(message)
    console.log()
    //TODO write to a log file
}

/*
 * settings.json looks something like this: 
{
    "verboseResponses" : "true",
    "secretKey" : "sha1=somelonghashstringthatrepresentsyoursecretkey", 
	"ssl" : "true",
	"sslOptions" : {},
    "repositories": [
        {   
            "name": "aarongreenwald/grouper", 
            "scriptDirectory": "sci/scripts/", 
            "script": "grouper.sh"
        },
        {   
            "name": "aarongreenwald/sci", 
            "scriptDirectory": "sci/scripts/", 
            "script": "sci.sh"
        }
    ],
    "port" : 31242
}
* 
* port will default to 31242 if ommitted
* verboseSettings will default to false if ommitted
 */

log('sci server starting...')

try {
    var settings = JSON.parse(fs.readFileSync(path.join(__dirname, 'sci.config.json')))
} 
catch (ex){
    log('Cannot parse settings file: ' + ex)
    throw ex
}

var repositories = settings.repositories
var port = settings.port || 31242

var requestListener = function(request, response) {  
    
    var handleError = function(ex, response){
        response.writeHead(500, {"Content-Type": "text/plain"})
        if (settings.verboseResponses){
            response.write(ex.message || ex ||  'An uknown error occurred')    
        }
        else {        
            response.write('That didn\'t work. Try again.')        
        }    
        log(ex.message || ex || 'An unknown error occurred.') //TODO I should log more than this
    }

              
    var body = ''                                
    request.on('data', function (data) {
        body += data                                                  
    })
    
    request.on('end', function () {
        try {                                     
            if (request.headers['user-agent'].indexOf('GitHub-Hookshot/') === -1){
                throw 'This request does not appear to originate from github. If you\'re going to try to break the system, at least try harder.'            
            }
                        
	    const key = 'sha1=' + crypto.createHmac('sha1', settings.secretKey).update(body).digest('hex')
	    const suppliedKey = request.headers['x-hub-signature']

            if (suppliedKey !== key){
                throw 'You don\'t seem to be who you say you are. You need the key to enter!!'
            }
            
            if (request.method !== 'POST') {       
                throw 'Only POST requests are processed by this server.'         
            }
            
            if (request.headers['x-github-event'] !== 'push'){
                throw 'Only push events are processed by this server.'
            }
            
            try {           
                var payload = JSON.parse(body)                              
            } catch (ex) {                        
                throw   { 
                            message: 'Unable to parse payload: ' 
                                    + body 
                                    + '\n\nError: ' + ex
                        }
            }
            
            var found = false
            for (var i = 0; i < repositories.length; i++){
                var repository = repositories[i]
                if (payload.repository.full_name === repository.name){                    
                    spawn('sh', [ repository.script ], { 
                        cwd: repository.scriptDirectory
                    })                                      
                    found = true
                    break             
                } 
            }
            if (found){
                response.writeHead(200, {"Content-Type": "text/plain"})
                var message = 'Successfully processed continuous integration script for repository: ' + repository.name
                response.write(message) 
                log(message) //log more than this
            }
            else {                        
                throw 'Invalid repository name.'                        
            }                 
        } catch (ex) {                                        
            handleError(ex, response)                    
        }                     
        finally {                    
            response.end()
        }                                                          
    })            
}

log('Listening for POST requests on port ' + port + '...')

if (!settings.ssl){
	http.createServer(requestListener).listen(port)
} else {	
	https.createServer(settings.sslOptions || { }, requestListener).listen(port)
}
