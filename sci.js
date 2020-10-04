const fs = require('fs');
const http = require('http');
const https = require('https');
const spawn = require('child_process').spawn;
const path = require('path');
const crypto = require('crypto');

/*
 * settings.json looks something like this: 
{
    "verboseResponses" : "true",
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

const settings = loadSettings()

const {repositories} = settings
const port = settings.port || 31242
const secret = process.env.SECRET

const requestListener = (request, response) => {

    const handleError = (ex, response) => {
        response.writeHead(500, {"Content-Type": "text/plain"})
        if (settings.verboseResponses) {
            response.write(ex.message || ex || 'An unknown error occurred')
        } else {
            response.write('That didn\'t work. Try again.')
        }
        log(ex.message || ex || 'An unknown error occurred.')
    };

    let body = '';
    request.on('data', data => { body += data })
    
    request.on('end', () => {
        try {
            validateRequest(request)

            const payload = getPayload(body)

            const repository = repositories.find(r => r.name === payload.repository.full_name)
            if (repository) {
                spawn('sh', [ repository.script ], {
                    cwd: repository.scriptDirectory
                })
                response.writeHead(200, {"Content-Type": "text/plain"})
                const message = `Successfully processed continuous integration script for repository: ${repository.name}`;
                response.write(message)
                log(message)
            } else {
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

function loadSettings() {
    try {
        return JSON.parse(fs.readFileSync(path.join(__dirname, 'sci.config.json')))
    }
    catch (ex){
        log(`Cannot parse settings file: ${ex}`)
        throw ex
    }
}

function getPayload(body) {
    try {
        return JSON.parse(body)
    } catch (ex) {
        throw {
            message: `Unable to parse payload: ${body}\n\nError: ${ex}`
        }
    }
}

function validateRequest(request) {
    const userAgent = request.headers['user-agent'];
    if (!userAgent.startsWith('GitHub-Hookshot/')){
        throw 'This request does not appear to originate from github. If you\'re going to try to break the system, at least try harder.'
    }

    const key = 'sha1=' + crypto.createHmac('sha1', secret).update(body).digest('hex')
    const suppliedKey = request.headers['x-hub-signature']

    if (suppliedKey !== key){
        throw 'Invalid signature.'
    }

    if (request.method !== 'POST') {
        throw 'Only POST requests are processed by this server.'
    }

    if (request.headers['x-github-event'] !== 'push'){
        throw 'Only push events are processed by this server.'
    }
}

function log(message){
    console.log('---------', new Date(), '---------')
    console.log(message)
    console.log()
}

log(`Listening for POST requests on port ${port}...`)

if (!settings.ssl){
	http.createServer(requestListener).listen(port)
} else {	
	https.createServer(settings.sslOptions || { }, requestListener).listen(port)
}
