import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import useChartTheme from '../../hooks/useChartTheme';

const StatusPie = ({ data = [] }) => {
  const { tooltipStyle, colors } = useChartTheme();

  const getColorForUrgency = (entry, index) => {
    const key = (entry?.urgency || entry?.status || '').toLowerCase();
    if (key.includes('critical') || key.includes('emergency') || key.includes('shortage')) {
      return colors.crimson;
    }
    if (key.includes('urgent') || key.includes('high') || key.includes('warning') || key.includes('pending')) {
      return colors.warning;
    }
    if (key.includes('complete') || key.includes('fulfilled') || key.includes('verified')) {
      return colors.teal;
    }
    const defaultSeries = [colors.info, colors.ice, colors.teal, colors.silver];
    return defaultSeries[index % defaultSeries.length];
  };

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={92}
            paddingAngle={4}
            dataKey="count"
            nameKey="urgency"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getColorForUrgency(entry, index)} stroke={colors.gridStroke} strokeWidth={1} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StatusPie;
