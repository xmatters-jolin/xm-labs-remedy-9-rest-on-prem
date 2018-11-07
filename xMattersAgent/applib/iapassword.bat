@echo off

rem Keep environment variables local to this script (not supported in all versions of Windows)
IF (%OS%) == (Windows_NT) SETLOCAL

rem Get SFN path to install directory.
rem A bug in some versions of Windows makes %~dsp0 append the filename, so use this workaround.
rem Note: correct to append .. instead of \ since %~dsp0 ends with \
for %%i in (%~sf0) do set INSTALL_DIR=%%~dspi..

rem Run iapassword from the install directory so that log files appear in <install>/log
rem and to keep classpath as short as possible (Windows 2K "The input line is too long" bug).
set ORIG_DIR=%CD%
cd %INSTALL_DIR%

rem Find the Java command to execute
for /r %%G in (*.exe) do if ("%%~nxG") == ("java.exe") set JC="%%~fG"

rem Set the library path
set CP=applib\EncryptionUtils.jar

%JC% -cp "%CP%" com.alarmpoint.integrationagent.cli.iapasswd.IAPassword %1 %2 %3 %4 %5 %6

rem Need to store error code so that it is not reset by cd command.
set EXIT_CODE=%ERRORLEVEL%
cd %ORIG_DIR%

EXIT /B %EXIT_CODE%
