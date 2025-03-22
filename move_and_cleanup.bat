@echo off
echo Moving files from frontend to public...

REM Create public directory if it doesn't exist
if not exist "public" mkdir public

REM Copy all contents from frontend to public
xcopy /E /I /Y frontend\* public\

REM Delete the frontend folder after copying
rmdir /S /Q frontend

echo All necessary files have been moved from frontend to public folder. Frontend folder has been deleted.
pause
