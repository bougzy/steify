@echo off
setlocal enabledelayedexpansion

echo.
echo  ███████╗████████╗███████╗███╗   ███╗██╗███████╗██╗   ██╗
echo  ██╔════╝╚══██╔══╝██╔════╝████╗ ████║██║██╔════╝╚██╗ ██╔╝
echo  ███████╗   ██║   █████╗  ██╔████╔██║██║█████╗   ╚████╔╝
echo  ╚════██║   ██║   ██╔══╝  ██║╚██╔╝██║██║██╔══╝    ╚██╔╝
echo  ███████║   ██║   ███████╗██║ ╚═╝ ██║██║██║        ██║
echo  ╚══════╝   ╚═╝   ╚══════╝╚═╝     ╚═╝╚═╝╚═╝        ╚═╝
echo.
echo  AI Stem Separator - Windows Setup
echo  ============================================
echo.

REM Check Node.js
echo [1/5] Checking Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found. Install from https://nodejs.org
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do echo ^✓ Node.js %%i

REM Check Python
echo.
echo [2/5] Checking Python...
where python >nul 2>&1
if %errorlevel% neq 0 (
    where python3 >nul 2>&1
    if %errorlevel% neq 0 (
        echo ERROR: Python not found. Install from https://python.org
        pause
        exit /b 1
    )
    set PYTHON=python3
) else (
    set PYTHON=python
)
for /f "tokens=*" %%i in ('%PYTHON% --version') do echo ^✓ %%i

REM Check MongoDB
echo.
echo [3/5] Checking MongoDB...
where mongod >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: MongoDB not found. Install from https://www.mongodb.com/try/download/community
    echo          OR set MONGODB_URI in .env.local to use MongoDB Atlas
) else (
    echo ^✓ MongoDB found
)

REM Install Node packages
echo.
echo [4/5] Installing Node.js dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: npm install failed
    pause
    exit /b 1
)
echo ^✓ Node packages installed

REM Install Python packages
echo.
echo [5/5] Installing Python dependencies (may take several minutes)...
%PYTHON% -m pip install --upgrade pip --quiet
%PYTHON% -m pip install soundfile numpy scipy --quiet
echo ^✓ Core audio libs installed
%PYTHON% -m pip install librosa --quiet
echo ^✓ librosa installed
echo Installing Demucs (300MB AI model)...
%PYTHON% -m pip install demucs --quiet
echo ^✓ Demucs installed

REM Create directories
if not exist "uploads\originals" mkdir uploads\originals
if not exist "uploads\stems" mkdir uploads\stems
if not exist "uploads\temp" mkdir uploads\temp

echo.
echo ============================================
echo   Setup complete!
echo ============================================
echo.
echo To start Stemify, run:
echo   npm run dev
echo.
echo Then open: http://localhost:3000
echo.
echo NOTE: MongoDB must be running before starting the app.
echo.
pause
