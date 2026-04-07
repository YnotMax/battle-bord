"""
Script de re-import: busca os detalhes de cada batalha já no banco
e popula a tabela player_stats que estava vazia por causa do RLS.
"""
import os
import platform
# Fix for Python 3.13 WMI crash on Windows when supabase calls platform.system()
try:
    platform.system()
except Exception:
    pass

from supabase import create_client
from dotenv import load_dotenv
import requests

load_dotenv()
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

GUILD_NAME = "I M O R T A I S"

def reimport_players():
    # Busca todas as batalhas salvas
    result = supabase.table("battles").select("id").execute()
    battle_ids = [r["id"] for r in result.data]
    print(f"Total de batalhas no banco: {len(battle_ids)}")

    # Verifica quais já têm players salvos
    existing = supabase.table("player_stats").select("battle_id").execute()
    done_ids = set(r["battle_id"] for r in existing.data)
    print(f"Batalhas com players já salvos: {len(done_ids)}")

    pending = [bid for bid in battle_ids if bid not in done_ids]
    print(f"Batalhas para processar: {len(pending)}\n")

    for battle_id in pending:
        url = f"https://api.albionbb.com/us/battles/{battle_id}"
        resp = requests.get(url, headers={"User-Agent": "Mozilla/5.0"})
        if resp.status_code != 200:
            print(f"  [{battle_id}] Erro HTTP {resp.status_code}")
            continue

        data = resp.json()
        players = data.get("players", [])
        imortais = [p for p in players if p.get("guildName", "").strip().lower() == GUILD_NAME.strip().lower()]

        rows = []
        for p in imortais:
            rows.append({
                "battle_id": battle_id,
                "player_name": p.get("name"),
                "role": p.get("role", "Desconhecido"),
                "damage_done": p.get("damage", 0),
                "healing_done": p.get("heal", 0) or p.get("healing", 0),
                "average_ip": p.get("ip", 0),
                "kills": p.get("kills", 0),
                "deaths": p.get("deaths", 0),
                "weapon": p.get("weapon", {}).get("name", "Desconhecida")
            })

        if rows:
            supabase.table("player_stats").insert(rows).execute()
            print(f"  [{battle_id}] ✓ {len(rows)} players salvos")
        else:
            print(f"  [{battle_id}] Nenhum membro da {GUILD_NAME} encontrado")

    # Resultado final
    final = supabase.table("player_stats").select("id", count="exact").execute()
    print(f"\n✅ Total de registros em player_stats: {final.count}")

if __name__ == "__main__":
    reimport_players()
