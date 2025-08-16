import React, { useState, useEffect } from 'react';
import { Users, Briefcase, TrendingUp, Eye, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface User {
  id: number;
  email: string;
  role: string;
  created_at: string;
}

interface UserPortfolio {
  user_id: number;
  email: string;
  portfolio: {
    symbol: string;
    quantity: number;
    avgBuyPrice: number;
    lastPrice: number;
  }[];
}

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [portfolios, setPortfolios] = useState<UserPortfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'portfolios'>('users');

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersResponse, portfoliosResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/users`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/admin/portfolios`, { headers: getAuthHeaders() })
      ]);

      if (usersResponse.ok && portfoliosResponse.ok) {
        const usersData = await usersResponse.json();
        const portfoliosData = await portfoliosResponse.json();
        setUsers(usersData || []);
        setPortfolios(portfoliosData || []);
      } else {
        console.error('Failed to fetch admin data');
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const calculateTotalValue = (portfolio: UserPortfolio['portfolio']) => {
    return portfolio.reduce((sum, item) => {
      return sum + (item.quantity * (item.lastPrice || 0));
    }, 0);
  };

  const totalUsers = users.length;
  const totalPortfolioValue = portfolios.reduce((sum, userPortfolio) => {
    return sum + calculateTotalValue(userPortfolio.portfolio);
  }, 0);
  const activePortfolios = portfolios.filter(p => p.portfolio.length > 0).length;

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
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
            <Users className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-lg text-gray-600 mt-1">Manage users and monitor portfolios</p>
          </div>
        </div>
        
        <button
          onClick={fetchData}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Data
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{totalUsers}</p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Portfolios</p>
              <p className="text-2xl font-bold text-gray-900">{activePortfolios}</p>
            </div>
            <Briefcase className="h-8 w-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Portfolio Value</p>
              <p className="text-2xl font-bold text-gray-900">${totalPortfolioValue.toFixed(2)}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'users'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="h-4 w-4 inline mr-2" />
              Users ({totalUsers})
            </button>
            <button
              onClick={() => setActiveTab('portfolios')}
              className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'portfolios'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Briefcase className="h-4 w-4 inline mr-2" />
              Portfolios ({activePortfolios})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'users' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">User</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Role</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Joined</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Portfolio</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const userPortfolio = portfolios.find(p => p.user_id === user.id);
                    const portfolioValue = userPortfolio ? calculateTotalValue(userPortfolio.portfolio) : 0;
                    
                    return (
                      <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <div>
                            <div className="font-medium text-gray-900">{user.email}</div>
                            <div className="text-sm text-gray-500">ID: {user.id}</div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.role === 'admin' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-600">
                          {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">
                              ${portfolioValue.toFixed(2)}
                            </div>
                            <div className="text-gray-500">
                              {userPortfolio?.portfolio.length || 0} holdings
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

          {activeTab === 'portfolios' && (
            <div className="space-y-6">
              {portfolios.filter(p => p.portfolio.length > 0).map((userPortfolio) => (
                <div key={userPortfolio.user_id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-medium text-gray-900">{userPortfolio.email}</h3>
                      <p className="text-sm text-gray-600">
                        {userPortfolio.portfolio.length} holdings • 
                        Total Value: ${calculateTotalValue(userPortfolio.portfolio).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 font-medium text-gray-700">Symbol</th>
                          <th className="text-left py-2 font-medium text-gray-700">Quantity</th>
                          <th className="text-left py-2 font-medium text-gray-700">Avg Buy Price</th>
                          <th className="text-left py-2 font-medium text-gray-700">Current Price</th>
                          <th className="text-left py-2 font-medium text-gray-700">Market Value</th>
                          <th className="text-left py-2 font-medium text-gray-700">P&L</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userPortfolio.portfolio.map((holding, index) => {
                          const marketValue = holding.quantity * (holding.lastPrice || 0);
                          const totalCost = holding.quantity * (holding.avgBuyPrice || 0);
                          const pnl = marketValue - totalCost;
                          const pnlPercent = totalCost > 0 ? (pnl / totalCost) * 100 : 0;
                          
                          return (
                            <tr key={index} className="border-b border-gray-100">
                              <td className="py-2 font-medium text-gray-900">{holding.symbol}</td>
                              <td className="py-2 text-gray-600">{holding.quantity}</td>
                              <td className="py-2 text-gray-600">
                                ${holding.avgBuyPrice?.toFixed(2) || '—'}
                              </td>
                              <td className="py-2 text-gray-600">
                                ${holding.lastPrice?.toFixed(2) || '—'}
                              </td>
                              <td className="py-2 font-medium text-gray-900">
                                ${marketValue.toFixed(2)}
                              </td>
                              <td className="py-2">
                                <div className={`text-sm ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
                </div>
              ))}
              
              {portfolios.filter(p => p.portfolio.length > 0).length === 0 && (
                <div className="text-center py-12">
                  <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Portfolios</h3>
                  <p className="text-gray-600">No users have created portfolios yet.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;