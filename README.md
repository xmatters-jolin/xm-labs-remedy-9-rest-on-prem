# BMC Remedy 9 via REST
Notify on-call response teams when critical incidents are reported in Remedy. With the xMatters and BMC Remedy closed-loop integration, the on-call members of resolver teams are automatically notified via multiple communication channels. When the recipient responds, notes are added to the incident work log and specific incident actions may take place depending on the response.

---------

<kbd>
  <img src="https://github.com/xmatters/xMatters-Labs/raw/master/media/disclaimer.png">
</kbd>

---------

# Table of Contents
1. [Pre-Requisites](#pre)
2. [Files](#Files)
3. [How it works](#how)
4. [Installation](#inst)
   1. [Verify Agents are Running](#agrun)
   2. [xMatters Agent Additional Setup](#xaset)
   3. [Create the xMatters Integration and Remedy Users](#ciru)
   4. [xMatters On-Demand Setup (Part 1)](#xset1)
      1. [Import the Communication Plan](#icp)
      2. [Assign permissions to the Communication Plan and Form](#apcpf)
	   3. [Get the Inbound Integration webhook URL](#giiw)
   5. [Install the Remedy Integration Service (on Integration Agent)](#iris)
      1. [Add the Remedy 9 Incident Integration Service files to your Integration Agent](#iris1)
      2. [Create the encrypted password files](#iris2)
      3. [Add the Deduplicator Filter for Remedy 9 Incident](#iris3)
      4. [Update the integration's *configuration.js*](#iris4)
      5. [Update the Integration Agent configuration to load the Remedy 9 Incident Integration Service](#iris5)
      6. [Restart the Integration Agent](#iris6)
      7. [Verify that the Integration Service is loaded and running](#iris7)
      8. [Determine the Remedy 9 Integration Service entry point](#iris8)
   6. [xMatters On-Demand Setup (Part 2)](#xset2)
      1. [Enable Outbound Integrations](#eoi)
      2. [Configure List Property Values](#clpv)
      3. [Configure Integration Builder Endpoints](#cibe)
      4. [Configure Integration Builder Constants](#cibc1)
      5. [Review the Default Integration Builder Constants](#cibc2)
      6. [Configure REMEDY\_FORM\_INFO and REMEDY\_FORM\_CRITERIA](#crfirfc)
   7. [Remedy Setup](#rsu)
      1. [Importing workflow definition files](#riwdf)
      2. [Configuring filters](#rcf)
      3. [Configuring ITSM user](#rciu)
      4. [Disabling automatic assignment](#rdaa)
5. [Testing](#test)
6. [Troubleshooting](#tshoot)

***

# <a name="pre"></a>1. Pre-Requisites
* Version 9.1 and above of Remedy (on-prem, or on-demand via VPN)
* Account in Remedy capable of making REST calls
* xMatters account - If you don't have one, [get one](https://www.xmatters.com)!
* Agents to Install

    The following xMatters components *MUST* be installed on a server (or VM) on-premises (your data center, or a VM in the cloud) that has the ability to connect to both your xMatters instance, and your Remedy instance.<br>
    
    *THIS MUST BE DONE BEFORE ANY OTHER INSTALLATION ACTIVITIES*
    
 * xMatters Agent (for communications back to Remedy from xMatters)
     * Overall information about the xMatters Agent is [here](https://help.xmatters.com/ondemand/xmodwelcome/xmattersagent/xmatters-agent-topic.htm)
     * Installation instructions for the xMatters Agent is [here](https://help.xmatters.com/ondemand/xmodwelcome/xmattersagent/install-xmatters-agent.htm)  
 * xMatters Integration Agent (for communications to xMatters from Remedy)
     * Overall information about the xMatters Integration Agent is [here](https://help.xmatters.com/ondemand/iaguide/integration-agent-overview.htm)
     * Installation instructions for the xMatters Integration Agent is [here](https://help.xmatters.com/ondemand/iaguide/integration-agent.htm)
     * You will also need to
         * Install the Integration Agent Utilities (instructions are also on the above reference page).
         * Request an `Integration Agent ID` from Support as part of the installation of the xMatters Integration Agent.
         * Add a Web Service User (see the section called "Create a web service user" on [this](https://help.xmatters.com/ondemand/iaguide/integration-agent.htm) page)
         * Update the default Integration Service listening port:<br>
             * Open up the installed Integration Agent's `<IAHome>\conf\IAConfig.xml` file and change the `service-gateway` listening port from its default `8081` to something else (e.g. `8181`), as this will conflict with the default listening port that the xMatters Agent is configured on as part of its out-of-the-box configuration.
             * Alternatively, you can change the default listening port for the xMatters Agent by setting a Windows Environment variable called `SERVER_PORT` to something other than `8081`.
             * Be sure to restart either the Integeation Agent or the xMatters Agent depending on where you decide to make that change.

# <a name="Files"></a>2. Files
The following are the files that makeup the Remedy 9 Incident integration.  Each of these are installed and configured into a combination of Remedy, the Agents, and your xMatters On-Demand instance.  The [Installation](#inst) section covers this in detail.

* [xMattersAgent.zip](xMattersAgent.zip) - Supplemental files for completing the xMatters Agent configuration.
* [IntegrationAgent.zip](IntegrationAgent.zip) - The Remedy Incident Integration Service and configuration files to be installed on the configured Integration Agent.
* [xMattersOnDemand/BMCRemedyITSMIncidentREST.zip](xMattersOnDemand/BMCRemedyITSMIncidentREST.zip) - Remedy Incident Communication Plan (ready to be configured).
* [Remedy.zip](Remedy.zip) - This zip file containing the BMC Remedy 8.1 and above workflow definition files.

# <a name="how"></a>3. How it works
### Information Workflow
The following diagram illustrates a standard workflow in an incident management system, and how information from the management system is passed into xMatters:
<kbd>
  <img src="media/InformationWorkflow.png">
</kbd>
### Integration Workflow
Remedy triggers one of the xMatters filters as part of the integration. The filter POSTs the Remedy Incident ID to xMatters via SOAP (a Remedy limitation), and in turn xMatters uses a Remedy REST web service call to obtain the incident properties and subsequently creates the xMatters Event targeted to the assigned resolver Group.

The notified resolver responds with:

* ACCEPT - to take ownership of the incident
* IGNORE - to escalate to the next resource in the on call schedule
* COMMENT to add an independent Work Info note
* RESOLVE - to resolve the incident.

The closed loop integration annotates the incident's Work Info log with xMatters event status, notification delivery status, annotations/comments, and user responses. Additionally, an ACCEPT response assigns the user to the incident and updates the incident status to In Progress. A RESOLVE response updates the incident status to Resolved.

<details>
<summary>Click here to display a diagram that shows the relationship and data flow between the components for a typical Incident process.</summary>

  <img src="media/RemedyIncidentRESTSequenceDiagram.png">
</details>

Additional details about this Integration may be found in the previous SOAP-based on-prem Integration Guide for BMC Remedy Incident [here](media/xM-BMC-Remedy_Incident_Management_5_1_2.pdf).

# <a name="inst"></a>4. Installation 

## <a name="agrun"></a>Verify Agents are Running
Before doing any installation steps for this Remedy Incident integration, it is critical to make sure that your xMatters Agent and Integration Agent are running and visible in your environment.<br>
To view the state of the running agents:

   * Login to your xMatters instance
   * Go to the `DEVELOPER` section
   * On the left hand context menu, click on `Agents` (directly underneath `XMATTERS AGENTS`)
   * The default view on the right is called `AVAILABLE`, you need to click on the next link `INSTALLED`
      <details><summary>Click here to see an example</summary><img src="media/xMViewAgents1.png"></details>
   
   * After clicking `INSTALLED`, you should see a list of agents.
   * Click on the "Connected" filter in the upper right side of the display, and you should at least see one connected (green and white checkmark under STATUS) `xMatters Agent` in the upper list, and one connected `Integration Agent` in the lower list
      <details><summary>Click here to see an example</summary><img src="media/xMViewAgents2.png"></details>


## <a name="xaset"></a>xMatters Agent Additional Setup
The integration expects to work with encrypted passwords (see the description of `REMEDY_WS_PASSWORD` in [Configure Integration Builder Constants](#cibc) below).<br>
In order for the system to decrypt that value, a special library (.jar file) needs to be added to the xMatters Agent installation.<br>
The following steps will guide you in adding this library:

1. Download the file [xMattersAgent.zip](xMattersAgent.zip) to the server where your xMatters Agent is installed and running.
2. Unzip the file into a temporary directory (e.g. C:\temp).  Check out [this article](https://support.microsoft.com/en-gb/help/4028088/windows-zip-and-unzip-files) if you need help with unzipping compressed files in Windows.

   <details><summary>Click here for examples of what you should find if you performed those operations in your C:\temp folder.</summary>
   <kbd><img src="media/xa-UnzippedxMattersAgent1.png"></kbd>
   <kbd><img src="media/xa-UnzippedxMattersAgent2.png"></kbd>
   <kbd><img src="media/xa-UnzippedxMattersAgent3.png"></kbd>
   </details>

3. Move (or copy) the `EncryptionUtils.jar` file to the `applib` folder of your xMatters Agent installation.  Typically this will be `C:\Program Files\xa\applib`.
   <details><summary>Click here for an example</summary>
   <img src="media/xA-1-AddEncryptionUtils.jarHere.png">
   </details>
   
4. Update the existing xerus-service.conf (`C:\Program Files\xa\config\xerus-service.conf`) file to refer to the new EncryptionUtils.jar file.<br>We have included a filed called `xerus-servcie.conf.additions` that is an example of the change you need to make to `xerus-service.conf`.
   <details><summary>Click here for an example</summary>
   <img src="media/xA-2-LocationOfxerus-service.conf.png">
   </details>

   When you open the `xerus-service.conf` file, you will want to find the last occurence of a line beginning with `wrapper.java.classpath.nn` where `.nn` is going to be a number like 29 as the example shows here.

   ```
   wrapper.java.classpath.29=${wrapper.working.dir}\\service-installer\\lib\\xercesImpl-2.9.1.jar
   ```

   Paste the two lines from `xerus-service.conf.additions` directly after the last occurence of the line starting with `wrapper.java.classpath.nn`, and make sure that the new line has a number that is one more than the previous line.  So, if the last occurence you find is `.29`, then make the new line that refers to `EncryptionUtils.jar` have `.30`.

   ```
   # Include the xMatters Encryption utility claseses
   wrapper.java.classpath.30=${wrapper.working.dir}\\applib\\EncryptionUtils.jar
   ```

   <details><summary>Click here for an example of `xerus-service.conf` after the change has been made. `DON'T FORGET TO SAVE THIS FILE AFTER MAKING YOUR CHANGES!`</summary>
   <img src="media/xA-3-Updatexerus-service.conf.png">
   </details>

5. Once you have saved the changes, the last step is to restart the xMatters Agent.  This is done from the Services applet.
   <details><summary>Click here for an example</summary>
   <img src="media/xA-4-RestartAgent.png">
   </details>


## <a name="ciru"></a>Create the xMatters Integration and Remedy Users
Prior to installing and configuring the Integration Service and Remedy Integration files, it is best to create the xMatters Integration User that the Remedy Integration Service will use to authenticate back to xMatters.  And, the Remedy `Person` that the xMatters Integration will use to make REST calls into Remedy.

### <a name="crest"></a>Create an xMatters REST user account
Note, that this account needs to have two roles:

* REST Web Service User, and
* Developer

These are required as the integration makes callbacks into xMatters to initiate and control Events (requiring the "REST Web Service User" Role), and that interrogate the Communiation Plan directly (requiring the "Developer" role).

<kbd>
  <img src="media/xMRESTUser.png">
</kbd>  

### <a name="ciu"></a>Configuring ITSM user
The integration requires a dedicated ITSM user to interact with incidents.<br>
First, create a new ITSM user with the Incident Master role in BMC Remedy; the user does not need to be Support Staff.

<kbd>
  <img src="media/RemITSMUser.png">
</kbd>

## <a name="xset1"></a>xMatters Setup (Part 1)
### <a name="icp"></a>Import the Communication Plan
* Import the "BMC Remedy ITSM - Incident - REST" Communication Plan [BMCRemedyITSMIncidentREST.zip](BMCRemedyITSMIncidentREST.zip).
Instructions on Importing Communication Plans are [here](http://help.xmatters.com/OnDemand/xmodwelcome/communicationplanbuilder/exportcommplan.htm).

### <a name="apcpf"></a>Assign permissions to the Communication Plan and Form  
* On the Communication Plans page, click the Edit drop-down menu for the "BMC Remedy ITSM - Incident - REST" Communication Plan then select Access Permissions
* Add the REST User
* On the Communication Plans page, click the Edit drop-down menu for the "BMC Remedy ITSM - Incident - REST" Communication Plan then select Forms
* Click the Mobile and Web Service drop-down menu for the Incident Alerts form
* Select Sender Permissions then add the REST User

### <a name="giiw"></a>Get the Inbound Integration webhook URL
Before we can install and configure the Remedy Integration Service into the xMatters Integration Agent, we also need to collect the URL (Webhook address) for the Inbound Integration that is called on behalf of Remedy when an Incident requires xMatters to notify folks.

* On the Communication Plans page, click the Edit drop-down menu for the "**BMC Remedy ITSM - Incident - REST**" communication plan then select Integration Builder
   <details><summary>Click here for an example</summary>
   <img alt="Integration Builder" src="media/xMOpenIntegrationBuilder.png">
   </details>
   
* Click the "**3 Configured**" link (blue text) to the right of Inbound Integrations
   <details><summary>Click here for an example</summary>
   <img alt="3 Configured" src="media/xM3Configured.png">
   </details>

* Click the "**Trigger Remedy Alert - Inbound WebHook**" link (blue text)
   <details><summary>Click here for an example</summary>
   <img alt="Initiate Incident Alerts Form" src="media/xMTriggerRemedyAlert.png">
   </details>

* Scroll to the **How to trigger the integration** section, and click on "**Select Method**", and then "**Basic Authentication**".
   <details><summary>Click here for an example</summary>
   <img alt="How to trigger the integration" src="media/xMHowToTrigger2.png">
   </details>

* Click the *Copy Url* link to the right of the Trigger, and save that value in a text file to use later on when setting up `configuration.js` [below](#iris4).
   <details><summary>Click here for an example</summary>
   <img alt="URL Authentication" src="media/xMBasicAuthCopyURL.png">
   </details>

## <a name="iris"></a>Install the Remedy Integration Service (on Integration Agent)
This section explains how to to install the Remedy 9 Incident Integration Service into the Integration Agent installed previously.<br>There are essentially eight (8) steps:

1. [Add the Remedy 9 Incident Integration Service files to your Integration Agent](#iris1)
2. [Create the encrypted password files](#iris2)
3. [Add the Deduplicator Filter for Remedy 9 Incident](#iris3)
4. [Update the integration's *configuration.js*](#iris4)
5. [Update the Integration Agent configuration to load the Remedy 9 Incident Integration Service](#iris5)
6. [Restart the Integration Agent](#iris6)
7. [Verify that the Integration Service is loaded and running](#iris7)
8. [Determine the Remedy 9 Integration Service entry point](#iris8)

### <a name="iris1"></a>Add the Remedy 9 Incident Integration Service files to your Integration Agent
Similar to the previous steps to install the files for the xMatters Agent, an Integration Service is placed into a specific location for an Integration Agent.  In this case, the files to install are contained in the distribution called [IntegrationAgent.zip](IntegrationAgent.zip).


1. Download the file [IntegrationAgent.zip](IntegrationAgent.zip) to the server where your Integration Agent is installed and running.
2. Unzip the file into a temporary directory (e.g. C:\temp).  Check out [this article](https://support.microsoft.com/en-gb/help/4028088/windows-zip-and-unzip-files) if you need help with unzipping compressed files in Windows.
   <details><summary>Click here for an example of what you should find if you performed those operations in your C:\temp folder.</summary>
   <kbd>
   <img src="media/ia-UnzippedIntegrationAgent1.png">
   </kbd><br>
   <kbd>
   <img src="media/ia-UnzippedIntegrationAgent2.png">
   </kbd><br>
   <kbd>
   <img src="media/ia-UnzippedIntegrationAgent3.png">
   </kbd><br>
   <kbd>
   <img src="media/ia-UnzippedIntegrationAgent4.png">
   </kbd><br>
   </details>

3. Move (or copy) the `bmc-remedy-9` folder (and all sub-folders) as shown above to the `<IAHome>integrationservices\applications\` folder of your xMatters Integration Agent installation.  
   <details><summary>Click here to see what this would look like if you installed your xMatters Integration Agent into `C:\xmatters\integrationagent-5.2.0`, and have moved (or copied) the `bmc-remedy-9` folder (and all sub-folders) to `C:\xmatters\integrationagent-5.2.0\integrationservices\applications\`.</summary>
   <kbd>
   <img src="media/ia-UnzippedIntegrationAgent5.png">
   </kbd>
   </details>

### <a name="iris2"></a>Create the encrypted password files
The xMatters Integration Agent creates several utilities, and one in particular ("iapassword.bat") is useful for encrypting sensitive information, like passwords.  The documentation for the "iapassword.bat" utility is located [here](https://help.xmatters.com/ondemand/iaguide/iapasswordutility.htm).  But we'll cover examples of how to create them for this integration via a few screen shots.

1. Open up a Windows Command Prompt, and change directory to your xMatters Integration Agent's `bin\` folder.
2. If you do a `dir` command, you will see the contents, including the `iapassword.bat` utility.
3. Typing in the command name and pressing Enter will show you the command usage.
   <details><summary>Click here for an example</summary>
   <kbd>
   <img src="media/cp1.png">
   </kbd>
   </details>
   
4. We want our two passwords to go into the `conf` directory, so we will specify that on the command line.
5. The format for the "iapassword" command we can use to create the encrypted password for the Integration User we created previoustly (svc-rest-remedy-incident), is as follows:<br>`iapassword --new <password> --file <relative-path-and-name>`.<br>The actual command would look something like this:<br>`iapassword --new xM@tt3rs --file conf\xm_initiator.pwd`<br>In this example, the unencrypted password is `xM@tt3rs` with the encrypted version in `conf\xm_initiator.pwd` is `niuVvodM3AaaM/8Sn+jqiw==`.
   <details><summary>Click here to display a screenshot of creating this file in the `conf` directory.  There is a before and after view of the `conf` directory, as well as the command we ran to create the encrypted file, as well as a display of the encrypted value.</summary>
   <kbd>
   <img src="media/cp2.png">
   </kbd>
   </details>
   
6. Let's follow up with creating the encrypted password for the Remedy 9 Incident user created previously.<br>As before, we'll user the same format of command line, but replace the password and file names, as follows:<br>`iapassword --new Remedy9! --file conf\rem_rest_user.pwd`<br>In this example, the unencrypted password is `Remedy9!` with the encrypted version in `conf\rem_rest_user.pwd` is `R5UMpF4Zeb2aM/8Sn+jqiw==`.
   <details><summary>Click here for a screenshot of creating this file in the `conf` directory.  There is a before and after view of the `conf` directory, as well as the command we ran to create the encrypted file, as well as a display of the encrypted value.</summary>
   <kbd>
   <img src="media/cp3.png">
   </kbd>
   </details>
   
7. Keep track of the encrypted password file location for the Remedy User, as we will need to use that value when configuring the `REMEDY_WS_PASSWORD` constant in [Configure Integration Builder Constants](#cibc1) below.

### <a name="iris3"></a>Add the Deduplicator Filter for Remedy 9 Incident
The xMatters Integration Agent includes the capability to deduplicate Events as they are attempting to be injected into your xMatters environment.  This is a pre-cursor to the Flood Control features that are startig to be introduced in future releases of xMatters.  Eventually, this will not be required, but for now we will configure it.<br>The file that includes this information is in the `<IAHome>\conf\` directory and is called `deduplicator-filter.xml`.  We have included a filter to add into this file that was expanded when we added the new files [above](#iris1).<br>If you followed the naming conventions we used previously, you will want to open the file `C:\temp\IntegrationAgent\conf\deduplicator-filter.xml` and copy the lines starting with `<filter>` and and continuing through `</filter>` to the clipboard.<br>The part to copy will look something lide this:

```
  <!-- Filter to prevent duplicate BMC Remedy Incident events injecting more often than once every 3 mins -->
  <filter name="bmc-remedy-9-incident-6-0-1">
    <predicates>
      <predicate>incident_number</predicate>
      <predicate>status</predicate>
      <predicate>slm_status</predicate>
      <predicate>urgency</predicate>
      <predicate>priority</predicate>
      <predicate>impact</predicate>
      <predicate>recipients</predicate>
    </predicates>
    <suppression_period>180</suppression_period>
    <window_size>100</window_size>
  </filter>
```
Now, we need to paste that into the main deduplication filter in `<IAHome>\conf\deduplicator-filter.xml` (in our case the actual file path and name are `C:\xmatters\integrationagent-5.2.0\conf\deduplicator-filter.xml`).<br>Edit this file in something like `notepad++` or `wordpad`, and paste the above section inbetween the last occurence of `</filter>` and the `</deduplicator>` at the end of the file.<br>Here's a before and after view starting with the out-of-the-box version of `deduplicator-filter.xml` from the 5.2.0 version of the Integration Agent, and ending with our additional elements.

```
<?xml version="1.0"?>
<!--
 | EventDeduplicator Configuration file.
 | 
 | Filter attributes
 |   attribute: predicates
 |   comments : This is the list of predicates that are considered in event correlation. An event request will
 |              be considered for deduplication only if all of these predicates are present in the request, AND
 |              if all of the predicates' values match those of a previous request.
 |
 |   attribute: suppression_period
 |   comments : An event request will be deduplicated only if a matching request was processed less than this
 |              number of seconds ago.
 |
 |   attribute: window_size
 |   comments : This is the number of non-matching events before the suppression period timer is reset.
 |              An event request will not be deduplicated if this many non-matching requests have been received
 |              within the suppression period.
 +-->
<deduplicator xmlns="http://www.alarmpoint.com/schema">
  <!-- sample filter to prevent pinging more often than once every 5 minutes to any device -->
  <filter name="ping-plan">
    <predicates>
      <predicate>device</predicate>
    </predicates>
    <suppression_period>300</suppression_period>
    <window_size>2000</window_size>
  </filter>

  <filter name="sample-terminate">
    <predicates>
      <predicate>propertyName</predicate>
      <predicate>propertyValue</predicate>
    </predicates>
    <suppression_period>300</suppression_period>
    <window_size>2000</window_size>
  </filter>
  
  <filter name="sample-plan">
    <predicates>
      <predicate>building</predicate>
      <predicate>city</predicate>
    </predicates>
    <suppression_period>20</suppression_period>
    <window_size>100</window_size>
  </filter>
  
</deduplicator>
```
And, here's the updated version (don't forget to save your changes!):

```
<?xml version="1.0"?>
<!--
 | EventDeduplicator Configuration file.
 | 
 | Filter attributes
 |   attribute: predicates
 |   comments : This is the list of predicates that are considered in event correlation. An event request will
 |              be considered for deduplication only if all of these predicates are present in the request, AND
 |              if all of the predicates' values match those of a previous request.
 |
 |   attribute: suppression_period
 |   comments : An event request will be deduplicated only if a matching request was processed less than this
 |              number of seconds ago.
 |
 |   attribute: window_size
 |   comments : This is the number of non-matching events before the suppression period timer is reset.
 |              An event request will not be deduplicated if this many non-matching requests have been received
 |              within the suppression period.
 +-->
<deduplicator xmlns="http://www.alarmpoint.com/schema">
  <!-- sample filter to prevent pinging more often than once every 5 minutes to any device -->
  <filter name="ping-plan">
    <predicates>
      <predicate>device</predicate>
    </predicates>
    <suppression_period>300</suppression_period>
    <window_size>2000</window_size>
  </filter>

  <filter name="sample-terminate">
    <predicates>
      <predicate>propertyName</predicate>
      <predicate>propertyValue</predicate>
    </predicates>
    <suppression_period>300</suppression_period>
    <window_size>2000</window_size>
  </filter>
  
  <filter name="sample-plan">
    <predicates>
      <predicate>building</predicate>
      <predicate>city</predicate>
    </predicates>
    <suppression_period>20</suppression_period>
    <window_size>100</window_size>
  </filter>
  
  <!-- Filter to prevent duplicate BMC Remedy Incident events injecting more often than once every 3 mins -->
  <filter name="bmc-remedy-9-incident-6-0-1">
    <predicates>
      <predicate>incident_number</predicate>
      <predicate>status</predicate>
      <predicate>slm_status</predicate>
      <predicate>urgency</predicate>
      <predicate>priority</predicate>
      <predicate>impact</predicate>
      <predicate>recipients</predicate>
    </predicates>
    <suppression_period>180</suppression_period>
    <window_size>100</window_size>
  </filter>

</deduplicator>
```

### <a name="iris4"></a>Update the integration's `configuration.js`
The file `configuration.js` contains the installation / implementation specific values that this Integration Service needs in order to communicate with both your xMatters On-Demand and Remedy 9 instances.<br>The file is located under `<IAHome>\integrationservices\applications\bmc-remedy-9\incident-6-0-1`, so in our example, the actual location is:<br>`C:\xmatters\integrationagent-5.2.0\integrationservices\applications\bmc-remedy-9\incident-6-0-1\configuration.js`<br>Open the file up in a local editor (e.g. `notepad++` or `wordpad`) and edit the file.<br>There are several important values to specify and update here:

| Variable               | Value Description                                                          |
|:---------------------- |:-------------------------------------------------------------------------- |
| `* WEB_SERVICE_URL` |  This value determines the form that will be used to inject events into xMatters. The "DELETE" (terminate event) request is also based on this URL. |
| `* INITIATOR` | The Web Login ID used to authenticate the request to xMatters.  This is the user created in the [Create an xMatters REST user account](#crest) step above. (e.g. `"svc-rest-remedy-incident"`)|
| `* INITIATOR_PASSWORD_FILE` | The relative location of the initiating user's encrypted password file, as created in the [Create the encrypted password files](#iris2) step above. (e.g. `"conf/xm_initiator.pwd"`)|
| `* REMEDY_SERVER_NAME` | AR Server's mid-tier host name (the physical server's FQDN). (e.g. `"remedyars.mycompany.com"`). |
| `* REMEDY_REST_PORT` | The AR Server's port that is used by Atrium Core Web Services to recieve REST requests (possibly 8443).  Note that this is not the same port that you use to access the Web UI (typically 8080).|
| `* REMEDY_REST_USERNAME` | Login ID of the Remedy User that will be making REST API calls back into Remedy.  This is the user created in the [Configuring ITSM user](#ciu) step above. (e.g. `"xmatters"`) |
| `* REMEDY_REST_PASSWORD_FILE` | The relative location of the initiating user's encrypted password file, as created in the [Create the encrypted password files](#iris2) step above. (e.g. `"conf/rem_rest_user.pwd"`) |

Here is an example of the contents of `configuration.js` before being updated:

```javascript
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
```

And an example of the contents of `configuration.js` after being updated:

```javascript
// ----------------------------------------------------------------------------------------------------
// Configuration settings for the BMC Remedy 9 Incident Integration Service
// ----------------------------------------------------------------------------------------------------

// ----------------------------------------------------------------------------------------------------
// This value determines the form that will be used to inject events into xMatters.
// The "DELETE" (terminate event) request is also based on this URL.
// ----------------------------------------------------------------------------------------------------
var WEB_SERVICE_URL = "https://xxx.xmatters.com/api/integration/1/functions/147a29bf-47b6-b591-e67e-b2b646699748/triggers";

//----------------------------------------------------------------------------------------------------
// The Web Login ID used to authenticate the request to xMatters. The user's password should be encrypted
// using the iapassword.sh utility. Please see the integration agent documentation for instructions.
//----------------------------------------------------------------------------------------------------
var INITIATOR = "svc-rest-remedy-incident";
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
var REMEDY_SERVER_NAME = "vic-vw-remedy91";  
var REMEDY_REST_PORT = "8443";
var REMEDY_REST_GET_TOKEN_PATH = "https://" + REMEDY_SERVER_NAME + ":" + REMEDY_REST_PORT + "/api/jwt/login";
var REMEDY_REST_RELEASE_TOKEN_PATH = "https://" + REMEDY_SERVER_NAME + ":" + REMEDY_REST_PORT + "/api/jwt/logout";
var REMEDY_REST_BASE_PATH  = "https://" + REMEDY_SERVER_NAME + ":" + REMEDY_REST_PORT + "/api/arsys/v1/entry/";

//----------------------------------------------------------------------------------------------------
// The location and authentication credentials for the Remedy REST API. The user's
// password should be encrypted using the iapassword.sh utility.
//----------------------------------------------------------------------------------------------------
var REMEDY_REST_USERNAME = "xmatters";
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
```

### <a name="iris5"></a>Update the Integration Agent configuration to load the Remedy 9 Incident Integration Service
Once the Remedy 9 Integration Service has been configured, we need to add a reference to it in the xMatters Integration Agent's main configuration file, `IAConfig.xml`.<br>That file is located under `<IAHome>\conf`.<br>So, in our example, the full path to the file would be `C:\xmatters\integrationagent-5.2.0\conf\IAconfig.xml`.<br>The section that needs to be modified is near the end of the file, and is called `service-configs`.<br>The out-of-the-box version of this section will look something like this:

```
  <!--
  | The Service Config files are organized in a file structure rooted
  | in a common directory within this IA's installation directory.
  |
  | attribute: dir
  | comments : must be "../integrationservices"
  |
  +-->
  <service-configs dir="../integrationservices">
    <!--
     | 0 or more paths (relative to <services-configs>/@dir), that refer to
     | the Service Config files that this IA will load whenever it is started or
     | the "iadmin reload all" command is issued.
     |
     | NOTE: Paths may be Unix or Windows-formatted, although it is
     | recommended that Unix-formatting be used since it works under both environments.
     |
     | NOTE: Depending on the OS, paths may be case-sensitive.
     +-->
    <path>applications/sample-integrated-properties/sample-integrated-properties.xml</path>
    <path>applications/sample-plan/sample-plan.xml</path>

    <path>applications/sample-terminate/sample-terminate.xml</path>
    <path>applications/ping-plan/ping-plan.xml</path>
  </service-configs>
```
We can use a text editor (e.g. "notepad++" or "wordpad") to modify this file.<br>We need to add a new `<path>` statement to refer to the newly installed and configured BMC Remedy 9 Incident Integration Service.<br>That line will look something like this:<br>
	`<path>applications/bmc-remedy-9/incident-6-0-1/bmcremedyincident.xml</path>`<br>
You can either add this to the end of the existing <service-configs> section, or replace the existing `<path>` statements with just this one (recommended if this is the only Integration Service you will be running).<br>If you've removed all but the new integration service, then you're updated section may look something like this.

```
  <!--
  | The Service Config files are organized in a file structure rooted
  | in a common directory within this IA's installation directory.
  |
  | attribute: dir
  | comments : must be "../integrationservices"
  |
  +-->
  <service-configs dir="../integrationservices">
    <!--
     | 0 or more paths (relative to <services-configs>/@dir), that refer to
     | the Service Config files that this IA will load whenever it is started or
     | the "iadmin reload all" command is issued.
     |
     | NOTE: Paths may be Unix or Windows-formatted, although it is
     | recommended that Unix-formatting be used since it works under both environments.
     |
     | NOTE: Depending on the OS, paths may be case-sensitive.
     +-->
    <path>applications/bmc-remedy-9/incident-6-0-1/bmcremedyincident.xml</path>
  </service-configs>
```
Be sure to Save your updates!

### <a name="iris6"></a>Restart the Integration Agent
The last step is to stop and restart the xMatters Integration Agent.  If you followed the recommendations in the out-of-the-box installation guide for the Integration Agent under Windows, then you can control it with the Services applet (as we did before with the xMatters Agent).
   <details><summary>Click here to display a screenshot of clicking "Restart" in the Services applet for the xMatters Integration Agent.</summary>
   <img src="media/ia-restart.png">
   </details>

### <a name="iris7"></a>Verify that the Integration Service is loaded and running
To verify that the new Integration Service was loaded and listening for requests, we use the `"iadmin.bat"` utility, that is located under `<IAHome>\bin` (or in our case `C:\xmatters\integrationagent-5.2.0\bin\iadmin.bat`).  The `iadmin` utility can take several commands, and you can read all about them [here](https://help.xmatters.com/ondemand/iaguide/managetroubleshoot.htm).  In this case, the command that we use is called `get-status`, and the command line for this is `iadmin get-status`.<br><br>From a Status perspective, we want to see two things in the output of this command:<br><br>1.) we want to look for a line that says `Connectivity status: PRIMARY_ACCEPTED`, as that tells us we are connected successfully to your xMatters instance, and <br><br>2.) we want to see a line under our Integration Service that shows `Status: ACTIVE`.<br>If either of those are missing, then you need to verify the edits and updates that were made to both `<IAHome>\conf\IAConfig.xml` and `<IAHome>\integrationservices\applications\bmc-remedy-9\incident-6-0-1\configuration.js`.<br><br>Here is a screenshot of a successfully installed and configured Remedy 9 Integration Service:
<kbd>
  <img src="media/ia-configured.png">
</kbd>

### <a name="iris8"></a>Determine the Remedy 9 Integration Service entry point
The last part of this section is to get the Web Service entry point (web hook URL) that we will need to apply to the [Configuring filters](#rcf) step when configuring the Filters in Remedy later.  The value that you see from the `iadmin get-status` command above is almost correct, but we need to make a slight modification so that it includes a reference to the way the service's entry point will listen for requests (this is an `http` service in our case).<br><br>The URL from the screen shot above looks like this:<br>`http://10.128.0.52:8081/applications_bmc-remedy-9-incident-6-0-1`<br><br>but, when we use it to configure the Filter in Remedy, it should look like this:<br>**`http://10.128.0.52:8081/http/applications_bmc-remedy-9-incident-6-0-1`**<br>(notice the "/http" added between the `8081` and the start of `applications...`.<br><br>The first part of the address will be different and specific to your installed and configured Integration Agent.<br><br>If you get stuck, again, review the changes and edits made above, as well as review the section called [Manage and Troubleshooting your Integration Agent](https://help.xmatters.com/ondemand/iaguide/managetroubleshoot.htm) section of the online documentation.

## <a name="xset2"></a>xMatters Setup (Part 2)
### <a name="eoi"></a>Enable Outbound Integrations
When you first load a Communication Plan that has Outbound Integrations configured to use the xMatters Agent, those Outbound Integrations come up as disabled.  This is because you have to tell xMatters On-Demand, which xMatters Agent (or Agents) you would like those Outbound Integrations to run on.

Here is how to Enable an Outbound Integration, and point it to a specific xMatters Agent.<br>**Note: You will need to perform the following steps for each of the 8 Outbound Integrations.**

* On the Communication Plans page, click the Edit drop-down menu for the "**BMC Remedy ITSM - Incident - REST**" communication plan then select Integration Builder
   <details><summary>Click here for an example</summary>
   <img alt="Integration Builder" src="media/xMOpenIntegrationBuilder.png">
   </details>

* Click the *8 Configured* link (blue text) to the right of Outbound Integrations
   <details><summary>Click here for an example</summary>
   <img alt="8 Configured" src="media/xM8Configured.png">
   </details>

* Click on any of the eight Outbound Integrations links (blue text), for example "**Incident Alerts - Device Delivery Updates**"<br>Notice that the toggle switch to the left of each name is white, instead of green, signifying that it is disabled.
![Select Outbound Integration](media/xMSelectOutboundIntegration.png)

* Select (click on the checkbox) the xMatters Agent that you want the Oubtound Integrations to run on.
   <details><summary>Click here for an example</summary>
   <img alt="Select Agent Before" src="media/xMSelectAgentBefore.png">
   </details>

* After Selecting you'll be able to Update the integration by clicking on the "Update Outbound Integration" button
   <details><summary>Click here for an example</summary>
   <img alt="Select Agent After" src="media/xMSelectAgentAfter.png">
   </details>

* You may be presented with a warning telling you to restart the xMatters Agent.  That is normal, and you should defer until you have enabled all eight Outbound Integrations.  This is a requirement as it ensures that the user who enabled the integrations was authorized to do so by the agent.  This is a one time activity.
   <details><summary>Click here for an example</summary>
   <img alt="Restart Agent After Update" src="media/xMRestartAgent.png">
   </details>

* Click on the "*BMC Remedy ITSM - Incident - REST*" breadcrumb at the top of the page to go back
   <details><summary>Click here for an example</summary>
   <img alt="Click breadcrumb" src="media/xMBreadcrumbBack.png">
   </details>

* After all eight are enabled, your list of Outbound Integrations should look like this.
![All Enabled](media/xMAllOutboundEnabled.png)

* Finally, Restart the xMatters Agent that we just pointed all of those Outbound Integrations at.<br>This is done from the Services applet back on the Server/VM hosting the xMatters Agent.
   <details><summary>Click here for an example</summary>
   <img alt="Restart Agent" src="media/xA-4-RestartAgent.png">
   </details>

### <a name="clpv"></a>Configure List Property Values  
* On the Communication Plans page, click the Edit drop-down menu for the "BMC Remedy ITSM - Incident - REST" Communication Plan then select `Properties` from the sub-menu. 
* Verify/Edit the following list of Property values:  
   * Company  
   * Contact\_Sensitivity  
   * Escalated  
   * Impact  
   * Priority  
   * Reported\_Source  
   * SLM_Status  
   * Service\_Type  
   * Status  
   * Status\_Reason  
   * Urgency  
   * VIP

### <a name="cibe"></a>Configure Integration Builder Endpoints  
* On the Communication Plans page, click the Edit drop-down menu for the "BMC Remedy ITSM - Incident - REST" Communication Plan then select Integration Builder
* Click the "Edit Endpoints" button
* For the `xMatters` endpoint, in Assign Endpoint add the REST User from above (e.g. svc-rest-remedy-incident), then Save Changes
* For the `RemedyRESTAPI` endpoint, type the Base URL for the Remedy environment's REST Web Service address (e.g. https://remedyServer:8443) then Save Changes
* Close Edit Endpoints  

### <a name="cibc1"></a>Configure Integration Builder Constants
Note: There are many Constants defined in the Communication Plan (and described below), but only the ones that are environment specific need to be configured.  Those will have an asterisk (*) in front of their name.

* On the Communication Plans page, click the Edit drop-down menu for the "BMC Remedy ITSM - Incident - REST" Communication Plan then select Integration Builder
* Click the "Edit Constants" button
* Edit these constants to match your environment (used by the scripts in the Communication Plan, and the "Remedy Rest Util" Shared Library)
   
| Constant               | Description                                                                |
|:---------------------- |:-------------------------------------------------------------------------- |
| `* REMEDY_FORM_CRITERIA` | JSON Array containing objects with property values that when matched cause a particular form to be used. (This object is dependent on the constant `REMEDY_FORM_INFO`.  See specific configuration instructions for both below). |
| `* REMEDY_FORM_INFO` | JSON Object representing the FORMs in this Communication Plan, their name and trigger URL. (This values in this object are used by the constant `REMEDY_FORM_CRITERIA`.  See specific configuration instructions for both below). |
| `* REMEDY_FQDN` | The fully qualified domain name AND port of the Remedy Mid Tier server that provides the Remedy Web User Interface.  Typically this is on port 8080. |
| `* REMEDY_SERVER_NAME` | The logical server name to target in Remedy. |
| `* REMEDY_WS_PASSWORD` | The Remedy API user's encrypted password.<br>Note: This is created using the xMatters Integration Agent's iapassword.bat utility.  See the instruction [here](https://help.xmatters.com/ondemand/iaguide/iapasswordutility.htm).  Once the file is created, open it up in any text editor and paste the contents into this value. |
| `* REMEDY_WS_USERNAME` | Login ID of the Remedy User that will be making API calls. |

### <a name="cibc2"></a>Review the Default Integration Builder Constants
Note: There are many Constants defined in the Communication Plan (and described below), but only the ones that are environment specific need to be configured.  Those will have an asterisk (*) in front of their name.

* On the Communication Plans page, click the Edit drop-down menu for the "BMC Remedy ITSM - Incident - REST" Communication Plan then select Integration Builder
* Click the "Edit Constants" button
* Review these constants used by the scripts in the Communication Plan, and the "Remedy Rest Util" Shared Library.  They all have default values that are suitable for getting started.
   
| Constant               | Description                                                                |
|:---------------------- |:-------------------------------------------------------------------------- |
| `REMEDY_ENDPOINT` | The name of the xMatters endpoint object to use for calls to Remedy (default is "RemedyRESTAPI"). |
| `REMEDY_NOTE_PREFIX` | Text that is placed in-front of all Work Notes (default is "[xMatters] -"). |
| `REMEDY_OPT_ADD_JSON_HEADER` | If true, include the "Conent-Type: application/json" HTTP request header.<br>Note: This should be false if scripts are running in the xMatters Agent (default is false). |
| `REMEDY_OPT_MOCK_ENABLED [OPTIONAL]` | If exists, and the value is true, then export the mocked functions and variables. |
| `REMEDY_OPT_SIMPLE_GROUP_NAME` | If true, construct the xMatters target group name as just whatever value is in "Assigned_Group" vs. concatonating all Support Group name qualifiers "Support Company\*Support Organization\*Assigned\_Group" .  For example, "Desktop Support" vs "Calbro Services\*IT Support\*Desktop Support". (The default is true.)|
| `REMEDY_RESOLVED_RESOLUTION` | Description set in the Resolution field when the "Resolve" Response Option is taken. (Default is "Ticket resolved via xMatters notification response".) |
| `REMEDY_RESOLVED_RESOLUTION_METHOD` | Method set in the Resolution Method field when the "Resolve" Response Option is taken. (Default is "Self-Service".) |
| `REMEDY_STATUS_IN_PROGRESS` | Value put into the Status field upon Accept (default is "In Progress", but must map to a value that is configured in your Remedy instance). |
| `REMEDY_STATUS_REASON` | Value entered into the Status_Reason field upon Resolution (default is "No Further Action Required"). |
| `REMEDY_STATUS_RESOLVED` | Value put into the Status field upon Resolution (default is "Resolved", but must map to a value that is configured in your Remedy instance). |
| `RESPONSE_ACTION_ACCEPT` | Response Option representing Accept (default is "accept"). |
| `RESPONSE_ACTION_ACK` | Response Option representing Acknowledgement (short) (default is "ack"). |
| `RESPONSE_ACTION_ACKNOWLEDGE` | Response Option representing Acknowledgement (full) (default is "acknowledge"). |
| `RESPONSE_ACTION_ANNOTATE` | Response Option representing Annotate (same result as comment) (default is "annotate"). |
| `RESPONSE_ACTION_COMMENT` | Response Option representing Comment (default is "comment"). |
| `RESPONSE_ACTION_IGNORE` | Response Option representing Ignore (Escalate) (default is "ignore"). |
| `RESPONSE_ACTION_JOIN` | Response Option representing Join (Conference Bridge Only) (default is "join"). |
| `RESPONSE_ACTION_RESOLVE` | Response Option representing Resolve/Resolution (default is "resolve"). |


### <a name="crfirfc"></a>Configure REMEDY\_FORM\_INFO and REMEDY\_FORM\_CRITERIA
The ability to choose and route incoming requests from Remedy to a particular Form based on the need (or not) for a Conference Bridge is performed dynamically by the Inbound Integration and controlled by two constants: `REMEDY_FORM_INFO` and `REMEDY_FORM_CRITERIA`.

#### Configure REMEDY\_FORM\_INFO
`REMEDY_FORM_INFO` is used to hold the information on the Forms and their Inbound Integration entry points.  The out-of-the-box configuration contains two Forms ("Incident Alerts", and "Incident Alerts with Bridge") that have corresponding Inbound Integration entry points/web hooks ("Initiate Incident Alerts Form", and "Initiate Incident Alerts with Bridge Form" respectively).
The contents of this constant is a JSON (JavaScript Object Notation) array of objects, each representing information about one of these Forms.
Each element has a particular format and fields.  The only two fields of each element that you will need to configure are the `"triggerURL"` and `"URLUser"` fields.  They represent the Inbound Integration address and the user that will be authenticating to call that trigger.
Here is the out-of-the-box, unconfigured version of `REMEDY_FORM_INFO`.

```javascript
[
  {
    "pos": 0,
    "planName": "BMC Remedy ITSM - Incident - REST",
    "formName": "Incident Alerts",
    "userResponseOptions":"Accept,Comment,Resolve",
    "groupResponseOptions":"Accept,Ignore,Comment,Resolve",
    "triggerURL": "<TO-BE-FILLED-IN-BASED-ON-INBOUND-INTEGRATION>",
    "URLUser": "<YOUR-XMATTERS-REMEDY-REST-USER>"
  },
  {
    "pos": 1,
    "planName": "BMC Remedy ITSM - Incident - REST",
    "formName": "Incident Alerts with Bridge",
    "userResponseOptions":"Accept,Join,Comment,Resolve",
    "groupResponseOptions":"Accept,Ignore,Join,Comment,Resolve",
    "triggerURL": "<TO-BE-FILLED-IN-BASED-ON-INBOUND-INTEGRATION>",
    "URLUser": "<YOUR-XMATTERS-REMEDY-REST-USER>"
  }
]
```

The value to put into `"URLUser"` is simply the xMatters User ID for the REST User that you created previously (e.g. "svc-rest-remedy-incident").

Here is how we lookup the values to put into the "triggerURL":

* On the Communication Plans page, click the Edit drop-down menu for the "**BMC Remedy ITSM - Incident - REST**" communication plan then select Integration Builder
   <details><summary>Click here for an example</summary>
   <img alt="Integration Builder" src="media/xMOpenIntegrationBuilder.png">
   </details>

* Click the "**3 Configured**" link (blue text) to the right of Inbound Integrations
   <details><summary>Click here for an example</summary>
   <img alt="3 Configured" src="media/xM3Configured.png">
   </details>

* Click the "**Initiate Incident Alerts Form**" link (blue text)
   <details><summary>Click here for an example</summary>
   <img alt="Initiate Incident Alerts Form" src="media/xMInitiateIncidentAlertsForm.png">
   </details>

* Scroll down to the "**How to trigger the integration**" section
   <details><summary>Click here for an example</summary>
   <img alt="How to trigger the integration" src="media/xMHowToTrigger.png">
   </details>

* Select "**URL Authentication**" for the method
   <details><summary>Click here for an example</summary>
   <img alt="URL Authentication" src="media/xMURLAuthentication.png">
   </details>

* Find the REST User you created above and select it in Authenticating User field, then click the "**Copy**" link in the lower right side of the displayed Trigger URL
   <details><summary>Click here for an example</summary>
   <img alt="Copy URL" src="media/xMUserCopyURL.png">
   </details>

* Once we have the URL, we want to paste everything starting with `/api...` into the `"triggerURL"` field for the `"pos":0` element.
   * We do this by editing the Constant like so: 
    ![URL Authentication](media/xMUpdateFormInfo.png)
* Now, do the same thing for the "Initiate Incident Alerts with Bridge Form" Inbound Integration, and update the `"pos":1` element.
* Be sure to click the "Save Changes" button.
* When you are done, your `REMEDY_FORM_INFO` should contain something like this:


```javascript
[
  {
    "pos": 0,
    "planName": "BMC Remedy ITSM - Incident - REST",
    "formName": "Incident Alerts",
    "userResponseOptions":"Accept,Comment,Resolve",
    "groupResponseOptions":"Accept,Ignore,Comment,Resolve",
     "triggerURL": "/api/integration/1/functions/e8a69294-19c9-49fd-9093-06c1ffbd98a5/triggers?apiKey=7bfa98ab-9b2f-45d2-9361-c49c95c026ad",
    "URLUser": "svc-rest-remedy-incident"
  },
  {
    "pos": 1,
    "planName": "BMC Remedy ITSM - Incident - REST",
    "formName": "Incident Alerts with Bridge",
    "userResponseOptions":"Accept,Join,Comment,Resolve",
    "groupResponseOptions":"Accept,Ignore,Join,Comment,Resolve",
    "triggerURL": "/api/integration/1/functions/c7a99c60-ab67-48cc-94a6-24167e51afe5/triggers?apiKey=20888305-ed7e-4fc7-b5a6-6aa861a84c7f",
    "URLUser": "svc-rest-remedy-incident"
  }
]
```
#### Configure REMEDY\_FORM\_CRITERIA (Advanced, Optional Configuration)
**NOTE: THIS IS AN ADVANCED TOPIC, AND THE DEFAULT/OUT-OF-THE-BOX `REMEDY_FORM_CRITERIA` MAY BE SUITABLE TO START WITH**<br>
`REMEDY_FORM_CRITERIA` is used to decide at runtime what Form to initiate based on the value(s) of any named properties that are coming in from Remedy.  It relies on the information from `REMEDY_FORM_INFO` to know how to initiate a given Form by referencing the position of the specific form in the Array.

By default, an occurence of `"form":0` refers to the "Incident Alerts" Form, and an occurence of `"form":1` refers to the "Incident Alerts with Bridge" Form.

You do not have to modify `REMEDY_FORM_CRITERIA` if the out-of-the-box behavior works for you.

The default configuration operates as follows:

	* If the values from Remedy for
   		* `"impact"` is `"1-Extensive/Widespread"`, and 
    	* `"urgency"` is `"1-Critical"`, and 
    	* `"priority"` is `"Critical"`
    	
	* Then, initiate "Incident Alerts with Bridge" Form, and start a new xMatters Conference Bridge.
	
	* All other combinations will result in the non-bridge "Incident Alerts" Form.

Here is what the out-of-the-box contents of `REMEDY_FORM_CRITERIA` looks like:

```javascript
[
    {
        "defaultForm":0,
        "hasBridge":false
    },
    {
        "properties":{
            "impact":"1-Extensive/Widespread",
            "urgency":"1-Critical",
            "priority":"Critical"
            },
        "form":1,
        "hasBridge":true,
        "type":"BRIDGE",
        "useExisting":false,
        "existingEventPropFieldName":"",
        "existingEventValueFieldName":""
    },
    {
        "properties":{
            "impact":"1-Extensive/Widespread",
            "urgency":"2-High",
            "priority":"Critical"
            },
        "form":0,
        "hasBridge":false
    },
    {
        "properties":{
            "impact":"2-Significant/Large",
            "urgency":"1-Critical",
            "priority":"High"
            },
        "form":0,
        "hasBridge":false
    },
    {
        "properties":{
            "impact":"2-Significant/Large",
            "urgency":"2-High",
            "priority":"High"
            },
        "form":0,
        "hasBridge":false
    },
    {
        "properties":{
            "impact":"3-Moderate/Limited",
            "urgency":"1-Critical",
            "priority":"High"
            },
        "form":0,
        "hasBridge":false
    },
    {
        "properties":{
            "impact":"3-Moderate/Limited",
            "urgency":"2-High",
            "priority":"High"
            },
        "form":0,
        "hasBridge":false
    }
]
```

It basically says to use Form 0 as the default Form if nothing matches the definitions that follow.

The next six (6) elements define which Form to select for a variety of combinations of properites coming in from Remedy.

If you want to add or modify the existing elements, the field definitions are as follows:

* Element 0: Represents the default form, so has a special `"defaultForm"` field, whereas all other Elements use the field named `"form"` to determine which element of the `REMEDY_FORM_INFO` array to reference.
* Other than that, all elements are able to use the following fields:
 
| Field               | Description                                                                |
|:---------------------- |:-------------------------------------------------------------------------- |
| `"properties"` | (Required: object) A JavaScript Object that contains one or more field names and values.  The field name(s) (left of the colon in quotes) represent the name of fields that are being sent to xMatters from the Remedy Incident, and the values (right of the colon) are what to match agains.  If all of the values coming from Remedy match the values defined here, then choose the form identified in the "form" field. |
| `"form"` | (Required: number) Represents the subscript into the `REMEDY_FORM_INFO` array to decide which Form to trigger.  A value of zero (0) refers to the first element in the array. |
| `"hasBridge"` | (Required: boolean, `true` or `false`) A flag that determines if a Conference Bridge is on the Form.  A value of `true` means that the Form has a Conference Bridge defined on its Layout, and a value of `false` means that the Form does not contain a Conference Bridge Defined on its layout. |
| `"type"` | (Required if `"hasBridge"` is `true`, must be `"BRIDGE"` or `"EXTERNAL"`)  If a conference bridge is required, then we need to know if we are configuring an xMatters Hosted Bridge (`"BRIDGE"`), or an External Bridge (`"EXTERNAL"`).  See [this](https://help.xmatters.com/ondemand/userguide/conferencebridging/create-conference-bridge.htm) page for information on creating Conference Bridges. |
| `"subType"` | (Required if `"type"` is `"EXTERNAL"`, and must be `"STATIC"` or `"DYNAMIC"`)  This identifies if the externally defined bridge information has a Bridge Number defined in its definition (`"STATIC"`), or if the Bridge Number is to be specified at run-time (`"DYNAMIC"`) |
| `"bridgeId"` | (Required if `"type"` is `"EXTERNAL"`) Name of pre-defined 3rd-party Conference Bridge object (e.g. "My Skype Priority 1 Bridge"). |
| `"bridgeNumber"` | (Required if `"subType"` is `"DYNAMIC"`, string) Digits representing bridge number (e.g. "13849348". |
| `"dialAfter"` | (Optional: string) digits or characters to dial after the bridgeNumber (e.g. "#" or ",,,#", etc). |
| `"useExisting"` | (Optional: boolean, `true` or `false`)  If present and `"hasBridge"` is `true`, then you can specify values for `"existingEventPropFieldName "` and `"existingEventValueFieldName"` to allow the script to lookup the information related to an exissting/running Conference Bridge. |
| `"existingEventPropFieldName"` | (Optional: string)  If present and `"useExisting"` is `true`, then you can specify either `"eventId"` or the name of a property in the incoming payload from Remedy to get the Event Id for an existing event that will contain the running Conference Bridges details. |
| `"existingEventValueFieldName"` | (Optional: string)  If present and `"useExisting"` is `true`, then you use this field to specify the name of the field that can be used to lookup the running Event.<br>If `"existingEventPropFieldName"` = `eventId`, then the contents of the field named in `"existingEventValueFieldName"` will be an active xMatters Event Id.<br>Othewise, `"existingEventPropFieldName"` is the name of a Property in a running xMatters Event, and `"existingEventValueFieldName"` is the value to compare it to.<br>For example, `"existingEventPropFieldName"` may be "Incident ID" (the name of a Property in the Event to search for), and `"existingEventValueFieldName"` may be "incident_number" which will contain a Remedy Incident Number at runtime to search with (i.e. value of "incident_number" will match the value of "Incident ID" if found). |

Here's another way of thinking about how and when to specify the Conference Bridge details:

```
    hasBridge: {boolean} true | false
    
        IF "hasBridge" is true
        
            useExisting: {boolean} true | false
            
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
                        
                IF "useExisting" is true
                    existingEventPropFieldName: {string} "eventId" | "<arbitrary-event-property-name>"
                    existingEventValueFieldName: {string} "<field-name-in-source-properties-with-existingEventPropFieldName-value>"
```

	
## <a name="rsu"></a>Remedy Setup
Configuring BMC Remedy to integrate with xMatters requires the following steps:

* Import the workflow definition files
* Configure filters
* Configure the ITSM user
* Disable automatic assignments

### <a name="riwdf"></a>Importing workflow definition files
* BMC's instructions are [here](https://docs.bmc.com/docs/ars91/en/importing-object-definitions-609072836.html)
* Copy the [Remedy.zip](Remedy.zip) file to the machine that has the BMC Remedy Developer Studio installed on it.
* Unzip the file which should expand our two Remedy Incident Workflow definition files ([xm_foumdation\_8\_1.def](Remedy/xm_foundation_8_1.def), and [xm_incident\_8\_1.def](Remedy/xm_incident_8_1.def))
* Log in to the BMC Remedy Developer Studio, and then select **File** > **Import**
* Select **BMC Remedy Developer Studio** > **Object Definitions**, and then click **Next**
* Select the AR System server into which you want to upload the integration objects, and then click **Next**
* Do one of the following:  
      Type in the location of the `xm_foundation_8_1.def` file  
      Click the Browse button to the right of the text field and navigate to the location of the `xm_foundation_8_1.def` file. Select the file, and then click **Open**.  
* Click **Next**  
      If you have already imported a workflow definition file, ensure that you select the Replace Objects on the Destination Server check box (do not select the other check boxes), but note that any changes you have made to those objects will be lost. If you are sure the changes you made are necessary for your installation, you will be required to re-apply those changes to the new version of the files being imported unless you applied those changes to overlay objects.  
* Repeat the above steps to import the `xm_incident_8_1.def` file.  
      Note this file must be imported after the foundation file.  
Click **Finish**

### <a name="rcf"></a>Configuring filters
The integration includes a filter that uses the Set Fields action to consume a web service; this object needs to have its endpoint changed to the inbound Web Hook URL the Remedy 9 Incident Integration Service that is running in the Integration Agent that we previously configured in [Determine the Remedy 9 Integration Service entry point](#iris8).  The value will look something like this `http://<integration-agent-server-ip>:<service_port>/http/applications_bmc_remedy_9_incident_6_0_1`.

**Filter: XM:EI:EventInjection_100**
<kbd>
  <img src="media/remfilter1.png">
</kbd>

### <a name="rciu"></a>Configuring ITSM user
This the continuation of configuring the Remedy ITSM User that you created previously.

**Note: If you specify a Login ID of "xmatters" for this ITSM user, you can skip the following two update steps and proceed with [Disabling automatic assignment](#rdaa).**

#### Update the filter qualification
The XM:Incident_Re-Assigned_899 filter contains the following qualification criteria: `($USER$ != "xmatters")`  

This qualification prevents the integration from sending a second notification based on an incident's assignment changing because of a user response to an earlier notification. Replace `xmatters` with the name of the ITSM user created in Step One.

<kbd>
  <img src="media/RemUpdateFilterQual.png">
</kbd>

#### Update the default assignee
The out-of-box permissions allow the Submitter and Assignee (and BMC Remedy administrators) to search instances of the XM:Event Injection form. This allows users who modify incidents to see the corresponding XM:Event Injection instance for their update. To allow the ITSM user to also see all the Event Injection forms, modify the default value for the Assigned To field to the ITSM user you created.  

<kbd>
  <img src="media/RemUpdateDefaultAssignee.png">
</kbd>

### <a name="rdaa"></a>Disabling automatic assignment
To allow xMatters to control assignments, you must turn off the automatic assignment feature in BMC Remedy.

**Note: To perform this step, you will need to login as a user with Administrator permission.**

* Log in to the BMC Remedy Mid Tier web server.
* Click **Applications**, and then click the **Application Console** left-menu item.
* Click **Application Administration Console**.
* In the new window, expand **Incident Management**, and then expand **Advanced Options**.
* Select **Rules**, and then click **Open**.
* Search for all existing "Configure Incident Rules".
* For each existing rule, do the following:  
      Select the rule, and in the **Assignment Process** drop-down list, select **(clear)**.  
      Click **Save**.  


# <a name="test"></a>5. Testing

## Triggering a notification
To trigger a notification, create a new incident with a priority of High or Critical in BMC Remedy, and assign it to
a user or group that exists in both BMC Remedy and xMatters:  

<kbd>
  <img src="media/RemTriggerNotification.png">
</kbd>

## Responding to a notification
In the following example, the notification is received on an Apple iPhone, but the process is similar for all devices.  

* Notifications appear in the application Inbox  

<kbd>
  <img src="media/RemiPhone01.png" width=236 height=420>
</kbd>  

* Opening the notification displays the details  

<kbd>
  <img src="media/RemiPhone02.png" width=236 height=420>
</kbd>  

* After viewing the details, either click the respond (blue return arrow) icon at the top or scroll to the bottom of the notification  

<kbd>
  <img src="media/RemiPhone03.png" width=236 height=420>
</kbd>  

* Tap the desired response, then tap **Respond now** or **Respond with comment**  

<kbd>
  <img src="media/RemiPhone04.png" width=236 height=420>
</kbd>  

* Here's a view of the same information via Email Notification:

<kbd>
  <img src="media/RemEmail.png">
</kbd>

# <a name="tshoot"></a>6. Troubleshooting
If an xMatters notification was not received you can work backwards to determine where the issue may be:  
* Review the xMatters Reports tab and the specific [Event Log](http://help.xmatters.com/OnDemand/installadmin/reporting/eventlogreport.htm)  
* If no Event was created, review the [xMatters Inbound Integration Activity Stream](http://help.xmatters.com/OnDemand/xmodwelcome/integrationbuilder/activity-stream.htm)  
* If no activity was recorded, review the Remedy logs for a POST to xMatters
* If you see that Remedy POSTed to xmatters, next, inspect the logs from the Integration Agent that is listening for those requesets. (Search for "Exception", as well as "202" to detect if the integration was submitted to xMatters.