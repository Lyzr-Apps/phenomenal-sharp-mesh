import React, { useState, useEffect } from 'react';
import parseLLMJson from './utils/jsonParser';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  type: 'income' | 'expense';
  notes?: string;
}

interface CategorySuggestion {
  suggested_category: string;
  confidence_score: number;
  alternative_categories: string[];
  reasoning: string;
}

interface FinancialSummary {
  summary: string;
  insights: string[];
  recommendations: string[];
  statistics: {
    total_spend: number;
    top_category: string;
    unusual_patterns: string[];
  };
}

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'insights'>('overview');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'week' | 'month'>('all');
  const [insightsPeriod, setInsightsPeriod] = useState<'week' | 'month'>('month');
  const [insights, setInsights] = useState<FinancialSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: '',
    type: 'expense' as 'income' | 'expense',
    notes: ''
  });

  const categories = [
    'Groceries', 'Utilities', 'Rent', 'Transportation', 'Entertainment',
    'Healthcare', 'Education', 'Shopping', 'Dining Out', 'Insurance',
    'Salary', 'Freelance', 'Investment', 'Other'
  ];

  useEffect(() => {
    const saved = localStorage.getItem('budgetTransactions');
    if (saved) {
      const parsed = JSON.parse(saved);
      setTransactions(Array.isArray(parsed) ? parsed : []);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('budgetTransactions', JSON.stringify(transactions));
  }, [transactions]);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const DonutBackground = () => (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Large donuts */}
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-pulse opacity-20"
          style={{
            top: `${10 + i * 18}%`,
            left: `${10 + i * 20}%`,
            animationDelay: `${i * 0.5}s`,
            animationDuration: '4s'
          }}
        >
          <div className="relative">
            <div className="w-24 h-24 bg-pink-200 rounded-full border-4 border-white shadow-lg"></div>
            <div className="absolute top-2 left-2 w-20 h-20 bg-pink-100 rounded-full border-2 border-pink-300"></div>
            <div className="absolute top-4 left-4 w-16 h-16 bg-pink-50 rounded-full"></div>
          </div>
        </div>
      ))}

      {/* Small donuts */}
      {[...Array(8)].map((_, i) => (
        <div
          key={`small-${i}`}
          className="absolute animate-bounce opacity-15"
          style={{
            top: `${15 + i * 12}%`,
            right: `${5 + i * 8}%`,
            animationDelay: `${i * 0.3}s`,
            animationDuration: '3s'
          }}
        >
          <div className="relative">
            <div className="w-12 h-12 bg-pink-300 rounded-full border-2 border-white shadow-md"></div>
            <div className="absolute top-1 left-1 w-10 h-10 bg-pink-200 rounded-full border border-pink-400"></div>
            <div className="absolute top-2 left-2 w-8 h-8 bg-pink-100 rounded-full"></div>
          </div>
        </div>
      ))}

      {/* Floating donuts */}
      <div className="absolute top-20 left-20 animate-spin opacity-25" style={{ animationDuration: '8s' }}>
        <div className="w-16 h-16 bg-pink-200 rounded-full border-3 border-white shadow-lg relative">
          <div className="absolute inset-2 bg-pink-50 rounded-full">
            <div className="absolute inset-2 bg-pink-100 rounded-full"></div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-32 right-32 animate-pulse opacity-20" style={{ animationDuration: '5s' }}>
        <div className="w-20 h-20 bg-pink-300 rounded-full border-3 border-white shadow-lg relative">
          <div className="absolute inset-3 bg-pink-200 rounded-full">
            <div className="absolute inset-2 bg-pink-100 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );

  const callCategorizerAgent = async (transaction: any): Promise<CategorySuggestion | null> => {
    try {
      const response = await fetch('https://agent-prod.studio.lyzr.ai/v3/inference/chat/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'sk-default-obhGvAo6gG9YT9tu6ChjyXLqnw7TxSGY'
        },
        body: JSON.stringify({
          user_id: `user${Date.now()}@test.com`,
          agent_id: '68e0594bbbcaab95f4ed53fe',
          session_id: `categorizer-${Date.now()}`,
          message: JSON.stringify(transaction)
        })
      });

      const data = await response.text();
      const parsed = parseLLMJson(data);
      return parsed?.result || null;
    } catch (error) {
      console.error('Categorizer error:', error);
      return null;
    }
  };

  const callSummaryAgent = async (transactions: Transaction[]): Promise<FinancialSummary | null> => {
    try {
      setIsLoading(true);
      const response = await fetch('https://agent-prod.studio.lyzr.ai/v3/inference/chat/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'sk-default-obhGvAo6gG9YT9tu6ChjyXLqnw7TxSGY'
        },
        body: JSON.stringify({
          user_id: `user${Date.now()}@test.com`,
          agent_id: '68e05958f21978807e7e981f',
          session_id: `summary-${Date.now()}`,
          message: JSON.stringify({
            transactions: transactions,
            period: insightsPeriod
          })
        })
      });

      const data = await response.text();
      const parsed = parseLLMJson(data);
      setIsLoading(false);
      return parsed?.result || null;
    } catch (error) {
      console.error('Summary error:', error);
      setIsLoading(false);
      return null;
    }
  };

  const generateInsights = async () => {
    const filtered = filterTransactions();
    const result = await callSummaryAgent(filtered);
    if (result) {
      setInsights(result);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const transaction = {
      id: editingTransaction?.id || generateId(),
      description: formData.description,
      amount: parseFloat(formData.amount),
      date: formData.date,
      category: formData.category,
      type: formData.type,
      notes: formData.notes
    };

    if (!transaction.category) {
      const suggestion = await callCategorizerAgent({
        description: transaction.description,
        amount: transaction.amount,
        type: transaction.type
      });

      if (suggestion) {
        transaction.category = suggestion.suggested_category;
      }
    }

    if (editingTransaction) {
      setTransactions(transactions.map(t => t.id === editingTransaction.id ? transaction : t));
      setEditingTransaction(null);
    } else {
      setTransactions([...transactions, transaction]);
    }

    setFormData({
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      category: '',
      type: 'expense',
      notes: ''
    });
    setShowAddModal(false);
  };

  const deleteTransaction = (id: string) => {
    setTransactions(transactions.filter(t => t.id !== id));
  };

  const editTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      description: transaction.description,
      amount: transaction.amount.toString(),
      date: transaction.date,
      category: transaction.category,
      type: transaction.type,
      notes: transaction.notes || ''
    });
    setShowAddModal(true);
  };

  const getTransactionsByPeriod = () => {
    const now = new Date();
    const periodStart = new Date();

    if (insightsPeriod === 'week') {
      periodStart.setDate(now.getDate() - 7);
    } else {
      periodStart.setMonth(now.getMonth() - 1);
    }

    return transactions.filter(t => new Date(t.date) >= periodStart);
  };

  useEffect(() => {
    if (activeTab === 'insights') {
      const recentTransactions = getTransactionsByPeriod();
      if (recentTransactions.length > 0) {
        generateInsights();
      }
    }
  }, [activeTab, insightsPeriod]);

  const getBalance = () => {
    return transactions.reduce((acc, t) => {
      return t.type === 'income' ? acc + t.amount : acc - t.amount;
    }, 0);
  };

  const getTotal = (type: 'income' | 'expense') => {
    return transactions
      .filter(t => t.type === type)
      .reduce((acc, t) => acc + t.amount, 0);
  };

  const getCategoryTotals = () => {
    const totals: { [key: string]: number } = {};
    transactions.forEach(t => {
      if (t.type === 'expense') {
        totals[t.category] = (totals[t.category] || 0) + t.amount;
      }
    });
    return totals;
  };

  const filterTransactions = () => {
    return transactions.filter(t => {
      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'all' || t.category === filterCategory;
      const matchesType = filterType === 'all' || t.type === filterType;

      let matchesDate = true;
      if (dateFilter !== 'all') {
        const transactionDate = new Date(t.date);
        const now = new Date();
        const periodStart = new Date();

        if (dateFilter === 'week') {
          periodStart.setDate(now.getDate() - 7);
        } else {
          periodStart.setMonth(now.getMonth() - 1);
        }

        matchesDate = transactionDate >= periodStart;
      }

      return matchesSearch && matchesCategory && matchesType && matchesDate;
    });
  };

  const PieChart = ({ data }: { data: { [key: string]: number } }) => {
    const entries = Object.entries(data);
    const total = entries.reduce((sum, [, value]) => sum + value, 0);
    let currentAngle = 0;

    const colors = ['#FFB6C1', '#FFC0CB', '#FF69B4', '#FF1493', '#FF69B4', '#FF6B9D'];

    return (
      <svg className="w-full h-64" viewBox="0 0 200 200">
        {entries.map(([category, value], index) => {
          const percentage = value / total;
          const angle = percentage * 360;
          const x1 = 100 + 80 * Math.cos((currentAngle * Math.PI) / 180);
          const y1 = 100 + 80 * Math.sin((currentAngle * Math.PI) / 180);
          const x2 = 100 + 80 * Math.cos(((currentAngle + angle) * Math.PI) / 180);
          const y2 = 100 + 80 * Math.sin(((currentAngle + angle) * Math.PI) / 180);

          const largeArcFlag = angle > 180 ? 1 : 0;

          const pathData = [
            'M', 100, 100,
            'L', x1, y1,
            'A', 80, 80, 0, largeArcFlag, 1, x2, y2,
            'Z'
          ].join(' ');

          currentAngle += angle;

          return (
            <path
              key={category}
              d={pathData}
              fill={colors[index % colors.length]}
              className="hover:opacity-80 transition-opacity"
              title={`${category}: $${value.toFixed(2)}`}
            />
          );
        })}
      </svg>
    );
  };

  const BarChart = ({ data }: { data: { [key: string]: number } }) => {
    const entries = Object.entries(data);
    const maxValue = Math.max(...entries.map(([, value]) => value));
    const colors = ['#FFB6C1', '#FFC0CB', '#FF69B4', '#FF1493'];

    return (
      <div className="w-full h-64 flex items-end justify-around px-4">
        {entries.map(([category, value], index) => {
          const height = (value / maxValue) * 200;
          return (
            <div key={category} className="flex flex-col items-center flex-1">
              <div
                className="w-full rounded-t transition-all hover:opacity-80"
                style={{
                  height: `${height}px`,
                  backgroundColor: colors[index % colors.length]
                }}
                title={`${category}: $${value.toFixed(2)}`}
              />
              <span className="text-xs text-gray-600 mt-2 text-center">{category}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white bg-opacity-90 rounded-2xl p-6 shadow-lg border border-pink-200">
          <h3 className="text-lg font-semibold text-pink-700 mb-2">Total Balance</h3>
          <p className={`text-3xl font-bold ${getBalance() >= 0 ? 'text-pink-600' : 'text-pink-400'}`}>
            ${getBalance().toFixed(2)}
          </p>
        </div>
        <div className="bg-white bg-opacity-90 rounded-2xl p-6 shadow-lg border border-pink-200">
          <h3 className="text-lg font-semibold text-pink-700 mb-2">Total Income</h3>
          <p className="text-3xl font-bold text-pink-500">${getTotal('income').toFixed(2)}</p>
        </div>
        <div className="bg-white bg-opacity-90 rounded-2xl p-6 shadow-lg border border-pink-200">
          <h3 className="text-lg font-semibold text-pink-700 mb-2">Total Expenses</h3>
          <p className="text-3xl font-bold text-pink-400">${getTotal('expense').toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white bg-opacity-90 rounded-2xl p-6 shadow-lg border border-pink-200">
          <h3 className="text-lg font-semibold text-pink-700 mb-4">Spending by Category</h3>
          <PieChart data={getCategoryTotals()} />
        </div>
        <div className="bg-white bg-opacity-90 rounded-2xl p-6 shadow-lg border border-pink-200">
          <h3 className="text-lg font-semibold text-pink-700 mb-4">Monthly Comparison</h3>
          <BarChart data={{
            'Income': getTotal('income'),
            'Expenses': getTotal('expense'),
            'Net': getBalance()
          }} />
        </div>
      </div>
    </div>
  );

  const renderTransactions = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          placeholder="Search transactions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border border-pink-300 rounded-xl focus:ring-2 focus:ring-pink-400 focus:border-pink-400 bg-pink-50"
        />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-4 py-2 border border-pink-300 rounded-xl focus:ring-2 focus:ring-pink-400 focus:border-pink-400 bg-pink-50"
        >
          <option value="all">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
          className="px-4 py-2 border border-pink-300 rounded-xl focus:ring-2 focus:ring-pink-400 focus:border-pink-400 bg-pink-50"
        >
          <option value="all">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as any)}
          className="px-4 py-2 border border-pink-300 rounded-xl focus:ring-2 focus:ring-pink-400 focus:border-pink-400 bg-pink-50"
        >
          <option value="all">All Time</option>
          <option value="week">Last Week</option>
          <option value="month">Last Month</option>
        </select>
      </div>

      <div className="bg-white bg-opacity-90 rounded-2xl shadow-lg border border-pink-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-pink-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-pink-600 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-pink-600 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-pink-600 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-pink-600 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-pink-600 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-pink-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white bg-opacity-70 divide-y divide-pink-200">
              {filterTransactions().map((transaction) => (
                <tr key={transaction.id} className="hover:bg-pink-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-pink-900">
                    {transaction.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-pink-700 font-medium">
                    {transaction.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-pink-600">
                    {new Date(transaction.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      transaction.type === 'income' ? 'bg-pink-200 text-pink-800' : 'bg-pink-100 text-pink-700'
                    }`}>
                      {transaction.type}
                    </span>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${
                    transaction.type === 'income' ? 'text-pink-600' : 'text-pink-400'
                  }`}>
                    ${transaction.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => editTransaction(transaction)}
                      className="text-pink-600 hover:text-pink-800 transition-colors bg-pink-100 hover:bg-pink-200 px-3 py-1 rounded-lg"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteTransaction(transaction.id)}
                      className="text-pink-500 hover:text-pink-700 transition-colors bg-pink-50 hover:bg-pink-100 px-3 py-1 rounded-lg"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderInsights = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-pink-700">🍩 Sweet Financial Insights</h2>
        <select
          value={insightsPeriod}
          onChange={(e) => setInsightsPeriod(e.target.value as 'week' | 'month')}
          className="px-4 py-2 border border-pink-300 rounded-xl focus:ring-2 focus:ring-pink-400 focus:border-pink-400 bg-pink-50"
        >
          <option value="week">Last Week</option>
          <option value="month">Last Month</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 border-t-pink-200"></div>
        </div>
      ) : insights ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white bg-opacity-90 rounded-2xl p-6 shadow-lg border border-pink-200">
            <h3 className="text-lg font-semibold text-pink-700 mb-4">Summary</h3>
            <p className="text-pink-800">{insights.summary}</p>
          </div>

          <div className="bg-white bg-opacity-90 rounded-2xl p-6 shadow-lg border border-pink-200">
            <h3 className="text-lg font-semibold text-pink-700 mb-4">Statistics</h3>
            <div className="space-y-2">
              <p className="text-pink-700">
                <span className="font-medium">Total Spent:</span> ${insights.statistics.total_spend.toFixed(2)}
              </p>
              <p className="text-pink-700">
                <span className="font-medium">Top Category:</span> {insights.statistics.top_category}
              </p>
              {insights.statistics.unusual_patterns.length > 0 && (
                <div>
                  <p className="font-medium text-pink-800 mt-2">Unusual Patterns:</p>
                  {insights.statistics.unusual_patterns.map((pattern, index) => (
                    <p key={index} className="text-pink-500 text-sm">• {pattern}</p>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white bg-opacity-90 rounded-2xl p-6 shadow-lg border border-pink-200">
            <h3 className="text-lg font-semibold text-pink-700 mb-4">📊 Insights</h3>
            <ul className="space-y-2">
              {insights.insights.map((insight, index) => (
                <li key={index} className="flex items-start text-pink-700">
                  <span className="text-pink-500 mr-2">•</span>
                  {insight}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white bg-opacity-90 rounded-2xl p-6 shadow-lg border border-pink-200">
            <h3 className="text-lg font-semibold text-pink-700 mb-4">💡 Recommendations</h3>
            <ul className="space-y-2">
              {insights.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start text-pink-700">
                  <span className="text-pink-400 mr-2">💡</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="bg-white bg-opacity-90 rounded-2xl p-6 shadow-lg border border-pink-200 text-center">
          <p className="text-pink-600">🍩 Add more transactions to get sweet insights!</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-pink-50 to-white text-gray-800 relative">
      <DonutBackground />

      <div className="flex relative z-10">
        <div className="w-72 bg-white bg-opacity-95 text-pink-700 min-h-screen shadow-xl border-r border-pink-200 backdrop-blur-sm">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-pink-500 mb-8 flex items-center gap-3">
              🍩 Sweet Budget
              <span className="text-lg">✨</span>
            </h1>

            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 ${
                  activeTab === 'overview'
                    ? 'bg-pink-100 text-pink-700 border-2 border-pink-200 shadow-sm'
                    : 'hover:bg-pink-50 text-pink-600 hover:border-pink-200 border-2 border-transparent'
                }`}
              >
                📊 Overview
              </button>
              <button
                onClick={() => setActiveTab('transactions')}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 ${
                  activeTab === 'transactions'
                    ? 'bg-pink-100 text-pink-700 border-2 border-pink-200 shadow-sm'
                    : 'hover:bg-pink-50 text-pink-600 hover:border-pink-200 border-2 border-transparent'
                }`}
              >
                💳 Transactions
              </button>
              <button
                onClick={() => setActiveTab('insights')}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 ${
                  activeTab === 'insights'
                    ? 'bg-pink-100 text-pink-700 border-2 border-pink-200 shadow-sm'
                    : 'hover:bg-pink-50 text-pink-600 hover:border-pink-200 border-2 border-transparent'
                }`}
              >
                🎯 Insights
              </button>
            </nav>

            <div className="mt-8">
              <button
                onClick={() => {
                  setShowAddModal(true);
                  setEditingTransaction(null);
                  setFormData({
                    description: '',
                    amount: '',
                    date: new Date().toISOString().split('T')[0],
                    category: '',
                    type: 'expense',
                    notes: ''
                  });
                }}
                className="w-full bg-gradient-to-r from-pink-400 to-pink-500 hover:from-pink-500 hover:to-pink-600 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                ➕ Add Sweet Transaction
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'transactions' && renderTransactions()}
            {activeTab === 'insights' && renderInsights()}
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md text-gray-800 shadow-2xl border border-pink-200">
            <h2 className="text-xl font-bold mb-4 text-pink-700 flex items-center gap-2">
              🍩 {editingTransaction ? 'Edit Sweet Transaction' : 'Add New Sweet Transaction'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-pink-700 mb-2">Description</label>
                <input
                  type="text"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-pink-300 rounded-xl focus:ring-2 focus:ring-pink-400 focus:border-pink-400 bg-pink-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-pink-700 mb-2">Amount</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-pink-300 rounded-xl focus:ring-2 focus:ring-pink-400 focus:border-pink-400 bg-pink-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-pink-700 mb-2">Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-pink-300 rounded-xl focus:ring-2 focus:ring-pink-400 focus:border-pink-400 bg-pink-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-pink-700 mb-2">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'income' | 'expense' })}
                  className="w-full px-3 py-2 border border-pink-300 rounded-xl focus:ring-2 focus:ring-pink-400 focus:border-pink-400 bg-pink-50"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-pink-700 mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-pink-300 rounded-xl focus:ring-2 focus:ring-pink-400 focus:border-pink-400 bg-pink-50"
                >
                  <option value="">Select a category (or leave empty for AI suggestion)</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-pink-700 mb-2">Sweet Notes (Optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-pink-300 rounded-xl focus:ring-2 focus:ring-pink-400 focus:border-pink-400 bg-pink-50"
                  rows={3}
                />
              </div>

              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-pink-400 to-pink-500 hover:from-pink-500 hover:to-pink-600 text-white font-semibold py-2 px-4 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  {editingTransaction ? 'Update' : 'Add'} Sweet Transaction
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingTransaction(null);
                  }}
                  className="flex-1 bg-pink-100 hover:bg-pink-200 text-pink-700 font-semibold py-2 px-4 rounded-xl transition-colors border border-pink-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;