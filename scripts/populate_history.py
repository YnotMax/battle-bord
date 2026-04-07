from crawler import process_battle_details, supabase, GUILD_NAME
import requests

import time

def fetch_deep_history(pages_to_scan=15):
    print(f"=====================================")
    print(f"    MÁQUINA DO TEMPO LIGADA ⏳")
    print(f"=====================================")
    print(f"Coletando dados em massa de até {pages_to_scan} páginas de histórico do AlbionBB...\n")
    
    for page in range(1, pages_to_scan + 1):
        print(f"\n>>>> ESCAVANDO PÁGINA {page} DE {pages_to_scan} <<<<")
        url = f"https://api.albionbb.com/us/battles?search={GUILD_NAME}&minPlayers=25&page={page}"
        response = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})
        
        if response.status_code != 200:
            print(f"[ERRO] Falha na página {page} (Status: {response.status_code})")
            time.sleep(2)
            continue
            
        data = response.json()
        battles = data if isinstance(data, list) else data.get("data", [])
        
        if not battles:
            print("Não há mais batalhas no servidor. Chegamos ao fim da linha do tempo.")
            break
            
        for b in battles:
            battle_id = b.get("albionId") or b.get("id")
            
            try:
                # Verifica se já salvamos essa batalha no banco para não duplicar dados
                check = supabase.table("battles").select("id").eq("id", battle_id).execute()
                if len(check.data) > 0:
                    print(f"Batalha {battle_id} já mapeada. Pulando...")
                    continue
                    
                print(f"Injetando Batalha Histórica {battle_id} no Banco de Dados...")
                process_battle_details(battle_id)
                time.sleep(1.5) # Pausa estratégica de 1.5s pra não ser bloqueado pelo Supabase/API

            except Exception as e:
                print(f"[!] Erro de conexão com a batalha {battle_id}. Servidor barrou os acessos rápidos.")
                print("Esperando 5 segundos para tentar resfriar a conexão...")
                time.sleep(5)
                continue

    print("\n[+] FINALIZADO! Todos os dados passados foram capturados com sucesso.")

if __name__ == "__main__":
    # Varrendo até a página 15 da API (mais ou menos 300+ registros investigados de trás pra frente)
    fetch_deep_history(15)
