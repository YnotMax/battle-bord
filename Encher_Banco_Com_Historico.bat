@echo off
title Imortais ZvZ - Maquina do Tempo
color 0D

:: =========================================================================
:: PASSO 1 - ARQUIVO PARA POPULAR O BANCO DE DADOS PELA PRIMEIRA VEZ
:: =========================================================================

echo.
echo ========================================================
echo    BATTLE BOARD IMORTAIS: MAQUINA DO TEMPO (HISTORICO)
echo ========================================================
echo.
echo Quantas paginas de historico voce quer puxar?
echo 1 pagina = +- 1 dia de ZvZs (dependendo da atividade)
echo.
echo [1] 5 paginas  (Rapido, ~1 semana)
echo [2] 10 paginas (Padrao, ~2 semanas)
echo [3] 20 paginas (Demorado, ~1 mes ou mais)
echo.
set /p escolha="Digite o numero da sua escolha (1, 2 ou 3): "

if "%escolha%"=="1" set pages=5
if "%escolha%"=="2" set pages=10
if "%escolha%"=="3" set pages=20
if "%pages%"=="" set pages=10

echo.
echo Iniciando coleta massiva de %pages% paginas...
echo Pode demorar alguns minutos dependendo da escolha.
echo.

cd /d "%~dp0"
python scripts\populate_history.py %pages%

echo.
echo ========================================================
echo    DADOS INJETADOS COM SUCESSO! DE F5 NO SITE.
echo ========================================================
echo.
pause
