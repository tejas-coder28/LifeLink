import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import useChartTheme from '../../hooks/useChartTheme';

const TrendLineChart = ({ data = [] }) => {
  const { gridStroke, axisStroke, tooltipStyle, colors } = useChartTheme();

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
          <XAxis dataKey="month" stroke={axisStroke} fontSize={12} tickLine={false} />
          <YAxis stroke={axisStroke} fontSize={12} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
          <Line
            type="monotone"
            dataKey="donations"
            name="Donations Completed"
            stroke={colors.info}
            strokeWidth={3}
            dot={{ r: 4, fill: colors.info }}
          />
          <Line
            type="monotone"
            dataKey="requests"
            name="Requests Logged"
            stroke={colors.silver}
            strokeWidth={2.5}
            strokeDasharray="5 5"
            dot={{ r: 4, fill: colors.silver }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TrendLineChart;
