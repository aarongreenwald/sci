sci
===

SCI - a simple continuous integration tool - listens for HTTP posts from github push event webhooks and runs bash scripts.

Configuration
---------------
sci reads environment variables:

* `DOTENV`: optional, if available it should be the path to a .env file that sci will read
* `SECRET`
* `SCI_CONFIG_PATH`: optional, if not available sci will look for the config file in `./sci.config.json`

Config file: 

```
{
    "verboseResponses" : "true",    
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
    "packages": [
        {
          "name": "@aarongreenwald/pim-web",
          "scriptDirectory": "/home/web/scripts/pim-web",
          "script": "pim-web.sh"
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
