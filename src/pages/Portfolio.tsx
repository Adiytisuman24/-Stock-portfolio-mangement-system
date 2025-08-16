import React, { useState, useEffect } from 'react';
import { Briefcase, Plus, TrendingUp, TrendingDown } from 'lucide-react';

interface PortfolioItem {
  symbol: string;
  quantity: number | null;
  avgBuyPrice: number | null;
  lastPrice: number | null;
}

const Portfolio: React.FC = () => {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const fetchPortfolio = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/portfolio`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setItems(data || []);
      } else {
        console.error('Failed to fetch portfolio:', response.statusText);
        setItems([]);
      }
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const addToPortfolio = async () => {
    if (!symbol.trim() || !quantity.trim()) return;

    setAdding(true);
    try {
      const response = await fetch(`${API_BASE_URL}/portfolio`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          symbol: symbol.toUpperCase(),
          quantity: parseFloat(quantity),
          avgBuyPrice: 0, // Default to 0, can be enhanced later
        }),
      });

      if (response.ok) {
        setSymbol('');
        setQuantity('');
        await fetchPortfolio();
      } else {
        console.error('Failed to add to portfolio:', response.statusText);
      }
    } catch (error) {
      console.error('Error adding to portfolio:', error);
    } finally {
      setAdding(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const totalValue = items.reduce((sum, item) => {
    return sum + (item.quantity * (item.lastPrice || 0));
  }, 0);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-purple-600 p-3 rounded-full">
            <Briefcase className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Portfolio</h1>
            <p className="text-lg text-gray-600 mt-1">Track your stock investments</p>
          </div>
        </div>
      </div>

      {/* Add Stock Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Stock to Portfolio</h2>
        <div className="flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Symbol (e.g., AAPL or RELIANCE.NS)"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="w-32">
            <input
              type="number"
              step="0.01"
              placeholder="Quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={addToPortfolio}
            disabled={adding || !symbol.trim() || !quantity.trim()}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            {adding ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Holdings</p>
              <p className="text-2xl font-bold text-gray-900">{items.length}</p>
            </div>
            <Briefcase className="h-8 w-8 text-purple-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">${totalValue.toFixed(2)}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg. Position</p>
              <p className="text-2xl font-bold text-gray-900">
                ${items.length > 0 ? (totalValue / items.length).toFixed(2) : '0.00'}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Portfolio Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Holdings</h2>
          <p className="text-sm text-gray-600 mt-1">Your current stock positions</p>
        </div>
        
        {items.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No holdings yet</h3>
            <p className="text-gray-600">Add your first stock to start tracking your portfolio.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Symbol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Buy Price
                </th>
                    Last Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Market Value
                  </th>
                </tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  P&L
                </th>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item, index) => {
                  const marketValue = (item.quantity || 0) * (item.lastPrice || 0);
                  const totalCost = (item.quantity || 0) * (item.avgBuyPrice || 0);
                  const pnl = marketValue - totalCost;
                  const pnlPercent = totalCost > 0 ? (pnl / totalCost) * 100 : 0;
                  
                  return (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {item.symbol}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.quantity || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.avgBuyPrice ? `$${item.avgBuyPrice.toFixed(2)}` : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.lastPrice ? `$${item.lastPrice.toFixed(2)}` : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          ${marketValue.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                          <div className="text-xs">
                            ({pnl >= 0 ? '+' : ''}{pnlPercent.toFixed(1)}%)
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        
        {items.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Total Portfolio Value:</span>
              <span className="text-lg font-bold text-gray-900">${totalValue.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Portfolio;