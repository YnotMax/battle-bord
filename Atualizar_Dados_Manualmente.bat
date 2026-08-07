@echo off
title Imortais ZvZ Crawler
color 0B

:: =========================================================================
:: PASSO 2 - ARQUIVO DO DIA A DIA (ATUALIZAR BATALHAS RECENTES)
:: =========================================================================
:: O QUE ESSE ARQUIVO FAZ?
:: Ele roda o script 'crawler.py' que busca APENAS a última página de 
:: histórico no AlbionBB. 
::
:: QUANDO USAR?
:: Use este arquivo no seu DIA A DIA para puxar apenas as lutas novas que
:: acabaram de acontecer. É rápido e não sobrecarrega a API.
:: (Use sempre depois que o banco já foi preenchido na primeira vez)
:: =========================================================================

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
