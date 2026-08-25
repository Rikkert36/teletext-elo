@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ============================================
echo   Pack Matrix generator - op rating
echo ============================================
echo.

rem --- Python zoeken. LET OP: "where python" kan ook de Microsoft Store-
rem     placeholder in WindowsApps vinden; die staat wel op PATH maar werkt
rem     niet echt. Daarom eerst de betrouwbare Windows 'py' launcher proberen
rem     door hem echt uit te voeren, en pas daarna 'python' als terugval -
rem     en dan ook pas nadat we hem echt hebben uitgevoerd, niet enkel 'where'.
rem     De %errorlevel% binnen een haakjesblok wordt bij het inlezen van dat
rem     hele blok ingevuld, dus hier staat !errorlevel! met delayed expansion.
set "PYCMD="

py -3 --version >nul 2>nul
if !errorlevel! equ 0 set "PYCMD=py -3"

if not defined PYCMD (
    python --version >nul 2>nul
    if !errorlevel! equ 0 set "PYCMD=python"
)

if not defined PYCMD (
    echo FOUT: er is geen werkende Python-installatie gevonden op deze computer.
    echo Installeer Python via https://www.python.org/downloads/ ^(vink "Add to PATH" aan^)
    echo en start dit bestand daarna opnieuw.
    echo.
    echo ^(Zie je in het Startmenu / bij "python" een snelkoppeling naar de Microsoft
    echo  Store staan, dan is dat een lege placeholder en geen echte installatie.^)
    pause
    exit /b 1
)

echo Python gevonden: gebruik "!PYCMD!"

rem --- Zorg dat openpyxl geinstalleerd is ---
!PYCMD! -c "import openpyxl" >nul 2>nul
if not !errorlevel! equ 0 (
    echo Benodigde module 'openpyxl' wordt eenmalig geinstalleerd...
    !PYCMD! -m pip install --user openpyxl
    if not !errorlevel! equ 0 (
        echo FOUT: installeren van openpyxl is mislukt.
        pause
        exit /b 1
    )
)

echo.
!PYCMD! "%~dp0genereer_pack_matrix_rating.py"
set "EXITCODE=!errorlevel!"

echo.
if not "!EXITCODE!"=="0" (
    echo Er is iets misgegaan ^(zie foutmelding hierboven^).
)
pause
endlocal
