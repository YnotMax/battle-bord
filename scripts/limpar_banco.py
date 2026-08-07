import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Erro: Credenciais do Supabase não encontradas no .env")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

print("Iniciando limpeza completa do banco de dados...")

try:
    # Deleta todos os status de jogadores
    supabase.table('player_stats').delete().neq('battle_id', 0).execute()
    print("[+] Tabela de jogadores (player_stats) limpa.")

    # Deleta todas as batalhas
    supabase.table('battles').delete().neq('id', 0).execute()
    print("[+] Tabela de batalhas (battles) limpa.")

    print("\nBanco de dados completamente zerado e pronto para dados novos!")
except Exception as e:
    print("Erro ao limpar banco:", e)
