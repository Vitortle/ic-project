

        var g_autoTerminateBad3D = false,
                g_oneTimeTerminateBad3D = false,
                g_noPromptBad3D = false,
                g_maxRespawnAttempts = 12,
                g_respawnAttemptCount = 0,
                g_relaunchInstanceParams = {},
                g_logParent = null;

function setMenuName(dropDownId, name, value){
        var $dropDownBtn = $('#' + dropDownId);
        $dropDownBtn.data('value', value);
        $dropDownBtn.html(name + " <span class=\"caret\"></span>");

        switch (dropDownId) {
                case "modelsButton":
                        $('#startButton').prop('disabled', false);
                        $('#deleteModelBtn').prop('disabled', false);
                        break;
                case "instancesButton":
                        $('#terminateInstanceBtn').val("Terminate Instance");
                        $('#connectInstanceBtn').prop('disabled', false);
                        break;
        }
}

function hideNotification(element) {
        setTimeout(function() {
                $(element).fadeTo(1000, 0).slideUp(1000, function(){
                        $(this).remove();
                });
        }, 5000);
}

function updateAvailableModels() {
        $('#startButton').prop('disabled', true);
        $.ajax("webserver.dll?availablemodels").done(function(data) {
                var newHtml = "";
                var mList = data.getElementsByTagName("modelname");
                for (var i = 0; i < mList.length; i++) {
                        var modelName = mList[i].childNodes[0].nodeValue;
                        var fullModelName = modelName.replace(/\\/g, "\\\\");
                        var fullModelPath = fullModelName.replace(/&/g, "%26");
                        newHtml += "<li><a href=\"#\" onclick=\"setMenuName('modelsButton', '" + fullModelName + "', '" + fullModelPath + "')\">" + modelName + "</a></li>";
                }
                $('#modelsSelectMenu').html(newHtml);
        });
}

function updateInstanceSelect() {
        $.ajax("webserver.dll?instancelist").done(function(data) {
                var newHtml = "";
                var iList = data.getElementsByTagName("instance");

                //disable/enable the buttons according to the current state
                if (iList.length) {
                        $('#terminateInstanceBtn').prop('disabled', false);
                        $('#instancesButton').prop('disabled', false);
                }
                else {
                        $('#terminateInstanceBtn').prop('disabled', true);
                        $('#instancesButton').prop('disabled', true);
                }
                selectInstanceButtonVal = $('#instancesButton').data('value');
                if (typeof selectInstanceButtonVal == "string" && selectInstanceButtonVal.length)
                        $('#connectInstanceBtn').prop('disabled', false);
                else
                        $('#connectInstanceBtn').prop('disabled', true);

                //loop over all the available instances and create the dropdown list
                for (var i = 0; i < iList.length; i++) {
                        var instanceName = iList[i].childNodes[0].childNodes[0].nodeValue;
                        var instanceNum = iList[i].childNodes[1].childNodes[0].nodeValue;
                        var instanceValue = instanceName.replace(/&/g, "%26") + "&instancenum=" + instanceNum;
                        var instanceName = instanceName + " instance " + instanceNum;
                        var fullInstanceName = instanceName.replace(/\\/g, "\\\\");
                        var fullInstanceValue = instanceValue.replace(/\\/g, "\\\\");
                        newHtml += "<li><a href=\"#\" data-instancevalue=\"" + fullInstanceValue + "\" onclick=\"setMenuName('instancesButton', '" + fullInstanceName + "', '" + fullInstanceValue + "')\">" + instanceName + "</a></li>";
                }
                $('#instanceSelectMenu').html(newHtml);
        });
}

function checkConfiguration() {
        $.ajax("webserver.dll?configuration").done(function(data) {
                var modelUploading = data.getElementsByTagName("modeluploading");
                var modelDeleting = data.getElementsByTagName("modeldeleting");
                if (modelDeleting[0].childNodes[0].nodeValue == 'yes')
                        $('#deleteModelBtn').show();
                if (modelUploading[0].childNodes[0].nodeValue == 'yes')
                        $('#uploadModels').css('display', 'block');
        });
}


function updateLists() {
        updateAvailableModels();
        updateInstanceSelect();
        checkConfiguration();
}

function updateAvailableModelsWhenUploaded() {
        var invisible = $('#invisibleIFrame')[0];
        var responsedoc = invisible.document || invisible.contentWindow.document;
        var statusNodes = responsedoc.getElementsByTagName("status");

        if (statusNodes.length == 1) {
                var returnVal = statusNodes.item(0).childNodes[0].nodeValue;
                var notification = document.createElement('div');
                if (returnVal == "tooLarge") {
                        notification.className = "alert alert-danger fade in";
                        notification.innerHTML = "<strong>Upload Failed</strong> Model file size is too large.";
                } else if (returnVal == "success") {
                        notification.className = "alert alert-success fade in";
                        notification.innerHTML = "<strong>Upload Suceeded</strong>";
                        updateAvailableModels();
                } else { //Fail
                        notification.className = "alert alert-danger fade in";
                        notification.innerHTML = "<strong>Upload Failed</strong>";
                }
                $('#uploadModels').append(notification);
                hideNotification(notification);
                $('#uploadModelBtn').prop('disabled', false);
        } else
                setTimeout("updateAvailableModelsWhenUploaded()", 100);
}
function imageExists(image_url){
        var xhr = new XMLHttpRequest(),
                info = {"status":0, "response":""};
        xhr.open('GET', image_url, false);
        xhr.send();
        return xhr;
}      

function abre_simulacao() {
                window.open("http://127.0.0.1:8080/webserver.dll?createinstance=1");
            }

function startPressed() {
        var model = $("1").data('value'),
                logEntry = addLogEntry("launching instance of ["+model+"]"+(g_respawnAttemptCount?" (relaunch attempt "+g_respawnAttemptCount+")":"")+"...");
        $.ajax("webserver.dll?createinstance=" + model, {
                beforeSend: function(jqXHR, settings) {
                        $('#startButton').prop('disabled', true);
                        toggleWorkingOverlay("<p>Starting new instance"+(g_respawnAttemptCount?" - relaunch attempt "+g_respawnAttemptCount:"")+"<br><span style='font-size:75%;white-space:nowrap;'>["+model+"]</span></p>");
                },
                success: function(data, textStatus, jqXHR) {
                        var
                                xmlText = jqXHR.responseText,
                                xmlDoc = $.parseXML(xmlText),
                                xmlObj = $(xmlDoc),
                                status = xmlObj.find('status').text(),
                                reason = xmlObj.find('reason').text();

                        if (status == "success") {
                                var instanceNumber = xmlObj.find('instancenum').text(),
                                        currTime = (new Date()).getTime(),
                                        url_testImage = "webserver.dll?queryinstance="+encodeURIComponent(model)+"&instancenum="+instanceNumber+"&screenshot=1&time="+currTime,
                                        imgXHR = imageExists(url_testImage),
                                        target = "newImg"+currTime,
                                        bad3D = true;	//default to true, set as false upon success

                                //update the log
                                logEntry.append(" instance ["+instanceNumber+"] launched"+
                                        (imgXHR.status==200?
                                                " <a href='"+url_testImage+"' data-featherlight='image' target='"+target+"'>["+imgXHR.status+"]</a>"
                                                :" ["+imgXHR.status+"]"
                                        )
                                );
                                $('a[target="'+target+'"]').featherlight();

                                //if instance unable to generate a 3D view (server did not return 200), it probably didn't get the OpenGL context it needs.
                                if (imgXHR.status != 200)
                                        logEntry.append(", <i>ERROR:</i> GET 3D server fault");
                                //if instance unable to generate a 3D view (server did not return a valid png)...
                                else if (imgXHR.getResponseHeader("Content-Type") != "image/png")
                                        logEntry.append(", <i>ERROR:</i> no 3D image");
                                //if instance unable to generate a 3D view (server did not return any data)...
                                else if (imgXHR.getResponseHeader("Content-Length") <= 10 && imgXHR.getResponseHeader("Transfer-Encoding") != "chunked")
                                        logEntry.append(", <i>ERROR:</i> no 3D image data");
                                //else instance can properly generate 3D views
                                else {
                                        bad3D = false;
                                        logEntry.append(" successfully");
                                }

                                //if there was a bad 3D result, and user hasn't asked to stop being bugged...
                                if (bad3D && !g_noPromptBad3D) {
                                        //Prompt for retry.
                                        g_relaunchInstanceParams = {"logEntry":logEntry, "model":model, "instanceNumber":instanceNumber};
                                        relaunchInstance();							
                                }
                                //else we are keeping this instance
                                else {
                                        updateInstanceSelect();
                                        toggleWorkingOverlay();
                                        //reset the auto respawn counter
                                        g_respawnAttemptCount = 0;
                                        //reset the log parent so that new log entries are added at the base level
                                        g_logParent = null;
                                }
                        }
                        else {
                                logEntry.append(" <i>ERROR:</i> "+status+(reason.length?":<i>"+reason+"</i>":""));
                                alert("Failed to start instance on the server.");
                                toggleWorkingOverlay();
                                //reset the auto respawn counter
                                g_respawnAttemptCount = 0;
                        }
                },
                error: function(jqXHR, textStatus, errorThrown) {
                        logEntry.append(" <i>ERROR:</i> server fault: "+JSON.stringify({"jqXHR":jqXHR, "textStatus":textStatus, "errorThrown":errorThrown}));
                        toggleWorkingOverlay();
                        //reset the auto respawn counter
                        g_respawnAttemptCount = 0;
                },
                complete: function(jqXHR, textStatus) {
                        $('#startButton').prop('disabled', false);
                }
        });
}



function relaunchInstance() {
        //if we don't yet have permission to attempt a relaunch, let's ask the user
        if (!g_autoTerminateBad3D && !g_oneTimeTerminateBad3D)
                return togglePromptOverlay("alert_bad3d_relaunchInstance");

        //if we're currently in a relaunch loop, and we've reached the limit, prompt the user
        if (g_autoTerminateBad3D && g_respawnAttemptCount >= g_maxRespawnAttempts) {
                g_autoTerminateBad3D = false;
                g_respawnAttemptCount = 0;
                return togglePromptOverlay("alert_bad3d_relaunchLoopDetect");
        }

        //in case of getting in via the one time flag, we'll set the flag to false for next time
        g_oneTimeTerminateBad3D = false;
        var attemptRespawn = true;

        //if we get this far, it's time to terminate the bad instance and attempt auto relaunch
        g_respawnAttemptCount++;
        g_relaunchInstanceParams.logEntry.append(", terminating instance and re-launching...");

        //if we're just starting an auto-relaunch series, set g_logParent
        if (g_autoTerminateBad3D && !g_logParent)
                g_logParent = $('<ul></ul>').appendTo(g_relaunchInstanceParams.logEntry);

        //passing noop for the complete callback to prevent it using the default terminateInstance callback
        terminateInstance(
                g_relaunchInstanceParams.model+"&instancenum="+g_relaunchInstanceParams.instanceNumber,
                {"success":startPressed, "complete":function() {
                        $('#instancesButton').html("Select Instance <span class=\"caret\"></span>");
                        updateInstanceSelect();
                        $('#terminateInstanceBtn').prop('disabled', false).val("Terminate All");
                }}
        );
}

function deletePressed() {
        var modelName = $('#modelsButton').data('value');
        togglePromptOverlay("prompt_deleteModel", {"beforeBounce":function(alertId, promptBox) {
                promptBox.find('.deleteModel').text(modelName).css('fontStyle', 'italic');
                promptBox.find('input[data-modelname]').data("modelname", modelName)
        }});
}


function deleteModel(modelName, callbacks) {
        //default to an empty callbacks obj if invalid callbacks param was received
        callbacks = callbacks || {};

        var logEntry = addLogEntry("deleting ["+modelName+"] from server...");

        //set some default callbacks, if not already defined
        callbacks.beforeSend = callbacks.beforeSend || function() {
                $('#deleteModelBtn').prop('disabled', true);
                $('#startButton').prop('disabled', true);
                toggleWorkingOverlay("<p>Deleting model from server<br><span class='default' style='font-size:75%;white-space:nowrap;'>["+modelName+"]</span></p>");
        };
        callbacks.complete = callbacks.complete || function() {
                toggleWorkingOverlay();
        };

        $.ajax("webserver.dll?deletemodel=" + modelName, {
                beforeSend: function(jqXHR, settings) {
                        if (typeof callbacks.beforeSend == "function")
                                callbacks.beforeSend(jqXHR, settings, modelName);
                },
                success: function(data, textStatus, jqXHR) {
                        if (data.getElementsByTagName("status")[0].textContent == "success") {
                                logEntry.append(" successfully deleted model");
                                $('#modelsButton').html("Select Model <span class=\"caret\"/>");
                                updateAvailableModels();
                        } else {
                                logEntry.append("<i>ERROR:</i> unable to delete model");
                                alert("ERROR: Unable to delete the selected model on the server.\n\n"+JSON.stringify({"data":data, "textStatus":textStatus, "jqXHR":jqXHR}));
                        }
                        if (typeof callbacks.success == "function")
                                callbacks.success(data, textStatus, jqXHR, modelName);
                },
                error: function(jqXHR, textStatus, errorThrown) {
                        logEntry.append(" <i>ERROR:</i> server fault: "+JSON.stringify({"jqXHR":jqXHR, "textStatus":textStatus, "errorThrown":errorThrown}));
                        if (typeof callbacks.error == "function")
                                callbacks.error(jqXHR, textStatus, errorThrown, modelName);
                },
                complete: function(jqXHR, textStatus) {
                        if (typeof callbacks.complete == "function")
                                callbacks.complete(jqXHR, textStatus, modelName);
                }
        });
}


function closeInstanceIframe(newTab) {
        var iframe = $('iframe.instanceIframe'),
                modelName = iframe.data('model'),
                instanceNumber = iframe.data('instance');
        $('.instanceIframe').fadeOut('fast', function() { iframe.remove(); });
        logEntry = addLogEntry("closed local view ["+modelName+", instance number "+instanceNumber+"]");
        if (newTab)
                addLogEntry("opening external view in new tab ["+modelName+", instance number "+instanceNumber+"]");
}

function connectPressed() {
        var instance = $('#instancesButton').data('value');
        if (instance) {
                var
                        instanceUrl = "webserver.dll?queryinstance=" + instance + "&defaultpage&dashboardstats=1&time="+(new Date()).getTime(),
                        instanceInfo = instance.split("&instancenum="),
                        logEntry = addLogEntry("opening local view ["+instanceInfo[0]+", instance number "+instanceInfo[1]+"]");
                $('body').append('<iframe data-model="'+instanceInfo[0]+'" data-instance="'+instanceInfo[1]+'" class="instanceIframe">Your browser doesn\'t support iframes</iframe>');

                $('#instanceIframe-name').html(instanceInfo[0]);
                $('#instanceIframe-num').html(instanceInfo[1]);
                $('a.instanceIframe-button').attr('href', instanceUrl).attr('target', 'instanceView'+(new Date()).getTime());

                $('div.instanceIframe').fadeIn(200, function() {
                        $('iframe.instanceIframe').slideDown('fast', function() {
                                $('iframe.instanceIframe').attr('src', instanceUrl)})});
        }
}

function terminatePressed() {
        //try to get the instance from the instance selector
        instance = $('#instancesButton').data('value');

        //if there was an instance selected, just terminate that one
        if (instance)
                return terminateInstance(instance);

        //else no instance is selected for termination. Prompt user to terminate all instances.
        togglePromptOverlay("alert_terminateAll");
}

function terminateAllInstances(callbacks) {
        var logEntry = addLogEntry("terminating all instances...<ul></ul>"),
                instanceList = $('#instanceSelectMenu a'),
                instanceCount = instanceList.length,
                instancesTerminatedCount = 0;
        //set the global logParent so that log entries added during this terminate-all will be added to the sublist
        g_logParent = logEntry.find('ul');

        //clear and disable the select instances button
        $('#instancesButton').data('value', '');
        $('#terminateInstanceBtn').prop('disabled', true);

        //initialize the busy overlay
        toggleWorkingOverlay("<p>Terminating all instances</p><ul></ul>");

        //add each instance to the popup list
        $.each(instanceList, function() {
                var instance = $(this).data('instancevalue');
                $('#workingContent ul').append(
                        "<li class='"+window.btoa(instance)+
                                "' style='font-size:75%;white-space:nowrap;'>["+instance+"]</li>");
        });
        //center the popupulated popup list
        vCenterWorkingOverlay();

        //default to an empty callbacks obj if invalid callbacks param was received
        callbacks = callbacks || {};
        //add a custom beforeSend callback
        callbacks.beforeSend = function() {
                $('#instancesButton').data('value', '');
                $('#terminateInstanceBtn').prop('disabled', true);
        };
        //add a custom complete callback
        callbacks.complete = function(jqXHR, textStatus, instance) {
                //instance termination just completed. Find out what happened
                var
                        xmlText = jqXHR.responseText,
                        xmlDoc = $.parseXML(xmlText),
                        xmlObj = $(xmlDoc),
                        status = xmlObj.find('status').text(),
                        reason = xmlObj.find('reason').text(),
                        completeCount = 0;
                if (status=="success")
                        status = "terminated";
                //update the overlay with current multi-terminate status
                $('#workingContent ul').find('li.'+window.btoa(instance).replace(/([:\.\[\],=@])/g, "\\$1"))
                        .append(" - "+status);

                //terminate the next instance that has not yet had terminateInitiated set
                instanceList.each(function(index) {
                        if ($(this).data('terminateInitiated')!==true) {
                                //store the fact that this in instanceList is being handled
                                $(this).data('terminateInitiated', true);
                                terminateInstance($(this).data('instancevalue'), callbacks);
                                return false;	//break out of the each loop
                        }
                        completeCount++;
                });

                //if all instances are now terminated, cleanup notifiers
                if (completeCount>=instanceCount) {
                        g_logParent = null;
                        $('#terminateInstanceBtn').prop('disabled', false).val("Terminate All");
                        toggleWorkingOverlay();
                        $('#instancesButton').html("Select Instance <span class=\"caret\"></span>");
                        updateInstanceSelect();
                }

        };

        //store the fact that the first thing in instanceList is being handled
        instanceList.first().data('terminateInitiated', true);
        terminateInstance(instanceList.first().data('instancevalue'), callbacks);
}

function terminateInstance(instance, callbacks, auxLog) {
        //catch bad input
        if (!instance)
                return addLogEntry("unable to terminate invalid instance "+JSON.stringify(instance));

        //default to an empty callbacks obj if invalid callbacks param was received
        callbacks = callbacks || {};

        //any messages to add to an existing log entry?
        if (auxLog)
                auxLog.entry.append(auxLog.message);

        //add a new log entry for this termination attempt
        var logEntry = addLogEntry("terminating ["+instance+"]...");

        //set some default callbacks, if not already defined
        callbacks.beforeSend = callbacks.beforeSend || function() {
                $('#instancesButton').data('value', '');
                $('#terminateInstanceBtn').prop('disabled', true);
                toggleWorkingOverlay("<p>Terminating instance<br><span class='default' style='font-size:75%;white-space:nowrap;'>["+instance+"]</span></p>");
        };
        callbacks.complete = callbacks.complete || function() {
                $('#instancesButton').html("Select Instance <span class=\"caret\"></span>");
                updateInstanceSelect();
                $('#terminateInstanceBtn').prop('disabled', false).val("Terminate All");
                toggleWorkingOverlay();
        };

        $.ajax("webserver.dll?terminateinstance=" + instance, {
                beforeSend: function(jqXHR, settings) {
                        if (typeof callbacks.beforeSend == "function")
                                callbacks.beforeSend(jqXHR, settings, instance);
                },
                success: function(data, textStatus, jqXHR) {
                        var
                                xmlText = jqXHR.responseText,
                                xmlDoc = $.parseXML(xmlText),
                                xmlObj = $(xmlDoc),
                                status = xmlObj.find('status').text(),
                                reason = xmlObj.find('reason').text();
                        logEntry.append(" "+status+(reason.length?":<i>"+reason+"</i>":""));
                        if (typeof callbacks.success == "function")
                                callbacks.success(data, textStatus, jqXHR, instance);
                },
                error: function(jqXHR, textStatus, errorThrown) {
                        logEntry.append(" <i>ERROR:</i> server fault: "+JSON.stringify({"jqXHR":jqXHR, "textStatus":textStatus, "errorThrown":errorThrown}));
                        if (typeof callbacks.error == "function")
                                callbacks.error(jqXHR, textStatus, errorThrown, instance);
                },
                complete: function(jqXHR, textStatus) {
                        if (typeof callbacks.complete == "function")
                                callbacks.complete(jqXHR, textStatus, instance);
                }
        });
}


function submitPressed() {
        $('#upload').submit();
        updateAvailableModelsWhenUploaded();
        $('#uploadModelBtn').prop('disabled', true);
}


function addLogEntry(content, id, parent) {
        //if there was a parent string passed in, get the list under that selector
        if (typeof parent == "string")
                parent = $(parent).find('ul');
        //if there was a passed in parent, that is the priority.
        // else if there is a global g_logParent, that is secondary
        // finally, the fallback is the default log list
        parent = parent || g_logParent || $('div.log>ul');

        var li = $("<li style='display:none;'"+(id?" id='"+id+"'":"")+">"+content+"</li>").appendTo(parent).slideDown();
        $("div.log").animate({ scrollTop: $('div.log').prop("scrollHeight")});
        return li;
}

function toggleWorkingOverlay(content) {
        //close any opened dropdown selectors
        $('div.dropdown').removeClass("open");

        var workingOverlay = $('#workingOverlay');

        //if there is no content for the working/busy overlay, we're closing it
        if (typeof content == "undefined" || !content.length)
                return workingOverlay.fadeOut();

        //else, set the new content
        $('#workingContent').html(content);
        //if the working content is already visible, just adjust the centering
        if (workingOverlay.is(':visible'))
                return vCenterWorkingOverlay();

        //if we need to bring up the overlay, first set the spinner to default, center the content, and bring up the overlay
        workingOverlay.find('div.spinner').removeClass("spinner-medium spinner-small").addClass("spinner-large").show();
        workingOverlay.css({opacity:0.01,display:"block"}).each(function() {
                vCenterWorkingOverlay();
        }).css({display:"none",opacity:1}).fadeIn(500);
}

function vCenterWorkingOverlay() {
        var maxSpinnerSize = 66,
                minSpinnerSize = 22,
                overlay = $('#workingOverlay'),
                //default the spinner to the large size
                spinner = overlay.find('div.spinner').css({width:maxSpinnerSize,height:maxSpinnerSize}).show(),
                container = $('#workingOverlayContainer'),
                workingContent = $('#workingContent'),
                overlayH = overlay.outerHeight(),
                containerH = container.outerHeight(),
                heightOverage = containerH - 0.95*overlayH;

        //remove any previous spinner-aux elements there may have been.
        workingContent.find('.spinner-aux').remove();

        //if the amount of space that can be saved by shrinking the spinner is not
        // adequate to create the needed vertical space...
        if (heightOverage > (maxSpinnerSize-minSpinnerSize)) {
                //can't use the spinner at all. Just put a small one inline with the workingContent
                spinner.hide();
                workingContent.find('p').first().prepend('<span class="spinner spinner-aux" style="margin-right:6px;position:relative;top:3px;width:'+minSpinnerSize+'px;height:'+minSpinnerSize+'px"></span>');
        }
        //else shrinking the spinner to somewhere between its max and min size is adequate to
        // create the needed vertical space...
        else if (heightOverage > 0) {
                var spinSize = maxSpinnerSize-heightOverage;
                spinner.css({width:spinSize,height:spinSize});
        }
        //recalculate working overlay height and overage
        containerH = container.outerHeight();
        heightOverage = containerH - 0.95*overlayH;


        //if the container is still taller than the overlay...
        if (heightOverage > 0) {
                //are there any lists we can try to resize?
                var list = container.find('li');
                if (list.length) {
                        var fontSize = parseInt(list.css('fontSize'));
                        while (heightOverage > 0 && fontSize > 9) {
                                list.css('fontSize', (fontSize*=0.9)+'px');
                                containerH = container.outerHeight();
                                heightOverage = containerH - 0.95*overlayH;
                        }
                }

                //if we're still too tall, just set it to the top and be done with it
                if (heightOverage > 0)
                        return container.css({top:"0px"});
        }

        //vertically center the container in the working overlay
        container.animate({top:(overlayH-containerH)/2}, {duration: 200});
}


function togglePromptOverlay(alertId, callbacks) {
        callbacks = callbacks || {};
        //if no prompt was passed in, turn off any active prompts...
        if (typeof alertId == "undefined" || !alertId.length)
                return $('#promptOverlay').fadeOut();

        //Else we need to display a prompt...
        //close any opened dropdown selectors
        $('div.dropdown').removeClass("open");
        //reset all prompt boxes
        $('.promptBox').each(function() {
                $(this).css({top:'-100%',display:"none"});
        });
        //animate the specified promptBox into view
        if (typeof callbacks.beforeFadeIn == "function")
                callbacks.beforeFadeIn(alertId);
        $('#promptOverlay').fadeIn(300, function() {
                var overlayHeight = $('#promptOverlay').outerHeight(),
                        promptBox = $('#'+alertId).show(),
                        promptBoxHeight = promptBox.outerHeight();
                if (typeof callbacks.beforeBounce == "function")
                        callbacks.beforeBounce(alertId, promptBox);
                promptBox.animate({top:(overlayHeight-promptBoxHeight)/2}, {duration: 700, easing: 'easeOutBounce'});
        });
}

window.onload = updateLists;
