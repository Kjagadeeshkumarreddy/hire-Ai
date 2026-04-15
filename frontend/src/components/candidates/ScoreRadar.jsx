import React from 'react';
import { ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip } from 'recharts';

export const ScoreRadar = ({ scores }) => {
  if (!scores) return null;

  // Transform scores payload from backend into Recharts structure
  const data = [
    { subject: 'Backend Dev', A: scores.category_scores?.backend || 0, fullMark: 100 },
    { subject: 'System Design', A: scores.category_scores?.architecture || 0, fullMark: 100 },
    { subject: 'Cloud / DevOps', A: scores.category_scores?.cloud || 0, fullMark: 100 },
    { subject: 'Communication', A: scores.category_scores?.communication || 0, fullMark: 100 },
    { subject: 'Open Source', A: scores.category_scores?.opensource || 0, fullMark: 100 },
  ];

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#3A3F58" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#A0AEC0', fontSize: 12 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} stroke="#3A3F58" />
          <Radar 
            name="Skill Match" 
            dataKey="A" 
            stroke="#8B5CF6" 
            fill="#8B5CF6" 
            fillOpacity={0.4} 
          />
          <Tooltip 
             contentStyle={{ backgroundColor: '#1A1D2D', border: '1px solid #2D334D', borderRadius: '8px', color: '#fff' }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};
