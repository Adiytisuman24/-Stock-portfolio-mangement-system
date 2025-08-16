import React, { useState, useEffect } from 'react';
import StockTable from '../components/StockTable';
import PipelineStatus from '../components/PipelineStatus';
import { RefreshCw, TrendingUp } from 'lucide-react';

interface Stock {
  symbol: string;
  ts: string;
  close: number;
  volume: number;
}

interface StatusData {
  status: string;
  database_connected: boolean;
  last_update: string;
  stock_count: number;
}

const Dashboard: React.FC = () => {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const fetchStocks = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/stocks`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setStocks(data || []);
      } else {
        console.error('Failed to fetch stocks:', response.statusText);
        setStocks([]);
      }
    } catch (error) {
      console.error('Error fetching stocks:', error);
      setStocks([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatus = async () => {
    try {
      // Mock status data since we don't have a status endpoint
      const mockStatus: StatusData = {
        status: 'healthy',
        database_connected: true,
        last_update: new Date().toISOString(),
        stock_count: stocks.length,
      };
      setStatus(mockStatus);
    } catch (error) {
      console.error('Error fetching status:', error);
      setStatus(null);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchStocks();
      await fetchStatus();
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStocks();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchStatus();
    }
  }, [loading, stocks.length]);

  useEffect(() => {
    // Set up auto-refresh every 5 minutes
    const interval = setInterval(() => {
      fetchStocks();
      fetchStatus();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <div className="bg-blue-600 p-3 rounded-full">
            <TrendingUp className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Stock Portfolio Dashboard</h1>
            <p className="text-lg text-gray-600 mt-1">Real-time market data and pipeline monitoring</p>
          </div>
        </div>
      </div>

      {/* Status and Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <PipelineStatus 
            status={status} 
            loading={statusLoading} 
            onRefresh={handleRefresh}
            refreshing={refreshing}
          />
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Manual Refresh'}
            </button>
            
            <div className="text-xs text-gray-500 text-center">
              Auto-refresh every 5 minutes
            </div>
          </div>
        </div>
      </div>

      {/* Stock Table */}
      <StockTable stocks={stocks} loading={loading} />

      {/* Summary Cards */}
      {stocks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Symbols</p>
                <p className="text-2xl font-bold text-gray-900">{stocks.length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Price</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${stocks.length > 0 ? (stocks.reduce((sum, stock) => sum + (stock.close || 0), 0) / stocks.length).toFixed(2) : '0.00'}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Stocks</p>
                <p className="text-2xl font-bold text-green-600">
                  {stocks.filter(stock => stock.close > 0).length}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;