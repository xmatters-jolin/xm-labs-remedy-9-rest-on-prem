/*
  Called when object is being injected by APClient.Bin or via HTTP
*/
function apia_event(formObject) {

  // A workaround for 'form properties of type List rejecting empty values' issue
  for (var property in formObject.properties) {
    if (formObject.properties[property] === "") {
      formObject.properties[property] = null;
    }
  }

	return formObject;	
}

/**
 * ---------------------------------------------------------------------------------------------------------------------
 * http_event - called by apia_http() implementation
 *
 * @param requestBody - the body of the HTTP Request
 * ---------------------------------------------------------------------------------------------------------------------
 */
function http_event(requestBody) {
  log.debug("Enter - http_event");
  log.debug("http_event: request body [" + requestBody + "]");
  var responseMsg = null;
  
  // If the request body is a duplicate (contains the other soap header)
  // than ignore/just return
  if (requestBody.indexOf("http://schemas.xmlsoap.org/soap/envelope/") >= 0) {
    log.warn("http_event - Ignoring duplicate request per BMC bug that causees the same SOAP request to be sent twice with different soapenv values. Request body: [" + requestBody + "]");
	return "Ignoring duplicate request per BMC bug that causees the same SOAP request to be sent twice with different soapenv values.";
  }

  // Parse the incoming XML SOAP Payload injected from Remedy
  var request = parseCheckRequestBody( new XML( new WSUtil().formatStringForE4X( requestBody ) ) );
  log.info("http_event: action [" + request.action + "], incidentId [" + request.incidentId + "], form [" + request.form + "]");
    
  if (equalsIgnoreCase(request.action, REQUEST_ACTION_DELETE)) {
	  
    // Remedy will send requests with the delete action when an incident is set to resolved or closed.
    log.info("http_event - deleting incident [" + request.incidentId + "]");
    
	var count = XMRESTAPI.deleteEvents( getExistingEventsFilter( request.incidentId ) );
    log.info("http_event: SUCCESS. Events terminated: " + count); // deleteEvents will throw exception if something is wrong
    
	responseMsg = "" + count + " Event" + ((count === 1)?"":"s") + " related to Incident Numnber " + request.incidentId + ((count === 1)?" was":" were") + " terminated.";
    if ((count > 0) && OPT_ANNOTATE_NUM_DELETED) {
	  var delMessage = notePrefix;
      if ( isEmpty(request.logMessage) ) {
		  delMessage += responseMsg;
	  } else {
		  delMessage += request.logMessage;
	  }
      // Add the message to the incident work log
      addWorkInfoToIncident( null, null, request.incidentId, delMessage );
    }
	
  } else {

    // Retrieve incident details from Remedy
	// Get the Incident details from Remedy via REST
	var incident = getRemedyIncident(request.incidentId);
    log.debug("http_event: retrieved incident via REST.  Incident_Number: [" + incident.Incident_Number + "]");
    
	// Add the request details to the incident object
	for (var r in request) {
		incident[r] = request[r];
	}
	incident.triggerType = request.form;

    // Convert incident details into APXML
    var apxml = makeApxmlFrom(incident, request.form);
    if (log.isDebugEnabled()) {
      log.debug("incident [" + request.incidentId + "] converted to APXML: " + APXML.toString(apxml));    
    }

	// Check to see if this is a duplicate based on the named or default deduplication filter
	// And, if so, send an appropriate work note to show that was the case.
    var isDuplicate = XMRESTAPI.isDuplicateOccurrence(apxml);
	if (isDuplicate) {

	    // Send appropriate response and work note.
		if (OPT_ANNOTATE_SUPRESSED_REQUEST) {
			addWorkInfoToIncident( null, incident.Request_ID, request.incidentId, notePrefix + "Notification request has been suppressed/deduplicated.");
		}
		return request.incidentId + " has been suppressed/deduplicated";
		
	} else {

		// Submit APXML
		var response = XMRESTAPI.submitApxml(WEB_SERVICE_URL, apxml, null, { 'priority' : 'xm_priority' });
		
		if (response) {
		  // if request was actually sent
		  if (response.status == XMRESTAPI.RESPONSE_SUCCESS || response.status == XMRESTAPI.RESPONSE_SUCCESS_ACCEPTED) {
			log.debug("http_event: SUCCESS");
			var body = JSON.parse(response.body);
			var xmRequestId = body.requestId;
			log.debug("http_event: xmRequestId = [" + xmRequestId + "]"); 
			if (OPT_ANNOTATE_NOTIFICATION_REQUEST_ID) {
			  addWorkInfoToIncident( null, incident.Request_ID, request.incidentId, notePrefix + "Notification request submitted. Request ID: " + xmRequestId);
			}
			responseMsg = "Notification request submitted to xMatters.  Request ID: " + xmRequestId;
		  } else {
			log.info("http_event: FAILURE (" + response.status + ")");      
			XMRESTAPI.checkResponse( response );
		  }
		}

	}
	
  }
 
  log.debug("Exit - http_event");
  return responseMsg;
}

/**
 * ---------------------------------------------------------------------------------------------------------------------
 * getRemedyIncident
 *
 * @param incidentNumber - the key to the Incident to retrieve details for from Remedy
 * ---------------------------------------------------------------------------------------------------------------------
 */
function getRemedyIncident(incidentNumber)
{
  var functionName = "getRemedyIncident";
  log.debug("Enter - " + functionName);
  log.info(functionName + " - incidentNumber [" + incidentNumber + "]");

  // Get the JWT Token from Remedy
  var jwt = REMEDYIO.generateRemedyApiToken();
  if (null === jwt) {
	// We were unable to get a JWT token
	throw ("incident [" + request.incidentId + "]: Unable to retrieve a JWT token from Remedy");
  }
  // Get the JWT Header
  var jwtHeader = REMEDYIO.generateHeaderForApiRequest(jwt);
  log.debug(functionName + " - jwtHeader: " + JSON.stringify(jwtHeader,null,4));

  var queryString = "%27Incident%20Number%27%3d%22"+incidentNumber+"%22";
  var apiUrl = REMEDY_REST_BASE_PATH + "HPD:IncidentInterface?q=" + queryString;

  var response = REMEDYIO.get(apiUrl, "", "", jwtHeader);
  log.debug(functionName + " - response.status: " + response.status);
  log.debug(functionName + " - response.body: " + response.body);

  var incident = null;
  try {
    var body = JSON.parse(response.body);
    if (body.entries instanceof Array && body.entries.length > 0) {
      incident = body.entries[body.entries.length - 1].values;
	  // Replace field names containing spaces with equivalent field names containing undercores
	  // This is done for compatibility with the existing Comm Plans and logic
	  for (var key in incident) {
		if (key.indexOf(" ") >= 0) {
			var newKey = key.split(" ").join("_");
			incident[newKey] = incident[key];
			delete incident[key];
		}
	  }
      log.debug(functionName + " - incident: " + JSON.stringify(incident,null,4));
    } else {
      log.error(functionName + " - Cannot get form data from HPD:IncidentInterface REST Service.");
    }
	// Release the jwt token
	REMEDYIO.releaseRemedyApiToken(jwt);

  } catch (e) {
	// Release the jwt token
	REMEDYIO.releaseRemedyApiToken(jwt);
    throw e;
  }

  log.debug("Exit - " + functionName);
  return incident;
  
}

/**
 * ---------------------------------------------------------------------------------------------------------------------
 * getRemedyRequestId
 *
 * @param jwtHeader - Formatted HTTP header including a valid JWT Token
 * @param incidentNumber - the key to the Incident to retrieve details for from Remedy
 * ---------------------------------------------------------------------------------------------------------------------
 */
function getRemedyRequestID(jwtHeader, incidentNumber)
{
  var functionName = "getRemedyRequestID";
  log.debug("Enter - " + functionName);
  log.info(functionName + " - incidentNumber [" + incidentNumber + "]");
  log.debug(functionName + " - jwtHeader: " + JSON.stringify(jwtHeader,null,4));

  var requestId = "";
  
  var queryString = "%27Incident%20Number%27%3d%22"+incidentNumber+"%22";
  var apiUrl = REMEDY_REST_BASE_PATH + 
    "HPD:IncidentInterface?fields=values(" + 
	encodeURIComponent("Request ID") + "," + 
	encodeURIComponent("Incident Number") + 
	")&q=" + queryString;

  var response = REMEDYIO.get(apiUrl, "", "", jwtHeader);
  log.debug(functionName + " - response.status: " + response.status);
  log.debug(functionName + " - response.body: " + response.body);

  try {
    var body = JSON.parse(response.body);
    if (body.entries instanceof Array && body.entries.length > 0) {
      var incident = body.entries[body.entries.length - 1].values;
      if (typeof incident["Request ID"] !== "undefined" ) {
        requestId = incident["Request ID"];
      } else {
        log.error(functionName + " - Request ID was not returned by the HPD:IncidentInterface REST Service.");
      }
    } else {
      log.error(functionName + " - Cannot get Request ID from HPD:IncidentInterface REST Service.");
    }
  } catch (e) {
    log.error(functionName + " - Got exception trying to get Request ID from HPD:IncidentInterface REST Service. \n" + e);
  }

  log.debug("Exit - " + functionName + " - requestId: " + requestId);
  return requestId;
  
}

/**
 * ---------------------------------------------------------------------------------------------------------------------
 * addWorkInfoToIncident
 *
 * Add an annotation as a result of the event injection processing. Catch any exceptions thrown.
 *
 * @param incidentId
 * @param summary
 * ---------------------------------------------------------------------------------------------------------------------
 */
function addWorkInfoToIncident(jwt, requestId, incidentId, summary)
{
    var functionName = "addWorkInfoToIncident";
	var INCIDENT_ACTION_MODIFY = "MODIFY";
	var WORK_LOG_TYPE = "xMatters";
	var WORK_INFO_TYPE = "Working Log";
	var WORK_INFO_VIEW_ACCESS = "Internal";
	var WORK_INFO_LOCKED = "Yes";
	var WORK_INFO_SUMMARY_FIELD_LENGTH = 100;
	var localJwt = false;

    log.debug("Enter - " + functionName);
    log.info(functionName + " - incidentId [" + incidentId + "], summary [" + summary + "]");

    try
    {
	  if (null === jwt) {
		localJwt = true;
	    // Get the JWT Token from Remedy
	    var jwt = REMEDYIO.generateRemedyApiToken();
	    if (null === jwt) {
		  // We were unable to get a JWT token
		  throw ("incident [" + incidentId + "]: Unable to retrieve a JWT token from Remedy");
	    }
	  }
	  // Get the JWT Header
	  var jwtHeader = REMEDYIO.generateHeaderForApiRequest(jwt);

	  // Get the RequestID from the incident, if not supplied.
	  if (null === requestId) {
	    var requestId = getRemedyRequestID(jwtHeader, incidentId);
	    if ("" === requestId) {
	  	  log.error(functionName + " - Could not retrieve Request ID, so unable to update WorkInfo.");
		  if (localJwt) {
		    // Release the jwt token
	        REMEDYIO.releaseRemedyApiToken(jwt);
	      }
	  	  return;
	    }
	  }
	  
      // Prepare the values object    
      var values = {
        "values": {
            "z1D Action": INCIDENT_ACTION_MODIFY,
            "z1D_Activity_Type": WORK_INFO_TYPE,
            "z1D_Secure_Log": WORK_INFO_LOCKED,
            "z1D_View_Access": WORK_INFO_VIEW_ACCESS,
            "z1D_WorklogDetails": summary
            }
        };

      var apiUrl = REMEDY_REST_BASE_PATH + "HPD%3AIncidentInterface/" + encodeURIComponent(requestId);

      var response = REMEDYIO.put(JSON.stringify(values), apiUrl, "", "", jwtHeader);
      log.debug(functionName + " - response.status: " + response.status);
      log.debug(functionName + " - response.body: " + response.body);
	  
	  if (localJwt) {
		// Release the jwt token
	    REMEDYIO.releaseRemedyApiToken(jwt);
	  }
      
    } catch (e)
    {
        log.error("addWorkInfoToIncident - Failed to annotate incident: Exception - name [" + e.name + "], message [" + e.message + "]");
        log.error("addWorkInfoToIncident - Incident ID [" + incidentId + "]");
    }

    log.debug("Exit - addWorkInfoToIncident");
}

/**
 * ---------------------------------------------------------------------------------------------------------------------
 * makeApxmlFrom
 *
 * @param incident - the object received from Remedy
 * ---------------------------------------------------------------------------------------------------------------------
 */
function makeApxmlFrom(incident, form)
{
  var functionName = "makeApxmlFrom";
  log.debug("Enter - " + functionName);
  log.info(functionName + " - incident [" + incident + "]");

  var apxml = ServiceAPI.createAPXML();
  
  // -----------------------------------------------------------------------------------------------------------------
  // Set up the APXML tokens that have the same names and values as the Remedy incident properties
  // -----------------------------------------------------------------------------------------------------------------
  new xMattersWS().addEventTokensFromObject(apxml, incident);
  
  // Add agent_client_id token required for responses
  var agent = getAgentClientID();
  log.info(functionName + ": agent_client_id [" + agent + "]");
  apxml.setToken("agent_client_id", agent);

  log.debug("Exit - " + functionName);

  return apxml;
}

/**
 * ---------------------------------------------------------------------------------------------------------------------
 * parseCheckRequestBody
 *
 * Parse the HTML request body, check that the expected parameters were found and return a Javascript object that
 * contains the request parameters.
 * ---------------------------------------------------------------------------------------------------------------------
 */
function parseCheckRequestBody(requestBody)
{
    log.debug("Enter - parseCheckRequestBody: " + (typeof requestBody) + " \n" + requestBody);

    var request = new Object();

    request.action = String(requestBody.*::Body.*::TriggerRequest.*::action);
    request.incidentId = String(requestBody.*::Body.*::TriggerRequest.*::id);
    request.form = String(requestBody.*::Body.*::TriggerRequest.*::form);
    request.logMessage = String(requestBody.*::Body.*::TriggerRequest.*::message);

    log.debug("parseCheckRequestBody: Received action=" + request.action + ", incidentId=" + request.incidentId + ", form=" + request.form + ", logMessage=" + request.logMessage);

    if (isEmpty(request.action))
    {
        throw "Request action not found."
    }

    if (isEmpty(request.incidentId))
    {
        throw "Request incidentId not found."
    }
    
    log.debug("Exit - parseCheckRequestBody");
    return request;
}

/**
 * ---------------------------------------------------------------------------------------------------------------------
 * getExistingEventsFilter
 *
 * return a Javascript object that contains the event filter parameters 
 * ---------------------------------------------------------------------------------------------------------------------
 */
function getExistingEventsFilter(incidentId) {
  return { status : "ACTIVE", properties : { 'incident_number#en' : incidentId } } 
}

/**
 * ---------------------------------------------------------------------------------------------------------------------
 * getAgentClientID
 *
 * return agent_client_id of the integration
 * ---------------------------------------------------------------------------------------------------------------------
 */
function getAgentClientID() {
	if (ServiceAPI.getConfiguration === undefined)
		return "applications|bmc-remedy-" + PRODUCT_VERSION_NUMBER + "-incident" + INTEGRATION_VERSION_NUMBER; 
	else
		return ServiceAPI.getConfiguration().getName(); 
}