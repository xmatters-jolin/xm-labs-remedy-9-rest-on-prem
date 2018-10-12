importPackage(java.util);
importPackage(java.io);
importPackage(java.text);

importClass(Packages.com.alarmpoint.integrationagent.apxml.APXMLMessage);
importClass(Packages.com.alarmpoint.integrationagent.apxml.APXMLMessageImpl);
importClass(Packages.com.alarmpoint.integrationagent.apxml.APXMLToken);
importClass(Packages.com.alarmpoint.integrationagent.soap.exception.SOAPRequestException);

importClass(Packages.com.thoughtworks.xstream.XStream);
importClass(Packages.com.thoughtworks.xstream.converters.reflection.PureJavaReflectionProvider);

importClass(Packages.org.apache.commons.httpclient.Header);
importClass(Packages.org.apache.commons.httpclient.HttpVersion);
importClass(Packages.org.mule.providers.http.HttpResponse);

var PRODUCT_VERSION_NUMBER = "9";
var INTEGRATION_VERSION_NUMBER = "-6-0-1";
var BASE_SOURCE_PATH = "integrationservices/applications/bmc-remedy-" + PRODUCT_VERSION_NUMBER;
var INTEGRATION_SOURCE_PATH = BASE_SOURCE_PATH + "/incident" + INTEGRATION_VERSION_NUMBER;

// Core Javascript files provided by the IA
load("integrationservices/applications/lib/javascript/core/baseclass.js");
load("integrationservices/applications/lib/javascript/core/logger.js");
load("integrationservices/applications/lib/javascript/core/util.js");
load("integrationservices/applications/lib/javascript/webservices/wsutil.js"); 
load("integrationservices/applications/lib/javascript/webservices/soapfault.js");
load("integrationservices/applications/lib/javascript/xmatters/xmattersws.js"); 

// REB support
load("lib/integrationservices/javascript/event.js");
// xM REST API
load(INTEGRATION_SOURCE_PATH + "/xmrestapi.js");
// Remedy REST API
load(INTEGRATION_SOURCE_PATH + "/remedyio.js");

// Integration-specific Javascript files
load(BASE_SOURCE_PATH + "/util.js");
load(INTEGRATION_SOURCE_PATH + "/configuration.js");
load(INTEGRATION_SOURCE_PATH + "/http_event.js");
load(INTEGRATION_SOURCE_PATH + "/bmcremedyincident-event.js");
load(INTEGRATION_SOURCE_PATH + "/bmcremedyincident-properties.js");
