@echo off
setlocal
cd /d "%~dp0"
set "MEMMARA_GIT=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\git\cmd\git.exe"
if not exist "%MEMMARA_GIT%" (
  echo Memmara could not find the bundled Git program.
  echo Leave this window open and tell Codex what it says.
  pause
  exit /b 1
)
echo Publishing the prepared Memmara commits to GitHub...
echo If GitHub asks you to sign in, complete the approval in your browser.
"%MEMMARA_GIT%" push -u origin main
if errorlevel 1 (
  echo.
  echo The upload did not finish. Leave this window open and tell Codex what it says.
) else (
  echo.
  echo Memmara was uploaded successfully. You can close this window.
)
pause
