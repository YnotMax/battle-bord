"""
SCRIPT: crawler.py
OBJETIVO: Varrer apenas a 1ª página da API do AlbionBB (lutas mais recentes).
USO: Executado pelo 'Atualizar_Dados_Manualmente.bat'. Usado no dia a dia
     para puxar apenas lutas novas de forma rápida e segura.
"""

import os
import requests
from supabase import create_client, Client
from dotenv import load_dotenv

# Carrega as variáveis do arquivo .env
load_dotenv()

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") # Chave secreta!

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Erro: Credenciais do Supabase não encontradas no .env")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

GUILD_NAME = "I M O R T A I S"
GUILD_ID = "YNRMcsuVSRWTBs0y4mZ-SQ"

def fetch_recent_battles():
    print(f"Buscando as últimas batalhas da guilda {GUILD_NAME} no AlbionBB...")
    url = f"https://api.albionbb.com/us/battles?guildId={GUILD_ID}&minPlayers=21&page=1"  # Mínimo de 21 jogadores
    response = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})
    
    if response.status_code != 200:
        print("Falha ao consultar AlbionBB", response.status_code)
        return

    data = response.json()
    battles = data if isinstance(data, list) else data.get("data", [])
    
    for b in battles:
        battle_id = b.get("albionId") or b.get("id")
        
        # Verifica se já salvamos essa batalha no banco para não duplicar
        check = supabase.table("battles").select("id").eq("id", battle_id).execute()
        if len(check.data) > 0:
            print(f"Batalha {battle_id} já mapeada. Pulando...")
            continue
            
        print(f"Nova Batalha encontrada: {battle_id}. Processando dados densos...")
        process_battle_details(battle_id)

# Guildas que jogam na nossa ALIANÇA (não são inimigas)
# Serve de fallback caso o campo "alliance" venha vazio na API
ALLIED_GUILDS = [
    "We Profit",
    # Adicione aqui outras guildas aliadas
]

def process_battle_details(battle_id):
    url = f"https://api.albionbb.com/us/battles/{battle_id}"
    response = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})
    
    if response.status_code != 200:
        return
        
    data = response.json()
    
    # 1. Determinar quem era o inimigo e o status (WIN/LOSS) simulado
    guilds = data.get("guilds", [])
    imortais_info = next((g for g in guilds if g.get("name", "").strip().lower() == GUILD_NAME.strip().lower()), None)
    
    if not imortais_info or imortais_info.get("players", 0) < 21:
        print(f"Batalha ignorada. Menos de 21 jogadores da guilda ({imortais_info.get('players', 0) if imortais_info else 0} presentes).")
        return
        
    my_alliance = imortais_info.get("alliance") or imortais_info.get("allianceName") or imortais_info.get("alliance_name")
    
    # Inimigos: guildas que não são a nossa E não estão na nossa aliança E não estão em ALLIED_GUILDS
    def is_enemy(g):
        g_name = g.get("name")
        if not g_name or g_name.strip().lower() == GUILD_NAME.strip().lower():
            return False
            
        # Verifica se está na lista hardcoded de aliadas
        if g_name.strip().lower() in [a.strip().lower() for a in ALLIED_GUILDS]:
            return False
            
        # Verifica pelo ID/Nome da aliança (se a API forneceu)
        g_alliance = g.get("alliance") or g.get("allianceName") or g.get("alliance_name")
        if my_alliance and g_alliance == my_alliance:
            return False
            
        return True

    inimigos = [g.get("name") for g in guilds if is_enemy(g)][:3]
    opponents_str = ", ".join(inimigos)
    if not opponents_str:
        opponents_str = "Vários"
        
    result = "WIN" if imortais_info.get("kills", 0) >= imortais_info.get("deaths", 0) else "LOSS"

    # Salva na Tabela `battles`
    try:
        supabase.table("battles").insert({
            "id": battle_id,
            "start_time": data.get("startedAt") or data.get("startTime"),
            "opponents": opponents_str,
            "result": result,
            "guild_players": imortais_info.get("players", 0),
            "total_kills": imortais_info.get("kills", 0),
            "total_fame": imortais_info.get("killFame", 0)
        }).execute()
        print(f"Batalha {battle_id} salva com sucesso.")
    except Exception as e:
        print(f"Erro ao salvar batalha {battle_id}:", e)
        return

    # 2. Salva estatísticas de cada jogador da nossa guilda
    players = data.get("players", [])
    imortais_participants = [p for p in players if p.get("guildName", "").strip().lower() == GUILD_NAME.strip().lower()]
    
    player_rows = []
    for p in imortais_participants:
        # weapon.type = ID completo com Tier e Enchant (ex: T5_2H_LONGBOW@1)
        # weapon.name = apenas o nome base sem tier (ex: 2H_LONGBOW)
        # Salvamos o 'type' para garantir que WeaponIcon receba o ID exato e carregue a imagem certa.
        # Se o jogador morreu sem atacar, a API retorna weapon=None — isso é um dado da API, não um bug.
        weapon_obj = p.get("weapon") or {}
        weapon_id = weapon_obj.get("type") or weapon_obj.get("name") or "Desconhecida"
        
        player_rows.append({
            "battle_id": battle_id,
            "player_name": p.get("name"),
            "role": p.get("role", "Desconhecido"),
            "damage_done": p.get("damage", 0),
            "healing_done": p.get("heal", 0) or p.get("healing", 0),
            "average_ip": p.get("ip", 0),
            "kills": p.get("kills", 0),
            "deaths": p.get("deaths", 0),
            "weapon": weapon_id
        })
        
    if player_rows:
        try:
            supabase.table("player_stats").insert(player_rows).execute()
            print(f"Salvos {len(player_rows)} participantes no banco.")
        except Exception as e:
            print("Erro ao salvar jogadores:", e)

if __name__ == "__main__":
    fetch_recent_battles()
