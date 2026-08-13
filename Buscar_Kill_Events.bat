@echo off
title Imortais ZvZ - Buscar Kill Events (Mentoria V2)
color 0C

:: =========================================================================
:: BUSCAR KILL EVENTS - MENTORIA V2
:: =========================================================================
:: O QUE ESSE ARQUIVO FAZ?
:: Busca os Kill Events detalhados (quem matou quem, com qual arma, em que
:: momento da luta) na API oficial do Albion Online e salva no banco.
::
:: QUANDO USAR?
:: Rode este arquivo logo APÓS cada CTA/ZvZ, idealmente dentro de 1-2 horas
:: pois a API do Albion só guarda os eventos recentes.
:: Funciona junto com o Atualizar_Dados_Manualmente.bat.
::
:: PRÉ-REQUISITO:
:: Execute o SQL em docs/migration_v2_kill_events.sql no Supabase antes
:: de rodar este script pela primeira vez.
:: =========================================================================

echo.
echo ========================================================
echo    BATTLE BOARD IMORTAIS: Kill Events (Mentoria V2)
echo ========================================================
echo.
echo Buscando eventos de kill na API do Albion Online...
echo Isso pode levar 1-2 minutos dependendo da quantidade de batalhas.
echo.

:: Navega para a pasta raiz do projeto
cd /d "%~dp0"

:: Executa o crawler de kill events
python scripts\crawler_kills.py

echo.
echo ========================================================
echo    KILL EVENTS ATUALIZADOS!
echo    Mentoria com Carrasco Pessoal e Mortes Precoces
echo    agora disponível no site.
echo ========================================================
echo.
pause
