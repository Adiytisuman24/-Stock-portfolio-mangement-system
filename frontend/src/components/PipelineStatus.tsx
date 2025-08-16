import React from 'react';
import { CheckCircle, XCircle, Clock, RefreshCw, Database, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface StatusData {
  status: string;
  database_connected: boolean;
  last_update: string;
  stock_count: number;
}

interface PipelineStatusProps {
  status: StatusData | null;
  loading: boolean;
  onRefresh: () => void;
  refreshing: boolean;
}

const PipelineStatus: React.FC<PipelineStatusProps> = ({ 
  status, 
  loading, 
  onRefresh, 
  refreshing 
}) => {
  const getStatusColor = (statusValue: string) => {
    switch (statusValue) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'unhealthy':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    }
  };

  const getStatusIcon = (statusValue: string) => {
    switch (statusValue) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5" />;
      case 'unhealthy':
        return <XCircle className="h-5 w-5" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-8 bg-gray-200 rounded w-20"></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Pipeline Status</h2>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {status ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* System Status */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-sm font-medium text-gray-600">System Status</span>
              </div>
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(status.status)}`}>
                {getStatusIcon(status.status)}
                <span className="ml-2 capitalize">{status.status}</span>
              </div>
            </div>

            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Database className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-600">Database</span>
              </div>
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${
                status.database_connected 
                  ? 'text-green-600 bg-green-50 border-green-200' 
                  : 'text-red-600 bg-red-50 border-red-200'
              }`}>
                {status.database_connected ? (
                  <CheckCircle className="h-4 w-4 mr-2" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                {status.database_connected ? 'Connected' : 'Disconnected'}
              </div>
            </div>
          </div>

          {/* Data Metrics */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-600">Last Update</span>
              </div>
              <p className="text-sm text-gray-900">
                {status.last_update 
                  ? formatDistanceToNow(new Date(status.last_update), { addSuffix: true })
                  : 'Never'
                }
              </p>
            </div>

            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-sm font-medium text-gray-600">Tracked Symbols</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {status.stock_count}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to fetch status</h3>
          <p className="text-gray-600">There was an error connecting to the API.</p>
          <button
            onClick={onRefresh}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};

export default PipelineStatus;