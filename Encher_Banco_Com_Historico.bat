@echo off
title Imortais ZvZ - Maquina do Tempo
color 0D

:: =========================================================================
:: PASSO 1 - ARQUIVO PARA POPULAR O BANCO DE DADOS PELA PRIMEIRA VEZ
:: =========================================================================
:: O QUE ESSE ARQUIVO FAZ?
:: Ele roda o script 'populate_history.py' que busca múltiplas páginas de 
:: histórico no AlbionBB. Use este arquivo apenas quando quiser "encher" o
:: painel com muitas batalhas passadas de uma só vez (ex: depois de limpar o banco).
::
:: QUANDO USAR?
:: Somente uma vez no início (ou após zerar o banco de dados).
:: NÃO use isso diariamente, senão a API do AlbionBB pode bloquear sua conexão.
:: =========================================================================

echo.
echo ========================================================
echo    BATTLE BOARD IMORTAIS: MAQUINA DO TEMPO (HISTORICO)
echo ========================================================
echo.
echo Iniciando coleta massiva. Isso vai lotar o seu banco com estatisticas antigas pra 
echo o painel ficar riquissimo! Pode demorar alguns minutos.
echo.

cd /d "%~dp0"
python scripts\populate_history.py


echo.
echo ========================================================
echo    DADOS INJETADOS COM SUCESSO! DE F5 NO SITE.
echo ========================================================
echo.
pause
