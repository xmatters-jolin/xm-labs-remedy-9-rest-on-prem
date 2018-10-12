
var APIA_HTTP_RECEIVED = "Received";
var APIA_HTTP_ERROR = "Error";

/**
 * ---------------------------------------------------------------------------------------------------------------------
 * apia_http
 *
 * This is the entry point for HTTP requests from Remedy that initiate operations.
 *
 * This method expects that the POST body contains a SOAP 1.1 message indicating the data load action to be taken.
 *
 * ---------------------------------------------------------------------------------------------------------------------
 */
function apia_http(httpRequestProperties, httpResponse)
{
    log.debug("Enter - apia_http");
    log.debug("httpRequestProperties: " + httpRequestProperties);

    var responseBody = null;

    try
    {
        var message = http_event( httpRequestProperties.getProperty("REQUEST_BODY") );
		if ((typeof message === "undefined") || (message === null)) {
		  message = "Request was submitted for processing";
		}

        responseBody = makeSoapResponseBody(APIA_HTTP_RECEIVED, message);
    }
    catch (e)
    {
        var msg;
        
        if (e.stack) {
          msg = e.stack;
        } else if (e.name == "JavaException") {
          e.printStackTrace();
        } else {
          msg = String(e);
        }
        
        log.warn("apia_http: caught Exception - name: [" + e.name + "], message [" + e.message + "]: " + msg);
        responseBody = makeSoapResponseBody(APIA_HTTP_ERROR, e.toString());
    }
    finally
    {
        httpResponse.setStatusLine(HttpVersion.HTTP_1_1, 200);
        httpResponse.setHeader(new Header("Content-Type", httpRequestProperties.getProperty("Content-Type")));
        httpResponse.setBodyString(responseBody);
    }

    log.debug("apia_http - response body [" + responseBody + "]");
    log.debug("Exit - apia_http");

    return httpResponse;
}

/**
 * ---------------------------------------------------------------------------------------------------------------------
 * makeSoapResponseBody
 *
 * @param status
 * @param description
 * ---------------------------------------------------------------------------------------------------------------------
 */
function makeSoapResponseBody(status, description)
{
    log.debug("Enter - makeSoapResponseBody");

    var soapResponse = new XML();
    soapResponse = <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:apia="http://www.xmatters.com/apia_http_bmcremedy/">
        <soapenv:Header/>
        <soapenv:Body>
            <apia:TriggerResponse>
                <apia:status/>
                <apia:description/>
            </apia:TriggerResponse>
        </soapenv:Body>
    </soapenv:Envelope>;

    soapResponse.*::Body.*::TriggerResponse.*::status = status;
    soapResponse.*::Body.*::TriggerResponse.*::description = description;

    log.debug("httpResponse [" + soapResponse + "]");
    log.debug("Exit - makeSoapResponseBody");

    return soapResponse;
}