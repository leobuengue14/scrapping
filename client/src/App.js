import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Play, RefreshCw } from 'lucide-react';
import ProductTable from './components/ProductTable';
import SourceManager from './components/SourceManager';

function App() {
  const [products, setProducts] = useState([]);
  const [sources, setSources] = useState([]);
  const [executing, setExecuting] = useState(false);

  // Fetch products and sources on component mount
  useEffect(() => {
    fetchProducts();
    fetchSources();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/api/products');
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchSources = async () => {
    try {
      const response = await axios.get('/api/sources');
      setSources(response.data);
    } catch (error) {
      console.error('Error fetching sources:', error);
    }
  };

  const handleExecute = async () => {
    setExecuting(true);
    try {
      const response = await axios.post('/api/execute');
      console.log('Execution results:', response.data);
      
      // Refresh products after execution
      await fetchProducts();
      
      // Show success message
      alert('Scraping completed successfully!');
    } catch (error) {
      console.error('Error executing scraping:', error);
      alert('Error executing scraping. Please check the console for details.');
    } finally {
      setExecuting(false);
    }
  };

  const handleAddSource = async (sourceData) => {
    try {
      await axios.post('/api/sources', sourceData);
      fetchSources();
    } catch (error) {
      console.error('Error adding source:', error);
      alert('Error adding source. Please try again.');
    }
  };

  const handleDeleteSource = async (id) => {
    try {
      await axios.delete(`/api/sources/${id}`);
      fetchSources();
    } catch (error) {
      console.error('Error deleting source:', error);
      alert('Error deleting source. Please try again.');
    }
  };

  const handleDeleteProduct = async (id) => {
    try {
      await axios.delete(`/api/products/${id}`);
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Error deleting product. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Web Scraping App</h1>
              <p className="text-gray-600">Monitor products from multiple sources</p>
            </div>
            <button
              onClick={handleExecute}
              disabled={executing || sources.length === 0}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                executing || sources.length === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
              }`}
            >
              {executing ? (
                <RefreshCw className="animate-spin -ml-1 mr-2 h-4 w-4" />
              ) : (
                <Play className="-ml-1 mr-2 h-4 w-4" />
              )}
              {executing ? 'Executing...' : 'Execute Scraping'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sources Section */}
            <div className="lg:col-span-1">
              <SourceManager
                sources={sources}
                onAddSource={handleAddSource}
                onDeleteSource={handleDeleteSource}
              />
            </div>

            {/* Products Section */}
            <div className="lg:col-span-2">
              <ProductTable products={products} onDeleteProduct={handleDeleteProduct} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App; 