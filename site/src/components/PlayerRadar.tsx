'use client'

import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip
} from 'recharts';

export function PlayerRadar({ data }: { data: any[] }) {
  return (
    <div style={{ width: '100%', height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
          <PolarGrid stroke="rgba(255,255,255,0.1)" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-400)', fontSize: 10, fontWeight: 700 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          
          <Tooltip 
            contentStyle={{ background: '#0f172a', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, fontWeight: 700 }}
            itemStyle={{ color: 'var(--cyan)' }}
          />

          {/* Average Guild Path */}
          <Radar name="Média da Guilda" dataKey="B" stroke="var(--text-500)" strokeDasharray="3 3" fill="rgba(255,255,255,0)" fillOpacity={0} />
          
          {/* Player Path */}
          <Radar name="Operador Atual" dataKey="A" stroke="var(--cyan)" fill="var(--cyan)" fillOpacity={0.4} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
