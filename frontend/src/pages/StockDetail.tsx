import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import StockChart from '../components/StockChart';
import { ArrowLeft, Calendar, TrendingUp, Volume, DollarSign } from 'lucide-react';
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

const StockDetail: React.FC = () => {
  const { symbol } = useParams<{ symbol: string }>();
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(30);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

  const fetchStockData = async () => {
    if (!symbol) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/stocks/${symbol}?limit=${limit}`);
      if (response.ok) {
        const data = await response.json();
        setStockData(data || []);
      } else {
        console.error('Failed to fetch stock data:', response.statusText);
        setStockData([]);
      }
    } catch (error) {
      console.error('Error fetching stock data:', error);
      setStockData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockData();
  }, [symbol, limit]);

  const latestData = stockData[0];
  const calculateChange = () => {
    if (stockData.length < 2) return { change: 0, changePercent: 0 };
    const current = stockData[0].close;
    const previous = stockData[1].close;
    const change = current - previous;
    const changePercent = (change / previous) * 100;
    return { change, changePercent };
  };

  const { change, changePercent } = calculateChange();

  if (!symbol) {
    return <div>Symbol not found</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link 
            to="/" 
            className="inline-flex items-center text-gray-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Stock Header Info */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{symbol}</h1>
            <p className="text-gray-600 mt-1">Stock Details & Historical Data</p>
          </div>
          
          <div className="text-right">
            <div className="text-3xl font-bold text-gray-900">
              {latestData ? `$${latestData.close.toFixed(2)}` : '—'}
            </div>
            {latestData && stockData.length > 1 && (
              <div className={`flex items-center justify-end mt-1 ${
                change >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                <TrendingUp className={`h-4 w-4 mr-1 ${change < 0 ? 'transform rotate-180' : ''}`} />
                <span className="font-medium">
                  {change >= 0 ? '+' : ''}${change.toFixed(2)} ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%)
                </span>
              </div>
            )}
          </div>
        </div>

        {latestData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-50 p-2 rounded-lg">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Open</p>
                <p className="font-semibold text-gray-900">${latestData.open.toFixed(2)}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="bg-green-50 p-2 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">High</p>
                <p className="font-semibold text-gray-900">${latestData.high.toFixed(2)}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="bg-red-50 p-2 rounded-lg">
                <TrendingUp className="h-5 w-5 text-red-600 transform rotate-180" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Low</p>
                <p className="font-semibold text-gray-900">${latestData.low.toFixed(2)}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="bg-purple-50 p-2 rounded-lg">
                <Volume className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Volume</p>
                <p className="font-semibold text-gray-900">{latestData.volume.toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chart Controls */}
      <div className="flex items-center justify-between bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Time Period:</span>
        </div>
        <div className="flex space-x-2">
          {[30, 60, 90, 180].map((days) => (
            <button
              key={days}
              onClick={() => setLimit(days)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                limit === days
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {days}D
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <StockChart data={stockData} symbol={symbol} loading={loading} />

      {/* Historical Data Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Historical Data</h3>
          <p className="text-sm text-gray-600 mt-1">Last {limit} trading days</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Open
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  High
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Low
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Close
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Volume
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                [...Array(10)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                  </tr>
                ))
              ) : (
                stockData.map((data) => (
                  <tr key={data.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {format(new Date(data.date), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${data.open.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${data.high.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${data.low.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      ${data.close.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {data.volume.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {stockData.length === 0 && !loading && (
          <div className="px-6 py-12 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No historical data available</h3>
            <p className="text-gray-600">Historical data for {symbol} is not available.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockDetail;