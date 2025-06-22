import React, { useState } from 'react';
import { Plus, Trash2, Globe, Settings } from 'lucide-react';

const SourceManager = ({ sources, onAddSource, onDeleteSource }) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    url: '',
    type: 'sporting'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.url) {
      alert('Please enter a URL');
      return;
    }

    onAddSource(formData);
    setFormData({ url: '', type: 'sporting' });
    setShowForm(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getSourceTypeIcon = (type) => {
    switch (type) {
      case 'sporting':
        return '🏪';
      default:
        return '🌐';
    }
  };

  const getSourceTypeName = (type) => {
    switch (type) {
      case 'sporting':
        return 'Sporting.com.ar';
      default:
        return type;
    }
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900 flex items-center">
          <Globe className="mr-2 h-5 w-5 text-primary-600" />
          Sources
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Manage your scraping sources
        </p>
      </div>

      <div className="p-6">
        {/* Add Source Button */}
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <Plus className="-ml-1 mr-2 h-4 w-4" />
            Add Source
          </button>
        )}

        {/* Add Source Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700">
                Product URL *
              </label>
              <input
                type="url"
                id="url"
                name="url"
                value={formData.url}
                onChange={handleInputChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="https://www.sporting.com.ar/product-url"
                required
              />
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                Source Type
              </label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              >
                <option value="sporting">Sporting.com.ar</option>
                {/* Add more source types here as needed */}
              </select>
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <Plus className="-ml-1 mr-2 h-4 w-4" />
                Add Source
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Sources List */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-900 flex items-center">
            <Settings className="mr-2 h-4 w-4" />
            Active Sources ({sources.length})
          </h3>

          {sources.length === 0 ? (
            <div className="text-center py-4">
              <Globe className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">No sources added yet</p>
            </div>
          ) : (
            sources.map((source) => (
              <div
                key={source.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{getSourceTypeIcon(source.type)}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{source.name}</p>
                    <p className="text-xs text-gray-500">{getSourceTypeName(source.type)}</p>
                  </div>
                </div>
                <button
                  onClick={() => onDeleteSource(source.id)}
                  className="text-red-600 hover:text-red-900 p-1"
                  title="Delete source"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SourceManager; 