import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import useChartTheme from '../../hooks/useChartTheme';

const BloodGroupBarChart = ({ data = [] }) => {
  const { gridStroke, axisStroke, tooltipStyle, colors } = useChartTheme();

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
          <XAxis dataKey="bloodGroup" stroke={axisStroke} fontSize={12} tickLine={false} />
          <YAxis stroke={axisStroke} fontSize={12} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
          <Bar dataKey="donors" name="Available Donors" fill={colors.rose} radius={[6, 6, 0, 0]} />
          <Bar dataKey="requests" name="Blood Requests" fill={colors.sky} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BloodGroupBarChart;
