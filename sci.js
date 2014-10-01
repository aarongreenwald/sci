var fs = require('fs')
var http = require("http")
var spawn = require('child_process').spawn

//repositories.json is a json formatted array of objects of form:
//{ "name" : "aarongreenwald/sci", "scriptDirectory" : "some/relative/or/absolute/path", "script": "scriptName.sh"}
//testing sci continuous integration process    
var repositories = JSON.parse(fs.readFileSync('repositories.json', 'utf8'));

var handleError = function(ex, response){
    response.write(ex.message ? ex.message : 'An uknown error occurred')
}

http.createServer(function(request, response) {
    response.writeHead(200, {"Content-Type": "text/plain"})
    try {                     
         var body = ' '            
         if (request.method == 'POST') {                 
            request.on('data', function (data) {
                body += data                                                  
            })
            
            request.on('end', function () {
                try {         
                    try {           
                        var payload = JSON.parse(body)                              
                    } catch (ex) {                        
                        throw { message: 'Unable to parse payload' + body }
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
                    if (!found){                        
                        throw 'Invalid repository'                        
                    }    
                } catch (ex) {                                        
                    handleError(ex, response)                    
                }                     
                finally {                    
                    response.end()
                }                                                          
            }) 
            
        }
        else {
            throw 'Only POST requests are processed by this server.'        
        }   
    }catch (ex) { //we didn't even make it to the callback, so we need to handle the error and close the response here
        handleError(ex, response)
        response.end()
    }   
    
}).listen(31242);
