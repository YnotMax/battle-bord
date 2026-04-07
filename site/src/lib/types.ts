export type Battle = {
  id: number
  start_time: string
  opponents: string
  result: 'WIN' | 'LOSS'
  guild_players: number
  total_kills: number
  total_fame: number
}

export type PlayerStat = {
  id: string
  battle_id: number
  player_name: string
  role: string
  damage_done: number
  healing_done: number
  average_ip: number
  kills: number
  deaths: number
}
