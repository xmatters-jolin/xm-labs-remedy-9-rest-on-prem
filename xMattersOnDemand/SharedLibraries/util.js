/**
 * ---------------------------------------------------------------------------------------------------------------------
 * 
 * Shared library containing utility functions for making calls back into xMatters.
 *
 * To use this shared library in another script, include the following 
 * 'require' function statement in your Integration Builder script.
 *
 *  var util = require('util');
 *  util.fixPayload(payload);
 *
 * Required Constants (to be defined in the "requiring" Comm Plan)
 *   None.
 * 
 * Required Shared Libraries (to be included in this Comm Plan):
 *   None.
 *
 * Hisory
 *  Version: 1.0 (2018-10-08)
 *
 * ---------------------------------------------------------------------------------------------------------------------
 */


/**
 * ---------------------------------------------------------------------------------------------------------------------
 * 
 * Determine if an HTTP status code represents success
 *
 * @param {number} statusCode from an HTTP request
 * @returns {boolean} true if successful; false otherwise
 * 
 * ---------------------------------------------------------------------------------------------------------------------
 */
function isValidStatusCode(statusCode) {
    return statusCode >= 200 && statusCode <= 299;
}
exports.isValidStatusCode = isValidStatusCode;


/**
 * ---------------------------------------------------------------------------------------------------------------------
 * 
 * Calls xMatters based on the input parameters.  
 * In the case of a failure (5xx) or exception, will retry up to 2 additional times (default)
 * 
 * @param {string} the HTTP method to call
 * @param {string} path to make Remedy call against
 * @param {boolean} whether or not to auto Encode the URI
 * @param {object} [Optional] the Remedy Values object
 * 
 * @returns {object} the response object
 * 
 * ---------------------------------------------------------------------------------------------------------------------
 */
function callxMatters(method, path, autoEncodeURI, payload) {
    var funcName = "util.callxMatters";
    console.log("Enter " + funcName + " - method: " + method + ", path: " + path);
    var maxRetries = 2;
    
    // Prepare the request object to get the Incident
    var requestObj = {
        'endpoint': "xMatters",
        'path': path,
        'method': method,
        'headers': {
            'Content-Type': 'application/json'
        }
    };
    
    // Check for and add autoEncodeURI if not true
    // Note, the defauolt is true
    if ((typeof autoEncodeURI !== "undefined") && !autoEncodeURI) {
        requestObj.autoEncodeURI = autoEncodeURI;
    }

    // Create the request
    var request = http.request(requestObj);

    // Send request to xMatters with retries
    var response;
    var finished = false;
    for (var retryCount = 0;!finished || (retryCount === maxRetries);++retryCount) {
        console.log('util.callxMatters - Attempt #' + (retryCount+1));
        try {
            if ((typeof payload !== "undefined") && (null !== payload)) {
                response = request.write(payload);
            } else {
                response = request.write();
            }
            if (response.statusCode < 500) {
                finished = true;
            }
        } catch (e) {
            response = {};
            response.statusCode = 400;
            errBody = {
                "code":400,
                "message": String(e),
                "reason":"Exception",
                "subcode":"Exception caught in util." + funcName
            };
            response.body = JSON.stringify(errBody);
        }
    }

    console.log("Exit " + funcName + " - response: " + JSON.stringify(response));
    return response;   
}
exports.callxMatters = callxMatters;


/**
 * ---------------------------------------------------------------------------------------------------------------------
 * 
 * Retrieves the xMatters event object via it's event id
 * 
 * @param {string|number} Event identifier to find
 * 
 * @returns {object} The event object.  Returns null if not found, or an error was returned.
 * 
 * ---------------------------------------------------------------------------------------------------------------------
 */
var getEvent = function(eventId) {
    // Make the request to get the events
    var response = callxMatters(
        'GET',
        '/api/xm/1/events/' + eventId
        );
    if(isValidStatusCode(response.statusCode)) {
        var event = null;
        if(response.body) {
            event = JSON.parse(response.body);
        } 
        return event;
    } else {
        console.log('util.getEvents returned an error: ' + response.statusCode);
        return null;
    }
};
exports.getEvent = getEvent;


/**
 * ---------------------------------------------------------------------------------------------------------------------
 * 
 * Retrieves the xMatters event objects that match the specified status and properties.
 * 
 * @param {string} Event status to match
 * @param {string}[] Array of URL Encoded xMatters Event property names
 * @param {string}[] Array of URL Encoded xMatters Event property values
 * 
 * @returns {object}[] The event objects.  Returns an empty array if none are found, or an error was returned.
 * 
 * ---------------------------------------------------------------------------------------------------------------------
 */
var getEvents = function(status, propertyNames, propertyValues) {    
    // Make the request to get the events
    var response = callxMatters(
        'GET',
        '/api/xm/1/events?status=' + status + '&propertyName=' + propertyNames.join(',') + '&propertyValue=' + propertyValues.join(',')
        );
    if(isValidStatusCode(response.statusCode)) {
        var events = [];
        if(response.body) {
            events = JSON.parse(response.body).data;
        } 
        return events;
    } else {
        console.log('util.getEvents returned an error: ' + response.statusCode);
        return [];
    }
};
exports.getEvents = getEvents;


/**
 * ---------------------------------------------------------------------------------------------------------------------
 * 
 * Possibe xMatters Event Status values
 * 
 * ---------------------------------------------------------------------------------------------------------------------
 */
var EVENT_STATUS = {
    ACTIVE: 'ACTIVE',
    SUSPENDED: 'SUSPENDED',
    TERMINATED: 'TERMINATED',
    TERMINATED_EXTERNAL: 'TERMINATED_EXTERNAL'
};
exports.EVENT_STATUS = EVENT_STATUS;


/**
 * ---------------------------------------------------------------------------------------------------------------------
 * 
 * Terminates any events with the specified xMatters eventId
 * 
 * @param {string} Id of an xMatters event
 * 
 * @returns {boolean} True if successful, false otherwise.
 * 
 * ---------------------------------------------------------------------------------------------------------------------
 */
var terminateEvent = function(eventId) {
    var response = callxMatters(
        'POST',
        '/api/xm/1/events',
        true,
        {
            id: eventId,
            status: EVENT_STATUS.TERMINATED
        }
        );
    if(isValidStatusCode(response.statusCode)) {
        return true;
    } else {
        return false;
    }
};
exports.terminateEvent = terminateEvent;

/**
 * ---------------------------------------------------------------------------------------------------------------------
 * 
 * Terminate active events matching a set of properties
 *
 * Note: When property is a string type, be sure to include the language
 *       with the property name (e.g. "alert_id#en"). If the property is
 *       a numeric, however, do not include the language (e.g.
 *       "alert_count").
 *
 * @param {Object} properties a set of properties to search
 * 
 * @returns {boolean} True if successful, false if not.
 * 
 * ---------------------------------------------------------------------------------------------------------------------
 */
exports.terminateEvents = function (properties) {
    // Prepare the search criteria for matching events
    var propNames = [];
    var propValues = [];
    for (var key in properties) {
        propNames.push(encodeURIComponent(key));
        propValues.push(encodeURIComponent(properties[key]));
    }

    if(propNames.length <= 0) {
        console.log('util.terminateEvents - Skipping terminate events because it was called without any search properties');
        return false;
    }

    var isSuccessful = true;
    try {
        var activeEvents = getEvents(EVENT_STATUS.ACTIVE, propNames, propValues);
        for(var i = 0; i < activeEvents.length; i++) {
            isSuccessful = terminateEvent(activeEvents[i].id) && isSuccessful;
        }
    } catch(e) {
        console.log('util.terminateEvents - A problem occurred while terminating active events: ' + JSON.stringify(e));
        isSuccessful = false;
    }

    try {
        var suspendedEvents = getEvents(EVENT_STATUS.SUSPENDED, propNames, propValues);
        for(var j = 0; j < suspendedEvents.length; j++) {
            isSuccessful = terminateEvent(suspendedEvents[j].id) && isSuccessful;
        }
    } catch(e) {
        console.log('util.terminateEvents - A problem occurred while terminating suspended events: ' + JSON.stringify(e));
        isSuccessful = false;
    }

    return isSuccessful;
};


/**
 * ---------------------------------------------------------------------------------------------------------------------
 * 
 * Attempts to retrieve a PERSON object via targetName
 *
 * @param {String} targetName of the person to retrieve
 * 
 * @returns {object} The person object if found, or null
 * 
 * ---------------------------------------------------------------------------------------------------------------------
 */
exports.getPerson = function(targetName) {
    console.log("util.getPerson for " + targetName );
    var response = callxMatters(
        'GET',
        '/api/xm/1/people/' + targetName
        );
    console.log("util.getPerson - Received " + JSON.stringify(response,null,4));
  
    // If it worked, returnTry the targetName
    if (isValidStatusCode(response.statusCode)) {
        return JSON.parse( response.body );
    }
    
    return null;

};


/**
 * ---------------------------------------------------------------------------------------------------------------------
 * 
 * Attempts to retrieve a PERSON object via the specified custom field.
 * If not found via custom field, an attempt is made to retrieve the PERSON
 * using the customFieldValue as a targetName
 *
 * @param {String} Custom property name to use in the search
 * @param {String} Custom property value to use in the search
 * 
 * @returns {object} The person object if found, or null
 * 
 * ---------------------------------------------------------------------------------------------------------------------
 */
var getPersonByCustomField = function(customField, customFieldValue) {
    console.log("util.getPersonByCustomField for " + customFieldValue);
    var search = "propertyName=" + encodeURIComponent(customField) + "&propertyValue=" + encodeURIComponent(customFieldValue);
    var url = "/api/xm/1/people?" + search;
    
    var response = callxMatters("GET", url);
    console.log("util.getPersonByCustomField - Received " + response.statusCode + " " + response.body);    
    
    // Try the targetName
    if (response.statusCode == "404") {
      
        console.log("XM REST API: Attempting query by targetName");
        url = "/api/xm/1/people/" + encodeURIComponent(customFieldValue);
        response = callxMatters("GET", url);
        console.log("util.getPersonByCustomField - (based on targetName) received " + response.statusCode + " " + response.body);    
    }
    
    var data = JSON.parse(response.body);
    if( data.count > 0 )
        return data.data[0];
    
    return null;
    
};
exports.getPersonByCustomField = getPersonByCustomField;

/**
 * ---------------------------------------------------------------------------------------------------------------------
 * 
 * Form properties are included in the payload when they are marked as
 * 'Include in Outbound Integrations' on the form layout.
 *
 * Transform the eventProperties object so that
 * you can access form properties using dot notation.
 * 
 * @param {object} payload object from an Outbound Integration
 * 
 * ---------------------------------------------------------------------------------------------------------------------
 */
var fixPayload = function(payload) {
    if (payload.eventProperties && Array.isArray(payload.eventProperties)) {
        var eventProperties = payload.eventProperties;
        payload.eventProperties = {};
    
        for (var i = 0; i < eventProperties.length; i++) {
            var eventProperty = eventProperties[i];
            var key = Object.keys(eventProperty)[0];
            payload.eventProperties[key] = eventProperty[key];
          }
    }
};
exports.fixPayload = fixPayload;


/**
 * ---------------------------------------------------------------------------------------------------------------------
 * 
 * Delays the current thread's execution for the number of milliseconds specified.
 * 
 * NOTE: This funciton only works when executing in the xMatters Agent.
 * 
 * @param {number} Number of milliseconds to sleep.
 * 
 * ---------------------------------------------------------------------------------------------------------------------
 */
var sleep = function(timeInMilliseconds) {
    console.log("Entered util.sleep(" + timeInMilliseconds + ") at: " + new Date());
    try {
        java.lang.Thread.sleep(timeInMilliseconds);
    } catch (e) {
      /*
       * This will happen if the sleep is woken up - you might want to check
       * if enough time has passed and sleep again if not - depending on how
       * important the sleep time is to you.
       */
    }
    console.log("Leaving util.sleep(" + timeInMilliseconds + ") at: " + new Date());
};
exports.sleep = sleep;


function copyBridgeDetails(formData, criteria) {
	formData.hasBridge = criteria.hasBridge;
	if (formData.hasBridge) {
		formData.type = criteria.type;
		formData.useExisting = criteria.useExisting;
		if (formData.useExisting) {
		    formData.existingEventPropFieldName = criteria.existingEventPropFieldName;
		    formData.existingEventValueFieldName = criteria.existingEventValueFieldName;
		}
	    formData.bridgeId = criteria.bridgeId;
		if ("EXTERNAL" === formData.type) {
    	    formData.subType = criteria.subType;
    	    formData.bridgeNumber = criteria.bridgeNumber;
    		formData.dialAfter = criteria.dialAfter;
		}
	}
}


/**
 * ---------------------------------------------------------------------------------------------------------------------
 *
 * Evaluates the properties for a match against the criteria as defined
 * in json_criteria, to decide which Form Entry Point should be called.
 * 
 * @param {String} Stringified JSON object containing array of Form specific details and information
 * @param {String} Stringified JSON object containing array of criteria to match the properties agains
 * @param {object} Properties from the inbound message paylaod to match against jsonCriteria
 * 
 * @returns {object} Form and URL information related to the target to call based on matching properties with criteria
 * 
 * ---------------------------------------------------------------------------------------------------------------------
 */
var resolveForm = function(jsonFormInfo, jsonCriteria, properties) {
    var funcName = "util.resolveForm";
    console.log("Enter " + funcName);

	// Convert the jsonCriteria string to a JavaScript object
	var criteria = convertAndVerifyCriteria(jsonCriteria);
	if (null === criteria) return null;

 	// Convert the formInfo string to a JavaScript object
	var formInfo = convertAndVerifyFormInfo(jsonFormInfo);
	if (null === formInfo) return null;
	
	// Pull out the default url in case we do not find a match.
	// The defaultURL is in the 0th position of the array.
	var aFormInfoData = findFormInfo(formInfo, criteria[0].defaultForm);
	if (null === aFormInfoData) return null;

    // Construct the default formData	
	var formData = {};
	formData.formURL = aFormInfoData.triggerURL;
	formData.formName = aFormInfoData.formName;
	// Get the response options
	var responseOptions = getResponseOptions(aFormInfoData.planName, aFormInfoData.formName);
	formData.userResponseOptions = getResponseOptionIds(responseOptions, aFormInfoData.userResponseOptions);
	formData.groupResponseOptions = getResponseOptionIds(responseOptions, aFormInfoData.groupResponseOptions);
	// Setup the bridge info
	copyBridgeDetails(formData, criteria[0]);

	// Now, go through the remaining criteria until we have a match
	for (var i = 1; i < criteria.length; i++) {
	
		// First validate that the criteria is structurally
		var isValid = criteriaIsValid(criteria, i);
		if (isValid) {

			// Look for a match between the criteria and the properties
			var numProps = 0, matchedProps = 0;
			for (var cp in criteria[i].properties) {
				++numProps;
				if (typeof properties[cp] !== "undefined" &&
					properties[cp] === criteria[i].properties[cp]) {
					++matchedProps;
					console.log(funcName + ' - DEBUG - property "' + cp + '" at criteria position ' + i + ' matched.');
				} else {
					console.log(funcName + ' - DEBUG - property "' + cp + '" at criteria position ' + i + ' did not matched.  Stopping search for this set of criteria.');
					break;
				}
			}
			
			// If we found a match, setup the formData
			if (numProps > 0 && numProps === matchedProps) {
			    // Get the corresponding form info block
		    	aFormInfoData = findFormInfo(formInfo, criteria[i].form);
            	if (null !== aFormInfoData) {
            	    // Get the response options
                	formData.formURL = aFormInfoData.triggerURL;
                	formData.formName = aFormInfoData.formName;
                	responseOptions = getResponseOptions(aFormInfoData.planName, aFormInfoData.formName);
                	formData.userResponseOptions = getResponseOptionIds(responseOptions, aFormInfoData.userResponseOptions);
                	formData.groupResponseOptions = getResponseOptionIds(responseOptions, aFormInfoData.groupResponseOptions);
                	// Setup the bridge info
                	copyBridgeDetails(formData, criteria[i]);
					break;
            	}
			}
		}
	}
	
    console.log("Exit " + funcName + " - formData: " + JSON.stringify(formData,null,4));
	return formData;
};
exports.resolveForm = resolveForm;


/**
 * ---------------------------------------------------------------------------------------------------------------------
 * 
 * Convert the jsonCriteria string to a JavaScript object
 * 
 * @param {String} JSON version of Criteria array.
 * 
 * @returns {object}[] Criteria array, or null if there were problems.
 * 
 * ---------------------------------------------------------------------------------------------------------------------
 */
function convertAndVerifyCriteria(jsonCriteria) {
	var funcName = "util.convertAndVerifyCriteria";
	// Convert the jsonCriteria string to a JavaScript object
	var criteria = null;
	try {
	    // Should parse cleanly
		criteria = JSON.parse(jsonCriteria);
		console.log(funcName + ' - jsonCriteria: ' + JSON.stringify(criteria));
		
		// Need to have at least one criteria defined
		if (criteria.length === 0) {
			console.log(funcName + ' - FATAL - jsonCriteria is empty.');
			throw funcName + ' - FATAL - jsonCriteria is empty.';
		
		// 0th Criteria needs to have a defaultForm referencing the position of a FormInfo object
		} else if (typeof criteria[0].defaultForm === "undefined" ||
		           (typeof criteria[0].defaultForm !== "number" && typeof criteria[0].defaultForm !== "string") ||
		           (typeof criteria[0].defaultForm === "string" && criteria[0].defaultForm.length === 0)) {
			throw funcName + ' - FATAL - jsonCriteria the field "defaultForm" in the 0th position is either missing or empty. (typeof='+(typeof criteria[0].defaultForm)+')';
		} else {
		    var msg = validateBridgeInfo(criteria, 0);
		    if (null !== msg) throw msg;
		}
	} catch (e) {
	    console.log('FATAL - ' + e);
	    return null;
	}
	return criteria;
}


/**
Make sure we have the right properties defined.
    hasBridge: {boolean} true | false
        IF "hasBridge" is true
            useExisting: {boolean} true | false
                IF "useExisting" is true
                    existingEventPropFieldName: {string} "eventId" | "<arbitrary-event-property-name>"
                    existingEventValueFieldName: {string} "<field-name-in-source-properties-with-existingEventPropFieldName-value>"
            type: {string} "EXTERNAL" | "BRIDGE"
                IF "EXTERNAL"
                    subType: {string} "STATIC" | "DYNAMIC"
                    bridgeId: {string} "Name of pre-defined 3rd-party Conference Bridge object"
                    IF "subType" is "DYNAMIC"
                        bridgeNumber: {string} "digits representing bridge number"
                    dialAfter: {string} (Optional) "digits or characters to dial after the bridgeNumber"
                        
                IF "BRIDGE"
                    No other properties are required.
                    IF "useExisting" is true
                        bridgeId: Will be resolved at run-time
            
**/
function validateBridgeInfo(criteria, i) {
    var funcName = "validateBridgeInfo";
    var msg = null;
    
    // does "hasBridge" exist
    if (typeof criteria[i].hasBridge === "undefined") {
		msg = funcName + ' - jsonCriteria the field "hasBridge" in position ' + i + ' is either missing or empty.';

	} else if (criteria[i].hasBridge) {
	    
	    // Validate useExisting, existingEventPropFieldName, and existingEventValueFieldName
		if (typeof criteria[i].useExisting !== "boolean") {
			msg = funcName + ' - jsonCriteria the field "useExisting" in position ' + i + ' is missing or not boolean.';
		} else if (criteria[i].useExisting && (typeof criteria[i].existingEventPropFieldName !== "string" || criteria[i].existingEventPropFieldName.length <= 0)) {
			    msg = funcName + ' - jsonCriteria the field "useExisting" is true, but the field "existingEventPropFieldName" in position ' + i + ' is missing.';
		} else if (criteria[i].useExisting && (typeof criteria[i].existingEventValueFieldName !== "string" || criteria[i].existingEventValueFieldName.length <= 0)) {
			    msg = funcName + ' - jsonCriteria the field "useExisting" is true, but the field "existingEventValueFieldName" in position ' + i + ' is missing.';

        // Validate type
	    } else if (typeof criteria[i].type === "undefined" || 
	        (criteria[i].type !== "EXTERNAL" && 
	         criteria[i].type !== "BRIDGE")) {
    		msg = funcName + ' - jsonCriteria the field "hasBridge" is true, but "type" in the position ' + i + ' is missing or invalid (s/b EXTERNAL or BRIDGE).';

        // type:"EXTERNAL" specific validations 
        // (need subType, optionally dialAfter, and if not useExisting we need a bridgeId, and bridgeNumber if DYNAMIC)
        } else if (criteria[i].type === "EXTERNAL") {
            
            // Need subType
            if ((typeof criteria[i].subType !== "string") ||
                ((criteria[i].subType !== "STATIC") && (criteria[i].subType !== "DYNAMIC"))) {
    			msg = funcName + ' - jsonCriteria the field "subType" is missing or invalid (s/b STATIC or DYNAMIC) in position ' + i + '.';

    		// Optionally dialAfter (if present s/b a string)
    		} else if (typeof criteria[i].dialAfter !== "undefined" && typeof criteria[i].dialAfter !== "string") {
    			msg = funcName + ' - jsonCriteria the field "dialAfter" in position ' + i + ' is present but the wrong type (s/b a string).';

            // Need bridgeId, and bridgeNumber if subType is DYNAMIC
    		} else if (typeof criteria[i].bridgeId !== "string" || criteria[i].bridgeId.length <= 0) {
    			msg = funcName + ' - jsonCriteria the field "bridgeId" in position ' + i + ' is missing.';
    		} else if ((criteria[i].subType === "DYNAMIC") && (typeof criteria[i].bridgeNumber === "undefined")) {
    			msg = funcName + ' - jsonCriteria the field "bridgeNumber" in position ' + i + ' is missing.';
    		}
    		
    	// type:"BRIDGE" specific validations
        } else { 
            // none at this time.
        }
	}
    return msg;
}


function criteriaIsValid(criteria, i) {
	var isValid = false;
	// First validate that the criteria is structurally
	if (typeof criteria[i].form === "undefined" ||
		(typeof criteria[i].form !== "number" && typeof criteria[i].form !== "string") ||
		(typeof criteria[i].form === "string" && criteria[i].defaultForm.length === 0)) {
		console.log(funcName + ' - ERROR - "form" field is missing from json_criteria at position ' + i);
	} else if (typeof criteria[i].properties === "undefined") {
		console.log(funcName + ' - ERROR - "properties" field is missing from json_criteria at position ' + i);
	} else {
	    var msg = validateBridgeInfo(criteria, i);
	    if (null === msg) {
	        isValid = true;
	    } else {
	        console.log(msg);
	    }
	}
	return isValid;
}


/**
 * ---------------------------------------------------------------------------------------------------------------------
 * 
 * Convert the formInfo string to a JavaScript object
 * Fields are: pos(number), formName(string), userResponseOptions(string), groupResponseOptions(string), triggerURL(string), URLUser(string)
 * 
 * @param {String} JSON version of Form Info array.
 * 
 * @returns {object}[] Form Info array, or null if there were problems.
 * 
 * ---------------------------------------------------------------------------------------------------------------------
 */
function convertAndVerifyFormInfo(jsonFormInfo) {
	var funcName = "util.convertAndVerifyFormInfo";
 	// Convert the formInfo string to a JavaScript object
    // 
	var formInfo = null;
	try {
		formInfo = JSON.parse(jsonFormInfo);
		console.log(funcName + ' - jsonFormInfo: ' + JSON.stringify(formInfo));
		if (formInfo.length === 0) {
			throw funcName + ' - FATAL - jsonFormInfo is empty.';
		} else {
		    for (var fi in formInfo) {
        		if (typeof formInfo[fi].pos === "undefined" || typeof formInfo[fi].pos !== "number") {
        			throw funcName + ' - FATAL - jsonFormInfo - The field "pos" in array element [' + fi + '] is either missing or not a number. (typeof formInfo[fi].pos = "' + (typeof formInfo[fi].pos) + '")';
        		} else if (typeof formInfo[fi].planName === "undefined" || typeof formInfo[fi].planName !== "string" || formInfo[fi].planName.length === 0) {
        			throw funcName + ' - FATAL - jsonFormInfo - The field "planName" in array element [' + fi + '] is either missing, not a string, or empty.';
        		} else if (typeof formInfo[fi].formName === "undefined" || typeof formInfo[fi].formName !== "string" || formInfo[fi].formName.length === 0) {
        			throw funcName + ' - FATAL - jsonFormInfo - The field "formName" in array element [' + fi + '] is either missing, not a string, or empty.';
        		} else if (typeof formInfo[fi].userResponseOptions === "undefined" || typeof formInfo[fi].userResponseOptions !== "string" || formInfo[fi].userResponseOptions.length === 0) {
        			throw funcName + ' - FATAL - jsonFormInfo - The field "userResponseOptions" in array element [' + fi + '] is either missing, not a string, or empty.';
        		} else if (typeof formInfo[fi].groupResponseOptions === "undefined" || typeof formInfo[fi].groupResponseOptions !== "string" || formInfo[fi].groupResponseOptions.length === 0) {
        			throw funcName + ' - FATAL - jsonFormInfo - The field "groupResponseOptions" in array element [' + fi + '] is either missing, not a string, or empty.';
        		} else if (typeof formInfo[fi].triggerURL === "undefined" || typeof formInfo[fi].triggerURL !== "string" || formInfo[fi].triggerURL.length === 0) {
        			throw funcName + ' - FATAL - jsonFormInfo - The field "triggerURL" in array element [' + fi + '] is either missing, not a string, or empty.';
        		} else if (typeof formInfo[fi].URLUser === "undefined" || typeof formInfo[fi].URLUser !== "string" || formInfo[fi].URLUser.length === 0) {
        			throw funcName + ' - FATAL - jsonFormInfo - The field "URLUser" in array element [' + fi + '] is either missing, not a string, or empty.';
           		}
		    }
		}
	} catch (e) {
	    console.log(e);
	    return null;
	}
	return formInfo;
}


/**
 * ---------------------------------------------------------------------------------------------------------------------
 * 
 * Searches for the corresponding formInfo entry based on position or Form name.
 * 
 * @param {object}[] Form info object array
 * @param {String} or {number} containing the element identifier to return
 * 
 * @returns {object} Form Info element matching the posOrName.
 *   Returns null if not found.
 * 
 * ---------------------------------------------------------------------------------------------------------------------
 */
function findFormInfo(formInfo, posOrName) {
	var funcName = "findFormInfo";
    if (typeof posOrName === "number") {
        if (posOrName >= 0 && posOrName < formInfo.length) {
            return formInfo[posOrName];
        }
    } else {
        for (var i in formInfo) {
            if (posOrName.trim().equalsIgnoreCase(formInfo[i].formName.trim())) {
                return formInfo[i];
            }
        }
    }

	var msg = funcName + ' - FATAL - Unable to find Form Info corresponding to the specified Form in the Criteria '
	if (typeof posOrName === "number") {
		msg += 'at position ' + posOrName;
	} else {
		msg += 'with name ' + posOrName;
	}
	console.log(msg);

    return null;
}


/**
 * ---------------------------------------------------------------------------------------------------------------------
 * 
 * Given a planName and formName, returns the array of response options.
 * 
 * @param {String} Name of an existing Communication Plan in the xMatters environment.
 * @param {String} Name of an existing Form in the above mentioned Communication Plan.
 * 
 * @returns {object}[] Contains the array of response options for the matching form.  
 *   Empty array returned if not found, or if there are simply no response options defined.
 * 
 * ---------------------------------------------------------------------------------------------------------------------
 */
var getResponseOptions = function(planName, formName) {
    var funcName = "util.getResponseOptions";
    console.log("Enter " + funcName + " - planName: " + planName + ", formName: " + formName);
    var responseOptions = [];
    
    var response = callxMatters(
        'GET',
        '/api/xm/1/plans/' + encodeURIComponent(planName) + '/forms?embed=responseOptions'
        );

    if (isValidStatusCode(response.statusCode)) {
        var body = JSON.parse(response.body);
        console.log(funcName + ' - body.total: ' + body.total + ', body.count: ' + body.count);
        for (var f in body.data) {
            if (formName.equalsIgnoreCase(body.data[f].name) &&
                (body.data[f].responseOptions.count > 0)) {
                responseOptions = body.data[f].responseOptions.data;
                break;
            }
        }
    }
    
    console.log("Exit " + funcName + " - responseOptions: " + JSON.stringify(responseOptions,null,4));
    return responseOptions;
};
exports.geResponseOptions = getResponseOptions;


/**
 * ---------------------------------------------------------------------------------------------------------------------
 * 
 * Takes an array of response option text and returns a corresponding array of Response Option IDs suitable for use
 * in calls to trigger an event via the xM API.
 * 
 * @param {object}[] Response Option details for the associated form as returned by a call to
 *   GET /plans/{id}/forms?embed=responseOptions (specifically the responseOptions.data field)
 * @param {String} Comma separated list of values that match the start of (if not the whole value) of the 
 *   text in the Response column as defined in the Form (e.g. "Accept,Ignore,Comment,Resolve").
 *   Note: The order is the order that the response options will be set to in the outbound notification.
 * 
 * @returns {String}[] Contains the IDs matching the response options in a format sutable for use in trigger event
 * 
 * ---------------------------------------------------------------------------------------------------------------------
 */
var getResponseOptionIds = function(formResponseOptions, responseOptionText) {
    var funcName = "util.getResponseOptionIds";
    console.log("Enter " + funcName + " - responseOptionText: " + responseOptionText);
    var responseOptionIds = [];
    responseOptionTexts = responseOptionText.toLowerCase().split(",");
    for (var t in responseOptionTexts) {
        for (var o in formResponseOptions) {
            ro = formResponseOptions[o];
            if (ro.text.trim().toLowerCase().indexOf(responseOptionTexts[t].trim()) === 0) {
                responseOptionIds.push({"id":ro.id});
            }
        }
    }
    console.log("Exit " + funcName + " - responseOptionIds: " + JSON.stringify(responseOptionIds,null,4));
    return responseOptionIds;
};
exports.getResponseOptionIds = getResponseOptionIds;


/**
 * ---------------------------------------------------------------------------------------------------------------------
 * 
 * Checks for the presence of the required constants, and if not there, throws an exception
 * 
 * @param {String} Comma separated list of Constant names that should exist in the current Communication Plan.
 * 
 * @throws - Exception naming missingn constants. (And puts them in the Activity Stream via console.log())
 * 
 * ---------------------------------------------------------------------------------------------------------------------
 */
var verifyConstants = function(requiredConstants) {
    var missingConstants = [];
    var rcNames = requiredConstants.split(",");
    for (var rc in rcNames) {
        var rcName = rcNames[rc];
        if ((typeof constants[rcName] === "undefined") ||
            (constants[rcName] === null) ||
            (constants[rcName].length === 0)) {
            missingConstants.push(rcName);
        }
    }
    if (missingConstants.length > 0) {
        var msg = "util.verifyConstants - The following required constants are missing: " + missingConstants.join();
        console.log(msg);
        throw(msg);
    }
}
exports.verifyConstants = verifyConstants;
