"""
SCRIPT: debug_weapons.py
OBJETIVO: Analisar quantas armas estão chegando como None/null da API do AlbionBB
          e descobrir se o problema é na API ou no nosso crawler.
"""
import os
import requests
from dotenv import load_dotenv

load_dotenv()

GUILD_ID = "YNRMcsuVSRWTBs0y4mZ-SQ"
GUILD_NAME = "I M O R T A I S"

def main():
    url = f"https://api.albionbb.com/us/battles?guildId={GUILD_ID}&minPlayers=21&page=1"
    resp = requests.get(url, headers={"User-Agent": "Mozilla/5.0"})
    battles = resp.json()
    
    total_players = 0
    total_sem_arma = 0
    total_com_arma_none = 0
    exemplos_sem_arma = []

    for b in battles[:5]:
        battle_id = b.get("albionId") or b.get("id")
        detail_resp = requests.get(
            f"https://api.albionbb.com/us/battles/{battle_id}",
            headers={"User-Agent": "Mozilla/5.0"}
        )
        if detail_resp.status_code != 200:
            continue
        detail = detail_resp.json()
        players = detail.get("players", [])
        imortais = [p for p in players if p.get("guildName", "").strip().lower() == GUILD_NAME.strip().lower()]
        
        print(f"\n=== Batalha {battle_id} | {len(imortais)} Imortais ===")
        for p in imortais:
            total_players += 1
            w = p.get("weapon")
            
            if w is None:
                total_sem_arma += 1
                exemplos_sem_arma.append(p.get("name"))
                print(f"  SEM ARMA: {p.get('name')}")
            elif isinstance(w, dict):
                w_name = w.get("name")
                w_type = w.get("type")
                if not w_name:
                    total_com_arma_none += 1
                    print(f"  WEAPON SEM NAME: {p.get('name')} | type={w_type}")
                else:
                    print(f"  OK: {p.get('name'):20} | name={w_name:35} | type={w_type}")
            else:
                print(f"  ARMA COMO STRING: {p.get('name')} | weapon={w}")

    print(f"\n\n========= RESUMO =========")
    print(f"Total jogadores analisados: {total_players}")
    print(f"  - weapon=None (campo ausente):  {total_sem_arma}")
    print(f"  - weapon.name=None/vazio:       {total_com_arma_none}")
    print(f"  - Com arma válida:              {total_players - total_sem_arma - total_com_arma_none}")
    if exemplos_sem_arma:
        print(f"\nExemplos sem arma: {exemplos_sem_arma}")

if __name__ == "__main__":
    main()
