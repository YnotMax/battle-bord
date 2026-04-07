import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

battles = supabase.table("battles").select("id", count="exact").execute()
players = supabase.table("player_stats").select("id", count="exact").execute()

print(f"Batalhas no banco: {battles.count}")
print(f"Registros de players: {players.count}")

if players.count == 0:
    print("\n[AVISO] Tabela player_stats vazia.")
    print("Provável causa: RLS ativo no Supabase bloqueando inserts.")
    print("Solução: Acesse Supabase > Table Editor > player_stats > Disable RLS")
    print("         (ou crie uma política que permita INSERT para service role)")
