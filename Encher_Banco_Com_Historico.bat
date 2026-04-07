@echo off
title Imortais ZvZ - Maquina do Tempo
color 0D

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
