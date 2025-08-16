import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { format } from 'date-fns';

interface StockData {
  id: number;
  symbol: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjusted_close: number;
  volume: number;
  created_at: string;
  updated_at: string;
}

interface StockChartProps {
  data: StockData[];
  symbol: string;
  loading: boolean;
}

const StockChart: React.FC<StockChartProps> = ({ data, symbol, loading }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Price History - {symbol}
        </h3>
        <div className="text-center py-12">
          <p className="text-gray-600">No historical data available for {symbol}</p>
        </div>
      </div>
    );
  }

  // Reverse data to show chronologically (oldest to newest)
  const chartData = data
    .slice()
    .reverse()
    .map((item) => ({
      ...item,
      date: format(new Date(item.date), 'MMM dd'),
      fullDate: item.date,
    }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">{data.fullDate}</p>
          <div className="space-y-1 text-sm">
            <p className="text-gray-600">
              <span className="font-medium">Close:</span> ${data.close.toFixed(2)}
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Open:</span> ${data.open.toFixed(2)}
            </p>
            <p className="text-gray-600">
              <span className="font-medium">High:</span> ${data.high.toFixed(2)}
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Low:</span> ${data.low.toFixed(2)}
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Volume:</span> {data.volume.toLocaleString()}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Price History - {symbol}
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Last {data.length} trading days
        </p>
      </div>
      
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis 
              dataKey="date" 
              stroke="#6B7280"
              fontSize={12}
            />
            <YAxis 
              stroke="#6B7280"
              fontSize={12}
              domain={['auto', 'auto']}
              tickFormatter={(value) => `$${value.toFixed(2)}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="close"
              stroke="#3B82F6"
              strokeWidth={2}
              fill="url(#colorClose)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      {/* Price range info */}
      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-600">Period High: </span>
          <span className="font-semibold text-green-600">
            ${Math.max(...data.map(d => d.high)).toFixed(2)}
          </span>
        </div>
        <div>
          <span className="text-gray-600">Period Low: </span>
          <span className="font-semibold text-red-600">
            ${Math.min(...data.map(d => d.low)).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default StockChart;