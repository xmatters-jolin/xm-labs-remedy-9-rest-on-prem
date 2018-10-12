XMRESTAPI = {};

(function(){

  XMRESTAPI.RESPONSE_SUCCESS = "200";
  XMRESTAPI.RESPONSE_SUCCESS_ACCEPTED = "202";
  XMRESTAPI.RESPONSE_DATA_VALIDATION_ERROR = "400";

  // private functions
  
    function addValue(text, property, value) {
	  if (value === null) return text;
      if (text != "") text += "&";
      text += property + "=" + value;
	  return text;
	}
	
	function getEventFilterAsString(filter) {	
    var text = "";
    
    for (var property in filter) {
      var value = filter[property];
      
      if (property == "properties") {
		var propNames = [];
		var propValues = [];
        for (var p in value) {
		  propNames.push(encodeURIComponent(p));
		  propValues.push(encodeURIComponent(value[p]));
        }
		text = addValue(text, "propertyName", propNames.join(","));
		text = addValue(text, "propertyValue", propValues.join(","));
      } else {
		text = addValue(text, property, value);
      }
      
    }
    
    return text;
	}
  
  // public functions
  
	XMRESTAPI.getEvents = function(eventFilter) {
	// JSON.stringify chokes on Java strings, so we need to convert the eventFilter to a JS string if it isn't a JSON object or a JS string
	var evFilt = (typeof(eventFilter)=="object"? eventFilter: ""+eventFilter  );
	IALOG.debug("XM REST API: getEvents for " + JSON.stringify(evFilt) );
    var parameters = getEventFilterAsString(eventFilter);
    
    var url = WEB_SERVICE_URL.substring(0, WEB_SERVICE_URL.indexOf("api")) + "api/xm/1/events?" + parameters;
    
    var response = XMIO.get(url, INITIATOR, INITIATOR_PASSWORD);
    IALOG.debug("XM REST API: getEvents received " + response.status + " " + response.body);    
    
    XMRESTAPI.checkResponse( response );      
    
    return JSON.parse(response.body);
  };

	XMRESTAPI.setEventStatus = function(eventFilter, status) {
	// JSON.stringify chokes on Java strings, so we need to convert the eventFilter to a JS string if it isn't a JSON object or a JS string
	var evFilt = (typeof(eventFilter)=="object"? eventFilter: ""+eventFilter  );
    IALOG.debug("XM REST API: setEventStatus for " + JSON.stringify(evFilt) + " to " + status);

    var count = 0;
    
    var events = XMRESTAPI.getEvents( eventFilter );
    
    var url = WEB_SERVICE_URL.substring(0, WEB_SERVICE_URL.indexOf("api")) + "api/xm/1/events";

	for (var i = 0; i < events.total; i++) {
      var event = events.data[i];
      IALOG.debug("\tXM REST API: setEventStatus for event href " + event.href + " to " + status); // href looks like /reapi/2013-12-01/events/<id>
      
      var response = XMIO.post(JSON.stringify({ 'status': status, 'id':event.eventId }), url, INITIATOR, INITIATOR_PASSWORD);
      IALOG.debug("XM REST API: setEventStatus received " + response.status + " " + response.body);

      XMRESTAPI.checkResponse( response, {status : 409} ); // ignore conflict errors      
      
      count++;      
    }

    IALOG.info("XM REST API: setEventStatus events " + status + ": " + count);    
    return count;
  };

	XMRESTAPI.deleteEvents = function(eventFilter) {
	// JSON.stringify chokes on Java strings, so we need to convert the eventFilter to a JS string if it isn't a JSON object or a JS string
	var evFilt = (typeof(eventFilter)=="object"? eventFilter: ""+eventFilter  );
    IALOG.debug("XM REST API: deleteEvents for " + JSON.stringify(evFilt) );
    return XMRESTAPI.setEventStatus(eventFilter, "TERMINATED");
  };
  
  // Return deduplication status
  XMRESTAPI.isDuplicateOccurrence = function(apxml, deduplicationFilter) {
    var deduplicationFilterName = DEDUPLICATION_FILTER_NAME;
    
    if ( deduplicationFilter !== undefined ) {
      deduplicationFilterName = deduplicationFilter;
    }
    IALOG.debug("XMRESTAPI.isDuplicateOccurrence - Deduplication settings: parameter passed=" + deduplicationFilter + ", value used=" + deduplicationFilterName);
    
    if ( deduplicationFilterName != null && APXML.isDuplicateOccurrence(apxml, deduplicationFilterName) ) {
	  IALOG.debug('XMRESTAPI.isDuplicateOccurrence - APXML.isDuplicateOccurrence(apxml, deduplicationFilterName): ' + APXML.isDuplicateOccurrence(apxml, deduplicationFilterName));
      IALOG.warn(
          "XMRESTAPI.isDuplicateOccurrence - An event has been injected into the event domain " +
          "within the configured suppression period with the same properties. It will be suppressed."
          );
      return true;
	}

	return false;
  }

  // Submit Apxml
  XMRESTAPI.submitApxml = function(url, apxml, existingEventsFilter, newKeys, deduplicationFilter) {
    var deduplicationFilterName = DEDUPLICATION_FILTER_NAME;
    
    if ( deduplicationFilter !== undefined ) {
      deduplicationFilterName = deduplicationFilter;
    }
    IALOG.debug("XM REST API: Deduplication settings: parameter passed=" + deduplicationFilter + ", value used=" + deduplicationFilterName);
    
    if ( deduplicationFilterName != null && APXML.isDuplicateOccurrence(apxml, deduplicationFilterName) ) {
	  IALOG.debug('XM REST API: APXML.isDuplicateOccurrence(apxml, deduplicationFilterName): ' + APXML.isDuplicateOccurrence(apxml, deduplicationFilterName));
      IALOG.warn(
          "XM REST API: An event with tokens " + APXML.toString(apxml) + " has been injected into the event domain " +
          "within the configured suppression period. It has been suppressed."
          );
      return;
    } else if ( deduplicationFilterName != null ) {
	  var count = APXML.dedup(apxml, deduplicationFilterName );
	  IALOG.debug('XM REST API: APXML.dedup(apxml, deduplicationFilterName ) count: ', count);
	}
  
    if (existingEventsFilter != null) {
      XMRESTAPI.deleteEvents( existingEventsFilter );
    }
    
	//  use this code only if the IA cannot be upgraded to 5.1.6 or higher
    //  var eventObj = createEventTemplate !== undefined /* IA 5.1.4 */ ? createEventTemplate(apxml) : XMUtil.createEventTemplate();
    var eventObj = XMUtil.createEventTemplate();
    var apxmlAsObj = APXML.toEventJs(apxml, eventObj, newKeys);
    var obj = apia_event( apxmlAsObj );
    var json = JSON.stringify(obj);    
    
    if (IALOG.isDebugEnabled()) {
      IALOG.debug("XM REST API: Post to " + url + " " + json);
    }
    return XMIO.post(json, url, INITIATOR, INITIATOR_PASSWORD);
  }

  // Utility methods  
  XMRESTAPI.checkResponse = function(response, ignoreError) {
  
    if ( response.status !== undefined && response.status != XMRESTAPI.RESPONSE_SUCCESS && response.status != XMRESTAPI.RESPONSE_SUCCESS_ACCEPTED) {
      // Ignore status?
      if (ignoreError && ignoreError['status'] != null && ignoreError['status'] == response.status) {
        IALOG.debug("XM REST API: checkResponse status " + response.status + " will be treated as success");
        return response;
      }
      var error; 
      try {
        var body = JSON.parse(response.body);
        
        if (ignoreError && ignoreError['type'] != null && ignoreError['type'] == body.type) {
          IALOG.debug("XM REST API: checkResponse error type " + response.status + " will be treated as success");
          return response;
        }
        error = body.message;
      } catch (e) {
        error = "xMatters server returned status " + response.status;
      }     
      throw error;
    }
    
    return response;
  };
  
  XMRESTAPI.getFormURL = function(webServiceURL, form) {
    
    if (form.startsWith("http"))
      return form;
      
    var triggers = webServiceURL.indexOf("/triggers");
    if (triggers >= 0) {
      // 'form' parameter is treated as form UID e.g. https://<xM server>/reapi/2015-01-01/forms/<formUID>/triggers
      return webServiceURL.substring(0, webServiceURL.lastIndexOf('/', triggers-1)) + "/" + form + "/triggers";
    }

    IALOG.warn("XM REST API:: Unrecognized WEB_SERVICE_URL format. getFormURL will use " + webServiceURL + " 'as is'.");
    
    return webServiceURL;
  };
})();