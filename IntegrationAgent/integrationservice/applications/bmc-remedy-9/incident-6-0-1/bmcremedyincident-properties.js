/**
 * This function handles getIncident integrated properties request
 */
function handleGetIncident(msg) {
  var incidentID = INT_PROPERTY_TICKET_ID;
  // Here we add incident properties to the response. These will be used to populate the response properties
  // on the form, assuming properties with these names have been defined.
  var addTokens = {};
  var hasID = ('additionalTokens' in msg) && (incidentID in msg.additionalTokens) 
    && (msg.additionalTokens[incidentID] != null && msg.additionalTokens[incidentID].trim().length > 0);
  
  if (hasID) {
    // Retrieve incident details from Remedy
    var incident = getRemedyIncident(msg.additionalTokens[incidentID]);
    if (incident == null) {
      addTokens['Summary'] = "Incident " + msg.additionalTokens[incidentID] + " not found in Remedy";
    } else {
      log.debug("Retrieved incident {0}", incident.Incident_Number);
      for (property in incident) {
        addTokens[property.replace(/_/g, ' ')] = incident[property];
      }
    }
  } else {
    addTokens['Summary'] = INT_PROPERTY_TICKET_ID + ' request property is not set';
  }    

  return addTokens;  
}

/**
 * ---------------------------------------------------------------------------------------------------------------------
 * apia_response
 *
 * Overrides event.js implementation to handle integrated properties 
 * ---------------------------------------------------------------------------------------------------------------------
 */ 
function apia_response(apxml) {
  IALOG.info("Calling JavaScript method apia_callback (integrated properties supported).");
  var apxmlAsObj = APXML.toResponseJs(apxml);
  
  if ('xmattersrebrequestaction' in apxmlAsObj)
    return apia_request(apxmlAsObj);
  else
    apia_callback(apxmlAsObj);
}

/**
 * ---------------------------------------------------------------------------------------------------------------------
 * apia_request
 *
 * Handles a request for inetgrated properties. The hadler name is assumed to be "handle" plus capitalized request action name 
 * e.g. handleGetIncident for getIncident
 * ---------------------------------------------------------------------------------------------------------------------
 */ 
function apia_request(msg) {
  IALOG.info("Received integrated properties request {0}: {1}", msg.xmattersrebrequestuuid, msg.xmattersrebrequestaction);
  
  var action = msg.xmattersrebrequestaction;
  var functionName = "handle" + action.charAt(0).toUpperCase() + action.substring(1);
  var handler = eval(functionName);
  
  if (typeof eval(functionName) === "function") {
    IALOG.debug("Handler found for '{0}' request", action);
    
    // All responses must include this value from the request so that the response can be matched to its
    // originating request.
    var requestUuid = msg.xmattersrebrequestuuid;
    
    // Create a response
    var response = ServiceAPI.createAPXML();
    response.setMethod(APXMLMessage.RESPONSE_METHOD);
    response.setSubclass(APXMLMessage.RESPONSE_SUBCLASS);  
    response.setToken(APXMLMessage.APIA_PRIORITY, APXMLMessage.APIA_PRIORITY_HIGH);

    // This field is REQUIRED in the response. If omitted, xMatters will not be able to match the response to the
    // request that originated it.
    response.setToken('xmattersRebRequestUuid', requestUuid, APXMLToken.Type.STRING);  

    var addTokens = handler(msg);
    var payload = JSON.stringify(addTokens);
    
    // Add the response properties to the response message. The field MUST be called "additionalTokens", and the
    // expected value should be a JSON representation of the values. Use JSON.stringify() to encode the values as
    // JSON.
    response.setToken('additionalTokens', payload, APXMLToken.Type.STRING);
    
    IALOG.debug('Sending response with tokens {0}', response); 
    
    // Return the response so that it gets sent back to xMatters.
    return response;
  } 
  
  IALOG.error("No handler found for {0} request. Define function '{1}' to handle it", action, functionName);
}
