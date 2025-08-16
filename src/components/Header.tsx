import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { TrendingUp, BarChart3, User, LogOut, Briefcase } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            <div className="bg-blue-600 p-2 rounded-lg">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Stock Portfolio</h1>
              <p className="text-sm text-gray-600">Market Data Pipeline</p>
            </div>
          </Link>
          
          <nav className="flex items-center space-x-6">
            {user ? (
              <>
                {user.role === 'admin' ? (
                  <Link 
                    to="/" 
                    className={`flex items-center space-x-2 transition-colors ${
                      isActive('/') 
                        ? 'text-purple-600 font-medium' 
                        : 'text-gray-600 hover:text-purple-600'
                    }`}
                  >
                    <BarChart3 className="h-4 w-4" />
                    <span>Admin Dashboard</span>
                  </Link>
                ) : (
                  <>
                    <Link 
                      to="/" 
                      className={`flex items-center space-x-2 transition-colors ${
                        isActive('/') 
                          ? 'text-blue-600 font-medium' 
                          : 'text-gray-600 hover:text-blue-600'
                      }`}
                    >
                      <BarChart3 className="h-4 w-4" />
                      <span>Dashboard</span>
                    </Link>
                    
                    <Link 
                      to="/portfolio" 
                      className={`flex items-center space-x-2 transition-colors ${
                        isActive('/portfolio') 
                          ? 'text-blue-600 font-medium' 
                          : 'text-gray-600 hover:text-blue-600'
                      }`}
                    >
                      <Briefcase className="h-4 w-4" />
                      <span>Portfolio</span>
                    </Link>
                  </>
                )}

                <div className="flex items-center space-x-4 ml-6 pl-6 border-l border-gray-200">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <User className="h-4 w-4" />
                    <div className="text-sm">
                      <div>{user.email}</div>
                      {user.role === 'admin' && (
                        <div className="text-xs text-purple-600 font-medium">Admin</div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={logout}
                    className="flex items-center space-x-2 text-gray-600 hover:text-red-600 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="text-sm">Logout</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link 
                  to="/login" 
                  className="text-gray-600 hover:text-blue-600 transition-colors"
                >
                  Login
                </Link>
                <Link 
                  to="/register" 
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;