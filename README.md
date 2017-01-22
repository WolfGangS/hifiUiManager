# hifiUiManager
A manager for Interface scripts, that suports multiple "repositories"

#Repo Layout

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
            ]
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
            "datetime": "2017-01-20 20:00",
            "include" : true
        },
        "package2":{ .....
    },
    "meta":{
        "name": "Test Repo",
        "owner": "Mark Tester",
        "contact": "Testface@testing.com"
    }
}
```

Due to the way that this has to be laoded you need to handle CORS with the "Access-Control-Allow-Origin" header.

For users that download this manager, you need to allow "file://" if they are running it from the hosted github instance, you will need to allow "https://wolfgangs.github.io"

An example php script is below.

```PHP
<?php
$allowed = array("file://","https://wolfgangs.github.io");

$index = array_search($_SERVER["HTTP_ORIGIN"],$allowed);

if($index !== false)header("Access-Control-Allow-Origin: {$allowed[$index]}", false);

echo file_get_contents("repo.json");
```

HiFi's QT web engine only allows for 1 domain to be listed int eh CORS header, Because of this we need to so some detection for where the user is coming from.
