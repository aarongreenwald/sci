sci
===

SCI - a simple continuous integration tool - listens for HTTP posts from github push event webhooks and runs bash scripts.

Configuration
---------------
You'll need a settings.json file that looks something like this: 

```
{
    "verboseResponses" : "true",
    "secretKey" : "sha1=somelonghashstringthatrepresentsyoursecretkey", 
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
```
The `port` and `verboseResponses` settings are optional, they'll default to `31242` and `false`, respectively. When 
`verboseResponses` is `false`, error messages will not be very descriptive. 

TODO
--------------
* Add support for other sources, such as bitbucket.
* Add support for rolling builds (so that only one build per repository is running at a time)
