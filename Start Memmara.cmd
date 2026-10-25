@echo off
setlocal
cd /d "%~dp0"
set "CODEX_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
set "CODEX_PNPM=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd"
if not exist "%CODEX_NODE%\node.exe" (
  echo Memmara could not find the bundled Node runtime.
  pause
  exit /b 1
)
if not exist "%CODEX_PNPM%" (
  echo Memmara could not find the bundled pnpm runtime.
  pause
  exit /b 1
)
set "PATH=%CODEX_NODE%;%PATH%"
echo Starting Memmara. Keep this window open while using the preview.
echo Open http://localhost:5173/ once VITE says ready.
call "%CODEX_PNPM%" dev
echo Memmara stopped. Any startup error is shown above.
pause
