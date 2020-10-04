const fs = require('fs');
const http = require('http');
const spawn = require('child_process').spawn;
const path = require('path');
const crypto = require('crypto');
if (process.env.DOTENV) {
    require('dotenv').config({path: process.env.DOTENV})
}

log('sci server starting...')

const config = loadConfig()

const {repositories, packages} = config
const port = config.port || 31242
const secret = process.env.SECRET

const requestListener = (request, response) => {

    const handleError = (ex, response) => {
        response.writeHead(500, {"Content-Type": "text/plain"})
        if (config.verboseResponses) {
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
            validateRequest(request, body)

            const payload = getPayload(body)
            const eventType = getEventType(request);

            let message = '';
            switch (eventType) {
                case 'push':
                    message = processPushEvent(payload)
                    break
                case 'package':
                    message = processPackageEvent(payload)
                    break
            }

            response.writeHead(200, {"Content-Type": "text/plain"})
            response.write(message)

        } catch (ex) {                                        
            handleError(ex, response)                    
        }                     
        finally {                    
            response.end()
        }                                                          
    })            
}

function loadConfig() {
    try {
        const configFile = process.env.SCI_CONFIG_PATH ||path.join(__dirname, 'sci.config.json');
        return JSON.parse(fs.readFileSync(configFile))
    }
    catch (ex){
        log(`Cannot parse config file: ${ex}`)
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

function getEventType(request) {
    return request.headers['x-github-event'];
}

function processPushEvent(payload) {
    const repository = repositories.find(r => r.name === payload.repository.full_name)
    if (repository) {
        spawn('sh', [ repository.script ], {
            cwd: repository.scriptDirectory
        })
        const message = `Successfully processed continuous integration script for repository: ${repository.name}`;
        log(message)
        return message;
    } else {
        throw 'Invalid repository name.'
    }
}

function processPackageEvent(payload) {
    const package = packages.find(r => r.name === payload.package.name)
    if (package) {
        spawn('sh', [ package.script ], {
            cwd: package.scriptDirectory
        })
        const message = `Successfully processed continuous integration script for package: ${package.name}`;
        log(message)
        return message;
    } else {
        throw 'Invalid package name.'
    }
}

function validateRequest(request, body) {
    const userAgent = request.headers['user-agent'];
    if (!userAgent.startsWith('GitHub-Hookshot/')){
        throw 'Only requests originating from GitHub are valid.'
    }

    const key = 'sha1=' + crypto.createHmac('sha1', secret).update(body).digest('hex')
    const suppliedKey = request.headers['x-hub-signature']

    if (suppliedKey !== key){
        throw 'Invalid signature.'
    }

    if (request.method !== 'POST') {
        throw 'Only POST requests are processed by this server.'
    }

    const event = getEventType(request);
    if (!['push', 'package'].includes(event)){
        throw 'Invalid event type (only push/package are valid).'
    }
}

function log(message){
    console.log('---------', new Date(), '---------')
    console.log(message)
    console.log()
}

log(`Listening for POST requests on port ${port}...`)
http.createServer(requestListener).listen(port)
