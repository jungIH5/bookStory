@echo off
echo Starting bookStory Platform...
docker compose up -d --build
echo.
echo Done! Please visit http://localhost:3000 in your browser.
pause
