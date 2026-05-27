'use client';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Legend, Tooltip,
} from 'recharts';

export type RadarDataPoint = {
  dimension: string;
  [competitorName: string]: string | number;
};

interface Props {
  data: RadarDataPoint[];
  competitors: { name: string; color: string }[];
}

const COLORS = ['#F79C31', '#0C2054', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4'];

export function CompetitorRadarChart({ data, competitors }: Props) {
  return (
    <ResponsiveContainer width="100%" height={360}>
      <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
        <PolarGrid stroke="#e5e7eb" />
        <PolarAngleAxis
          dataKey="dimension"
          tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 500 }}
        />
        {competitors.map((c, i) => (
          <Radar
            key={c.name}
            name={c.name}
            dataKey={c.name}
            stroke={COLORS[i % COLORS.length]}
            fill={COLORS[i % COLORS.length]}
            fillOpacity={0.08}
            strokeWidth={2}
            dot={{ r: 3, fill: COLORS[i % COLORS.length] }}
          />
        ))}
        <Tooltip
          formatter={(value) => [`${value}/10`, '']}
          contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '13px' }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: '13px', paddingTop: '16px' }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
