/**
 * ---------------------------------------------------------------------------------------------------------------------
 * 
 * Shared library containing functions to use to make calls into
 * Remedy via REST.
 *
 * To use this shared library in another script, include the following 
 * 'require' function statement in your Integration Builder script.
 *
 *  var remedyRest = require('Remedy Rest Util');
 *  var token = remedyRest.generateRemedyApiToken(  );
 *
 * Required Constants (to be defined in the "requiring" Comm Plan)
 *   REMEDY_OPT_ADD_JSON_HEADER - If true, include the "Conent-Type: application/json" HTTP request header
 *     Note: This should be false if scripts are running in the xMatters Agent
 *   REMEDY_OPT_MOCK_ENABLED [OPTIONAL] - If "true", then export the mocked functions and variables.
 *   REMEDY_OPT_SIMPLE_GROUP_NAME - If true, construct group name as just Assigned_Group vs Support Company*Support Organization*Assigned_Group
 *   REMEDY_ENDPOINT - The name of the xMatters endpoint object to use for calls to Remedy
 *   REMEDY_NOTE_PREFIX - String that goes infront of all Work Info notes
 *   REMEDY_WS_USERNAME - Login ID of the Remedy User that will be making API calls
 *   REMEDY_WS_PASSWORD - Remedy API users encrypted password (as produced by the iapassword utility)
 * 
 * Required Shared Libraries (to be included in this Comm Plan):
 *  Remedy Rest Util Mocked [Optional] - If present, and mock-mode is enabled, will override functions with these versions.
 *
 * Hisory
 *  Version: 1.1 (2018-11-25)
 *
 * ---------------------------------------------------------------------------------------------------------------------
 */

/**
 * Local constants
 */
var REMEDY_INCIDENT_ACTION_MODIFY = "MODIFY";
var REMEDY_WORK_INFO_LOCKED = 'Yes';
var REMEDY_WORK_INFO_TYPE = 'Working Log';
var REMEDY_WORK_INFO_VIEW_ACCESS = 'Internal';
var REMEDY_WORK_INFO_MAX_LENGTH = 100;


/**
 * ---------------------------------------------------------------------------------------------------------------------
 * 
 * Create a new Remedy Incident.
 *
 * @param {string} the jwt token
 * @param {object} the Remedy Values object
 * 
 * @returns {object} the response object (responseCode of 201 represents success)
 *   If a 201 is returned, the Location header will contain the URL to the newly
 *   created Incident
 * 
 * ---------------------------------------------------------------------------------------------------------------------
 */
function createRemedyIncident(jwt, values) {
	var funcName = "createRemedyIncident";
    console.log("Enter " + funcName + " - values: " + JSON.stringify(values,null,4));

    // Send request to Remedy
    var response = callRemedy(jwt, "POST", "/api/arsys/v1/entry/HPD%3AIncidentInterface_Create", true, values);

    // console.log("Exit " + funcName + " - Repsonse: " + JSON.stringify(response,null,4));
    return response;
}


/**
 * ---------------------------------------------------------------------------------------------------------------------
 * 
 * Modify an existing Remedy Incident.
 *
 * @param {string} the jwt token
 * @param {string} Request ID
 * @param {object} the Remedy Values object
 * 
 * @returns {object} the response object (responseCode of 201 or 204 represent success)
 * 
 * ---------------------------------------------------------------------------------------------------------------------
 */
function modifyRemedyIncident(jwt, requestId, values) {
	var funcName = "modifyRemedyIncident";
    console.log("Enter " + funcName + " - requestId: " + requestId + ", values: " + JSON.stringify(values,null,4));
    
    // Send request to Remedy
    var path = "/api/arsys/v1/entry/HPD%3AIncidentInterface/" + requestId;
    var response = callRemedy(jwt, "PUT", path, true, values);

    // console.log("Exit " + funcName + " - Repsonse: " + JSON.stringify(response,null,4));
    return response;
}


/**
 * ---------------------------------------------------------------------------------------------------------------------
 * 
 * Add a Work Info entry to an Incident.
 *
 * @param {string} the jwt token
 * @param {string} Request ID
 * @param {string} the work note
 * 
 * @returns {object} the response object (responseCode of 204 represents success)
 * 
 * ---------------------------------------------------------------------------------------------------------------------
 */
function addRemedyIncidentWorkInfo(jwt, requestId, workNote) {
	var funcName = "addRemedyIncidentWorkInfo";
    console.log("Enter " + funcName + " - requestId: " + requestId + ", workNote: " + workNote);

    // Prepare the values object    
    var details = constants.REMEDY_NOTE_PREFIX + " " + workNote;
    var values = {
        "values": {
            "z1D Action": REMEDY_INCIDENT_ACTION_MODIFY,
            "z1D_Activity_Type": REMEDY_WORK_INFO_TYPE,
            "z1D_Secure_Log": REMEDY_WORK_INFO_LOCKED,
            "z1D_View_Access": REMEDY_WORK_INFO_VIEW_ACCESS,
            "z1D_WorklogDetails": details.substring(0, REMEDY_WORK_INFO_MAX_LENGTH)
            }
        };

    // Modify the incident
    var response = modifyRemedyIncident(jwt, requestId, values);

    // console.log("Exit " + funcName + " - Repsonse: " + JSON.stringify(response,null,4));
    return response;
}


/**
 * ---------------------------------------------------------------------------------------------------------------------
 * 
 * Add a Work Info entry to an Incident, and specifies the Incident Number in the payload.
 *
 * @param {string} the jwt token
 * @param {string} Request ID
 * @param {string} Incident Number
 * @param {string} the work note
 * 
 * @returns {object} the response object (responseCode of 204 represents success)
 * 
 * ---------------------------------------------------------------------------------------------------------------------
 */
function addWorkInfoToRemedyIncident(jwt, requestId, incidentId, workNote) {
	var funcName = "addRemedyIncidentWorkInfo";
    console.log("Enter " + funcName + " - requestId: " + requestId + ", incidentId: " + incidentId + ", workNote: " + workNote);

    // Prepare the values object  
    var details = constants.REMEDY_NOTE_PREFIX + " " + workNote;
    var values = {
        "values": {
            "Incident Number": incidentId,
            "z1D Action": REMEDY_INCIDENT_ACTION_MODIFY,
            "z1D_Activity_Type": REMEDY_WORK_INFO_TYPE,
            "z1D_Secure_Log": REMEDY_WORK_INFO_LOCKED,
            "z1D_View_Access": REMEDY_WORK_INFO_VIEW_ACCESS,
            "z1D_WorklogDetails": details.substring(0, REMEDY_WORK_INFO_MAX_LENGTH)
            }
        };

    // Modify the incident
    var response = modifyRemedyIncident(jwt, requestId, values);

    // console.log("Exit " + funcName + " - Repsonse: " + JSON.stringify(response,null,4));
    return response;
}


/**
 * ---------------------------------------------------------------------------------------------------------------------
 * 
 * Retrieve request ID from a Location header.
 *
 * @param {String} the Location header element returned from a successful call to createRemedyIncident
 * 
 * @returns {object} the incident
 * 
 * ---------------------------------------------------------------------------------------------------------------------
 */
function retrieveRequestIdByLocation(Location) {
    // Parse the path from the Location
    var locationParts = Location.split("/");
    return locationParts[locationParts.length-1];
}


/**
 * ---------------------------------------------------------------------------------------------------------------------
 * 
 * Retrieve an Incident via Request ID.
 *
 * @param {string} the jwt token
 * @param {string} Request ID
 * @param {String} [optional] String containing comma delimited list of field labels to return
 * 
 * @returns {object} the incident
 * 
 * ---------------------------------------------------------------------------------------------------------------------
 */
function retrieveRemedyIncident(jwt, requestId, fields) {
	var funcName = "retrieveRemedyIncident";
    console.log("Enter " + funcName + " - Request ID: " + requestId);

    // Construct the path
    var path = '/api/arsys/v1/entry/HPD%3AIncidentInterface/' + requestId;
    if ((typeof fields === 'string') && (fields.length > 0)) {
        path += '?fields=values(';
        var fArray = fields.split(",");
        for (var f = 0;f < fArray.length;++f) {
            if (f > 0) path += ",";
            path += encodeURIComponent(fArray[f]);
        }
        path += ')';
    }
    console.log(funcName + " - path: " + path);

    // Send request to Remedy
    var response = callRemedy(jwt, "GET", path, false);

    // Verify that a 200 was returned (success)
    var entry = null;
    if (200 === response.statusCode) {
        // See if an entry was returned
        var remResult = JSON.parse(response.body);
        if ((typeof remResult.entries !== "undefined") && (remResult.entries.length > 0)) {
            entry = remResult.entries[0];
        }
    }

    console.log("Exit " + funcName + " - Entry is " + ((null === entry)?"null":"not null"));
    return entry;
}


/**
 * ---------------------------------------------------------------------------------------------------------------------
 * 
 * Retrieve an Incident via Location.
 *
 * @param {string} the jwt token
 * @param {String} the Location header element returned from a successful call to createRemedyIncident
 * 
 * @returns {object} the incident
 * 
 * ---------------------------------------------------------------------------------------------------------------------
 */
function retrieveRemedyIncidentByLocation(jwt, Location) {
	var funcName = "retrieveRemedyIncidentByLocation";
    console.log("Enter " + funcName + " - Location: " + Location);

    // Parse the path from the Location
    var locationParts = Location.split(":");
    var path = locationParts[2].substring(4);
    if (locationParts.length > 3) {
        path = path + ":" + locationParts[3];
    }
    console.log("retrieveRemedyIncidentByLocation - path: " + path);
    
    // Send request to Remedy
    var response = callRemedy(jwt, "GET", path);
    // console.log(funcName + " - REMEDY REST API: received " + JSON.stringify(response,null,4));
    
    // Verify that a 200 was returned (success)
    var entry = null;
    if (200 === response.statusCode) {
        // See if an entry was returned
        entry = JSON.parse(response.body);
    }

    console.log("Exit " + funcName + " - Entry is " + ((null === entry)?"null":"not null"));
    return entry;
}


/**
 * ---------------------------------------------------------------------------------------------------------------------
 * 
 * Retrieve an Incident via a field name and value.
 *
 * @param {string} the jwt token
 * @param {string} field name
 * @param {String} field value
 * @param {String} [optional] String containing comma delimited list of field labels to return
 * 
 * @returns {object} the incident
 * 
 * ---------------------------------------------------------------------------------------------------------------------
 */
function retrieveRemedyIncidentByField(jwt, fieldName, fieldValue, fields) {
	var funcName = "retrieveRemedyIncidentByField";
    console.log("Enter " + funcName + " - fieldName: " + fieldName + ", fieldValue: " + fieldValue);

    // Construct the path
    var path = '/api/arsys/v1/entry/HPD%3AIncidentInterface?q=%27' +
        encodeURIComponent(fieldName) +
        '%27%3D%22' + 
        encodeURIComponent(fieldValue) + '%22';
    if ((typeof fields === 'string') && (fields.length > 0)) {
        path += '&fields=' + encodeURIComponent('(' + fields + ')');
    }
    console.log("retrieveRemedyIncidentByField - path: " + path);

    // Send request to Remedy
    var response = callRemedy(jwt, "GET", path, false);
    // console.log(funcName + " - REMEDY REST API: received " + JSON.stringify(response,null,4));

    // Verify that a 200 was returned (success)
    var entry = null;
    if (200 === response.statusCode) {
        // See if an entry was returned
        var remResult = JSON.parse(response.body);
        if ((typeof remResult.entries !== "undefined") && (remResult.entries.length > 0)) {
            entry = remResult.entries[0];
        }
    }

    console.log("Exit " + funcName + " - Entry is " + ((null === entry)?"null":"not null"));
    return entry;
}


/**
 * ---------------------------------------------------------------------------------------------------------------------
 * 
 * Retrieve an Incident via Request ID.
 *
 * @param {string} the jwt token
 * @param {String} the Request ID
 * @param {String} [optional] String containing comma delimited list of field labels to return
 * 
 * @returns {object} the incident
 * 
 * ---------------------------------------------------------------------------------------------------------------------
 */
function retrieveRemedyIncidentByRequestId(jwt, requestId, fields) {
	var funcName = "retrieveRemedyIncidentByRequestId";
    console.log("Enter " + funcName + " - Request ID: " + requestId);

    // Request the Incident details
    var entry = retrieveRemedyIncident(jwt, requestId, fields);

    console.log("Exit " + funcName + " - Entry is " + ((null === entry)?"null":"not null"));
    return entry;
}


/**
 * ---------------------------------------------------------------------------------------------------------------------
 * 
 * Retrieve an Incident via Incident Number.
 *
 * @param {string} the jwt token
 * @param {String} the Incident Number
 * @param {String} [optional] String containing comma delimited list of field labels to return
 * 
 * @returns {object} the incident
 * 
 * ---------------------------------------------------------------------------------------------------------------------
 */
function retrieveRemedyIncidentByIncidentNumber(jwt, incidentNumber, fields) {
	var funcName = "retrieveRemedyIncidentByIncidentNumber";
    console.log("Enter " + funcName + " - incidentNumber: " + incidentNumber);
    
    // Request the Incident details
    var entry = retrieveRemedyIncidentByField(jwt, "Incident Number", incidentNumber, fields);

    console.log("Exit " + funcName + " - Entry is " + ((null === entry)?"null":"not null"));
    return entry;
}


/**
 * ---------------------------------------------------------------------------------------------------------------------
 * 
 * Retrieve request ID from an incident via Incident_Number.
 *
 * @param {string} the jwt token
 * @param {String} the Incident Number
 * 
 * @returns {String} the Request ID
 * 
 * ---------------------------------------------------------------------------------------------------------------------
 */
function retrieveRequestId(jwt, incidentNumber) {
	var funcName = "retrieveRequestId";
    console.log("Enter " + funcName + " - incidentNumber: " + incidentNumber);

    var requestId = null;

    // Get the Incident
    var incident = retrieveRemedyIncidentByIncidentNumber(jwt, incidentNumber, "Incident Number,Request ID");
    if (null !== incident) {
        requestId = incident.values["Request ID"];
    } else {
        console.log(funcName + " - Could not find an incident in Remedy with Incident Number=" + incidentNumber);

    }
    console.log("Exit " + funcName + " - requestId: " + requestId);
    
    return requestId;
}


/**
 * ---------------------------------------------------------------------------------------------------------------------
 * 
 * Retrieve Support Group Associations via the XM:SupportGrp_SupportGrpAssoci_join_form.
 *
 * @param {string} the jwt token
 * @param {string} Assignee_Login_ID
 * @param {String} Assigned_Support_Company
 * @param {String} Assigned_Support_Organization
 * @param {String} Assigned_Group
 * 
 * @returns {object}[] Array of XM:SupportGrp_SupportGrpAssoci_join_form records that matched the criteria.
 * 
 * ---------------------------------------------------------------------------------------------------------------------
 */
function retrieveRemedySupportGrpAssoc(jwt, Assignee_Login_ID, Assigned_Support_Company, Assigned_Support_Organization, Assigned_Group) {
    var funcName = "retrieveRemedySupportGrpAssoc";
    console.log("Enter " + funcName + " - Assignee_Login_ID: " + Assignee_Login_ID + ", Assigned_Support_Company: " + Assigned_Support_Company + ", Assigned_Support_Organization: " + Assigned_Support_Organization + ", Assigned_Group: " + Assigned_Group);

    // Construct the path
    var path = [];
    path.push('/api/arsys/v1/entry/XM:SupportGrp_SupportGrpAssoci_join_form?q=');
    path.push( makeCondition('Login ID', Assignee_Login_ID) );
    path.push('%20AND%20');
    path.push('((');
    path.push( makeCondition('Company', Assigned_Support_Company) );
    path.push('%20AND%20');
    path.push( makeCondition('Support Organization', Assigned_Support_Organization) );
    path.push('%20AND%20');
    path.push( makeCondition('Support Group Name', Assigned_Group) );
    path.push(')%20OR%20');
    path.push( makeCondition('Default', 'Yes') );
    path.push(')');
    path = path.join('');
    console.log("retrieveRemedySupportGrpAssoc - path: " + path);

    var response = callRemedy(jwt, "GET", path, false);

    // Verify that a 200 was returned (success)
    var results = null;
    if (200 === response.statusCode) {
        // See if an entry was returned
        var remResult = JSON.parse(response.body);
        if ((typeof remResult.entries !== "undefined") && (remResult.entries.length > 0)) {
            results = remResult.entries;
        }
    }

    console.log("Exit " + funcName + " - results is " + (null === results)?"null":"not null");
    return results;
}


/**
 * ---------------------------------------------------------------------------------------------------------------------
 * 
 * In order to use the Remedy API, we need a JWT.
 * 
 * Uses these constants:
 *   REMEDY_ENDPOINT
 *   REMEDY_WS_PASSWORD
 *   REMEDY_WS_USERNAME
 *
 * @returns {string} the jwt
 * 
 * ---------------------------------------------------------------------------------------------------------------------
*/
function generateRemedyApiToken( ) {
    var funcName = "generateRemedyApiToken";
    console.log("Enter " + funcName);
    
    // Get the password
    var remPw = decryptPW(constants.REMEDY_WS_PASSWORD);
    if (null === remPw) {
        console.log(funcName + ' - could not resolve password');
        return null;
    }
    
    // Prepare the request object to get the JWT token
    var requestObj = {
        'endpoint': constants.REMEDY_ENDPOINT,
        'method': 'POST',
        'path': 'api/jwt/login'
    };
    var headers = {
        "Content-Type":"application/x-www-form-urlencoded",
        "Accept": "*/*"
        };
    requestObj.headers = headers;

    // Create the request
    var request = http.request(requestObj);

    // Setup the authentication payload
    var payload = "username=" + constants.REMEDY_WS_USERNAME + "&password=" + remPw;
    
    var response = request.write( payload );

    console.log("Exit " + funcName);
    return response.body;
}


/**
 * ---------------------------------------------------------------------------------------------------------------------
 * 
 * Once we get a JWT from Remedy we need to package it in the header
 * for subsequent requests to make API calls.
 *
 * @param {string} the jwt
 * 
 * @returns {object} Properly formed Remedy REST header with JWT
 * 
 * ---------------------------------------------------------------------------------------------------------------------
 */
function generateHeaderForApiRequest(jwt) {
    var funcName = "generateHeaderForApiRequest";
    console.log("Enter " + funcName);

    if (jwt === null || jwt.length === 0) {
        jwt = generateRemedyApiToken();
    }

    var headers = {
        "Authorization": "AR-JWT " + jwt/*,
        "Accept": 'application/json'*/
    };
    // Add the content type header if required
    if ("true".equalsIgnoreCase(constants.OPT_ADD_JSON_HEADER)) {
        headers["Content-Type"] = 'application/json';
    }

    console.log("Exit " + funcName);
    return headers;
}


/**
 * ---------------------------------------------------------------------------------------------------------------------
 * 
 * Logout the jwt.
 *
 * @params {string} the jwt
 * 
 * @returns {object} response;
 * 
 * ---------------------------------------------------------------------------------------------------------------------
 */
function logoutRemedyApiToken(jwt) {
    var funcName = "logoutRemedyApiToken";
    console.log("Enter " + funcName);

    // Perform the logout
    var response = callRemedy(jwt, "POST", "api/jwt/logout");

    console.log("Exit " + funcName);
    return response;
}


/**
 * ---------------------------------------------------------------------------------------------------------------------
 *
 * Builds and returns the name of the associated group in xMatters which is based on several fields in the 
 * Remedy Support Group descriptiong
 * 
 * @param {String} Remedy Company value
 * @param {String} Remedy Support Organization value
 * @param {String} Remedy Support Group name value
 * 
 * @returns {String} xMatters Group Name
 *
 * ---------------------------------------------------------------------------------------------------------------------
 */
function buildXmattersGroupName(company, organization, groupName) {

    // The group name in xMatters in a concatenation of the Remedy  company, support organization and support group,
    // separated by this character
    var builtGroup = "";
    if (constants.REMEDY_OPT_SIMPLE_GROUP_NAME.equalsIgnoreCase("true")) {
        builtGroup = groupName;
    } else {
        var GROUP_NAME_DELIMITER_TOKEN = "*";
        builtGroup = company + GROUP_NAME_DELIMITER_TOKEN + organization + GROUP_NAME_DELIMITER_TOKEN + groupName;
    }
    
    return builtGroup;
}


/**
 * ---------------------------------------------------------------------------------------------------------------------
 * 
 * Construct a Remedy Link based on Entry ID (no search or home, just the ticket)
 * Thanks to: http://depressedpress.com/2016/05/20/create-a-link-to-a-remedy-ticket/
 * 
 * @param {String} The Remedy instance FQDN including protocol (e.g. http://myremedy.mycompany.com:8080)
 * @param {String} The Remedy AR Servers name (e.g. myremedy)
 * @param {String} Remedy ticket Entry ID to base the link on
 * 
 * @returns {String} A clickable link to the associdated form in Remedy with the specified record loaded.
 * 
 * ---------------------------------------------------------------------------------------------------------------------
 */
function constructTicketLink(serverAddress, serverName, entryId) {
    var funcName = "constructTicketLink";
    console.log("Enter " + funcName + " - entryId: " + entryId);
 
    // Get the Ticket Type
    var ticketType = entryId.substring(0,3).toUpperCase();
    // Determine parameters
    switch(ticketType) {
        case "INC":
            var P1 = "HPD%3AHelp+Desk";
            break;
        case "PBI":
            var P1 = "PBM%3AProblem+Investigation";
            break;
        case "PKE":
            var P1 = "PBM%3AKnown+Error";
            break;
        case "CRQ":
            var P1 = "CHG%3AInfrastructure+Change";
            break;
        case "TSK":
            var P1 = "TMS%3ATask";
            break;
        case "WOI":
            var P1 = "WOI%3AWorkOrder";
            break;
        };
 
    // Create the URL
    var theURL = 
        serverAddress + 
        "/arsys/forms/" + 
        serverName + 
        "/" +
        P1 + 
        "/Default+Administrator+View/?eid=" + 
        entryId;

    // Return the constructed url
    console.log("Ext " + funcName + " - theURL: " + theURL);
    return theURL;
};


/**
 * ---------------------------------------------------------------------------------------------------------------------
 * 
 * Construct a Remedy Link based on Ticket Type and Number
 * Thanks to: http://depressedpress.com/2016/05/20/create-a-link-to-a-remedy-ticket/
 * 
 * @param {String} The Remedy instance FQDN including protocol (e.g. http://myremedy.mycompany.com:8080)
 * @param {String} The Remedy AR Servers name (e.g. myremedy)
 * @param {String} Remedy ticket number to base the link on
 * 
 * @returns {String} A clickable link to the associdated form in Remedy with the specified record loaded.
 * 
 * ---------------------------------------------------------------------------------------------------------------------
 */
function constructTicketSearchLink(serverAddress, serverName, ticketNumber) {
    var funcName = "constructTicketSearchLink";
    console.log("Enter " + funcName);
 
    // Get the Ticket Type
    var ticketType = ticketNumber.substring(0,3).toUpperCase();
    // Determine parameters
    switch(ticketType) {
        case "INC":
            var P1 = "HPD%3AHelp+Desk";
            var P2 = "'1000000161'";
            break;
        case "PBI":
            var P1 = "PBM%3AProblem+Investigation";
            var P2 = "'1000000232'";
            break;
        case "PKE":
            var P1 = "PBM%3AKnown+Error";
            var P2 = "'1000000979'";
            break;
        case "CRQ":
            var P1 = "CHG%3AInfrastructure+Change";
            var P2 = "'1000000182'";
            break;
        case "TSK":
            var P1 = "TMS%3ATask";
            var P2 = "'1'";
            break;
        case "WOI":
            var P1 = "WOI%3AWorkOrder";
            var P2 = "'1000000182'";
            break;
        };
 
    // Create the URL
    var theURL = 
        serverAddress + 
        "/arsys/forms/" + 
        serverName + 
        "/SHR%3ALandingConsole/Default+Administrator+View/?mode=search&F304255500=" + 
        P1 + 
        "&F1000000076=FormOpen&F303647600=SearchTicketWithQual&F304255610=" + 
        P2 + 
        "%3D%22" + 
        ticketNumber + 
        "%22";
        
    // Return the constructed url
    console.log("Ext " + funcName + " - theURL: " + theURL);
    return theURL;
};


/**
 * ---------------------------------------------------------------------------------------------------------------------
 * 
 * parseCheckRequestBody
 *
 * Parse the request body, check that the expected parameters were found and return a Javascript object that
 * contains the request parameters.
 * 
 * @param {object} The incoming request from Remedy
 * 
 * @returns {object} A JSON Object that contains the fields retrieved from the inbound XML.
 * 
 * ---------------------------------------------------------------------------------------------------------------------
 */
function parseCheckRequestBody(requestBody) {
    var funcName = "parseCheckRequestBody";
    console.log("Enter " + funcName + " - requestBody is a " + (typeof requestBody));
    var request = {};

    var triggerRequest = requestBody["soapenv:envelope"]["soapenv:body"]["ns0:triggerrequest"];
    request.action = triggerRequest["ns0:action"];
    request.incidentId = triggerRequest["ns0:id"];
    request.form = triggerRequest["ns0:form"];
    request.logMessage = (typeof triggerRequest["ns0:message"] !== "undefined")?triggerRequest["ns0:message"]:"";

    // console.log(funcName + " - Received action=" + request.action + ", incidentId=" + request.incidentId + ", form=" + request.form + ", logMessage=" + request.logMessage);

    if ((typeof request.action !== "string") || request.action.length === 0) {
        console.log(funcName + " - Request action not found.")
        throw "Request action not found."
    }

    if ((typeof request.incidentId !== "string") || request.incidentId.length === 0) {
        console.log(funcName + "- Request action not found.")
        throw "Request incidentId not found."
    }
    
    // console.log("Exit " + funcName);
    return request;
};


/**
 * ---------------------------------------------------------------------------------------------------------------------
 * 
 * updateWorkInfo
 *
 * Convenience function used by IB scripts to update the Work Info in a Remedy Incident
 * 
 * @param {String} The Remedy Request ID identifying the Incident to update
 * @param {String} The text to add to the Work Info
 * 
 * @returns nothing.
 * 
 * ---------------------------------------------------------------------------------------------------------------------
 */
function updateWorkInfo(requestId, workInfo) {
    
    // Generate the API token (essentially login to Remedy ARS)
    var token = generateRemedyApiToken();
    if (null === token) {
        console.log('updateWorkInfo - !!! UNABLE TO RETRIEVE JWT Token from Remedy !!!');
        throw 'updateWorkInfo - !!! UNABLE TO RETRIEVE JWT Token from Remedy !!!';
    }

    // Update the Work Info
    var results = addRemedyIncidentWorkInfo(token, requestId, workInfo);
    // console.log("updateWorkInfo - results: " + JSON.stringify(results,null,4));
        
    // Logout of Remedy via the Token
    logoutRemedyApiToken(token);
    
}


/**
 * ---------------------------------------------------------------------------------------------------------------------
 *
 * LOCAL FUNCTIONS, CONSTANTS, AND VARIABLES USED INTERNALLY
 * 
 * ---------------------------------------------------------------------------------------------------------------------
 */

var LIB_NAME = "Remedy Rest Util";
var MOCK_LIB_NAME = "Remedy Rest Util Mocked";
var requiredConstants = "REMEDY_OPT_ADD_JSON_HEADER,REMEDY_OPT_SIMPLE_GROUP_NAME,REMEDY_ENDPOINT,REMEDY_NOTE_PREFIX,REMEDY_WS_USERNAME,REMEDY_WS_PASSWORD";
var hasMockLib = false;
var remMockLib = null;


/**
 * ---------------------------------------------------------------------------------------------------------------------
 * 
 * Checks for the presence of the required constants, and if not there, throws an exception
 * 
 * @throws - Exception naming missingn constants.
 * 
 * ---------------------------------------------------------------------------------------------------------------------
 */
function verifyConstants() {
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
        var msg = "The following constants required by " + LIB_NAME + " are missing: " + missingConstants.join();
        console.log(msg);
        throw(msg);
    }
}


/**
 * ---------------------------------------------------------------------------------------------------------------------
 * 
 * Returns the current status of "Mocking"
 * 
 * @returns {boolean} true if Mocking is enabled, false otherwise
 * 
 * ---------------------------------------------------------------------------------------------------------------------
 */
exports.mockIsEnabled = function() {return mockEnabled;};


/** 
 * ---------------------------------------------------------------------------------------------------------------------
 * 
 * This variable represents the state of "mocking" by this library.
 * The states are "true", the library is to expose "mocked"
 * exports, and "false", the library exposes "live" exports.
 * If the constant, REMEDY_OPT_MOCK_ENABLED is not present or false, then
 * the exported functions and variables will be live.
 * 
 * ---------------------------------------------------------------------------------------------------------------------
 */
var mockEnabled = (typeof constants.REMEDY_OPT_MOCK_ENABLED === "undefined") ? false : "true".equalsIgnoreCase(constants.REMEDY_OPT_MOCK_ENABLED);
console.log(LIB_NAME + ' - mockEnabled: ' + exports.mockIsEnabled());


/** 
 * ---------------------------------------------------------------------------------------------------------------------
 * 
 * The following are the defined function variables that will hold either the real or mocked funciton pointers
 * 
 * ---------------------------------------------------------------------------------------------------------------------
 */
var varCreateRemedyIncident = null;
var varModifyRemedyIncident = null;
var varAddRemedyIncidentWorkInfo = null;
var varAddWorkInfoToRemedyIncident = null;
var varRetrieveRequestIdByLocation = null;
var varRetrieveRemedyIncident = null;
var varRetrieveRemedyIncidentByLocation = null;
var varRetrieveRemedyIncidentByField = null;
var varRetrieveRemedyIncidentByRequestId = null;
var varRetrieveRemedyIncidentByIncidentNumber = null;
var varRetrieveRequestId = null;
var varRetrieveRemedySupportGrpAssoc = null;
var varGenerateRemedyApiToken = null;
var varGenerateHeaderForApiRequest = null;
var varLogoutRemedyApiToken = null;
var varParseCheckRequestBody = null;
var varUpdateWorkInfo = null;

/**
 * ---------------------------------------------------------------------------------------------------------------------
 * 
 * Initialize the library
 * 
 * @param {boolean} The current mock state
 * 
 * ---------------------------------------------------------------------------------------------------------------------
 */
function _init(mockMode) {
    console.log(LIB_NAME + ' - _init() - mockMode: ' + mockMode);

    // First make sure all required operational constants are present and not 0 length
    verifyConstants();

    // Set exportable object overrides based on mocking variable
    if (mockMode) {
        
        // Mocking is based on the presence of local replacement (mocked) functions
        // or a library of overrides.  They can be mixed and matched.
        if (null === remMockLib) {
            // First time through init, so attempt to load the library
            try {
                remMockLib = require(MOCK_LIB_NAME);
                hasMockLib = true;
            } catch (e) {}
        }

        if (hasMockLib && (typeof remMockLib.mockCreateRemedyIncident === "function")) {
            varCreateRemedyIncident = remMockLib.mockCreateRemedyIncident;
        } else {
            varCreateRemedyIncident = mockCreateRemedyIncident;
        }         

        if (hasMockLib && (typeof remMockLib.mockModifyRemedyIncident === "function")) {
            varModifyRemedyIncident = remMockLib.mockModifyRemedyIncident;
        } else {
            varModifyRemedyIncident = mockModifyRemedyIncident;
        }         

        if (hasMockLib && (typeof remMockLib.mockAddRemedyIncidentWorkInfo === "function")) {
            varAddRemedyIncidentWorkInfo = remMockLib.mockAddRemedyIncidentWorkInfo;
        } else {
            varAddRemedyIncidentWorkInfo = mockAddRemedyIncidentWorkInfo;
        }         

        if (hasMockLib && (typeof remMockLib.mockAddWorkInfoToRemedyIncident === "function")) {
            varAddRemedyIncidentWorkInfo = remMockLib.mockAddWorkInfoToRemedyIncident;
        } else {
            varAddRemedyIncidentWorkInfo = mockAddWorkInfoToRemedyIncident;
        }         

        if (hasMockLib && (typeof remMockLib.mockRetrieveRequestIdByLocation === "function")) {
            varRetrieveRequestIdByLocation = remMockLib.mockRetrieveRequestIdByLocation;
        } else {
            varRetrieveRequestIdByLocation = mockRetrieveRequestIdByLocation;
        }         

        if (hasMockLib && (typeof remMockLib.mockRetrieveRemedyIncident === "function")) {
            varRetrieveRemedyIncident = remMockLib.mockRetrieveRemedyIncident;
        } else {
            varRetrieveRemedyIncident = mockRetrieveRemedyIncident;
        }         

        if (hasMockLib && (typeof remMockLib.mockRetrieveRemedyIncidentByLocation === "function")) {
            varRetrieveRemedyIncidentByLocation = remMockLib.mockRetrieveRemedyIncidentByLocation;
        } else {
            varRetrieveRemedyIncidentByLocation = mockRetrieveRemedyIncidentByLocation;
        }         

        if (hasMockLib && (typeof remMockLib.mockRetrieveRemedyIncidentByField === "function")) {
            varRetrieveRemedyIncidentByField = remMockLib.mockRetrieveRemedyIncidentByField;
        } else {
            varRetrieveRemedyIncidentByField = mockRetrieveRemedyIncidentByField;
        }         

        if (hasMockLib && (typeof remMockLib.mockRetrieveRemedyIncidentByRequestId === "function")) {
            varRetrieveRemedyIncidentByRequestId = remMockLib.mockRetrieveRemedyIncidentByRequestId;
        } else {
            varRetrieveRemedyIncidentByRequestId = mockRetrieveRemedyIncidentByRequestId;
        }         

        if (hasMockLib && (typeof remMockLib.mockRetrieveRemedyIncidentByIncidentNumber === "function")) {
            varRetrieveRemedyIncidentByIncidentNumber = remMockLib.mockRetrieveRemedyIncidentByIncidentNumber;
        } else {
            varRetrieveRemedyIncidentByIncidentNumber = mockRetrieveRemedyIncidentByIncidentNumber;
        }         

        if (hasMockLib && (typeof remMockLib.mockRetrieveRequestId === "function")) {
            varRetrieveRequestId = remMockLib.mockRetrieveRequestId;
        } else {
            varRetrieveRequestId = mockRetrieveRequestId;
        }         

        if (hasMockLib && (typeof remMockLib.mockRetrieveRemedySupportGrpAssoc === "function")) {
            varRetrieveRemedySupportGrpAssoc = remMockLib.mockRetrieveRemedySupportGrpAssoc;
        } else {
            varRetrieveRemedySupportGrpAssoc = mockRetrieveRemedySupportGrpAssoc;
        }         

        if (hasMockLib && (typeof remMockLib.mockGenerateRemedyApiToken === "function")) {
            varGenerateRemedyApiToken = remMockLib.mockGenerateRemedyApiToken;
        } else {
            varGenerateRemedyApiToken = mockGenerateRemedyApiToken;
        }

        if (hasMockLib && (typeof remMockLib.mockGenerateHeaderForApiRequest === "function")) {
            varGenerateHeaderForApiRequest = remMockLib.mockGenerateHeaderForApiRequest;
        } else {
            varGenerateHeaderForApiRequest = mockGenerateHeaderForApiRequest;
        }

        if (hasMockLib && (typeof remMockLib.mockLogoutRemedyApiToken === "function")) {
            varLogoutRemedyApiToken = remMockLib.mockLogoutRemedyApiToken;
        } else {
            varLogoutRemedyApiToken = mockLogoutRemedyApiToken;
        }

        if (hasMockLib && (typeof remMockLib.mockParseCheckRequestBody === "function")) {
            varParseCheckRequestBody = remMockLib.mockParseCheckRequestBody;
        } else {
            varParseCheckRequestBody = parseCheckRequestBody;
        }

        if (hasMockLib && (typeof remMockLib.mockUpdateWorkInfo === "function")) {
            varUpdateWorkInfo = remMockLib.mockUpdateWorkInfo;
        } else {
            varUpdateWorkInfo = updateWorkInfo;
        }

    } else {
        
        // Non-mocked function varirables
        varCreateRemedyIncident = createRemedyIncident;
        varModifyRemedyIncident = modifyRemedyIncident;
        varAddRemedyIncidentWorkInfo = addRemedyIncidentWorkInfo;
        varAddWorkInfoToRemedyIncident = addWorkInfoToRemedyIncident;
        varRetrieveRequestIdByLocation = retrieveRequestIdByLocation;
        varRetrieveRemedyIncident = retrieveRemedyIncident;
        varRetrieveRemedyIncidentByLocation = retrieveRemedyIncidentByLocation;
        varRetrieveRemedyIncidentByField = retrieveRemedyIncidentByField;
        varRetrieveRemedyIncidentByRequestId = retrieveRemedyIncidentByRequestId;
        varRetrieveRemedyIncidentByIncidentNumber = retrieveRemedyIncidentByIncidentNumber;
        varRetrieveRequestId = retrieveRequestId;
        varRetrieveRemedySupportGrpAssoc = retrieveRemedySupportGrpAssoc;
        varGenerateRemedyApiToken = generateRemedyApiToken;
        varGenerateHeaderForApiRequest = generateHeaderForApiRequest;
        varLogoutRemedyApiToken = logoutRemedyApiToken;
        varParseCheckRequestBody = parseCheckRequestBody;
        varUpdateWorkInfo = updateWorkInfo;

    }
    
    // Actual Exports
    exports.createRemedyIncident = varCreateRemedyIncident;
    exports.modifyRemedyIncident = varModifyRemedyIncident;
    exports.addRemedyIncidentWorkInfo = varAddRemedyIncidentWorkInfo;
    exports.addWorkInfoToRemedyIncident = varAddWorkInfoToRemedyIncident;
    exports.retrieveRequestIdByLocation = varRetrieveRequestIdByLocation;
    exports.retrieveRemedyIncident = varRetrieveRemedyIncident;
    exports.retrieveRemedyIncidentByLocation = varRetrieveRemedyIncidentByLocation;
    exports.retrieveRemedyIncidentByField = varRetrieveRemedyIncidentByField;
    exports.retrieveRemedyIncidentByRequestId = varRetrieveRemedyIncidentByRequestId;
    exports.retrieveRemedyIncidentByIncidentNumber = varRetrieveRemedyIncidentByIncidentNumber;
    exports.retrieveRequestId = varRetrieveRequestId;
    exports.retrieveRemedySupportGrpAssoc = varRetrieveRemedySupportGrpAssoc;
    exports.generateRemedyApiToken = varGenerateRemedyApiToken;
    exports.generateHeaderForApiRequest = varGenerateHeaderForApiRequest;
    exports.logoutRemedyApiToken = varLogoutRemedyApiToken;
    exports.buildXmattersGroupName = buildXmattersGroupName;
    exports.constructTicketLink = constructTicketLink;
    exports.constructTicketSearchLink = constructTicketSearchLink;
    exports.parseCheckRequestBody = parseCheckRequestBody;
    exports.updateWorkInfo = updateWorkInfo;
    
}


/**
 * ---------------------------------------------------------------------------------------------------------------------
 * 
 * Allow library user to manually change the mockEnabled flag, as well as the versions of the functions to export
 * 
 * @param {boolean} If true, enable mock mode, if false disable it.
 * ---------------------------------------------------------------------------------------------------------------------
 */
exports.setMockEnabled = function(mockMode) {
    mockEnabled = mockMode;
    console.log(LIB_NAME + ' - setMockEnabled() - mockEnabled: ' + mockEnabled);
    _init(mockMode);
};


/**
 * ---------------------------------------------------------------------------------------------------------------------
 * 
 * !!! Initialize the library !!!
 * 
 * ---------------------------------------------------------------------------------------------------------------------
 */
_init(mockEnabled);


/**
 * ---------------------------------------------------------------------------------------------------------------------
 * 
 * Call Remedy
 * 
 * @param {string} the jwt token
 * @param {string} the HTTP method to call
 * @param {string} path to make Remedy call against
 * @param {boolean} whether or not to auto Encode the URI
 * @param {object} [Optional] the Remedy Values object
 * 
 * @returns {object} the response object
 * 
 * ---------------------------------------------------------------------------------------------------------------------
 */
function callRemedy(jwt, method, path, autoEncodeURI, payload) {
    var funcName = "callRemedy";
    console.log("Enter " + funcName + " - method: " + method + ", path: " + path);
    
    // Prepare the request object to get the Incident
    var requestObj = {
        'endpoint': constants.REMEDY_ENDPOINT,
        'path': path,
        'method': method
    };
    
    // Check for and add autoEncodeURI if not true
    // Note, the defauolt is true
    if ((typeof autoEncodeURI !== "undefined") && !autoEncodeURI) {
        requestObj.autoEncodeURI = autoEncodeURI;
    }

    // Setup the Auth headers    
    requestObj.headers = generateHeaderForApiRequest(jwt);
    // console.log(funcName + " - requestObj before calling http.request(): " + JSON.stringify(requestObj,null,4));

    // Create the request
    var request = http.request(requestObj);
    // console.log(funcName + " - request before calling write(): " + JSON.stringify(request,null,4));
    
    // Send request to Remedy
    var response;
    try {
        if ((typeof payload !== "undefined") && (null !== payload)) {
            response = request.write(payload);
        } else {
            response = request.write();
        }
    } catch (e) {
        response = {};
        response.statusCode = 400;
        errBody = {
            "code":400,
            "message": String(e),
            "reason":"Exception",
            "subcode":"Exception caught in " + LIB_NAME + " - " + funcName
        }
        response.body = JSON.stringify(errBody);
    }

    // console.log("Exit " + funcName + " - response: " + JSON.stringify(response));
    return response;   
}


/**
 * ---------------------------------------------------------------------------------------------------------------------
 * 
 * Creates and returns a properly encoded and formated condition to use in a "q=" parameter
 * 
 * @param {String} The name of the field to encode
 * @param {String} The value of the field to encode
 * 
 * @returns {String} The properly formatted search term ready to be embedded in a "q=" request parameter
 * 
 * ---------------------------------------------------------------------------------------------------------------------
 */
function makeCondition(fieldName, fieldValue) {
     return '%27' + encodeURIComponent(fieldName) + '%27%20%3D%22' + encodeURIComponent(fieldValue) + '%22';
}


/**
 * ---------------------------------------------------------------------------------------------------------------------
 * 
 * Attempts to decrypt and return a password that was generated with the iapassword utility from the 
 * xMatters Integration Agent.
 * 
 * @param {String} The encrypted password
 * 
 * @returns {String} The decoded password value, or null if not found
 * 
 * ---------------------------------------------------------------------------------------------------------------------
 */
function decryptPW(password) {
    var EncryptionUtils = Java.type('com.alarmpoint.integrationagent.security.EncryptionUtils');
    var pw = null;
    try {
        pw = EncryptionUtils.decrypt(password);
    } catch (e) {
        console.log('Remedy Rest Util.decryptPW - Caught exception trying to decrypt ' + password + '\n' + e);
    }
    return pw;
}



/** 
 * ---------------------------------------------------------------------------------------------------------------------
 * 
 * DEFAULT MOCKED VERSIONS OF THE REQUIRED / EXPORTED FUNCTIONS
 *
 * ---------------------------------------------------------------------------------------------------------------------
 */

function mockedCreateRemedyIncident(jwt, values) {
	var funcName = "mockedCreateRemedyIncident";
    console.log("Enter " + funcName + " - values: " + JSON.stringify(values,null,4));
    
	var response = {
		"statusCode": 201,
		"headers": {"Location": ""},
		"body": ""
	}
	
    console.log("Exit " + funcName + " - Repsonse: " + JSON.stringify(response,null,4));
    return response;
}

function mockModifyRemedyIncident(jwt, requestId, values) {
	var funcName = "mockModifyRemedyIncident";
    console.log("Enter " + funcName + " - requestId: " + requestId + ", values: " + JSON.stringify(values,null,4));
    
	var response = {
		"statusCode": 204,
		"body": ""
	}

    console.log("Exit " + funcName + " - Repsonse: " + JSON.stringify(response,null,4));
    return response;
}

function mockAddRemedyIncidentWorkInfo(jwt, requestId, workNote) {
	var funcName = "mockAddRemedyIncidentWorkInfo";
    console.log("Enter " + funcName + " - requestId: " + requestId + ", workNote: " + workNote);

	var response = {
		"statusCode": 204,
		"body": ""
	}

    console.log("Exit " + funcName + " - Repsonse: " + JSON.stringify(response,null,4));
    return response;
}

function mockAddWorkInfoToRemedyIncident(jwt, requestId, incidentId, workNote) {
	var funcName = "mockAddRemedyIncidentWorkInfo";
    console.log("Enter " + funcName + " - requestId: " + requestId + ", incidentId: " + incidentId + ", workNote: " + workNote);

	var response = {
		"statusCode": 204,
		"body": ""
	}

    console.log("Exit " + funcName + " - Repsonse: " + JSON.stringify(response,null,4));
    return response;
}

function mockRetrieveRemedyIncident(jwt, requestId, fields) {
	var funcName = "mockRetrieveRemedyIncident";
    console.log("Enter " + funcName + " - Request ID: " + requestId);

    console.log("Exit " + funcName + " - Entry is not null");
    return {"values":{"Request ID":"INC000000000003","Incident Number":"INC000000000004"}};
}

function mockRetrieveRemedyIncidentByLocation(jwt, Location) {
	var funcName = "mockRetrieveRemedyIncidentByLocation";
    console.log("Enter " + funcName + " - Location: " + Location);

    console.log("Exit " + funcName + " - Entry is not null");
    return {"values":{"Request ID":"INC000000000001","Incident Number":"INC000000000002"}};
}

function mockRetrieveRemedyIncidentByField(jwt, fieldName, fieldValue, fields) {
	var funcName = "mockRetrieveRemedyIncidentByField";
    console.log("Enter " + funcName + " - fieldName: " + fieldName + ", fieldValue: " + fieldValue);

    console.log("Exit " + funcName + " - Entry is not null");
    return {"values":{"Request ID":"INC000000000001","Incident Number":"INC000000000002"}};
}

function mockRetrieveRemedyIncidentByRequestId(jwt, requestId, fields) {
	var funcName = "mockRetrieveRemedyIncidentByRequestId";
    console.log("Enter " + funcName + " - Request ID: " + requestId);

    console.log("Exit " + funcName + " - Entry is not null");
    return {"values":{"Request ID":"INC000000000003","Incident Number":"INC000000000004"}};
}

function mockRetrieveRemedyIncidentByIncidentNumber(jwt, incidentNumber, fields) {
	var funcName = "mockRetrieveRemedyIncidentByIncidentNumber";
    console.log("Enter " + funcName + " - IncidentNumber: " + incidentNumber);
    
    console.log("Exit " + funcName + " - Entry is " + ((null === entry)?"null":"not null"));
    return {"values":{"Request ID":"INC000000000003","Incident Number":"INC000000000004"}};
}

function mockRetrieveRequestId(jwt, incidentNumber) {
	var funcName = "mockRetrieveRequestId";
    console.log("Enter " + funcName + " - incidentNumber: " + incidentNumber);

    console.log("Exit " + funcName + " - requestId: INC000000000005");
    
    return "INC000000000005";
}

function mockRetrieveRemedySupportGrpAssoc(jwt, Assignee_Login_ID, Assigned_Support_Company, Assigned_Support_Organization, Assigned_Group) {
    var funcName = "mockRetrieveRemedySupportGrpAssoc";
    console.log("Enter " + funcName + " - Assignee_Login_ID: " + Assignee_Login_ID + ", Assigned_Support_Company: " + Assigned_Support_Company + ", Assigned_Support_Organization: " + Assigned_Support_Organization + ", Assigned_Group: " + Assigned_Group);

    results = [
        {
            "Company": Assigned_Support_Company,
            "Support Organization": Assigned_Support_Organization,
            "Support Group Name" : Assigned_Group,
            "Support Group ID" : "SPG000000000006",
            "Full Name" : Assignee_Login_ID,
            "Default" : "Yes"
        }
    ];
    
    console.log("Exit " + funcName + " - results is " + (null === results)?"null":"not null");
    return results;
}

function mockGenerateRemedyApiToken( ) {
    var funcName = "mockGenerateRemedyApiToken";
    console.log("Enter " + funcName);
    
    console.log("Exit " + funcName);
    return "MOCKED-JWT-TOKEN";
}

function mockGenerateHeaderForApiRequest(jwt) {
    var funcName = "mockGenerateHeaderForApiRequest";
    console.log("Enter " + funcName);

    if (jwt === null || jwt.length === 0) {
        jwt = mockGenerateRemedyApiToken();
    }

    var headers = {
        "Authorization": "AR-JWT " + jwt/*,
        "Accept": 'application/json'*/
    };
    // Add the content type header if required
    if ("true".equalsIgnoreCase(constants.OPT_ADD_JSON_HEADER)) {
        headers["Content-Type"] = 'application/json';
    }

    console.log("Exit " + funcName);
    return headers;
}

function mockLogoutRemedyApiToken(jwt) {
    var funcName = "mockLogoutRemedyApiToken";
    console.log("Enter " + funcName);

	var response = {
		"statusCode": 204,
		"body": ""
	}

    console.log("Exit " + funcName);
}

function mockParseCheckRequestBody(requestBody) {
    var funcName = "mockParseCheckRequestBody";
    console.log("Enter " + funcName + " - requestBody is a " + (typeof requestBody));
    var request = {};

    request.action = triggerRequest["ns0:action"];
    request.incidentId = triggerRequest["ns0:id"];
    request.form = triggerRequest["ns0:form"];
    request.logMessage = (typeof triggerRequest["ns0:message"] !== "undefined")?triggerRequest["ns0:message"]:"";

    // console.log(funcName + " - Received action=" + request.action + ", incidentId=" + request.incidentId + ", form=" + request.form + ", logMessage=" + request.logMessage);

    if ((typeof request.action !== "string") || request.action.length === 0) {
        console.log(funcName + " - Request action not found.")
        throw "Request action not found."
    }

    if ((typeof request.incidentId !== "string") || request.incidentId.length === 0) {
        console.log(funcName + "- Request action not found.")
        throw "Request incidentId not found."
    }
    
    // console.log("Exit " + funcName);
    return request;

}

function mockUpdateWorkInfo(requestId, workInfo) {
    var funcName = "mockUpdateWorkInfo";
    console.log("Enter " + funcName + " - requestId: [" + requestId + "], workInfo: [" + workInfo "].");
    console.log("Exit " + funcName);
}
