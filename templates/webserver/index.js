if(!process.env.IISNODE_VERSION) {
    process.on('uncaughtException', function (err) {
        if(process.env.IISNODE_VERSION)
            throw err;
        console.log(err.stack);
        console.log();
        console.log();
        console.log("There was a Problem with the FlexSim WebServer.");
        console.log("Press Enter to Exit.");
        console.log();
    });
}

fs = require('fs');
path = require('path');
url = require('url');
net = require('net');
os = require('os');
const spawn = require('child_process').spawn;
HTTPParser = require('http-parser-js').HTTPParser;

// list of flexsim instances
instances = [];
// requests
requests = {};
// Directories to restrict access to
restrictedDirs = null;

//Exit on enter key
if(!process.env.IISNODE_VERSION) {
    var keypress = require('keypress');
    keypress(process.stdin);
    process.stdin.on('keypress', function (ch, key) {
        if (key && (key.name == 'return' || key.name == 'enter'))
            process.exit();
    });
    if (process.stdin.isTTY)
        process.stdin.setRawMode(true);
    process.stdin.resume();
}

// settings dictionary
YAML = require('yamljs');
var tempSettings = YAML.load('../flexsim webserver configuration.txt');
var settings = {};
for(var i = 0; i < Object.keys(tempSettings).length; i += 1) {
    var key = Object.keys(tempSettings)[i];
    var newKey = key.replace(/\s+|\(.*\)/g, '');
    newKey = newKey.charAt(0).toLowerCase() + newKey.slice(1);
    if(typeof tempSettings[key] === 'object')
        settings[newKey] = tempSettings[key];
    else if(!isNaN(tempSettings[key]))
        settings[newKey] = Number(tempSettings[key]);
    else if(tempSettings[key].toLowerCase() == "yes")
        settings[newKey] = true;
    else if(tempSettings[key].toLowerCase() == "no")
        settings[newKey] = false;
    else if(tempSettings[key].toLowerCase() == "max")
        settings[newKey] = -1;
    else if(tempSettings[key].search(/%programfiles%/i) != -1)
        settings[newKey] = tempSettings[key].replace(/%programfiles%/i, process.env.PROGRAMFILES);
    else if(tempSettings[key].search(/%documents%/i) != -1)
        settings[newKey] = tempSettings[key].replace(/%documents%/i, process.env.USERPROFILE + "\\Documents");
    else if(tempSettings[key].search(/%allusersprofile%/i) != -1)
        settings[newKey] = tempSettings[key].replace(/%allusersprofile%/i, process.env.ALLUSERSPROFILE);
    else
        settings[newKey] = tempSettings[key];
}
if(process.env.PORT)
    settings.port = process.env.PORT;
settings.flexsimDirectory = settings.flexsimProgramDirectory.replace(/(\/|\\)program/i, "");

// Check if a file exists
function fileExists(filePath) {
    try {
        return fs.statSync(filePath).isFile();
    } catch (err) {
        return false;
    }
}

// Check if a directory exists
function dirExists(dirPath) {
    try {
        return fs.statSync(dirPath).isDirectory();
    } catch (err) {
        return false;
    }
}

// Copy flexsimweb directory
function copySync(from,to) {
    from=from.replace(/\//gim,"\\");
    to=to.replace(/\//gim,"\\");
    require("child_process").execSync("xcopy /y /q \""+from+"\\*\" \""+to+"\\\" /e");
}
var flexsimwebFromDir = settings.flexsimProgramDirectory + "/flexsimweb";
var flexsimwebToDir = "../flexsimweb";
if(dirExists(flexsimwebFromDir)) {
    try {
        copySync(flexsimwebFromDir, flexsimwebToDir);
    }
    catch(err) {
        console.log("************************************************************");
        console.log();
        console.log("FlexSim WebServer requires elevated priveleges.");
        console.log("Please restart FlexSim WebServer as an administrator.");
        console.log();
        console.log("************************************************************");
        console.log();
        console.log("Press Enter to Exit.");
        console.log();
        return;
    }
}
else {
    console.log("************************************************************");
    console.log();
    console.log("Unable to locate FlexSim.");
    console.log("Please configure:", __dirname.substr(0, __dirname.lastIndexOf("\\")) + '\\flexsim webserver configuration.txt');
    console.log();
    console.log("************************************************************");
    console.log();
    console.log("Press Enter to Exit.");
    console.log();
    return;
}

if(!dirExists(settings.modelDirectory)) {
    console.log("************************************************************");
    console.log();
    console.log("Unable to locate the Model Directory.");
    console.log("Please configure:", __dirname.substr(0, __dirname.lastIndexOf("\\")) + '\\flexsim webserver configuration.txt');
    console.log();
    console.log("************************************************************");
    console.log();
    console.log("Press Enter to Exit.");
    console.log();
    return;
}

if(!dirExists(settings.flexsimDataDirectory)) {
    console.log("************************************************************");
    console.log();
    console.log("Unable to locate the Flexsim Data Directory.");
    console.log("Please configure:", __dirname.substr(0, __dirname.lastIndexOf("\\")) + '\\flexsim webserver configuration.txt');
    console.log();
    console.log("************************************************************");
    console.log();
    console.log("Press Enter to Exit.");
    console.log();
    return;
}

// Check if a process exists
function processExists(pid) {
    try {
        process.kill(pid, 0);
        return true;
    } catch (err) {
        return false;
    }
}

// Escape characters of a regular expression
function escapeRegExp(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

// Does the user have access to the given path?
function userHasAccess(user, path) {
    if(!settings.restrictUserGroupDirectories)
        return true;

    var pathParts = path.split(/\\\\|\/\/|\\|\//g);
    if((!restrictedDirs || !user) && pathParts.length > 1)
        return false;

    for(var i = 0; i < pathParts.length - 1; i++) {
        var authorizedUsers = restrictedDirs[pathParts[i]];
        if(authorizedUsers) {
            for(var j = 0; j < authorizedUsers.length; j++) {
                if(authorizedUsers[j] == user || authorizedUsers[j] == user.split('\\')[1])
                    return true;
            }
            return false;
        }
    }
    return true;
}

// Get a list of files in the given directory
// Traverses directories recursively
function findFiles(dir, done) {
    var results = [];
    fs.readdir(dir, function(err, list) {
        if (err) return done(err, results);
        var i = 0;
        (function next() {
            var file = list[i++];
            if (!file) return done(null, results);
            if(file[0] != ".") {
                file = dir + '\\' + file;
                fs.stat(file, function(err, stat) {
                    if (stat && stat.isDirectory()) {
                        findFiles(file, function(err, res) {
                            results = results.concat(res);
                            next();
                        });
                    } else {
                        results.push(file);
                        next();
                    }
                });
            }
            else
                next();
        })();
    });
}

// Server Definition
function runServer() {
    // registration pipe
    REG_PIPE_PATH = "\\\\.\\pipe\\FlexsimServerRegistrationPipe";
    registrationPipe = net.createServer(function(stream) {
        stream.on('data', function(pid) {
            for(var i = 0; i < instances.length; i++) {
                if(instances[i].proc.pid == pid)
                    instances[i].registered = true;
            }
        });
        stream.write('2.0.0');
    });
    registrationPipe.listen(REG_PIPE_PATH);
    
    // HTTP Server
    var express = require('express');
    var app = express();
    var flexsimServer = require('http').createServer(app);
    var bodyParser = require('body-parser');
    var Busboy = require('busboy');

    //starts the specified job and sends it the setupcommands
    function startJob(job) {
        if (!isJobValid(job)) {
            for(var i = 0; i < jobs.length; i++) {
                if(jobs[i].id == job.id) {
                    jobs.splice(i, 1);
                    break;
                }
            }
            fs.writeFile(jobsDir + '/job' + job.id + '.json', getJobJson(job), 'utf8', function(err) {});
        }
        else if(settings.maxInstances == -1 || instances.length < settings.maxInstances) {
            job.setupComplete = 0;
            job.startedTime = Date.now();
            job.started = 1;
            fs.writeFile(jobsDir + '/job' + job.id + '.json', getJobJson(job), 'utf8', function(err) {//write {"status":"incomplete"} to file
                //emulate a createinstance query
                getReplyCreateInstance({'fromJob': true}, {'createinstance': job.modelname}, {'writeHead': function(){}, 'end': function(reply){
                    try {
                        job.instancenum = Number(reply.match(/\d(?=<\/instancenum>)/)[0]);
                    } catch (err) {
                        job.instancenum = 0;
                    }
                    if(job.instancenum == 0) {
                        job.started = 0;
                        return;
                    }

                    //emulate a defaultpage query
                    var instanceindex;
                    for(instanceindex = 0; instanceindex < instances.length; instanceindex++)
                        if(instances[instanceindex].instancenum == job.instancenum)
                            break;
                    var instance = instances[instanceindex];
                    var query = "queryinstance=" + job.modelname + "&instancenum=" + job.instancenum + "&defaultpage";
                    queryInstance(instance, "GET", query, "", function(responseData) {
                        //emulate each setup command and save the replies
                        (function executeSetupCommand(index) {
                            if(index < job.setupcommands.length && instance) {
                                var query = "queryinstance=" + job.modelname + "&instancenum=" + job.instancenum + "&id=1&" + job.setupcommands[index].command;
                                queryInstance(instance, job.setupcommands[index].verb, query, job.setupcommands[index].data, function(responseData) {
                                    var reqChunk = responseData, bodyOffset = 0;
                                    var parser = new HTTPParser(HTTPParser.RESPONSE);
                                    parser.onHeadersComplete = function(res) {};
                                    parser.onBody = function(chunk, offset, length) {
                                        reqChunk = chunk;
                                        bodyOffset = offset;
                                    };
                                    parser.onMessageComplete = function() {
                                        job.setupcommands[index].reply = reqChunk.slice(bodyOffset).toString();
                                        executeSetupCommand(++index);
                                    };
                                    parser.execute(responseData, 4, responseData.length - 4);
                                });
                            }
                            else if(index >= job.setupcommands.length)
                                job.setupComplete = 1;
                            else
                                job.started = 0;
                        })(0);
                    });
                }});
            });
        }
    }

    //checks the specified job and terminates it if it's finished or if it has timed out
    function checkJob(job) {
        //get the runstate
        var instanceindex;
        for(instanceindex = 0; instanceindex < instances.length; instanceindex++)
            if(instances[instanceindex].instancenum == job.instancenum)
                break;
        if(instanceindex == instances.length) {
            job.started = 0;
            job.setupComplete = 0;
            return;
        }
        job.checking = 1;
        var instance = instances[instanceindex];
        var query = "queryinstance=" + job.modelname + "&instancenum=" + job.instancenum + "&id=1&getrunstate";
        queryInstance(instance, "GET", query, "", function(responseData) {
            var runstate = -1;
            try {
                var reply = responseData.toString();
                runstate = Number(reply.match(/\d(?=<\/runstate>)/)[0]);
            } catch (err) {}

            //if it's finished, emulate the result commands, write the file, and terminate the instance
            if(runstate == 0) {
                (function executeResultCommands(index) {
                    if(index < job.resultcommands.length && instance) {
                        var query = "queryinstance=" + job.modelname + "&instancenum=" + job.instancenum + "&id=1&" + job.resultcommands[index].command;
                        queryInstance(instance, job.resultcommands[index].verb, query, job.resultcommands[index].data, function(responseData) {
                            var reqChunk = responseData, bodyOffset = 0;
                            var parser = new HTTPParser(HTTPParser.RESPONSE);
                            parser.onHeadersComplete = function(res) {};
                            parser.onBody = function(chunk, offset, length) {
                                reqChunk = chunk;
                                bodyOffset = offset;
                            };
                            parser.onMessageComplete = function() {
                                job.resultcommands[index].reply = reqChunk.slice(bodyOffset).toString();
                                executeResultCommands(++index);
                            };
                            parser.execute(responseData, 4, responseData.length - 4);
                        });
                    }
                    else {
                        job.completedTime = Date.now();
                        job.finished = 1;
                        //write results to file
                        fs.writeFile(jobsDir + '/job' + job.id + '.json', getJobJson(job), 'utf8', function(err) {});

                        getReplyTerminateInstance({'fromJob': true}, {'terminateinstance': job.modelname, 'instancenum': job.instancenum},
                            {'writeHead': function(){}, 'end': function(){}});
                        job.erase = 1;
                    }
                })(0);
            }
            //if it's past its timeout, terminate it and write the timeout file
            else if(job.started && job.timeout != -1 && Date.now() > (job.startedTime + (job.timeout * 1000))) {
                getReplyTerminateInstance({'fromJob': true}, {'terminateinstance': job.modelname, 'instancenum': job.instancenum},
                    {'writeHead': function(){}, 'end': function(){}});

                fs.writeFile(jobsDir + '/job' + job.id + '.json', "{\"status\":\"timeout\"}", 'utf8', function(err) {});
                job.erase = 1;
            }
            else
                job.checking = 0;
        });
    }

    function checkJobs() {
        //start more jobs if the server has unstarted jobs and it
        //can handle more jobs than it's currently doing
        while(settings.maxInstances == -1 || instances.length < settings.maxInstances) {
            var highestPriorityIndex = -1;
            for(var i = 0; i < jobs.length; i++)
                if(!jobs[i].started)
                    if(highestPriorityIndex == -1 || jobs[i].priority > jobs[highestPriorityIndex].priority)
                        highestPriorityIndex = i;
            if(highestPriorityIndex == -1)
                break;
            startJob(jobs[highestPriorityIndex]);
        }

        var index = jobs.length;
        while(--index >= 0) {
            if(jobs[index].erase)
                jobs.splice(index, 1);
        }

        //check each running job and terminate any jobs that are finished or that timed out
        for(var i = 0; i < jobs.length; i++)
            if(jobs[i].setupComplete && !jobs[i].checking)
                checkJob(jobs[i]);
        setTimeout(checkJobs, 8000);
    }

    function getJobJson(job) {
        if(job.finished) {
            var json = "{\"status\":\"complete\",\"setupcommands\":";
            json += JSON.stringify(job.setupcommands);
            json += ",\"resultcommands\":";
            json += JSON.stringify(job.resultcommands);
            json += "}";
            return json;
        }
        else if (job.started)
            return "{\"status\":\"incomplete\"}";
        else if (isJobValid(job))
            return "{\"status\":\"waiting\"}";
        else
            return "{\"status\":\"invalid\"}";
    }

    function isJobValid(job) {
        if(fileExists(settings.modelDirectory + "/" + job.modelname + ".fsm") ||
            fileExists(settings.modelDirectory + "/" + job.modelname + ".fsx"))
            return true;
        else
            return false;
    }

    // Check for old jobs
    var jobs = [];
    var nextJobId = 1;
    // Create jobs directory if it doesn't exist
    var jobsDir = settings.flexsimDataDirectory + "/jobs";
    if(!dirExists(jobsDir)) {
        jobsDir.split('/').reduce((path, folder) => {
            path += folder + '/';
            if (!dirExists(path))
                fs.mkdirSync(path);
            return path;
        }, '');
    }
    // Create jobDescriptions directory if it doesn't exist
    var jobDescriptionsDir = settings.flexsimDataDirectory + "/jobDescriptionsDir";
    if (!dirExists(jobDescriptionsDir))
        fs.mkdirSync(jobDescriptionsDir);
    // Find old job files
    findFiles(jobsDir, function(err, results) {
        for(var i = 0; i < results.length; i++) {
            (function getStatus(file) {
                fs.readFile(file, 'utf8', function readFileCallback(err, data) {
                    if(err)
                        return;
                    var jobId = Number(file.match(/\d+(?=.json$)/)[0]);
                    var jobStatus = JSON.parse(data);
                    if (jobStatus.status == "incomplete" || jobStatus.status == "waiting") {
                        fs.readFile(jobDescriptionsDir + "/job" + jobId + ".txt", 'utf8', function readFileCallback(err, data) {
                            if(err)
                                return;
                            var job = JSON.parse(data);
                            jobs.push(job);
                        });
                    }
                });
            })(results[i]);
        }
        checkJobs();
    });

    // Windows Authentication
    if(!process.env.IISNODE_VERSION && settings.useWindowsAuthentication) {
        var nodeSSPI = require('node-sspi');
        var nodeSSPIObj = new nodeSSPI({
            //perRequestAuth: true
        });
        app.use(function (req, res, next) {
            nodeSSPIObj.authenticate(req, res, function(err){
                res.finished || next();
            });
        });
    }

    // Get the raw body data
    app.use(bodyParser.raw({ limit: settings.maxUploadSize, type: '*/*' }));

    // Parse multipart data
    app.use(function (req, res, next) {
        if(req.method != 'POST' || !Buffer.isBuffer(req.body)) {
            req.body = null;
            return next();
        }

        req.files = null;
        var busboy;
        try {
            busboy = new Busboy({ headers: req.headers });
        } catch (err) {
            return next();
        }

        busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated, encoding, mime) {
            req.parsedBody = req.parsedBody || {};
            var prev = req.parsedBody[fieldname];

            if(!prev)
                return req.parsedBody[fieldname] = val;

            if(Array.isArray(prev))
                return prev.push(val);

            req.parsedBody[fieldname] = [prev, val];
        });

        // Build req.files fields
        busboy.on('file', function(fieldname, file, filename, encoding, mime) {
            var buf = new Buffer(0);

            file.on('data', function(data) {
                buf = Buffer.concat([buf, data]);
            });

            file.on('end', function() {
                if (!req.files)
                    req.files = {};

                if(!buf.length)
                    return;

                var newFile = {
                    name: filename,
                    data: buf,
                    encoding: encoding,
                    mimetype: mime,
                    mv: function(path, callback) {
                        var fstream = fs.createWriteStream(path);
                        fstream.end(buf);
                        fstream.on('error', function(error) {
                            if (callback)
                                callback(error);
                        });
                        fstream.on('close', function() {
                            if (callback)
                                callback(null);
                        });
                    }
                };

                // Non-array fields
                if (!req.files.hasOwnProperty(fieldname)) {
                    req.files[fieldname] = newFile;
                } else {
                    // Array fields
                    if (req.files[fieldname] instanceof Array)
                        req.files[fieldname].push(newFile);
                    else
                        req.files[fieldname] = [req.files[fieldname], newFile];
                }
            });
        });

        busboy.on('finish', next);
        busboy.end(req.body);
    });

    // FlexSim WebServer
    app.use(/.*\/webserver\.dll.*/, function (req, res, next) {
        if(process.env.IISNODE_VERSION)
            req.connection.user = req.headers['x-iisnode-auth_user'];

        console.log(req.url);
        // console.log(req.connection.user);
        // console.log(restrictedDirs);
        getReplyToQuery(req, res);
    });

    // Serve static files
    app.use(express.static('..'));

    // Start the server
    flexsimServer.listen(settings.port);

    console.log("listening for http request");
    console.log("go to http://127.0.0.1 in a browser");
    console.log("Press enter to terminate server");
    console.log("");

    // Call specialized query handler
    function getReplyToQuery(req, res) {
        var url_parts = url.parse(req.url, true);
        var query = url_parts.query;
        
        if(typeof query.queryinstance != 'undefined') getReplyQueryInstance(req, query, res);
        else if(typeof query.createinstance != 'undefined') getReplyCreateInstance(req, query, res);
        else if(typeof query.terminateinstance != 'undefined') getReplyTerminateInstance(req, query, res);
        else if(typeof query.instancelist != 'undefined') getReplyInstanceList(req, query, res);
        else if(typeof query.numinstances != 'undefined') getReplyNumInstances(req, query, res);
        else if(typeof query.availablemodels != 'undefined') getReplyAvailableModels(req, query, res);
        else if(typeof query.uploadmodel != 'undefined') getReplyUploadModel(req, query, res);
        else if(typeof query.deletemodel != 'undefined') getReplyDeleteModel(req, query, res);
        // else if(typeof query.uploadlibrary != 'undefined') getReplyUploadLibrary(req, query, res);
        // else if(typeof query.deletelibrary != 'undefined') getReplyDeleteLibrary(req, query, res);
        // else if(typeof query.uploadmodule != 'undefined') getReplyUploadModule(req, query, res);
        // else if(typeof query.deletemodule != 'undefined') getReplyDeleteModule(req, query, res);
        else if(typeof query.allfiles != 'undefined') getReplyAllFiles(req, query, res);
        else if(typeof query.submitjob != 'undefined') getReplySubmitJob(req, query, res);
        else if(typeof query.getjobresults != 'undefined') getReplyGetJobResults(req, query, res);
        else if(typeof query.getjobqueuelength != 'undefined') getReplyGetJobQueueLength(req, query, res);
        else if(typeof query.canceljob != 'undefined') getReplyCancelJob(req, query, res);
        else if(typeof query.getjobstatus != 'undefined') getReplyGetJobStatus(req, query, res);
        else if(typeof query.getjobquery != 'undefined') getReplyGetJobQuery(req, query, res);
        else if(typeof query.getlibraries != 'undefined') getReplyGetLibraries(req, query, res);
        else if(typeof query.getmodules != 'undefined') getReplyGetModules(req, query, res);
        else if(typeof query.downloadfile != 'undefined') getReplyDownloadFile(req, query, res);
        else if(typeof query.configuration != 'undefined') getReplyConfiguration(req, query, res);
        // else if(typeof query.createproxychildren != 'undefined') getReplyCreateProxyChildren(req, query, res);
        else getReplyDefault(req, query, res);
    }

    // Send a query to an instance of FlexSim
    function queryInstance(queriedInstance, verb, query, data, sendResponse) {
        // Remove ? if at beginning of query
        if(query.length && query[0] == '?')
            query = query.slice(1);

        var pid = queriedInstance.proc.pid;
        var request = {
            "verb" : verb,
            "query" : query,
            "data" : data,
            "responseData" : null,
            "sendResponse" : sendResponse,
            "timeoutId" : setTimeout(function() {
                // Send timeOut response
                console.log("timeout", query);
                sendResponse();
                requests[pid] = null;
            }, settings.replyTimeout)
        };

        doQuery(queriedInstance, request);
    }

    // Send a query to an instance of FlexSim
    function doQuery(queriedInstance, request) {
        // Wait for previous queries to return
        var pid = queriedInstance.proc.pid;
        if(requests[pid]) {
            setImmediate(doQuery, queriedInstance, request);
            return;
        }

        // If the instance doesn't exist anymore then just return
        if(!queriedInstance || !processExists(queriedInstance.proc.pid)) {
            clearTimeout(request.timeoutId);
            request.sendResponse();
            return;
        }

        // Setup a pipe server that flexsim can connect to and pass the query to flexsim
        if(!queriedInstance.communicationPipe) {
            var communicationPipe = "\\\\.\\pipe\\FlexsimServerCommunicationPipe" + pid;
            queriedInstance.communicationPipe = net.createServer(function(stream) {
                // Save response data in a buffer
                stream.on('data', function(c) {
                    if(requests[pid]) {
                        if(requests[pid].responseData == null)
                            requests[pid].responseData = c;
                        else
                            Buffer.concat([requests[pid].responseData, c])
                    }
                });
                // Send reply on end of response data
                stream.on('end', function() {
                    // Clear the response timeout
                    if(requests[pid])
                        clearTimeout(requests[pid].timeoutId);

                    stream.destroy();
                    if(requests[pid]) {
                        requests[pid].sendResponse(requests[pid].responseData);
                        requests[pid] = null;
                    }
                });
                
                // Pass the query to FlexSim using the named pipe
                if(requests[pid]) {
                    var verb = Buffer.from(requests[pid].verb);
                    var query = Buffer.from(requests[pid].query);
                    var data = Buffer.from(requests[pid].data || "");
                    var verbLengthBuff = new Buffer(4);
                    var queryLengthBuff = new Buffer(4);
                    var dataLengthBuff = new Buffer(4);
                    var totalLengthBuff = new Buffer(4);
                    var totalLength = verbLengthBuff.length + verb.length 
                        + queryLengthBuff.length + query.length
                        + dataLengthBuff.length + data.length;
                    if(os.endianness() == "BE") {
                        verbLengthBuff.writeUInt32BE(verb.length, 0);
                        queryLengthBuff.writeUInt32BE(query.length, 0);
                        dataLengthBuff.writeUInt32BE(data.length, 0);
                        totalLengthBuff.writeUInt32BE(totalLength, 0);
                    }
                    else {
                        verbLengthBuff.writeUInt32LE(verb.length, 0);
                        queryLengthBuff.writeUInt32LE(query.length, 0);
                        dataLengthBuff.writeUInt32LE(data.length, 0);
                        totalLengthBuff.writeUInt32LE(totalLength, 0);
                    }

                    try {
                        success = stream.write(totalLengthBuff);
                        success = stream.write(Buffer.concat([verbLengthBuff, verb, queryLengthBuff, query, dataLengthBuff, data]));
                    }catch (err) {
                        // catch write to pipe error
                        //console.log("Catch write to pipe error");
                        stream.destroy();
                        queriedInstance.communicationPipe.close();
                        queriedInstance.communicationPipe = null;
                        var request = requests[pid];
                        requests[pid] = null;
                        process.nextTick(doQuery, queriedInstance, request);
                    }
                }
            });
            queriedInstance.communicationPipe.on('close',function(){
                queriedInstance.communicationPipe = null;
            });
            queriedInstance.communicationPipe.listen(communicationPipe);
        }

        // Store query for when FlexSim is ready
        requests[pid] = request;

        // Connect to pipe to signal FlexSim
        var messagePipe = "\\\\.\\pipe\\FlexsimServerMessagePipe" + pid;
        var client = net.connect(messagePipe);
        // This is called when FlexSim calls DisconnectNamedPipe
        client.on('error',function(){
            client.destroy();
            client = null;
        });
    }

    // Query an instance of FlexSim and send response over http
    function getReplyQueryInstance(req, query, res) {
        var modelname = decodeURIComponent(query.queryinstance || "");
        var instancenum = query.instancenum || "";

        // Find the queried instance
        var instanceindex;
        for(instanceindex=0; instanceindex<instances.length; instanceindex++)
            if(instances[instanceindex].instancenum == instancenum && instances[instanceindex].modelname == modelname)
                break;

        // Instance not found
        if(instanceindex == instances.length || !userHasAccess(req.connection.user, modelname)) {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end("404 Not Found", 'utf-8');
            return;
        }

        // Query the instance of FlexSim and sendback a response
        var queriedInstance = instances[instanceindex];
        queryInstance(queriedInstance, req.method, url.parse(req.url).query, req.body, function(responseData) {
            if(res) {
                if(responseData && responseData.length > 4) {
                    var headers, reqChunk = responseData, bodyOffset = 0;
                    var parser = new HTTPParser(HTTPParser.RESPONSE);
                    parser.onHeadersComplete = function(res) {
                        headers = res;
                    };
                    parser.onBody = function(chunk, offset, length) {
                        reqChunk = chunk;
                        bodyOffset = offset;
                    };
                    parser.onMessageComplete = function() {
                        if(headers) {
                            res.statusMessage = headers.statusMessage;
                            res.status(headers.statusCode);
                            for (var i = 0; i < headers.headers.length; i+=2) {
                                res.set(headers.headers[i], headers.headers[i+1]);
                            };
                        }
                        res.send(reqChunk.slice(bodyOffset));
                        res.end();
                    };
                    parser.execute(responseData, 4, responseData.length - 4);
                }
                else {
                    res.writeHead(500, { 'Content-Type': 'text/html' });
                    res.end("FlexSim Query Timeout");
                }
            }
        });
    }

    // Start an instance of the given model
    function getReplyCreateInstance(req, query, res) {
        var reply = "<?xml version=\"1.0\"?><createinstancereply>";

        //search for an available model that matches the query after the "createinstance="
        var modelname = decodeURIComponent(query.createinstance || "");
        var filename = settings.modelDirectory + "\\" + modelname + ".fsm";
        if(!fileExists(filename))
            filename = settings.modelDirectory + "\\" + modelname + ".fsx";
        if(!fileExists(filename) || !(req.fromJob || userHasAccess(req.connection.user, modelname))) {
            reply += "<status>fail</status><instancenum>0</instancenum><reason>invalid file name</reason></createinstancereply>";
            res.writeHead(200, { 'Content-Type': 'text/xml' });
            res.end(reply, 'utf-8');
            return;
        }

        //return failure if there are too many instances already running
        if(settings.maxInstances != -1 && instances.length >= settings.maxInstances) {
            reply += "<status>fail</status><instancenum>0</instancenum><reason>server flexsim instance limit reached</reason></createinstancereply>";
            res.writeHead(200, { 'Content-Type': 'text/xml' });
            res.end(reply, 'utf-8');
            return;
        }

        //JASON ADDED:  
        //IF flexsimpath.txt exists, read the flexsimProgramDirectory from the file to allow different versions
        //Also copy the startupload.txt from the library in flexsimDirectory to the library in instanceDirectory - remove()d later in this function
        var altlocationconfigpath = settings.modelDirectory + "\\flexsimpath.txt";
        var instanceProgramDirectory = settings.flexsimProgramDirectory;
        var instancestartuppath = "";
        var flexstartuppath = settings.flexsimDirectory + "\\libraries\\startupload.txt";
        if (fileExists(altlocationconfigpath)) {
            var altFlexsimProgramDirectory = readfile(altlocationconfigpath);
            if (dirExists(altFlexsimProgramDirectory)) {
                instanceProgramDirectory = altFlexsimProgramDirectory;
                if (fileExists(flexstartuppath)) {
                    found = instanceProgramDirectory.lastIndexOf("\\");
                    if (found == -1)
                        found = instanceProgramDirectory.lastIndexOf("/");
                    instancestartuppath = instanceProgramDirectory.substring(0, found + 1) + "\\libraries\\startupload.txt";
                    if (fileExists(instancestartuppath))
                        fs.unlinkSync(instancestartuppath);
                    fs.linkSync(flexstartuppath, instancestartuppath);
                }
            }
        }

        //create the Flexsim instance and put it in the list
        var commandline = instanceProgramDirectory;
        if (!fileExists(instanceProgramDirectory))
            commandline += "\\flexsim.exe";
        var args = [filename];
        if(settings.maxThreadsPerInstance != -1)
            args.push("-cpulimit " + settings.maxThreadsPerInstance);
        args.push("-maintenance disablemsg");

        var proc = spawn(commandline, args);
        proc.on('error', function(err) {
            if (fileExists(instancestartuppath))
                fs.unlinkSync(instancestartuppath);
            reply += "<status>fail</status><instancenum>0</instancenum><reason>process creation failed</reason></createinstancereply>";
            res.writeHead(200, { 'Content-Type': 'text/xml' });
            res.end(reply, 'utf-8');
            if(processExists(proc.pid))
                proc.kill('SIGINT');
            return;
        });

        //wait for new instance of FlexSim to register with the server
        var index = instances.push({"proc" : proc}) - 1;
        var timedelay = 0;
        function waitForRegistration() {
            if(!instances[index].registered) {
                if(timedelay < settings.replyTimeout * 10) {
                    timedelay += 100;
                    setTimeout(waitForRegistration, 100); /* this checks the flag every 100 milliseconds*/
                }
                else {
                    if (fileExists(instancestartuppath))
                        fs.unlinkSync(instancestartuppath);
                    reply += "<status>fail</status><instancenum>0</instancenum><reason>registration failed</reason></createinstancereply>";
                    res.writeHead(200, { 'Content-Type': 'text/xml' });
                    res.end(reply, 'utf-8');
                    if(processExists(proc.pid))
                        proc.kill('SIGINT');
                    instances.splice(index, 1);
                    return;
                }
            } else {
                //search for an unused instance number
                var instancenum;
                for(instancenum = 1; true; instancenum++) {
                    var i;
                    for(i = 0; i < instances.length; i++) {
                        if(instances[i].instancenum == instancenum && instances[i].modelname == modelname)
                            break;
                    }
                    if(i == instances.length)
                        break;
                }
                instances[index].instancenum = instancenum;
                instances[index].modelname = modelname;
                instances[index].fromJob = req.fromJob;
                requests[instances[index].proc.pid.toString()] = null;

                // Start a namespace for the new instance
                newWebsocketNamespace(index);

                //clean up and return successfully
                if (fileExists(instancestartuppath))
                    fs.unlinkSync(instancestartuppath);
                reply += "<status>success</status><instancenum>" + instancenum + "</instancenum><reason></reason></createinstancereply>";
                res.writeHead(200, { 'Content-Type': 'text/xml' });
                res.end(reply, 'utf-8');
            }
        }
        waitForRegistration();
    }

    // Terminate the given instance
    function getReplyTerminateInstance(req, query, res) {
        var reply = "<?xml version=\"1.0\"?><terminateinstancereply>";

        //get the model name from the query
        var modelname = decodeURIComponent(query.terminateinstance || "");
        var instancenum = query.instancenum || 0;

        //search for a matching instance name and number
        var instanceindex;
        for(instanceindex = 0; instanceindex < instances.length; instanceindex++)
            if(instances[instanceindex].instancenum == instancenum && instances[instanceindex].modelname == modelname)
                break;

        //no matching instance name and number
        if(instanceindex == instances.length || !(req.fromJob || userHasAccess(req.connection.user, modelname))) {
            reply += "<status>fail</status><reason>instance name and number not found</reason>";
            reply += "</terminateinstancereply>";
            res.writeHead(200, { 'Content-Type': 'text/xml' });
            res.end(reply, 'utf-8');
            return;
        }

        // stop runtime update loop
        if(instances[instanceindex].updateTimeOut)
            clearTimeout(instances[instanceindex].updateTimeOut);

        var queriedInstance = instances[instanceindex];
        function terminateInstance() {
            // Wait for previous queries to return
            if(requests[queriedInstance.proc.pid.toString()]) {
                setImmediate(terminateInstance);
                return;
            }
            // Terminate the instance
            if(processExists(queriedInstance.proc.pid))
                queriedInstance.proc.kill('SIGINT');
            // if(queriedInstance.communicationPipe)
            //     queriedInstance.communicationPipe.close();
            
            reply += "<status>success</status><reason></reason></terminateinstancereply>"
            res.writeHead(200, { 'Content-Type': 'text/xml' });
            res.end(reply, 'utf-8');
        }
        // Remove the instance from the list
        instances.splice(instanceindex, 1);
        terminateInstance();
    }

    // Get a list of running instances of FlexSim
    function getReplyInstanceList(req, query, res) {
        var reply = "<?xml version=\"1.0\"?><instancelistreply>";

        //return the list of instances in xml
        for(var i = 0; i < instances.length; i++) {
            if(processExists(instances[i].proc.pid)) {
                if (!instances[i].fromJob && instances[i].registered && userHasAccess(req.connection.user, instances[i].modelname))
                {
                    reply += "<instance><modelname>" + instances[i].modelname;
                    reply += "</modelname><instancenum>" + instances[i].instancenum;
                    reply += "</instancenum></instance>";
                }
            }
            else
            {
                // if(instances[i].communicationPipe)
                //     instances[i].communicationPipe.close();
                instances.splice(i, 1);
                i--;
            }
        }
        
        reply += "</instancelistreply>";
        res.writeHead(200, { 'Content-Type': 'text/xml' });
        res.end(reply, 'utf-8');
    }

    // Get the number of running instances
    function getReplyNumInstances(req, query, res) {
        var reply = "<?xml version=\"1.0\"?><numinstancesreply>";
        reply += instances.length + "</numinstancesreply>";
        res.writeHead(200, { 'Content-Type': 'text/xml' });
        res.end(reply, 'utf-8');
    }

    // Get a list of available models
    function getReplyAvailableModels(req, query, res) {
        var reply = "<?xml version=\"1.0\"?><availablemodelsreply>";

        // Return the list of available models as xml (without the ".fsm" extension)
        findFiles(settings.modelDirectory, function(err, results) {
            var regex = new RegExp(escapeRegExp(settings.modelDirectory) + "(\\/|\\\\)?", "i");
            for(var i = 0; i < results.length; i++) {
                var file = results[i].replace(regex, "").replace(/\.fs(m|x)$/i, "");
                if(userHasAccess(req.connection.user, file)) {
                    if(settings.ignoreAutoSaveFiles) {
                        if(results[i].match(/^(.(?!_autosave\.fs))+(m|x)$/i))
                            reply += "<modelname>" + file + "</modelname>";
                    }
                    else if(results[i].match(/^.+\.fs(m|x)$/i))
                        reply += "<modelname>" + file + "</modelname>";
                }
            }
            reply += "</availablemodelsreply>";
            res.writeHead(200, { 'Content-Type': 'text/xml' });
            res.end(reply, 'utf-8');
        });
    }

    function getReplyUploadModel(req, query, res) {
        var reply;
        // Check if file was uploaded, uploading is enabled in the config file, and the user has access to the given path
        if (!req.files || !settings.modelUploading || !userHasAccess(req.connection.user, req.files.uploadModel.name)) {
            reply = "<?xml version=\"1.0\"?><uploadmodelreply><status>fail</status></uploadmodelreply>";
            res.writeHead(200, { 'Content-Type': 'text/xml' });
            res.end(reply, 'utf-8');
            return;
        }
        // Move file to model folder
        var file = req.files.uploadModel;
        file.mv(settings.modelDirectory + '/' + file.name, function(err) {
            if (err)
                reply = "fail";
            else
                reply = "success";

            reply = "<?xml version=\"1.0\"?><uploadmodelreply><status>" + reply + "</status></uploadmodelreply>";
            res.writeHead(200, { 'Content-Type': 'text/xml' });
            res.end(reply, 'utf-8');
        });
    }

    function getReplyDeleteModel(req, query, res) {
        var reply;
        var model = decodeURIComponent(query.deletemodel || "");
        var path = settings.modelDirectory + '/' + model + ".fsm";
        // Check if file exists, deleting is enabled in the config file, and the user has access to the given path
        if(!fileExists(path) || !settings.ModelDeleting || !userHasAccess(req.connection.user, model)) {
            path = settings.modelDirectory + '/' + model + ".fsx";
            if(!fileExists(path)) {
                reply = "<?xml version=\"1.0\"?><deletemodelreply><status>fail</status></deletemodelreply>";
                res.writeHead(200, { 'Content-Type': 'text/xml' });
                res.end(reply, 'utf-8');
                return;
            }
        }
        // Delete file
        fs.unlink(path, function(err) {
            if (err)
                reply = "fail";
            else
                reply = "success";

            reply = "<?xml version=\"1.0\"?><deletemodelreply><status>" + reply + "</status></deletemodelreply>";
            res.writeHead(200, { 'Content-Type': 'text/xml' });
            res.end(reply, 'utf-8');
        });
    }

    // function getReplyUploadLibrary(req, query, res) {
    //     res.writeHead(200, { 'Content-Type': 'text/html' });
    //     res.end(JSON.stringify(query), 'utf-8');
    // }

    // function getReplyDeleteLibrary(req, query, res) {
    //     res.writeHead(200, { 'Content-Type': 'text/html' });
    //     res.end(JSON.stringify(query), 'utf-8');
    // }

    // function getReplyUploadModule(req, query, res) {
    //     res.writeHead(200, { 'Content-Type': 'text/html' });
    //     res.end(JSON.stringify(query), 'utf-8');
    // }

    // function getReplyDeleteModule(req, query, res) {
    //     res.writeHead(200, { 'Content-Type': 'text/html' });
    //     res.end(JSON.stringify(query), 'utf-8');
    // }

    // Get a list of all files in the models directory
    function getReplyAllFiles(req, query, res) {
        var reply = "<?xml version=\"1.0\"?><allfilesreply>";

        // Return the list of all files as xml
        findFiles(settings.modelDirectory, function(err, results) {
            var regex = new RegExp(escapeRegExp(settings.modelDirectory) + "(\\/|\\\\)?", "i");
            for(var i = 0; i < results.length; i++) {
                var file = results[i].replace(regex, "");
                if(userHasAccess(req.connection.user, file))
                    reply += "<filename>" + file + "</filename>";
            }
            reply += "</allfilesreply>";
            res.writeHead(200, { 'Content-Type': 'text/xml' });
            res.end(reply, 'utf-8');
        });
    }

    function getReplySubmitJob(req, query, res) {
        try {
            req.parsedBody.job = JSON.parse(decodeURIComponent(req.parsedBody.job));
            var job = req.parsedBody.job;
            // Fail on invalid job request or if the user doesn't have access to the model path
            if(!isJobValid(job) || !job.modelname || !userHasAccess(req.connection.user, job.modelname))
                throw "Invalid Job";
            var filename = jobsDir + "/job" + nextJobId + ".json";
            while(fileExists(filename))
                filename = jobsDir + "/job" + (++nextJobId) + ".json";

            job.id = nextJobId++;
            job.started = 0;
            job.finished = 0;
            job.instancenum = -1;
            job.receivedTime = Date.now();
            job.startedTime = -1;
            job.completedTime = -1;
            job.timeout = job.timeout ? Math.min(settings.maxJobTimeout, job.timeout) : settings.maxJobTimeout;
            job.priority = job.priority || 1.0;
            if(!job.setupcommands)
                job.setupcommands = [];
            for(var i = 0; i < job.setupcommands.length; i++) {
                job.setupcommands[i].command = job.setupcommands[i].command || "";
                job.setupcommands[i].data = job.setupcommands[i].data || "";
                job.setupcommands[i].verb = job.setupcommands[i].verb || "GET";
            }
            if(!job.resultcommands)
                job.resultcommands = [];
            for(var i = 0; i < job.resultcommands.length; i++) {
                job.resultcommands[i].command = job.resultcommands[i].command || "";
                job.resultcommands[i].data = job.resultcommands[i].data || "";
                job.resultcommands[i].verb = job.resultcommands[i].verb || "";
            }

            if(jobs.length >= settings.maxJobQueueLength)
                throw "Max Jobs";

            fs.writeFile(jobsDir + '/job' + job.id + '.json', getJobJson(job), 'utf8', function(err) {
                if (err) {
                    res.json("-1");
                    return;
                }
                fs.writeFile(jobDescriptionsDir + '/job' + job.id + '.txt', JSON.stringify(job), 'utf8', function(err) {
                    if (err) {
                        res.json("-1");
                        return;
                    }
                    jobs.push(job);
                    res.json(job.id.toString());
                });
            });
        } catch(e) {
            res.json("-1");
        }
    }

    function getReplyGetJobResults(req, query, res) {
        //get the id from the query
        var id = query.getjobresults || 0;
        //no id specified, send not found
        if(id == 0) {
            res.status(404).end();
            return;
        }

        //read the file
        var jobFile = jobsDir + "/job" + id + ".json";
        fs.readFile(jobFile, 'utf8', function readFileCallback(err, data) {
            //send the reply, depending on whether a job with a matching id was found
            if(err) {
                res.status(404).end();
                return;
            }
            var jobResults = JSON.parse(data);
            res.json(jobResults);
        });
    }

    function getReplyGetJobQueueLength(req, query, res) {
        var notFinished = 0;
        for(var i = 0; i < jobs.length; i++)
            if(!jobs[i].finished)
                notFinished++;
        res.json(notFinished);
    }

    function getReplyCancelJob(req, query, res) {
        //get the id from the query
        var id = query.canceljob || 0;
        //no id specified, send not found
        if(id == 0) {
            res.status(404).end();
            return;
        }

        //find the job
        var i;
        for(i = 0; i < jobs.length; i++)
            if(jobs[i].id == id)
                break;

        //if it's in the queue and the user has access to the model path
        if(i != jobs.length && userHasAccess(req.connection.user, jobs[i].modelname)) {
            //if it's running, stop it
            if(jobs[i].started && !jobs[i].finished) {
                getReplyTerminateInstance({'fromJob': true}, {'terminateinstance': jobs[i].modelname, 'instancenum': jobs[i].instancenum},
                    {'writeHead': function(){}, 'end': function(){}});
            }
            //remove it from the queue
            fs.writeFile(jobsDir + '/job' + jobs[i].id + '.json', "{\"status\":\"canceled\"}", 'utf8', function(err) {});
            jobs[i].erase = 1;
            res.status(200).end();
        }
        else
            res.status(404).end();
    }

    function getReplyGetJobStatus(req, query, res) {
        //get the id from the query
        var id = query.getjobstatus || 0;
        //no id specified, send not found
        if(id == 0) {
            res.status(404).end();
            return;
        }

        //read the file
        var jobFile = jobsDir + "/job" + id + ".json";
        fs.readFile(jobFile, 'utf8', function readFileCallback(err, data) {
            //send the reply, depending on whether a job with a matching id was found
            if(err) {
                res.status(404).end();
                return;
            }
            var jobStatus = JSON.parse(data);
            res.json(jobStatus.status);
        });
    }

    function getReplyGetJobQuery(req, query, res) {
        //get the id from the query
        var id = query.getjobquery || 0;
        //no id specified, send not found
        if(id == 0) {
            res.status(404).end();
            return;
        }

        //find the job
        var i;
        for(i = 0; i < jobs.length; i++)
            if(jobs[i].id == id)
                break;

        //assemble the query for the job
        if(i != jobs.length && userHasAccess(req.connection.user, jobs[i].modelname)) {
            var jobQuery = "";
            if(jobs[i].instancenum != -1)
                jobQuery = "queryinstance=" + jobs[i].modelname + "&instancenum=" + jobs[i].instancenum;
            res.json(jobQuery);
        }
        else
            res.status(404).end();
    }

    // Return a list of all files in flexsimDirectory\libraries
    function getReplyGetLibraries(req, query, res) {
        var reply = "<?xml version=\"1.0\"?><getlibrariessreply>";

        // Return the list of all files as xml
        findFiles(settings.flexsimDirectory + "\\libraries", function(err, results) {
            var regex = new RegExp(escapeRegExp(settings.flexsimDirectory + "\\libraries") + "(\\/|\\\\)?", "i");
            for(var i = 0; i < results.length; i++) {
                var file = results[i].replace(regex, "");
                if(userHasAccess(req.connection.user, file))
                    reply += "<library>" + file + "</library>";
            }
            reply += "</getlibrariessreply>";
            res.writeHead(200, { 'Content-Type': 'text/xml' });
            res.end(reply, 'utf-8');
        });
    }

    // Return a list of all files in flexsimDirectory\modules
    function getReplyGetModules(req, query, res) {
        var reply = "<?xml version=\"1.0\"?><getmodulesreply>";

        // Return the list of all files as xml
        findFiles(settings.flexsimDirectory + "\\modules", function(err, results) {
            var regex = new RegExp(escapeRegExp(settings.flexsimDirectory + "\\modules") + "(\\/|\\\\)?", "i");
            for(var i = 0; i < results.length; i++) {
                var file = results[i].replace(regex, "");
                if(userHasAccess(req.connection.user, file))
                    reply += "<module>" + file + "</module>";
            }
            reply += "</getmodulesreply>";
            res.writeHead(200, { 'Content-Type': 'text/xml' });
            res.end(reply, 'utf-8');
        });
    }

    function getReplyDownloadFile(req, query, res) {
        var filename = decodeURIComponent(query.downloadfile || "");
        if (settings.modelDownloading && userHasAccess(req.connection.user, filename)) {
            var fileFullPath = settings.modelDirectory + "/" + filename;
            if(!fileExists(fileFullPath)) {
                res.status(404).end();
                return;
            }

            res.download(fileFullPath);
        }
        else
            res.status(403).end();
    }

    // Return the current settings
    function getReplyConfiguration(req, query, res) {
        var reply = "<?xml version=\"1.0\"?><configurationreply>";
        var objectToXml = function(obj){
            var xml = "";
            var keys = Object.keys(obj);
            for(var i = 0; i < keys.length; i += 1) {
                var val = obj[keys[i]];
                if(typeof val === 'object') {
                    xml += "<" + keys[i].toLowerCase() + ">" + objectToXml(val) + "</" + keys[i].toLowerCase() + ">";
                    continue;
                }
                else if(keys[i] == "password")
                    val = "********";
                else if(val == true)
                    val = "yes";
                else if(val == false)
                    val = "no";
                else if(val == -1)
                    val = "max";
                xml += "<" + keys[i].toLowerCase() + ">" + val + "</" + keys[i].toLowerCase() + ">";
            }
            return xml;
        }
        reply += objectToXml(settings);
        reply += "</configurationreply>";
        res.writeHead(200, { 'Content-Type': 'text/xml' });
        res.end(reply, 'utf-8');
    }

    // function getReplyCreateProxyChildren(req, query, res) {
    //     res.writeHead(200, { 'Content-Type': 'text/html' });
    //     res.end(JSON.stringify(query), 'utf-8');
    // }

    // Return usage instructions
    function getReplyDefault(req, query, res) {
        var reply =
            "<html>" +
                "<body>" +
                    "<p><h1>webserver responds to the following queries:</h1></p>" +
                    "<h4>General</h4>" +
                    "<p><a href=\"?availablemodels\">webserver.dll?availablemodels</a> returns an XML list of the models available to run on the server</p>" +
                    "<p><a href=\"?allfiles\">webserver.dll?allfiles</a> returns an XML list of all files (including data files, shapes, etc.) in the model directory on the server</p>" +
                    "<p><a href=\"?configuration\">webserver.dll?configuration</a> returns information from the configuration file to include whether models can be uploaded / deleted and max # instances</p>" +
                    "<p>webserver.dll?uploadmodel is the action of an HTML form with enctype=\"multipart/form-data\" and one input element with type=\"file\", if this feature has been enabled in the configuration file on the server</p>" +
                    "<p>webserver.dll?deletemodel=my%20model, for example, deletes a file called \"my model.fsm\" or \"my model.fsx\" from the model directory on the server, if this feature has been enabled in the configuration file on the server. (%20 is the URL encoding for a space character)</p>" +
                    "<p>webserver.dll?downloadfile=modeldata%2Ecsv, for example, downloads a file from the model directory on the server, if this feature has been enabled in the configuration file on the server.</p>" +
                    "<h4>Instances</h4>" +
                    "<p><a href=\"?instancelist\">webserver.dll?instancelist</a> returns an XML list of running instances</p>" +
                    "<p><a href=\"?numinstances\">webserver.dll?numinstances</a> returns an XML number representing the number of instances running on the server including from other users.  This can be used for load balancing multiple servers.</p>" +
                    "<p>webserver.dll?createinstance=my%20model, for example, starts a new instance of Flexsim on the server and opens \"my model.fsm\" or \"my model.fsx\".  An xml response is returned describing what instance number of this model was just started.</p>" +
                    "<p>webserver.dll?queryinstance=my%20model&instancenum=1&defaultpage, for example, opens the default webpage for the model.  Different query parameters after the instancenum can be defined for communication with each model</p>" +
                    "<p>webserver.dll?terminateinstance=my%20model&instancenum=1, for example, closes the first instance of Flexsim running \"my model.fsm\" or \"my model.fsx\".</p>" +
                    "<h4>Libraries</h4>" +
                    "<p><a href=\"?getlibraries\">webserver.dll?getlibraries</a> returns a list of the files in the libraries directory on the server.</p>" +
                    // "<p>webserver.dll?uploadlibrary is the action of an HTML form with enctype=\"multipart/form-data\" and one input element with type=\"file\", if this feature has been enabled in the configuration file on the server</p>" +
                    // "<p>webserver.dll?deletelibrary=my%20library, for example, deletes a file called \"my model.fsl\" from the libraries directory on the server, if this feature has been enabled in the configuration file on the server. (%20 is the URL encoding for a space character)</p>" +
                    "<h4>Modules</h4>" +
                    "<p><a href=\"?getmodules\">webserver.dll?getmodules</a> returns a list of the files in the modules directory on the server.</p>" +
                    // "<p>webserver.dll?uploadmodule is the action of an HTML form with enctype=\"multipart/form-data\" and one input element with type=\"file\", if this feature has been enabled in the configuration file on the server.</p>" +
                    // "<p>webserver.dll?deletemodule=filename, for example, deletes a file from the modules directory on the server, if this feature has been enabled in the configuration file on the server.</p>" +
                    "<h4>Jobs</h4>" +
                    "<p>webserver.dll?submitjob is the action of an HTML form with one input element named job whose value is a job description in JSON, which replies the job id in JSON (just one number, which is -1 if the JSON job description was invalid)</p>" +
                    "<p>webserver.dll?getjobquery=1, for example, gets a JSON string that can be used to query a job with id of 1, such as \"queryinstance=my%20model&instancenum=1\", or an empty string if the job has no instance (such as if it is waiting).  This should be used with caution, because the instance may be terminated at any time by the job manager when the job is finished.</p>" +
                    "<p>webserver.dll?getjobresults=1, for example, replies a JSON description of the job with id number 1 if it is finished, {\"status\":\"waiting\"} if the job is in the job queue, {\"status\":\"incomplete\"} if the job is running, {\"status\":\"canceled\"} if it has been canceled, or {\"status\":\"timeout\"} if the job has taken more time than its timeout</p>" +
                    "<p>webserver.dll?getjobstatus=1, for example, replies a JSON description of the status of the job with id number 1 (the beginning of the reply of a getjobresults query)</p>" +
                    "<p><a href=\"?getjobqueuelength\">webserver.dll?getjobqueuelength</a> replies the length of the queue length in JSON (just one number)</p>" +
                    "<p>webserver.dll?canceljob=1, for example, cancels the job with id 1 (if it is running or in the job queue) and returns an empty reply</p>" +
                    // "<p>webserver.dll?createproxychildren=n, for example, starts a new instance of Flexsim on the server which then creates n proxy child processes.  An xml response is returned describing what instance number of this model was just started.</p>" +
                "</body>" +
            "</html>";
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(reply, 'utf-8');
    }

    // Websocket Server
    var socketServer = new(require('socket.io'))(flexsimServer, {path: '/webserver/socket.io'});
    socketServer.on('connection', function(socket) {
        var srvSockets = socketServer.sockets.sockets;
        // console.log('New WebSocket Connection (' + Object.keys(srvSockets).length + ' total)');

        socket.on('disconnect', function() {
            // console.log('Disconnected WebSocket (' + Object.keys(srvSockets).length + ' total)');
        });
    });

    // Make a new websocket namespace
    // Define all websocket commands
    function newWebsocketNamespace(index) {
        var queriedInstance = instances[index];
        var instancenum = queriedInstance.instancenum;
        var modelname = queriedInstance.modelname;
        var baseQuery = "queryinstance="+encodeURIComponent(queriedInstance.modelname)+"&instancenum="+queriedInstance.instancenum;

        // Delete any existing namespace
        if(socketServer.nsps['/'+modelname+':'+instancenum]) {
            socketServer.nsps['/'+modelname+':'+instancenum] = null;
            delete socketServer.nsps['/'+modelname+':'+instancenum];
        }

        // Define a new namespace for the instance
        var nsp = socketServer.of('/'+modelname+':'+instancenum);
        nsp.on('connection', function(socket){
            // console.log('someone connected to namespace', instancenum, ", total:", Object.keys(nsp.sockets).length);
            if(!nsp.views)
                nsp.views = [];

            // Resize a given view
            socket.on('resize', function(msg) {
                // Update the dimensions of the view for the current client
                if(!socket.views)
                    socket.views = [];
                if(!socket.views[msg.screenshot])
                    socket.views[msg.screenshot] = {};
                socket.views[msg.screenshot].sizex = msg.resizex;
                socket.views[msg.screenshot].sizey = msg.resizey;

                // Find the largest dimensions needed to accomodate all clients
                var sizex = 0;
                var sizey = 0;
                for (var id in nsp.sockets) {
                    if(!nsp.sockets[id].views)
                        continue;
                    if(sizex < nsp.sockets[id].views[msg.screenshot].sizex)
                        sizex = nsp.sockets[id].views[msg.screenshot].sizex;
                    if(sizey < nsp.sockets[id].views[msg.screenshot].sizey)
                        sizey = nsp.sockets[id].views[msg.screenshot].sizey;
                }

                // Initialize a variable to store current stream dimensions
                if(!nsp.views[msg.screenshot]) {
                    nsp.views[msg.screenshot] = {};
                    nsp.views[msg.screenshot].sizex = 0;
                    nsp.views[msg.screenshot].sizey = 0;
                }

                // Resize stream if needed
                if(nsp.views[msg.screenshot].sizex != sizex || nsp.views[msg.screenshot].sizey != sizey) {
                    nsp.views[msg.screenshot].sizex = sizex;
                    nsp.views[msg.screenshot].sizey = sizey;
                    // Create a stream pipe for the view
                    if(!nsp.views[msg.screenshot].streamPipe) {
                        STREAM_PIPE_PATH = "\\\\.\\pipe\\FlexsimStreamPipe" + queriedInstance.proc.pid + "view" + msg.screenshot;
                        nsp.views[msg.screenshot].streamPipe = net.createServer(function(stream) {
                            stream.on('data', function(data) {
                                nsp.emit('stream'+msg.screenshot, data);
                            });
                        });
                        nsp.views[msg.screenshot].streamPipe.listen(STREAM_PIPE_PATH);
                    }
                    var query = baseQuery+"&screenshot="+msg.screenshot+"&resizex="+sizex+"&resizey="+sizey+"&streamview=1";
                    queryInstance(queriedInstance, "GET", query, "", function(responseData) {
                        if(responseData)
                            nsp.emit('resize', {"resizex": sizex, "resizey": sizey, "screenshot": msg.screenshot});
                    });
                }
            });
            // Reset the model
            socket.on('reset', function(msg) {
                var query = baseQuery+"&reset";
                queryInstance(queriedInstance, "GET", query, "", function(responseData) {
                    if(responseData) {
                        nsp.emit('reset', null);
                        queriedInstance.running = false;
                        //Update runTime
                        setTimeout(function() {
                            var query = baseQuery+"&getRunTime";
                            queryInstance(queriedInstance, "GET", query, "", function(responseData) {
                                if(responseData) {
                                    var resString = responseData.toString();
                                    var dataPosition = resString.indexOf("\r\n\r\n") + 4;
                                    nsp.emit('getRunTime', responseData.slice(dataPosition).toString());
                                }
                            });
                        }, 50);
                    }
                });
            });
            // Run the model
            socket.on('run', function(msg) {
                var query = baseQuery+"&run";
                queryInstance(queriedInstance, "GET", query, "", function(responseData) {
                    if(responseData) {
                        nsp.emit('run', null);
                        queriedInstance.running = true;
                    }
                });
            });
            // Stop the model
            socket.on('stop', function(msg) {
                var query = baseQuery+"&stop";
                queryInstance(queriedInstance, "GET", query, "", function(responseData) {
                    if(responseData) {
                        nsp.emit('stop', null);
                        queriedInstance.running = false;
                        //Update runTime
                        setTimeout(function() {
                            var query = baseQuery+"&getRunTime";
                            queryInstance(queriedInstance, "GET", query, "", function(responseData) {
                                if(responseData) {
                                    var resString = responseData.toString();
                                    var dataPosition = resString.indexOf("\r\n\r\n") + 4;
                                    nsp.emit('getRunTime', responseData.slice(dataPosition).toString());
                                }
                            });
                        }, 50);
                    }
                });
            });
            // Step forward the execution of a model
            socket.on('step', function(msg) {
                var query = baseQuery+"&step";
                queryInstance(queriedInstance, "GET", query, "", function(responseData) {
                    if(responseData) {
                        nsp.emit('step', null);
                        //Update runTime
                        setTimeout(function() {
                            var query = baseQuery+"&getRunTime";
                            queryInstance(queriedInstance, "GET", query, "", function(responseData) {
                                if(responseData) {
                                    var resString = responseData.toString();
                                    var dataPosition = resString.indexOf("\r\n\r\n") + 4;
                                    nsp.emit('getRunTime', responseData.slice(dataPosition).toString());
                                }
                            });
                        }, 50);
                    }
                });
            });
            // Compile the model
            socket.on('compile', function(msg) {
                var query = baseQuery+"&compile";
                queryInstance(queriedInstance, "GET", query, "", function(responseData) {
                    if(responseData)
                        nsp.emit('compile', null);
                });
            });
            // Set the run speed of the model
            socket.on('setRunSpeed', function(msg) {
                var query = baseQuery+"&setRunSpeed="+msg.setRunSpeed;
                queryInstance(queriedInstance, "GET", query, "", function(responseData) {
                    if(responseData)
                        nsp.emit('setRunSpeed', msg);
                });
            });
            // Reset the given view
            socket.on('resetView', function(msg) {
                var query = baseQuery+"&resetView="+msg.resetView+"&type="+msg.type;
                queryInstance(queriedInstance, "GET", query, "", function(responseData) {
                    if(responseData)
                        socket.emit('resetView', null);
                });
            });
            // Double click in the given coordinates
            socket.on('doubleClick', function(msg) {
                var query = baseQuery+"&screenshot="+msg.screenshot+"&doublex="+msg.doublex+"&doubley="+msg.doubley;
                queryInstance(queriedInstance, "GET", query, "", function(responseData) {
                    if(responseData)
                        socket.emit('doubleClick', null);
                });
            });
            // Left mouse down in the given coordinates
            socket.on('leftMouseDown', function(msg) {
                var query = baseQuery+"&screenshot="+msg.screenshot+"&leftx="+msg.leftx+"&lefty="+msg.lefty;
                queryInstance(queriedInstance, "GET", query, "", function(responseData) {
                    if(responseData)
                        socket.emit('leftMouseDown', null);
                });
            });
            // Right mouse down in the given coordinates
            socket.on('rightMouseDown', function(msg) {
                var query = baseQuery+"&screenshot="+msg.screenshot+"&rightx="+msg.leftx+"&righty="+msg.lefty;
                queryInstance(queriedInstance, "GET", query, "", function(responseData) {
                    if(responseData)
                        socket.emit('rightMouseDown', null);
                });
            });
            // Mouse up in the given coordinates
            socket.on('mouseUp', function(msg) {
                var query = baseQuery+"&screenshot="+msg.screenshot+"&mouseupx="+msg.mouseupx+"&mouseupy="+msg.mouseupy;
                queryInstance(queriedInstance, "GET", query, "", function(responseData) {
                    if(responseData)
                        socket.emit('mouseUp', null);
                });
            });
            // Mouse move in the given coordinates
            socket.on('mouseMove', function(msg) {
                var query = baseQuery+"&screenshot="+msg.screenshot+"&movex="+msg.movex+"&movey="+msg.movey;
                queryInstance(queriedInstance, "GET", query, "", function(responseData) {
                    if(responseData)
                        socket.emit('mouseMove', null);
                });
            });
            // Mouse wheel in the given coordinates
            socket.on('mouseWheel', function(msg) {
                var query = baseQuery+"&screenshot="+msg.screenshot+"&scrollx="+msg.scrollx+"&scrolly="+msg.scrolly
                    +"&scrollz="+msg.scrollz+"&mousex="+msg.mousex+"&mousey="+msg.mousey;
                queryInstance(queriedInstance, "GET", query, "", function(responseData) {
                    if(responseData)
                        socket.emit('mouseWheel', null);
                });
            });
            // Cancel view streams if all clients have disconnected
            socket.on('disconnect', function() {
                if(Object.keys(nsp.sockets).length == 0) {
                    var query = baseQuery+"&cancelStreams";
                    queryInstance(queriedInstance, "GET", query, "", function(responseData) {});
                    for(var i = 1; i < nsp.views.length; i++) {
                        if(nsp.views[i].streamPipe)
                            nsp.views[i].streamPipe.close();
                    }
                    nsp.views = [];
                }
            });
            // Send initial runstate to the client
            var query = baseQuery+"&getRunState";
            queryInstance(queriedInstance, "GET", query, "", function(responseData) {
                if(responseData) {
                    var resString = responseData.toString();
                    var dataPosition = resString.indexOf("\r\n\r\n") + 4;
                    nsp.emit('getRunState', responseData.slice(dataPosition).toString());
                }
            });
        });

        // Store new namespace
        queriedInstance.io = nsp;

        // start runtime loop
        var getRunTime = function() {
            if(Object.keys(queriedInstance.io.sockets).length != 0) {
                // Update runtime when running
                // Repaint views when not running
                if(queriedInstance.running) {
                    var query = baseQuery+"&getRunTime";
                    queryInstance(queriedInstance, "GET", query, "", function(responseData) {
                        if(responseData) {
                            var resString = responseData.toString();
                            var dataPosition = resString.indexOf("\r\n\r\n") + 4;
                            queriedInstance.io.emit('getRunTime', responseData.slice(dataPosition).toString());
                        }
                        queriedInstance.updateTimeOut = setTimeout(getRunTime, 50);
                    });
                }
                else {
                    var query = baseQuery+"&repaintViews";
                    queryInstance(queriedInstance, "GET", query, "", function(responseData) {
                        queriedInstance.updateTimeOut = setTimeout(getRunTime, 50);
                    });
                }
            }
            else
                queriedInstance.updateTimeOut = setTimeout(getRunTime, 50);
        };
        queriedInstance.updateTimeOut = setTimeout(getRunTime, 50);
    }
}

// Restrict directories named after user groups on Active Directory
if(settings.restrictUserGroupDirectories) {
    var ActiveDirectory = require('activedirectory');
    ad = new ActiveDirectory(settings.activeDirectory);
    // Get user groups from Active Directory
    ad.findGroups(function(err, groups) {
        if(groups && groups.length > 0) {
            restrictedDirs = [];
            // Get users of user groups from Active Directory
            var getUsersForGroupIndex = function(index) {
                var group = groups[index].cn;
                restrictedDirs[group] = [];
                ad.getUsersForGroup(group, function(err, users) {
                    if(users) {
                        for(var i = 0; i < users.length; i++) {
                            // Save principle name and sAMAccountName
                            if(users[i].userPrincipalName)
                                restrictedDirs[group].push(users[i].userPrincipalName);
                            if(users[i].sAMAccountName)
                                restrictedDirs[group].push(users[i].sAMAccountName);
                        }
                    }
                    if(index + 1 == groups.length)
                        runServer();
                    else
                        getUsersForGroupIndex(index + 1);
                });
            };
            getUsersForGroupIndex(0);
        }
        else {
            console.log("************************************************************");
            console.log();
            console.log("Unable to access ActiveDirectory.");
            console.log("Please configure:", __dirname.substr(0, __dirname.lastIndexOf("\\")) + '\\flexsim webserver configuration.txt');
            console.log();
            console.log("************************************************************");
            console.log();
            console.log("Press Enter to Exit.");
            console.log();
        }
    });
}
else
    runServer();