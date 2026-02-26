@echo off
cls

echo ==============================
echo MY COMPANY DASHBOARD DEPLOY
echo ==============================
echo.

echo Cleaning old build...
rmdir /s /q dist 2>nul

echo.
echo Building app...
call npm run build || (
  echo.
  echo ❌ Build failed!
  pause
  exit /b
)

echo.
echo Deploying to Firebase...
call firebase deploy --only hosting || (
  echo.
  echo ❌ Deploy failed!
  pause
  exit /b
)

echo.
echo ==============================
echo ✅ DEPLOY SUCCESSFUL
echo ==============================
pause
