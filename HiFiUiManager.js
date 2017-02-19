
//["objectName","position","size","visible","url","destroyed(QObject*)","destroyed()","objectNameChanged(QString)","deleteLater()","visibleChanged()","positionChanged()","sizeChanged()","moved(glm::vec2)","resized(QSizeF)","closed()","fromQml(QVariant)","scriptEventReceived(QVariant)","webEventReceived(QVariant)","isVisible()","setVisible(bool)","getPosition()","setPosition(glm::vec2)","setPosition(int,int)","getSize()","setSize(glm::vec2)","setSize(int,int)","setTitle(QString)","raise()","close()","getEventBridge()","sendToQml(QVariant)","emitScriptEvent(QVariant)","emitWebEvent(QVariant)","hasMoved(QVector2D)","hasClosed()","qmlToScript(QVariant)","urlChanged()","getURL()","setURL(QString)","setScriptURL(QString)"]

var SKEY_SETUP = "uiproject.manager.setup";
var SKEY_OPEN = "uiproject.manager.open";

var SKEY_ACTIVE_REPOS = "uiproject.manager.active_repos";
var SKEY_ACTIVE_SCRIPTS = "uiproject.manager.scripts";
var SKEY_ACTIVE_CATEGORIES = "uiproject.manager.active_categories";
var SKEY_REPOSITORIES = "uiproject.manager.repositories";
var SKEY_REPOLIST= "uiproject.manager.repolist";

var OVERLAY_TITLE = "UI Manager"; var OVERLAY_SIZE = {width: 200, height: 400};

var uiHtml = Script.resolvePath("html/uiManager.html");

var webOverlay = null;

function setSetting(set,val){
    Settings.setValue(set,JSON.stringify(val));
}
function getSetting(set){
    //log(["GET",set]);
    var get = Settings.getValue(set,null);
    //log(["Loaded",(typeof get !== "string"),get]);
    if(typeof get !== "string")return null;
    try{
        get = JSON.parse(get);
        return get;
    }catch(e){
        return null;
    }
}

function log(val){/*print(JSON.stringify(val));*/}

var MENU_NAME = "UI";
var MENU_ITEM = "Open Manager";

var repositories = {};
var repoList = [];
var webOpen = true;
var setupComplete = false;
var activeScripts = [];
var activeCategories = [];
var activeRepos = [];

function setup(){
    Settings.setValue("HUDUIEnabled", true);
    var _repositories = getSetting(SKEY_REPOSITORIES);
    var _repoList = getSetting(SKEY_REPOLIST);
    var _activeRepos = getSetting(SKEY_ACTIVE_REPOS);
    var _activeScripts = getSetting(SKEY_ACTIVE_SCRIPTS);
    var _activeCategories = getSetting(SKEY_ACTIVE_CATEGORIES);

    if(_repositories != null)repositories = _repositories;
    if(_repoList != null)repoList = _repoList;
    if(_activeRepos != null)activeRepos = _activeRepos;
    if(_activeScripts != null)activeScripts = _activeScripts;
    if(_activeCategories != null)activeCategories = _activeCategories;

    webOpen = getSetting(SKEY_OPEN) === true ? true : false;
    setupComplete = getSetting(SKEY_SETUP) === true ? true : false;



    addMenu();
    createWebOverlay();
    loadScripts(getScriptsToRun());
    if(!setupComplete || webOpen){
        openWebOverlay();
    }
    Script.scriptEnding.connect(scriptEnd);
}


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
    setSetting(SKEY_OPEN,true);
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

function scriptEvent(val){
    //log(["Sending",val]);
    webOverlay.emitScriptEvent(JSON.stringify(val));
}

function removeRepoUrl(url){
    log("REMOVING REPO " )
    var index = activeRepos.indexOf(url);
    if(index >= 0){
        purge(cleanRepoUrl(url));
        activeRepos.splice(index,1);
        setSetting(SKEY_ACTIVE_REPOS,activeRepos);
    }
    scriptEvent({command:"getActiveRepos",value:activeRepos});
}

function purge(repo){
    stopScripts(getScriptsToRun([repo]));
    var scripts = activeScripts;
    var newScripts = [];
    for(var i in scripts){
        if(scripts[i].indexOf(repo) != 0){
            newScripts.push(scripts[i]);
        }
    }

    var cats = activeCategories;
    var newCats = [];
    for(var i in cats){
        if(cats[i].indexOf(repo) != 0){
            newCats.push(cats[i]);
        }
    }

    setActiveScripts({scripts:newScripts,categories:newCats});
}


function addRepoUrl(url){
    if(url.indexOf("http://") != 0 && url.indexOf("https://") != 0){
        url = "https://" + url;
    }
    if(activeRepos.indexOf(url) < 0){
        activeRepos.push(url);
        setSetting(SKEY_ACTIVE_REPOS,activeRepos);
    }
    scriptEvent({command:"getActiveRepos",value:activeRepos});
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
    if(!(obj instanceof Object))return false;
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
    repo.meta = testObj(repo.meta,["name","owner","contact","url","tags"]);
    if(repo.meta === false)return false;
    if(!(repo.meta.tags instanceof Array))return false;
    repo.packages = testPackages(repo.packages);
    if(repo.packages === false)return false;
    repo.categories = testCategories(repo.categories,repo.packages);
    if(repo.categories === false)return false;
    return repo;
}

function testPackages(obj){
    var packages = {};
    for(var k in obj){
        var pkg = testObj(obj[k],["name","description","source","creator","version","datetime","include","tags","requires"]);
        if(pkg === false)return false;
        if(!(pkg.tags instanceof Array))return false;
        if(!(pkg.requires instanceof Array))return false;
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
    var category = testObj(obj,["name","description","packages","tags"]);
    if(category === false)return false;
    if(!(category.packages instanceof Array))return false;
    if(!(category.tags instanceof Array))return false;
    var pkgs = Object.keys(packages);
    for(var i in category.packages){
        var pkg = category.packages[i];
        if(pkgs.indexOf(pkg) < 0)return false;
    }
    return category;
}

function setRepositories(reposit){
    //log(reposit);
    reposit = testRepos(reposit);
    if(reposit === false)return;
    stopScripts(getScriptsToRun());
    repositories = reposit;
    setSetting(SKEY_REPOSITORIES,repositories);
    scriptEvent({command:"getRepositories",value:reposit});
    loadScripts(getScriptsToRun());
}

function setActiveScripts(obj){
    var active = testObj(obj,["scripts","categories"]);
    if(active === false)return;
    stopScripts(getScriptsToRun());
    activeScripts = active.scripts;
    activeCategories = active.categories;
    setSetting(SKEY_ACTIVE_SCRIPTS,activeScripts);
    setSetting(SKEY_ACTIVE_CATEGORIES,activeCategories);
    if(!setupComplete)setSetting(SKEY_SETUP,true);
    log(["Active scripts",activeScripts]);
    log(["Active Cats",activeCategories]);
    loadScripts(getScriptsToRun());
}

function reset(){
    stopScripts(getScriptsToRun());
    setSetting(SKEY_SETUP,null);
    setSetting(SKEY_OPEN,null);
    setSetting(SKEY_ACTIVE_REPOS,null);
    setSetting(SKEY_ACTIVE_SCRIPTS,null);
    setSetting(SKEY_ACTIVE_CATEGORIES,null);
    setSetting(SKEY_REPOSITORIES,null);
    setSetting(SKEY_REPOLIST,null);
    ScriptDiscoveryService.reloadAllScripts();
}

function stopScripts(scripts){
    if(scripts === false)return;
    var running = ScriptDiscoveryService.getRunning();
    for(var i in running){
        if(scripts.indexOf(running[i].path) >= 0){
            ScriptDiscoveryService.stopScript(running[i].path);
        }
    }
}

function getRequirements(repo,p){
    var urls = [];
    if(repo.packages.hasOwnProperty(p)){
        var url = repo.packages[p].source;
        for(var i in repo.packages[p].requires){
            var r = repo.packages[p].requires[i];
            if(!repo.packages.hasOwnProperty(r))return false;
            var us = getRequirements(repo,r);
            if(us === false)return false;
            for(var u in us){
                if(urls.indexOf(us[u]) < 0 && us[u] != url){
                    urls.push(us[u]);
                }
            }
        }
        urls.push(url);
    }
    else return false;
    return urls;
}

function getScriptsToRun(repoFilter){
    if(!(repoFilter instanceof Array)){
        repoFilter = Object.keys(repositories);
    }
    var scripts = activeScripts;
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
                    urls = getRequirements(repositories[repo],pkg);
                    for(var u in urls){
                        if(loads.indexOf(urls[u]) < 0){
                            loads.push(urls[u]);
                        }
                    }
                }
            }
        }
        else if(c.length == 1){
            var repo = c[0];
            if(repoFilter.indexOf(repo) < 0)continue;
            if(repositories.hasOwnProperty(repo)){
                for(var j in repositories[repo].packages){
                    urls = getRequirements(repositories[repo],j);
                    for(var u in urls){
                        if(loads.indexOf(urls[u]) < 0){
                            loads.push(urls[u]);
                        }
                    }
                }
            }
        }
    }
    var cats = activeCategories;
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
                            urls = getRequirements(repositories[repo],pkg);
                            for(var u in urls){
                                if(loads.indexOf(urls[u]) < 0){
                                    loads.push(urls[u]);
                                }
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
    if(scripts === false)return;
    log(["LOADING : ",scripts]);
    for(var s in scripts){
        //Script.load(scripts[s]);
        Script.include(scripts[s]);
    }
    //Script.load(scripts);
}


function setRepoList(rl){
    //log("SET REPO LIST");
    if(!(rl instanceof Array))return;
    //log("IS ARRAY");
    var rel = [];
    for(var k in rl){
        //log(rl[k]);
        var repo = testObj(rl[k],["name","owner","contact","url","tags"]);
        if(repo === false || !(repo.tags instanceof Array) || repo.tags.length > 10)continue;
        rel.push(repo);
    }
    repoList = rel;
    //log(repoList);
    setSetting(SKEY_REPOLIST,repoList);
    scriptEvent({command:"getRepoList",value:repoList});
}

function webEvent(webEventData){
    log("\n--------------\n---- WEB EVENT ----\n--------------\n" + webEventData + "\n--------------\n--------------\n--------------");
    webEventData = JSON.parse(webEventData);
    if(!(webEventData instanceof Array)){
        webEventData = [webEventData];
    }
    for(var i = 0;i < webEventData.length; i++){
        data = webEventData[i];
        if(!data.hasOwnProperty("command"))continue;
        switch(data.command){
            case "getRepositories":
                scriptEvent({command:data.command,value:repositories});
                break;
            case "getActiveRepos":
                scriptEvent({command:data.command,value:activeRepos});
                break;
            case "getActiveScripts":
                scriptEvent({command:data.command,value:{scripts:activeScripts,categories:activeCategories}});
                break;
            case "getRunningScripts":
                scriptEvent({command:data.command,value:ScriptDiscoveryService.getRunning()});
                break;
            case "reset":
                reset();
                break;
            case "getRepoList":
                scriptEvent({command:data.command,value:repoList});
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
            case "setRepoList":
                setRepoList(data.value);
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
    setSetting(SKEY_OPEN,false);
    //log("WEB Closed - " + arg);
}

function scriptEnd(){
    wipeMenu();
    stopScripts(getScriptsToRun());
}

setup();
