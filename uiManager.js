
//["objectName","position","size","visible","url","destroyed(QObject*)","destroyed()","objectNameChanged(QString)","deleteLater()","visibleChanged()","positionChanged()","sizeChanged()","moved(glm::vec2)","resized(QSizeF)","closed()","fromQml(QVariant)","scriptEventReceived(QVariant)","webEventReceived(QVariant)","isVisible()","setVisible(bool)","getPosition()","setPosition(glm::vec2)","setPosition(int,int)","getSize()","setSize(glm::vec2)","setSize(int,int)","setTitle(QString)","raise()","close()","getEventBridge()","sendToQml(QVariant)","emitScriptEvent(QVariant)","emitWebEvent(QVariant)","hasMoved(QVector2D)","hasClosed()","qmlToScript(QVariant)","urlChanged()","getURL()","setURL(QString)","setScriptURL(QString)"]

var SETTINGS_KEY_SETUP = "uiproject.manager.setup";
var SETTINGS_KEY_REPO_URLS = "uiproject.manager.repo_urls";
var SETTINGS_KEY_REPOSITRY = "uiproject.manager.repository";
var SETTINGS_KEY_SCRIPTS = "uiproject.manager.scripts";
var SETTINGS_KEY_CATEGORIES = "uiproject.manager.categories";
var SETTINGS_KEY_OPEN = "uiproject.manager.open";

var OVERLAY_TITLE = "UI Manager"; var OVERLAY_SIZE = {width: 200, height: 400};

var uiHtml = Script.resolvePath("html/uiManager.html");

var webOverlay = null;

function log(val){print(JSON.stringify(val));}

var MENU_NAME = "UI";
var MENU_ITEM = "Open Manager";

var repositories = null;

function addMenu(){
    if(!Menu.menuExists(MENU_NAME)){
        Menu.addMenu(MENU_NAME);
    }
    if(!Menu.menuItemExists(MENU_NAME,MENU_ITEM)){
        Menu.addMenuItem({
            menuName:       MENU_NAME,
            menuItemName:   MENU_ITEM,
        });
    }
    Menu.menuItemEvent.connect(menuItemEvent);
    ScriptDiscoveryService.scriptCountChanged.connect(scriptCountChanged);
}

function scriptCountChanged(){
    scriptEvent({command:"getRunningScripts",value:ScriptDiscoveryService.getRunning()});
}

function menuItemEvent(menuItem){
    if(menuItem == MENU_ITEM){
        openWebOverlay();
    }
}

function createWebOverlay(){
    if(webOverlay == null){
        webOverlay = new OverlayWebWindow({
            title: 'UI Manager',
            source: uiHtml,
            width: 600,
            height: 400,
            visible: false
        });
        webOverlay.webEventReceived.connect(webEvent);
        webOverlay.closed.connect(webClosed);
    }
}

function openWebOverlay(){
    createWebOverlay();
    Settings.setValue(SETTINGS_KEY_OPEN,true);
    webOverlay.setVisible(true);
}

function wipeMenu(){
    if(Menu.menuItemExists(MENU_NAME,MENU_ITEM)){
        Menu.removeMenuItem(MENU_NAME,MENU_ITEM);
    }
    if(Menu.menuExists(MENU_NAME)){
        Menu.removeMenu(MENU_NAME);
    }
}


function setup(){
    addMenu();
    createWebOverlay();
    getRepositories();
    loadScripts(getScriptsToRun());
    if(!Settings.getValue(SETTINGS_KEY_SETUP,false) || Settings.getValue(SETTINGS_KEY_OPEN,true)){
        openWebOverlay();
    }
    Script.scriptEnding.connect(scriptEnd);
}

function scriptEvent(val){
    //log(["Sending",val]);
    webOverlay.emitScriptEvent(JSON.stringify(val));
}

function getRepoUrls(){
    var repos = Settings.getValue(SETTINGS_KEY_REPO_URLS,null);
    if(!(repos instanceof Array))return [];
    else return repos;
}

function removeRepoUrl(url){
    var repos = getRepoUrls();
    var index = repos.indexOf(url);
    if(index >= 0){
        purge(cleanRepoUrl(url));
        repos.splice(index,1);
        Settings.setValue(SETTINGS_KEY_REPO_URLS,repos);
        scriptEvent({command:"getRepoUrls",value:repos});
    }
}

function purge(repo){
    stopScripts(getScriptsToRun([repo]]));
    var scripts = getActiveScripts();
    var newScripts = [];
    for(var i in scripts){
        if(scripts[i].indexOf(repo) != 0){
            newScripts.push(scripts[i]);
        }
    }

    var cats = getActiveCategories();
    var newCats = [];
    for(var i in cats){
        if(cats[i].indexOf(repo) != 0){
            newCats.push(cats[i]);
        }
    }

    setActiveScripts({scripts:newScripts,categories:newCats});
}

function getActiveScripts(){
    var scripts = Settings.getValue(SETTINGS_KEY_SCRIPTS,null);
    if(!(scripts instanceof Array))return [];
    else return scripts;
}

function getActiveCategories(){
    var cats = Settings.getValue(SETTINGS_KEY_CATEGORIES,null);
    if(!(cats instanceof Array))return [];
    else return cats;
}

function addRepoUrl(url){
    if(url.indexOf("http://") != 0 && url.indexOf("https://") != 0){
        url = "http://" + url;
    }
    repos = getRepoUrls();
    repos.push(url);
    Settings.setValue(SETTINGS_KEY_REPO_URLS,repos);
    scriptEvent({command:"getRepoUrls",value:repos});
}

function testObj(obj,head){
    var o = {};
    for(var i in head){
        if(!obj.hasOwnProperty(head[i]))return false;
        o[head[i]] = obj[head[i]];
    }
    return o;
}

function cleanRepoUrl(url){
    var prts = url.split("http://");
    if(prts.length > 1)url = prts[1];
    prts = url.split("https://");
    if(prts.length > 1)url = prts[1];
    prts = url.split("/");
    return prts[0].toLowerCase();
}

function testRepos(obj){
    var repos = {};
    for(var k in obj){
        var repo = testRepo(obj[k]);
        if(repo === false)return false;
        repos[cleanRepoUrl(k)] = repo;
    }
    return repos;
}

function testRepo(obj){
    repo = testObj(obj,["categories","packages","meta"]);
    if(repo === false)return false;
    repo.meta = testObj(repo.meta,["name","owner","contact"]);
    if(repo.meta === false)return false;
    repo.packages = testPackages(repo.packages);
    if(repo.packages === false)return false;
    repo.categories = testCategories(repo.categories,repo.packages);
    if(repo.categories === false)return false;
    return repo;
}

function testPackages(obj){
    var packages = {};
    for(var k in obj){
        var pkg = testObj(obj[k],["name","description","source","creator","version","datetime","include"]);
        if(pkg === false)return false;
        packages[k] = pkg;
    }
    return packages;
}

function testCategories(obj,packages){
    var categories = {};
    for(var k in obj){
        var category = testCategory(obj[k],packages);
        if(category === false)return false;
        categories[k] = category;
    }
    return categories;
}
function testCategory(obj,packages){
    var category = testObj(obj,["name","description","packages"]);
    if(category === false)return false;
    if(!(category.packages instanceof Array))return false;
    var pkgs = Object.keys(packages);
    for(var i in category.packages){
        var pkg = category.packages[i];
        if(pkgs.indexOf(pkg) < 0)return false;
    }
    return category;
}

function setRepositories(reposit){
    log(reposit);
    reposit = testRepos(reposit);
    if(reposit === false)return;
    stopScripts(getScriptsToRun());
    repositories = reposit;
    Settings.setValue(SETTINGS_KEY_REPOSITRY,reposit);
    scriptEvent({command:"getRepositories",value:reposit});
    loadScripts(getScriptsToRun());
}

function getRepositories(){
    var reposit = testRepos(Settings.getValue(SETTINGS_KEY_REPOSITRY,null));
    if(reposit === false)return null;
    repositories = reposit;
    return reposit;
}

function setActiveScripts(obj){
    var active = testObj(obj,["scripts","categories"]);
    if(active === false)return;
    stopScripts(getScriptsToRun());
    Settings.setValue(SETTINGS_KEY_SCRIPTS,active.scripts);
    Settings.setValue(SETTINGS_KEY_CATEGORIES,active.categories);
    Settings.setValue(SETTINGS_KEY_SETUP,true);
    log(["Active scripts",getActiveScripts()]);
    log(["Active Cats",getActiveCategories()]);
    loadScripts(getScriptsToRun());
}

function reset(){
    stopScripts(getScriptsToRun());
    Settings.setValue(SETTINGS_KEY_SCRIPTS,[]);
    Settings.setValue(SETTINGS_KEY_CATEGORIES,[]);
    Settings.setValue(SETTINGS_KEY_SETUP,false);
    Settings.setValue(SETTINGS_KEY_REPOSITRY,{});
    Settings.setValue(SETTINGS_KEY_REPO_URLS,[]);
    ScriptDiscoveryService.reloadAllScripts();
}

function stopScripts(scripts){
    var running = ScriptDiscoveryService.getRunning();
    for(var i in running){
        if(scripts.indexOf(running[i].path) >= 0){
            ScriptDiscoveryService.stopScript(running[i].path);
        }
    }
}

function getScriptsToRun(repoFilter){
    getRepositories();
    if(!(repoFilter instanceof Array)){
        repoFilter = Object.keys(repositories);
    }
    var scripts = getActiveScripts();
    var includes = [];
    var loads = [];
    for(var i in scripts){
        var c = scripts[i].split(">");
        if(c.length == 2){
            var repo = c[0];
            if(repoFilter.indexOf(repo) < 0)continue;
            var pkg = c[1];
            if(repositories.hasOwnProperty(repo)){
                if(repositories[repo].packages.hasOwnProperty(pkg)){
                    pkg = repositories[repo].packages[pkg];
                    /*if(pkg.include === true && includes.indexOf(pkg.source) < 0){
                        includes.push(pkg.source);
                    }
                    else*/if(loads.indexOf(pkg.source) < 0){
                        loads.push(pkg.source);
                    }
                }
            }
        }
        else if(c.length == 1){
            var repo = c[0];
            if(repoFilter.indexOf(repo) < 0)continue;
            if(repositories.hasOwnProperty(repo)){
                for(var j in repositories[repo].packages){
                    var pkg = repositories[repo].packages[j];
                    /*if(pkg.include === true && includes.indexOf(pkg.source) < 0){
                        includes.push(pkg.source);
                    }
                    else */if(loads.indexOf(pkg.source) < 0){
                        loads.push(pkg.source);
                    }
                }
            }
        }
    }
    var cats = getActiveCategories();
    for(var i in cats){
        var c = cats[i].split(">");
        if(c.length == 2){
            var repo = c[0];
            if(repoFilter.indexOf(repo) < 0)continue;
            var cat = c[1];
            if(repositories.hasOwnProperty(repo)){
                if(repositories[repo].categories.hasOwnProperty(cat)){
                    var pkgs = repositories[repo].categories[cat].packages;
                    for(var j in pkgs){
                        var pkg = pkgs[j];
                        if(repositories[repo].packages.hasOwnProperty(pkg)){
                            pkg = repositories[repo].packages[pkg];
                            /*if(pkg.include === true && includes.indexOf(pkg.source) < 0){
                                includes.push(pkg.source);
                            }
                            else */if(loads.indexOf(pkg.source) < 0){
                                loads.push(pkg.source);
                            }
                        }
                    }
                }
            }
        }
    }
    return loads;
}

function loadScripts(scripts){
    /*log(["INCLUDING : ",includes]);
    Script.include(includes);*/
    log(["LOADING : ",scripts]);
    Script.load(scripts);
}

function webEvent(webEventData){
    //log("\n--------------\n---- WEB EVENT ----\n--------------\n" + webEventData + "\n--------------\n--------------\n--------------");
    webEventData = JSON.parse(webEventData);
    if(!(webEventData instanceof Array)){
        webEventData = [webEventData];
    }
    for(var i = 0;i < webEventData.length; i++){
        data = webEventData[i];
        if(!data.hasOwnProperty("command"))continue;
        switch(data.command){
            case "getRepoUrls":
                scriptEvent({command:data.command,value:getRepoUrls()});
                break;
            case "getRepositories":
                scriptEvent({command:data.command,value:getRepositories()});
                break;
            case "getActiveScripts":
                scriptEvent({command:data.command,value:{scripts:getActiveScripts(),categories:getActiveCategories()}});
                break;
            case "getRunningScripts":
                scriptEvent({command:data.command,value:ScriptDiscoveryService.getRunning()});
                break;
            case "reset":
                reset();
                break;
        }
        if(!data.hasOwnProperty("value"))continue;
        switch (data.command) {
            case "addRepoUrl":
                    addRepoUrl(data.value);
                break;
            case "removeRepoUrl":
                removeRepoUrl(data.value);
                break;
            case "setRepositories":
                setRepositories(data.value);
                break;
            case "setActiveScripts":
                setActiveScripts(data.value);
                break;
            case "stopScript":
                ScriptDiscoveryService.stopScript(data.value);
                break;
            case "refreshScript":
                ScriptDiscoveryService.stopScript(data.value,true);
                break;
        }
    }
}

function webClosed(arg){
    Settings.setValue(SETTINGS_KEY_OPEN,false);
    //log("WEB Closed - " + arg);
}

function scriptEnd(){
    wipeMenu();
    stopScripts(getScriptsToRun());
}

setup();
