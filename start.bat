@echo off
title HubMSG Resilience Runner
echo Starting HubMSG Resilience Runner...
:loop
node runner.js
echo.
echo Server stopped or crashed. Restarting in 3 seconds...
timeout /t 3 /nobreak
goto loop
