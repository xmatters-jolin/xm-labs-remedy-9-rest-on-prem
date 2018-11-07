#! /bin/sh

INSTALL_DIR=$( cd "$( dirname "$0" )" && pwd )/..

CP=$INSTALL_DIR/bin/EncryptionUtils.jar

ORIG_DIR=$CD
cd $INSTALL_DIR

# java executable for xMatters Agent, change if you have multiple jdks installed. Trying to find the configured by default
[ -z "${JAVA_HOME}" ] && [ -x /etc/alternatives/java ] && JAVA_HOME=$(readlink -f /etc/alternatives/java | sed 's/\/bin\/java//')
JAVA=${JAVA_HOME}/bin/java


$JAVA -cp $CP com.alarmpoint.integrationagent.cli.iapasswd.IAPassword $1 $2 $3 $4 $5 $6

EXIT_CODE=$?
cd $ORIG_DIR
exit $EXIT_CODE
