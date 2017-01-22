var EventBridge;
var WebChannel;
$(document).ready(function(){
    document.addEventListener("contextmenu", function(event) {
        event.preventDefault();
    }, false);
    WebChannel = new QWebChannel(qt.webChannelTransport, function (channel) {
        EventBridge = WebChannel.objects.eventBridgeWrapper.eventBridge;
        webEventBridgeCallback(EventBridge);
    });
    $('input.searchbox').on('keyup paste change',function(){filterSearch(this)});

});

var repoList = [];

function testObj(obj,head){
    var o = {};
    for(var i in head){
        if(!obj.hasOwnProperty(head[i]))return false;
        o[head[i]] = obj[head[i]];
    }
    return o;
}

function getRepoListings(){
    alert("REPOS");
    //return;
    $.ajax({
        url: "repos.json",
        success: function(data){
            alert(data);
            webEvent({command:"setRepoList",value:JSON.parse(data)});
        },
        error: function(XMLHttpRequest, textStatus, errorThrown) {
            alert("Status: " + textStatus); alert("Error: " + errorThrown);
        }
    });
}

function renderRepoList(){
    var html = "";
    for(var k in repoList){
        var repo = repoList[k];
        if(repoUrls.indexOf(repo.url) < 0){
            html += '<tr class="value-row reposearch" data-tags="'+repo.tags.join(" ")+'"><td class="key"><a target="_blank" href="' + repo.url + '">' + repo.name + '</a></td><td class="buttons add-del-buttons"><a href="javascript:void(0);" onclick="addRepoUrl(\'' + repo.url + '\');" class="glyphicon glyphicon-plus add-row"></a></td></tr>';
        }
    }
    $("tbody#repolist").html(html);
}

function webEventBridgeCallback(eb){
    if (EventBridge !== undefined) {
        EventBridge.scriptEventReceived.connect(scriptEvent);
        loadData();
    }
}

function getRepos()
{
    repositories = {};
    for(var i = 0; i < repoUrls.length; i++){
        var url = repoUrls[i];
        var repository = {};
        repository["categories"] = {};
        repository["packages"] = {};
        $.ajax({
            url: url,
            success: function(response){
                data = JSON.parse(response);
                repositories[url] = data;
            },
            async: false
        });
    }
    debug(repositories);
    webEvent({command:"setRepositories",value:repositories});
}

function renderRepositories(){
    var cats = "";
    var repos = "";
    var count = 0;
    var repoCount = 0;
    for(var k in repositories){
        var repo = repositories[k];
        repos += renderRepo(repo,repoCount++,k);
        for(var l in repo.categories){
            if(count == 0){
                cats += '<div class="row">';
            }
            cats += '<div class="col-xs-6">';
            var category = repo.categories[l];
            cats += renderCategory(l,category,repo.packages,repo.meta,k);
            cats += "</div>";
            ++count;
            if(count == 2){
                cats += "</div>";
                count = 0;
            }
        }
    }
    if(count != 0){
        cats += "</div>";
    }

    $("#debugtext").html("<p>" + cats.replace("<","&lt;").replace(">","&gt;") + "</p>");

    $("div#categorieslist").html(cats);
    $("div#repolist").html(repos);
}

function renderCategory(cat,category,packages,repo,repoKey){
    var html = '<div class="panel panel-default"><div class="panel-heading">' +
        category.name + '<div class="float-right"><label>Active&nbsp;</label><input type="checkbox" ' +
        (isActiveCategory(repoKey,cat) ? ' checked="checked" ' : "") +
        'data-repo="' +  repoKey + '" data-cat="' + cat + '" class="catcheck"/></div>' +
        '</div><div class="panel-body">' + category.description +
        '</div><div class="panel-footer text-right">' +
        '<a href="' + repo.url + '" target="_blank">' + repo.name +
        '</a></div></div>';
    return html;
}

function filterSearch(elem){
    var search = "." + $(elem).data("search");
    var filter = $(elem).val();
    if(filter.length < 1){
        $(search).show();
        $(search + "-hide").show();
        return;
    }
    $(search + "-hide").hide();
    $(search).hide();
    $(search + '[data-tags*="' + filter + '"]').show();

}

function renderRepo(repo,c,repoKey){

    var tags = [];
    for(var k in repo.packages){
        var tgs = repo.packages[k].tags;
        for(var t in tgs){
            if(tags.indexOf(tgs[t]) < 0){
                tags.push(tgs[t]);
            }
        }
    }

    var html = '<div data-tags="' + tags.join(" ") + '" class="advsearch panel panel-default"><div class="panel-heading">' +
        repo.meta.name + '<div class="advsearch-hide float-right"><label>Active&nbsp;</label>' +
        '<input type="checkbox" onchange="checkAllPkg(this,' + c + ');" ' +
        (isActivePkg(repoKey,"") ? 'checked="checked" ' : "") + 'class="repocheck" data-repo="' + repoKey + '" /></div>' +
        '</div><div class="panel-body">';

        //$(this).parent().siblings('.panel-body').eq(0).children('.pkgcheck').prop("checked",true)
    html += renderPackages(repo.packages, c,repoKey);

    html += '</div><div class="panel-footer text-right">' +
        '<a href="' + repo.url + '" target="_blank">' + repo.meta.name +
        '</a></div></div>';
    return html;
}
function renderPackages(pkgs, c, repoKey){
    var html = "<table><tbody>";
    for(var k in pkgs){
        html += renderPackage(pkgs[k],k,c,repoKey);
    }
    return html + "</tbody></table>";
}

function renderPackage(pkg,k,c,repoKey){
    return '<tr class="advsearch" data-tags="' + pkg.tags.join(" ") + '"><td><input type="checkbox" data-pkg="' + k + '" ' +
        (isActivePkg(repoKey,k) ? 'checked="checked" ' : "") +
        'data-repo="' + repoKey + '" ' +
        'class="pkgcheck pkgcheck-' + c + '" /></td><td>' + pkg.name + "</td><tr>";
}

function post(val){
    alert(JSON.stringify(val));
}

function checkAllPkg(elem,c){
    $(".pkgcheck-" + c).each(function(index){
        $(this).prop("checked",$(elem).prop("checked"));
    });
}

function applyScripts(){
    var scripts = [];
    $("input.repocheck").each(function(i){
        if($(this).prop("checked")){
            scripts.push($(this).data("repo"));
        }
    });
    $("input.pkgcheck").each(function(i){
        if($(this).prop("checked")){
            var repo = $(this).data("repo");
            if(scripts.indexOf(repo) < 0){
                scripts.push(repo + ">" + $(this).data("pkg"));
            }
        }
    });
    var categories = [];
    $("input.catcheck").each(function(i){
        if($(this).prop("checked")){
            categories.push($(this).data("repo") + ">" + $(this).data("cat"));
        }
    });
    webEvent({command:"setActiveScripts",value:{scripts:scripts,categories:categories}});
}

var repoUrls = [];

function command(typ){
    return {command:typ};
}

function loadData()
{
    repoUrls = [];
    //getRepoListings();
    webEvent([command("getRepoList"),command("getRepoUrls"),command("getActiveScripts"),command("getRepositories"),command("getRunningScripts")]);
}

function webEvent(val){
    if(EventBridge !== undefined){
        EventBridge.emitWebEvent(JSON.stringify(val));
    }
}

function debug(data){
    //alert(JSON.stringify(data));
    $("#debugtext").html(JSON.stringify(data));
}

function removeRepo(repo){
    webEvent({command:"removeRepoUrl",value:repo});
}

function addRepoUrl(url){
    webEvent({command:"addRepoUrl",value:url});
}

function addRepo(){
    var newrepo = $("input#newrepo").val();
    if(newrepo.length < 5)return;
    $("input#newrepo").val("");
    addRepoUrl(newrepo);
}
var activeScripts = null;

function isActivePkg(repo,pkg){
    if(activeScripts == null) return false;
    return (activeScripts.scripts.indexOf(repo + ">" + pkg) >= 0 || activeScripts.scripts.indexOf(repo) >= 0);
}

function isActiveCategory(repo,cat){
    if(activeScripts == null) return false;
    return (activeScripts.categories.indexOf(repo + ">" + cat) >= 0);
}

function getRunningScripts(){
    webEvent({command:"getRunningScripts"});
}

function stopScript(scr){
    webEvent({command:"stopScript",value:scr});
}

function refreshScript(scr){
    webEvent({command:"refreshScript",value:scr})
}

function reset(){
    webEvent(command("reset"));
}

function scriptEvent(scriptEventData){
    //alert(scriptEventData);
    scriptEventData = JSON.parse(scriptEventData);
    if(!(scriptEventData instanceof Array)){
        scriptEventData = [scriptEventData];
    }
    for(var i = 0;i < scriptEventData.length; i++){
        data = scriptEventData[i];
        if(!data.hasOwnProperty("command"))continue;
        if(!data.hasOwnProperty("value"))continue;
        switch (data.command) {
            case "getRepoUrls":
                if(data.value instanceof Array){
                    var html = "";
                    for(var i = 0;i < data.value.length; i++){
                        html += '<tr><td class="key"><a target="_blank" href="' + data.value[i] + '">' + data.value[i] + '</a></td><td class="buttons add-del-buttons"><a href="javascript:void(0);" onclick="removeRepo(\'' + data.value[i] + '\');" class="glyphicon glyphicon-remove del-row"></a></td></tr>';
                    }
                    $("tbody#activerepolist").html(html);
                    repoUrls = data.value;
                    renderRepoList();
                    getRepos();
                }
                break;
            case "getRunningScripts":
                var html = "";
                for(var i in data.value){
                    var run = data.value[i];
                    html += '<tr><td>' + run.name + '</td><td><a href="javascript:void(0);" onclick="refreshScript(\'' + run.path + '\');" class="glyphicon glyphicon-refresh del-row"></a></td><td><a href="javascript:void(0);" onclick="stopScript(\'' + run.path + '\');" class="glyphicon glyphicon-remove del-row"></a></td></tr>';
                }
                $("tbody#runningscripts").html(html);
                break;
            case "getRepositories":
                    repositories = data.value;
                    renderRepositories();
                break;
            case "getActiveScripts":
                    activeScripts = data.value;
                    renderRepositories();
                break;
            case "getRepoList":
                repoList = data.value;
                renderRepoList();
                break;
        }
    }
}
