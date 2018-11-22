#! /bin/sh

CP=./EncryptionUtils.jar

# java executable for xMatters Agent, change if you have multiple jdks installed. Trying to find the configured by default
[ -z "${JAVA_HOME}" ] && [ -x /etc/alternatives/java ] && JAVA_HOME=$(readlink -f /etc/alternatives/java | sed 's/\/bin\/java//')
JAVA=${JAVA_HOME}/bin/java


$JAVA -cp $CP com.alarmpoint.integrationagent.cli.iapasswd.IAPassword $1 $2 $3 $4 $5 $6

EXIT_CODE=$?
exit $EXIT_CODE
