@echo off
title Imortais ZvZ Crawler
color 0B

echo.
echo ========================================================
echo    BATTLE BOARD IMORTAIS: Crawler de Lutas (Sincronizar)
echo ========================================================
echo.
echo Contactando a Inteligencia de Banco de Dados...
echo Aguarde, isso pode levar alguns segundos se houver lutas extensas.
echo.

:: Navega magicamente para a pasta exata onde esse script (.bat) esta
cd /d "%~dp0"

:: Executa o seu arquivo Python (o seu PC ja sabe encontrar o Python)
python scripts\crawler.py

echo.
echo ========================================================
echo    VERIFICACAO CONCLUIDA COM SUCESSO!
echo    Sua plataforma ja pode ser atualizada (F5) no navegador.
echo ========================================================
echo.
pause
