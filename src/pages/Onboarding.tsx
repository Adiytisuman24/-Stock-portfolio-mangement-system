import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { TrendingUp, Globe, Eye, CheckCircle } from 'lucide-react';

const Onboarding: React.FC = () => {
  const [step, setStep] = useState(1);
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { updatePreferences } = useAuth();
  const navigate = useNavigate();

  const markets = [
    { id: 'US', name: 'US Markets', description: 'NASDAQ, NYSE, S&P 500' },
    { id: 'IN', name: 'Indian Markets', description: 'NSE, BSE, Nifty 50' },
  ];

  const popularStocks = {
    US: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX'],
    IN: ['RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 'SBIN.NS', 'ITC.NS', 'LT.NS'],
  };

  const handleMarketToggle = (marketId: string) => {
    setSelectedMarkets(prev => 
      prev.includes(marketId) 
        ? prev.filter(m => m !== marketId)
        : [...prev, marketId]
    );
  };

  const handleStockToggle = (stock: string) => {
    setWatchlist(prev => 
      prev.includes(stock) 
        ? prev.filter(s => s !== stock)
        : [...prev, stock]
    );
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      await updatePreferences({
        preferred_markets: selectedMarkets,
        watchlist: watchlist,
        onboarding_completed: true,
      });
      navigate('/');
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAvailableStocks = () => {
    const stocks: string[] = [];
    selectedMarkets.forEach(market => {
      if (market === 'US') stocks.push(...popularStocks.US);
      if (market === 'IN') stocks.push(...popularStocks.IN);
    });
    return stocks;
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="bg-blue-600 p-3 rounded-full">
            <TrendingUp className="h-8 w-8 text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Welcome to Stock Portfolio</h1>
        <p className="text-lg text-gray-600 mt-2">Let's set up your investment preferences</p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">Step {step} of 3</span>
          <span className="text-sm font-medium text-gray-600">{Math.round((step / 3) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        {step === 1 && (
          <div>
            <div className="flex items-center mb-6">
              <Globe className="h-6 w-6 text-blue-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">Choose Your Markets</h2>
            </div>
            <p className="text-gray-600 mb-6">Select the markets you're interested in tracking:</p>
            
            <div className="space-y-4">
              {markets.map((market) => (
                <div
                  key={market.id}
                  onClick={() => handleMarketToggle(market.id)}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedMarkets.includes(market.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{market.name}</h3>
                      <p className="text-sm text-gray-600">{market.description}</p>
                    </div>
                    {selectedMarkets.includes(market.id) && (
                      <CheckCircle className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end mt-8">
              <button
                onClick={() => setStep(2)}
                disabled={selectedMarkets.length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="flex items-center mb-6">
              <Eye className="h-6 w-6 text-blue-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">Build Your Watchlist</h2>
            </div>
            <p className="text-gray-600 mb-6">Select stocks you want to track (optional):</p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {getAvailableStocks().map((stock) => (
                <button
                  key={stock}
                  onClick={() => handleStockToggle(stock)}
                  className={`p-3 text-sm font-medium rounded-md border transition-all ${
                    watchlist.includes(stock)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
                  }`}
                >
                  {stock}
                </button>
              ))}
            </div>

            <div className="flex justify-between mt-8">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">You're All Set!</h2>
            <p className="text-gray-600 mb-6">
              Your preferences have been saved. You can always update them later in your settings.
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="text-left">
                <h3 className="font-medium text-gray-900 mb-2">Your Preferences:</h3>
                <p className="text-sm text-gray-600 mb-1">
                  <strong>Markets:</strong> {selectedMarkets.join(', ') || 'None selected'}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Watchlist:</strong> {watchlist.length} stocks selected
                </p>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleComplete}
                disabled={loading}
                className="px-8 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Completing...' : 'Complete Setup'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;