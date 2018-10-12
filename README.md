# BMC Remedy 9 via REST
Notify on-call response teams when critical incidents are reported in Remedy. With the xMatters and BMC Remedy closed-loop integration, the on-call members of resolver teams are automatically notified via multiple communication channels. When the recipient responds, notes are added to the incident work log and specific incident actions may take place depending on the response.

---------

<kbd>
  <img src="https://github.com/xmatters/xMatters-Labs/raw/master/media/disclaimer.png">
</kbd>

---------


# Pre-Requisites
* Version 9.1 and above of Remedy
* Account in Remedy capable of making REST calls
* xMatters account - If you don't have one, [get one](https://www.xmatters.com)!
* The following should be installed on a server on-premises that has the ability to connect to both your xMatters instance, and your Remedy instance.
 * xMatters Agent (for communications back to Remedy from xMatters)
 * xMatters Integration Agent (for communications to xMatters from Remedy)

# Files
[BMCRemedyITSMIncidentREST.zip](BMCRemedyITSMIncidentREST.zip) - download this Communication Plan to get started  
[BMCRemedy_defn.zip](BMCRemedy_defn.zip) - download this zip file containing the BMC Remedy 8.1 and above workflow definition files

# How it works
Remedy triggers one of the xMatters filters as part of the integration. The filter POSTs the Remedy Incident ID to xMatters via SOAP (a Remedy limitation), and in turn xMatters uses a Remedy REST web service call to obtain the incident properties and subsequently creates the xMatters Event targeted to the assigned resolver Group.

The notified resolver responds with ACCEPT - to take ownership of the incident, IGNORE - to escalate to the next resource in the on call schedule, Comment to add a Work Info note, or RESOLVE - to resolve the incident.

The closed loop integration annotates the incident's Work Info log with xMatters event status, notification delivery status, annotations/comments, and user responses. Additionally, an ACCEPT response assigns the user to the incident and updates the incident status to In Progress. A RESOLVE response updates the incident status to Resolved.

# Installation 

## xMatters set up
### Create a REST user account

<kbd>
  <img src="media/xMRESTUser.png">
</kbd>  

### Import the Communication Plan
* Import the "BMC Remedy ITSM - Incident - REST" Communication Plan (BMCRemedyITSMIncidentREST.zip)     http://help.xmatters.com/OnDemand/xmodwelcome/communicationplanbuilder/exportcommplan.htm

### Assign permissions to the Communication Plan and Form  
* On the Communication Plans page, click the Edit drop-down menu for the "BMC Remedy ITSM - Incident - REST" Communication Plan then select Access Permissions
* Add the REST User
* On the Communication Plans page, click the Edit drop-down menu for the "BMC Remedy ITSM - Incident - REST" Communication Plan then select Forms
* Click the Mobile and Web Service drop-down menu for the Incident Alerts form
* Select Sender Permissions then add the REST User

### Configure List Property Values  
* On the Communication Plans page, click the Edit drop-down menu for the "BMC Remedy ITSM - Incident - REST" Communication Plan then select Properties
* Verify/Edit the following list property values:  
   Company  
   Contact_Sensitivity  
   Escalated  
   Impact  
   Priority  
   Reported_Source  
   SLM_Status  
   Service_Type  
   Status  
   Status_Reason  
   Urgency  
   VIP

### Configure Integration Builder Constants and Endpoints  
* On the Communication Plans page, click the Edit drop-down menu for the "BMC Remedy ITSM - Incident - REST" Communication Plan then select Integration Builder
* Click Edit Endpoints
* For the xMatters endpoint, in Assign Endpoint add the REST User then Save Changes
* For the `RemedyRESTAPI` endpoint, type the Base URL for the Remedy environment's REST Web Service address (e.g. https://remedyServer:8443) then Save Changes
* Close Edit Endpoints  
* Click Edit Constants
* Review/edit these constants used by the "Remedy Rest Util" Shared Library
   
| Constant               | Description                                                                |
|:---------------------- |:-------------------------------------------------------------------------- |
| `REMEDY_OPT_ADD_JSON_HEADER` | If true, include the "Conent-Type: application/json" HTTP request header.<br>Note: This should be false if scripts are running in the xMatters Agent. |
| `REMEDY_OPT_MOCK_ENABLED [OPTIONAL]` | If "true", then export the mocked functions and variables. |
| `REMEDY_OPT_SIMPLE_GROUP_NAME` | If true, construct group name as just "Assigned_Group" vs. "Support Company\*Support Organization\*Assigned\_Group" .|
| `REMEDY_ENDPOINT` | The name of the xMatters endpoint object to use for calls to Remedy (e.g. RemedyRESTAPI). |
| `REMEDY_NOTE_PREFIX` | String that goes infront of all Work Info notes. |
| `REMEDY_WS_USERNAME` | Login ID of the Remedy User that will be making API calls. |
| `REMEDY_WS_PASSWORD_FILE` | Full path to file containing Remedy API users encrypted password.<br>Note: This is based on the OS that the related xMatters Agent is running in. |

### Get the `XMOD_INC_FORM_WS_URL`
* On the Communication Plans page, click the Edit drop-down menu for the "BMC Remedy ITSM - Incident - REST" communication plan then select Integration Builder
* Click the *1 Configured* link for Inbound Integrations
* Click the *Incident Alerts - Inbound* link
* Scroll to the **How to trigger the integration** section
* Select "URL Authentication" for the method
* Find the REST User you created above
* Then click the *Copy Url* link

## Remedy set up
Configuring BMC Remedy to integrate with xMatters requires the following steps:

* Import the workflow definition files
* Configure filters
* Configure the ITSM user
* Disable automatic assignments

### Importing workflow definition files
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

### Configuring filters
The integration includes a filter and an escalation that use the Set Fields action to consume a web service; these objects need their endpoints changed to the address of the integration agent.  E.g. http://<integration-agent-server-ip>:<service_port>/http/applications_bmc_remedy_9_incident_6_0_1
Filter: XM:EI:EventInjection_100  
Escalation: XM:Event Injection Retry

### Configuring ITSM user
The integration requires a dedicated ITSM user to interact with incidents.

#### Create an ITSM user
First, create a new ITSM user with the Incident Master role in BMC Remedy; the user does not need to be Support Staff.

<kbd>
  <img src="media/RemITSMUser.png">
</kbd>

**Note: If you specify a Login ID of "xmatters" for this ITSM user, you can skip the following two update steps.**

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

### Disabling automatic assignment
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


# Testing

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


# Troubleshooting
If an xMatters notification was not received you can work backwards to determine where the issue may be:  
* Review the xMatters Reports tab and the specific [Event Log](http://help.xmatters.com/OnDemand/installadmin/reporting/eventlogreport.htm)  
* If no Event was created, review the [xMatters Inbound Integration Activity Stream](http://help.xmatters.com/OnDemand/xmodwelcome/integrationbuilder/activity-stream.htm)  
* If no activity was recorded, review the Remedy logs for a POST to xMatters
* If you see that Remedy POSTed to xmatters, next, inspect the logs from the Integration Agent that is listening for those requesets. (Search for "Exception", as well as "202" to detect if the integration was submitted to xMatters.