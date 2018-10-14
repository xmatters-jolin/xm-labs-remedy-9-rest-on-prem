// ----------------------------------------------------------------------------------------------------
// Configuration settings for the BMC Remedy 9 Incident Integration Service
// ----------------------------------------------------------------------------------------------------

// ----------------------------------------------------------------------------------------------------
// This value determines the form that will be used to inject events into xMatters.
// The "DELETE" (terminate event) request is also based on this URL.
// ----------------------------------------------------------------------------------------------------
var WEB_SERVICE_URL = "https://<company>.xmatters.com/api/integration/1/functions/<inbound integration uuid>/triggers";

//----------------------------------------------------------------------------------------------------
// The Web Login ID used to authenticate the request to xMatters. The user's password should be encrypted
// using the iapassword.sh utility. Please see the integration agent documentation for instructions.
//----------------------------------------------------------------------------------------------------
var INITIATOR = "<xmatters-user-with-rest-web-service-user-role>";
var INITIATOR_PASSWORD_FILE = "conf/xm_initiator.pwd";
var INITIATOR_PASSWORD = getPassword(INITIATOR_PASSWORD_FILE);

//----------------------------------------------------------------------------------------------------
// Name of the filter from conf/deduplicator-filter.xml to be used to detect duplicate events
//----------------------------------------------------------------------------------------------------
var DEDUPLICATION_FILTER_NAME = "bmc-remedy-9-incident-6-0-1";

//----------------------------------------------------------------------------------------------------
// Callbacks are now handled by the xMatters Agent, so do not include them int the APXML
//----------------------------------------------------------------------------------------------------
CALLBACKS = false;

//----------------------------------------------------------------------------------------------------
// URL used to retrieve information from Remedy AR/Change Management System via REST
//----------------------------------------------------------------------------------------------------
var REMEDY_SERVER_NAME = "<arserver-mid-tier-host-name>";  
var REMEDY_REST_PORT = "<arserver-mid-tier-port>";
var REMEDY_REST_GET_TOKEN_PATH = "https://" + REMEDY_SERVER_NAME + ":" + REMEDY_REST_PORT + "/api/jwt/login";
var REMEDY_REST_RELEASE_TOKEN_PATH = "https://" + REMEDY_SERVER_NAME + ":" + REMEDY_REST_PORT + "/api/jwt/logout";
var REMEDY_REST_BASE_PATH  = "https://" + REMEDY_SERVER_NAME + ":" + REMEDY_REST_PORT + "/api/arsys/v1/entry/";

//----------------------------------------------------------------------------------------------------
// The location and authentication credentials for the Remedy REST API. The user's
// password should be encrypted using the iapassword.sh utility.
//----------------------------------------------------------------------------------------------------
var REMEDY_REST_USERNAME = "<remedy-user-id-with-incident-master-role>";
var REMEDY_REST_PASSWORD_FILE = "conf/rem_rest_user.pwd";
var REMEDY_REST_PASSWORD = REMEDYIO.decryptFile(REMEDY_REST_PASSWORD_FILE);

// =====================================================================================================================
// Global variables
// =====================================================================================================================
var OPT_ANNOTATE_NUM_DELETED = true; // Will add a work note showing number of related xMatters Events terminated when an Incident is Downgraded or Manually Resolved.
var OPT_ANNOTATE_NOTIFICATION_REQUEST_ID = true; // Will add a work note showing the Inbound Integration Request ID related to the submitted notification request.
var OPT_ANNOTATE_SUPRESSED_REQUEST = true; // Will add a work note denoting the fact that this request was suppressed based on the deduplication filter.
var REQUEST_ACTION_DELETE = "Delete";
var notePrefix = "[xMatters] - "; //For Work Info notes
var INT_PROPERTY_TICKET_ID = 'Incident Number'; // Integrated properties callbacks
var log = new Logger("BMC Remedy 9 Incident 6-1-2: "); // Log4J Logger