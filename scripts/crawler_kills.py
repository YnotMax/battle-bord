"""
SCRIPT: crawler_kills.py
OBJETIVO: Para cada batalha salva no banco, buscar os Kill Events detalhados
          na API oficial do Albion Online (gameinfo) e salvar na tabela kill_events.

USO: python crawler_kills.py
     (Recomendado rodar logo após uma CTA, enquanto os eventos ainda estão na API)

PRÉ-REQUISITO: Rodar docs/migration_v2_kill_events.sql no Supabase antes.

DEPENDÊNCIAS: pip install requests supabase python-dotenv
"""

import os
import re
import time
import requests
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Erro: Credenciais do Supabase não encontradas no .env")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

GUILD_NAME    = "I M O R T A I S"
ALBION_EVENTS = "https://gameinfo.albiononline.com/api/gameinfo/events"
REQUEST_DELAY = 1.5  # segundos entre requests para não ser bloqueado

# ─── Taxonomia de Armas para Detecção de Bomb vs Zerg Clap ───────────────────
# Baseado em análise real da batalha 1430387617 e pesquisa de meta ZvZ 2026

BOMB_WEAPONS = [
    "RIFTGLAIVE",        # Rift Glaive — DPS principal do bomb squad
    "GLAIVE",            # Glaive — variante
    "HELLFIRE",          # Hellfire Hands — AoE burst
    "BLOODLETTER",       # Bloodletter — executa alvos com HP baixo
    "WAILING_BOW",       # Wailing Bow — range que segue bomb
    "2H_FIREBOMBSTAFF",  # Fire Bomb Staff — AoE
    "MAIN_HALLOWFALL",   # Hallowfall — burst
    "MAIN_GLACIALSTAFF", # Glacial Staff — AoE gelo
    "SOULSCYTHE",        # Soulscythe — engage do bomb
    "CAMLANN",           # Camlann Mace — clump para bomb
    "GROVEKEEPER",       # Grovekeeper — knock-up clump
]

ZERG_CLAP_WEAPONS = [
    "2H_DUALSCIMITAR",   # Dual Scimitar Undead — clap frontal (confirmado na batalha)
    "GALATINE",          # Galatine Pair — clap
    "KINGMAKER",         # Kingmaker — espada régia
    "2H_ARCANESTAFF",    # Arcane Staff — range do zerg
    "2H_FIRESTAFF",      # Fire Staff Hell — confirmado na batalha
    "2H_HOLYSTAFF",      # Holy Staff — heal do zerg
    "2H_CURSEDSTAFF",    # Cursed Staff — DPS do zerg
    "MAIN_SPEAR",        # Spear — melee do zerg
]


def normalizar_arma(weapon_type: str) -> str:
    """Remove Tier (T6_) e Enchant (@3) do ID para agrupamento."""
    if not weapon_type:
        return "Desconhecida"
    weapon = re.sub(r'^T\d_', '', weapon_type)
    weapon = re.sub(r'@\d+$', '', weapon)
    return weapon


def classificar_tipo_morte(killer_weapons: list) -> str:
    """
    Dado um conjunto de armas usadas numa janela de tempo,
    classifica se foi Bomb Squad ou Zerg Clap.
    """
    bomb_score = sum(1 for w in killer_weapons if any(b in w for b in BOMB_WEAPONS))
    clap_score = sum(1 for w in killer_weapons if any(z in w for z in ZERG_CLAP_WEAPONS))
    if bomb_score > clap_score:
        return "bomb"
    elif clap_score > 0:
        return "clap"
    return "normal"


def fetch_kill_events_for_battle(battle_id: int, battle_start: str) -> list:
    """
    Pagina pela API de eventos e retorna todos os kills da batalha especificada.
    A API não filtra por battleId — filtramos do lado do cliente.
    """
    events = []
    offset = 0
    start_dt = datetime.fromisoformat(battle_start.replace('Z', '+00:00'))
    consecutive_empty = 0

    print(f"  Buscando kill events (API Albion) para batalha {battle_id}...")

    while True:
        try:
            url = f"{ALBION_EVENTS}?limit=51&offset={offset}"
            r = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=30)

            if r.status_code != 200:
                print(f"  API retornou {r.status_code}. Parando.")
                break

            batch = r.json()
            if not batch:
                break

            # Filtrar kills desta batalha específica
            battle_events = [e for e in batch if e.get('BattleId') == battle_id]
            events.extend(battle_events)

            if battle_events:
                consecutive_empty = 0
            else:
                consecutive_empty += 1

            # Para de paginar se chegamos a eventos anteriores ao início da batalha
            last_ts = batch[-1].get('TimeStamp', '')
            if last_ts:
                last_dt = datetime.fromisoformat(last_ts.replace('Z', '+00:00'))
                if last_dt < start_dt:
                    break

            # Para se 3 páginas seguidas sem nenhum evento desta batalha
            if consecutive_empty >= 3 and offset > 100:
                break

            if len(batch) < 51:
                break

            offset += 51
            time.sleep(REQUEST_DELAY)

        except requests.exceptions.Timeout:
            print(f"  Timeout na API. Tentando novamente em 5s...")
            time.sleep(5)
        except Exception as ex:
            print(f"  Erro ao buscar eventos: {ex}")
            break

    print(f"  Encontrados {len(events)} kill events para a guilda.")
    return events


def save_kill_events(battle_id: int, battle_start: str, events: list):
    """Processa e salva os kill events de mortes da nossa guilda no banco."""
    start_dt = datetime.fromisoformat(battle_start.replace('Z', '+00:00'))
    rows = []

    for e in events:
        victim = e.get('Victim', {}) or {}
        killer = e.get('Killer', {}) or {}

        # Só salvamos quando um jogador da IMORTAIS morreu
        if victim.get('GuildName', '').strip() != GUILD_NAME:
            continue

        ts_str = e.get('TimeStamp', '')
        ts_dt  = None
        if ts_str:
            try:
                ts_dt = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
            except:
                pass

        seconds_into = int((ts_dt - start_dt).total_seconds()) if ts_dt else None

        killer_equip    = killer.get('Equipment', {}) or {}
        killer_mainhand = killer_equip.get('MainHand', {}) or {}
        killer_weapon   = killer_mainhand.get('Type', '') if killer_mainhand else ''

        rows.append({
            "event_id":            e.get('EventId'),
            "battle_id":           battle_id,
            "timestamp":           ts_str,
            "victim_name":         victim.get('Name', ''),
            "victim_guild":        victim.get('GuildName', ''),
            "killer_name":         killer.get('Name', ''),
            "killer_guild":        killer.get('GuildName', ''),
            "killer_weapon":       killer_weapon,
            "killer_weapon_norm":  normalizar_arma(killer_weapon),
            "total_participants":  e.get('numberOfParticipants', 0),
            "seconds_into_battle": seconds_into,
            "is_early_death":      (seconds_into is not None and seconds_into <= 60),
        })

    if not rows:
        print(f"  Nenhuma morte da {GUILD_NAME} encontrada nesta batalha.")
        return

    try:
        supabase.table("kill_events").insert(rows).execute()
        early = sum(1 for r in rows if r['is_early_death'])
        print(f"  [OK] Salvos {len(rows)} kill events ({early} mortes precoces <=60s).")
    except Exception as ex:
        print(f"  [ERRO] Erro ao salvar: {ex}")


def processar_batalhas_pendentes(limite: int = 20):
    """
    Busca as batalhas mais recentes do banco e processa as que ainda
    não têm kill events salvos.
    """
    print("Buscando batalhas no banco...")
    battles = (
        supabase.table("battles")
        .select("id, start_time")
        .order("start_time", desc=True)
        .limit(limite)
        .execute()
    )

    if not battles.data:
        print("Nenhuma batalha encontrada no banco.")
        return

    for b in battles.data:
        battle_id    = b['id']
        battle_start = b['start_time']

        # Verifica se já tem kill events
        check = (
            supabase.table("kill_events")
            .select("event_id")
            .eq("battle_id", battle_id)
            .limit(1)
            .execute()
        )
        if check.data:
            print(f"Batalha {battle_id}: ja processada. Pulando.")
            continue

        print(f"\n> Processando batalha {battle_id} ({battle_start[:16]})...")
        events = fetch_kill_events_for_battle(battle_id, battle_start)

        if events:
            save_kill_events(battle_id, battle_start, events)

        time.sleep(REQUEST_DELAY)

    print("\n[OK] Processamento concluido.")


if __name__ == "__main__":
    processar_batalhas_pendentes(limite=20)
