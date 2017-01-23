# hifiUiManager
A manager for Interface scripts, that supports multiple "repositories"

You can install it by downloading the project and adding it locally, or by using the following url.

https://wolfgangs.github.io/hifiUiManager/uiManager.js

# Adding your repo to the listing.

Make a pull request with the meta info for your repo added to the repos.json file in the html folder.

Format:

```javascript
{
    "name": "Test Repo",
    "owner": "Mark Tester",
    "contact": "Testface@testing.com",
    "url" : "http://testing.com/repo/",
    "tags": ["test","mark","testing.com"]
}
```

# Repo Layout

Repos are loaded as json.

The format is as below

```javascript
{
    "categories":{
        "cat1": {
            "name": "Category 1",
            "description" : "Category 1 Description",
            "packages" : [
                "package1",
                "package2"
            ],
            "tags": ["thing","category"]
        },
        "cat2": { .....
    },
    "packages":{
        "package1":{
            "name": "Package 1",
            "description": "Package 1 Description",
            "source" : "http://testing.com/scripts/package1.js",
            "creator" : "Bot Test",
            "version" : "1.0",
            "datetime" : "2017-01-20 20:00",
            "include" : true,
            "tags" : ["test","bot","thing"],
            "requires": ["package4"]
        },
        "package2":{ .....
    },
    "meta":{
        "name": "Test Repo",
        "owner": "Mark Tester",
        "contact": "Testface@testing.com",
        "url" : "http://testing.com/repo/",
        "tags": ["test","mark","testing.com"]
    }
}
```
As some users may be loading this from a https connection, you will need to serve your repo over https for best results. (Users that load the uiManager from github wont be able to access http repos)


The script will query the url the user puts in, so that is the one that needs to return the json.

It can link directly to a json file, however due to the fact that the script is being run from a separate domain, CORS becomes a problem so you will need to set the "Access-Control-Allow-Origin" header.

For users that download this manager, you need to allow "file://" if they are running it from the hosted github instance, you will need to allow "https://wolfgangs.github.io"

However the QT engine that HiFi uses for this doesn't allow for you to just declare both. So you have to do some detection

An example php script is below.

```PHP
<?php
$allowed = array("file://","https://wolfgangs.github.io"); // A list of domains we wish to allow access to.

$index = array_search($_SERVER["HTTP_ORIGIN"],$allowed); // Locate the origin we have been provided in the request header.

if($index !== false)header("Access-Control-Allow-Origin: {$allowed[$index]}", false); //if the domain was found set the CORS header

echo file_get_contents("repo.json"); // serve our json you could just as well write the json below in the php file.
```

This should work fairly easily in your web language of choice.
