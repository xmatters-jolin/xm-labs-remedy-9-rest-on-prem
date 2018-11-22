@echo off

rem Keep environment variables local to this script (not supported in all versions of Windows)
IF (%OS%) == (Windows_NT) SETLOCAL

rem JAVA_HOME must exist
IF ("%JAVA_HOME%") == ("") (
	ECHO "JAVA_HOME IS NOT SET AND MUST BE.  UNABLE TO CONTINUE.  EXITING APPLICATION."
	EXIT /B -1
)

REM Create the command to execute
set JC="%JAVA_HOME%\bin\java.exe"
IF NOT EXIST %JC% (
	ECHO "THE JAVA COMMAND DOES NOT EXIST IN JAVA_HOME, AND MUST.  UNABLE TO CONTINUE.  EXITING APPLICATION."
	EXIT /B -2
)

rem Set the library path
set CP=.\EncryptionUtils.jar

%JC% -cp "%CP%" com.alarmpoint.integrationagent.cli.iapasswd.IAPassword %1 %2 %3 %4 %5 %6

rem Need to store error code so that it is not reset by cd command.
set EXIT_CODE=%ERRORLEVEL%
cd %ORIG_DIR%

EXIT /B %EXIT_CODE%
