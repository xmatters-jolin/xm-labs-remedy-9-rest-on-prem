REMEDYIO = {};

var REMEDY_REST_BASE_PATH;
var REMEDY_REST_USERNAME;
var REMEDY_REST_PASSWORD_FILE;

(function () {
  var javaPkgs = new JavaImporter(
    java.io.File,
    java.io.FileReader,
	java.lang.Thread,
    com.alarmpoint.integrationagent.script.api,
    com.alarmpoint.integrationagent.security,
    com.alarmpoint.integrationagent.exceptions.retriable,
    com.alarmpoint.integrationagent.config.IAConfigImpl,
    com.alarmpoint.integrationagent.config.xml.IAConfigFileImpl
  );

  /**
   * Path to IA configuration file
   */
  REMEDYIO.IA_CONFIG_FILE_PATH = "conf/IAConfig.xml";

  /**
   * If true, will automatically use the proxy configuration (if any) defined in the IAConfig.xml.
   * Requires an Integration Agent version that supports proxy configuration through IAConfig.xml.
   */
  REMEDYIO.AUTOCONFIGURE_PROXY = true;

  with (javaPkgs) {
    var httpClient = new IntegrationServiceHttpClient();
    REMEDYIO.http = httpClient;

    function sleep(timeInMilliseconds) {
      IALOG.debug("Entered util.sleep(" + timeInMilliseconds + ") at: " + new Date());
      try {
          java.lang.Thread.sleep(timeInMilliseconds);
      } catch (e) {
        /*
         * This will happen if the sleep is woken up - you might want to check
         * if enough time has passed and sleep again if not - depending on how
         * important the sleep time is to you.
         */
      }
      IALOG.debug("Leaving util.sleep(" + timeInMilliseconds + ") at: " + new Date());
    };
	
    /**
     * In order to use the Remedy API, we need a JWT.
     *
     * @returns {string} the jwt
     */
    REMEDYIO.generateRemedyApiToken = function() {
      IALOG.debug("Enter - generateRemedyApiToken");
      var payload = "username=" + REMEDY_REST_USERNAME + "&password=" + REMEDY_REST_PASSWORD /* +
        "&authString:authenticationstring"*/;
      var headers = {
        "Content-Type":"application/x-www-form-urlencoded",
        "Accept": "*/*"
      };

	  var response;
	  var except = null;
	  var failed = true;
	  var numRetries = 3;
	  for (var attempt = 0;attempt < numRetries;++attempt) {
	    try {
		  // Force creattion of a new IntegrationServiceHttpClient
		  // This is required so that an empty set of Headers is used
		  // prior to adding any other headers to this request.
		  var httpClient = new IntegrationServiceHttpClient();
          REMEDYIO.http = httpClient;
          var response = this.post(payload, REMEDY_REST_GET_TOKEN_PATH, "", "", headers);
		  failed = false;
		  break;
	    } catch (e) {
		  except = e;
          var msg;
          if (e.stack) {
            msg = e.stack;
          } else if (e.name == "JavaException") {
            e.printStackTrace();
          } else {
            msg = String(e);
          }
          IALOG.warn("generateRemedyApiToken: attempt " + (attempt+1) + " of " + numRetries + " - caught Exception - name: [" + e.name + "], message [" + e.message + "]: " + msg);
		  if (attempt < 2) {
			  sleep(1000 * ((attempt+1)*3)); // Sleep for 3, then 6 seconds.
			  IALOG.debug("generateRemedyApiToken:attempt " + (attempt+1) + " of " + numRetries + " - About to call executeCommand.");
			  var cmd = ["C:\\Program Files\\BMC Software\\ARSystem\\arsignal.exe", "-u", REMEDY_SERVER_NAME];
			  var execResult = executeCommand(cmd);
			  IALOG.debug("generateRemedyApiToken: attempt " + (attempt+1) + " of " + numRetries + " - result from calling arsignal: " + execResult);
		  }
	    }
	  }
	  if (failed) {
		  throw except;
	  }
      IALOG.debug("REMEDY REST API: received " + response.status  + " -  " + response.body);
	  var jwt = null;
	  if (200 === response.status) {
		  jwt = response.body;
	  }
      IALOG.debug("Exit - generateRemedyApiToken");
      return jwt;
    };

    REMEDYIO.generateHeaderForApiRequest = function(jwt) {
      if (jwt === null || jwt.length === 0) {
        jwt = this.generateRemedyApiToken();
      }

      return {
        "Authorization": "AR-JWT " + jwt,
        "Content-Type": 'application/json',
        "Accept": 'application/json'
      };
    };

	/**
	 * ---------------------------------------------------------------------------------------------------------------------
	 * decryptFile
	 *
	 * Decrypts the password for the ServiceDeskUser used by the integration
	 *
	 * @param path file/path of the file containing the encrypted password
	 * @return decrypted password or an empty string if the password cannot be decrypted
	 * ---------------------------------------------------------------------------------------------------------------------
	 */
    REMEDYIO.decryptFile = function (path) {
      return EncryptionUtils.decrypt(new java.io.File(path));
    }

    /**
     * Release the JWT token so user is not still considered to be logged in.
     *
     * @param {string} the jwt
     */
    REMEDYIO.releaseRemedyApiToken = function(jwt) {
      IALOG.debug("Enter - releaseRemedyApiToken");
      var headers = this.generateHeaderForApiRequest(jwt);
	  
	  // Force creattion of a new IntegrationServiceHttpClient
	  // This is required so that an empty set of Headers is used
	  // prior to adding any other headers to this request.
	  var httpClient = new IntegrationServiceHttpClient();
      REMEDYIO.http = httpClient;

      var response = this.post("", REMEDY_REST_RELEASE_TOKEN_PATH, "", "", headers);
      IALOG.debug("REMEDY REST API: received " + response.status  + " -  " + response.body);
      IALOG.debug("Exit - releaseRemedyApiToken");
      return response.body;
    };

    REMEDYIO.post = function (jsonStr, url, username, password, headers) {
      return execute('POST', jsonStr, url, username, password, headers);
    }

    REMEDYIO.put = function (jsonStr, url, username, password, headers) {
      if (url === undefined) {
        throw 'The parameter "url" needs to be defined for the function "put".';
      }
      return execute('PUT', jsonStr, url, username, password, headers);
    }

    REMEDYIO.patch = function (jsonStr, url, username, password, headers) {
      if (url === undefined) {
        throw 'The parameter "url" needs to be defined for the function "patch".';
      }
      return execute('PATCH', jsonStr, url, username, password, headers);
    }

    REMEDYIO.get = function (url, username, password, headers) {
      if (url === undefined) {
        throw 'The parameter "url" needs to be defined for the function "get".';
      }
      return execute('GET', null, url, username, password, headers);
    }

    REMEDYIO.delete = function (url, username, password, headers) {
      if (url === undefined) {
        throw 'The parameter "url" needs to be defined for the function "delete".';
      }
      return execute('DELETE', null, url, username, password, headers);
    }

    function execute(method, jsonStr, url, username, password, headers) {
      IALOG.debug("\tEntering REMEDYIO.execute with method: {0}, jsonStr: {1}, and url: {2}", method, JSON.stringify(jsonStr), url);
      var urL = url === undefined ? REMEDY_REST_BASE_PATH : url,
        user = username === undefined ? REMEDY_REST_USERNAME : username,
        pwd = password === undefined ? REMEDYIO.decryptFile(REMEDY_REST_PASSWORD_FILE) : password;

      if (REMEDYIO.AUTOCONFIGURE_PROXY && REMEDYIO.iaConfig == null) {
        IALOG.debug("Reading configuration file: " + REMEDYIO.IA_CONFIG_FILE_PATH);
        var configFile = new File(REMEDYIO.IA_CONFIG_FILE_PATH);
        var iaConfigFile = new IAConfigFileImpl(new FileReader(configFile));
        REMEDYIO.iaConfig = new IAConfigImpl(iaConfigFile, configFile.getParentFile(), configFile.toURI());
      }

      if (REMEDYIO.AUTOCONFIGURE_PROXY && REMEDYIO.iaConfig.getProxyConfig().isProxyEnabled()) {
        if (REMEDYIO.proxyConfig == null) {
          IALOG.debug("Reading proxy configuration...");
          REMEDYIO.proxyConfig = REMEDYIO.iaConfig.getProxyConfig();
        }
        var proxyHost = REMEDYIO.proxyConfig.getHost();
        var proxyPort = REMEDYIO.proxyConfig.getPort();
        var proxyUsername = REMEDYIO.proxyConfig.getUsername();
        var proxyPassword = REMEDYIO.proxyConfig.getPassword();
        var proxyNtlmDomain = REMEDYIO.proxyConfig.getNtlmDomain();
        IALOG.debug("Adding the following proxy parameters: {0}:{1} {2}/{3} {4}", proxyHost, proxyPort, proxyUsername, proxyPassword, proxyNtlmDomain);
        REMEDYIO.http.setProxy(proxyHost, proxyPort, proxyUsername, proxyPassword, proxyNtlmDomain);
      }

      REMEDYIO.http.setUrl(urL);

      if (user != null) {
        REMEDYIO.http.setCredentials(user, pwd);
      }

      if (headers === undefined) {
        if (method !== 'GET') {
          IALOG.debug("\t\tAdding default header {0}={1}", 'Content-Type', 'application/json');
          REMEDYIO.http.addHeader('Content-Type', 'application/json');
          REMEDYIO.http.addHeader('Accept', 'application/json');
        }
      } else if (headers != null) {
        for (header in headers) {
          IALOG.debug("\t\tAdding header {0}={1}", header, headers[header]);
          REMEDYIO.http.addHeader(header, headers[header]);
        }
      }

      var resp;
      if (method === 'POST') {
        IALOG.debug("\t\tPOST to: {0} with payload: {1}", urL, JSON.stringify(jsonStr));
        resp = REMEDYIO.http.post(jsonStr);
      }
      else if (method === 'PUT') {
        IALOG.debug("\t\tPUT to: {0} with payload: {1}", urL, JSON.stringify(jsonStr));
        resp = REMEDYIO.http.put(jsonStr);
      }
      else if (method === 'GET') {
        IALOG.debug("\t\tGET from: {0}", urL);
        resp = REMEDYIO.http.get();
      }
      else if (method === 'PATCH') {
        IALOG.debug("\t\tPATCH to: {0} with payload: {1}", urL, JSON.stringify(jsonStr));
        resp = REMEDYIO.http.patch(jsonStr);
      }
      else if (method === 'DELETE') {
        IALOG.debug("\t\tDELETE from: {0}", urL);
        resp = REMEDYIO.http.delete();
      }

      var response = {};
      response.status = resp.getStatusLine().getStatusCode();
	  try {
        response.body = REMEDYIO.http.getResponseAsString(resp);
	  } catch (e) {
        IALOG.debug("Caught exception dereferencing the response body as a string.  resp = {0}", resp);
		response.body = "";
	  }
      REMEDYIO.http.releaseConnection(resp);
      IALOG.debug("Received response code: {0} and payload: {1}", response.status, response.body);
      return response;
    }
  }
})();
