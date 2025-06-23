import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Play, RefreshCw, Database, Settings, X, Plus, Search, ChevronLeft, ChevronRight, ChevronFirst, ChevronLast } from 'lucide-react';
import ProductTable from './components/ProductTable';
import SourceManager from './components/SourceManager';

function App() {
  const [products, setProducts] = useState([]);
  const [sources, setSources] = useState([]);
  const [executing, setExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState('sources'); // 'sources' or 'products'
  const [showExecuteModal, setShowExecuteModal] = useState(false);
  const [selectedSources, setSelectedSources] = useState([]);
  const [showAddSourceModal, setShowAddSourceModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5); // 5 sources por página
  
  // Real-time scraping updates
  const [scrapingUpdates, setScrapingUpdates] = useState([]);
  const [showScrapingProgress, setShowScrapingProgress] = useState(false);
  
  // Scraping progress tracking
  const [totalProductsToScrape, setTotalProductsToScrape] = useState(0);
  const [currentProductNumber, setCurrentProductNumber] = useState(0);
  const [currentProductName, setCurrentProductName] = useState('');
  const [scrapingStatus, setScrapingStatus] = useState('idle'); // 'idle', 'starting', 'scraping', 'completed', 'error'

  // Fetch products and sources on component mount
  useEffect(() => {
    fetchProducts();
    fetchSources();
  }, []);

  // SSE connection for real-time updates
  useEffect(() => {
    let eventSource = null;

    const connectSSE = () => {
      eventSource = new EventSource('http://localhost:5001/api/scraping-updates');
      
      eventSource.onmessage = (event) => {
        try {
          const update = JSON.parse(event.data);
          console.log('SSE Update:', update);
          
          setScrapingUpdates(prev => {
            const newUpdates = [...prev, { ...update, timestamp: new Date() }];
            // Keep only last 20 updates to prevent memory issues
            return newUpdates.slice(-20);
          });
          
          // Update progress tracking based on update type
          switch (update.type) {
            case 'scraping_started':
              setScrapingStatus('starting');
              setCurrentProductNumber(0);
              setCurrentProductName('');
              // Use totalCount from backend or extract from message
              setTotalProductsToScrape(update.totalCount || 1);
              break;
              
            case 'scraping_progress':
              setScrapingStatus('scraping');
              // Use currentIndex and totalCount from backend
              if (update.currentIndex) {
                setCurrentProductNumber(update.currentIndex);
              }
              if (update.totalCount) {
                setTotalProductsToScrape(update.totalCount);
              }
              // Extract product name from message
              if (update.message) {
                const nameMatch = update.message.match(/:\s*(.+)$/);
                if (nameMatch) {
                  setCurrentProductName(nameMatch[1].trim());
                }
              }
              break;
              
            case 'scraping_success':
              setScrapingStatus('scraping');
              if (update.data?.name) {
                setCurrentProductName(update.data.name);
              }
              break;
              
            case 'scraping_completed':
              setScrapingStatus('completed');
              break;
              
            case 'scraping_error':
              setScrapingStatus('error');
              break;
          }
          
          // Show progress modal when scraping starts
          if (update.type === 'scraping_started') {
            setShowScrapingProgress(true);
          }
          
          // Hide progress modal when scraping completes
          if (update.type === 'scraping_completed') {
            setTimeout(() => {
              setShowScrapingProgress(false);
              setScrapingStatus('idle');
              setScrapingUpdates([]);
              setTotalProductsToScrape(0);
              setCurrentProductNumber(0);
              setCurrentProductName('');
              // Refresh products after completion
              fetchProducts();
              // Switch to products tab
              setActiveTab('products');
            }, 3000); // Show completion message for 3 seconds
          }
        } catch (error) {
          console.error('Error parsing SSE update:', error);
        }
      };
      
      eventSource.onerror = (error) => {
        console.error('SSE Error:', error);
        eventSource.close();
      };
    };

    connectSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  const fetchProducts = async () => {
    try {
      console.log('Fetching products...');
      const response = await axios.get('http://localhost:5001/api/products');
      console.log('Products fetched:', response.data);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchSources = async () => {
    try {
      console.log('Fetching sources...');
      const response = await axios.get('http://localhost:5001/api/sources');
      console.log('Sources fetched:', response.data);
      setSources(response.data);
    } catch (error) {
      console.error('Error fetching sources:', error);
    }
  };

  const handleExecute = () => {
    setShowExecuteModal(true);
  };

  const handleExecuteSelected = async () => {
    if (selectedSources.length === 0) return;
    
    setExecuting(true);
    setShowExecuteModal(false);
    
    // Set total products to scrape
    setTotalProductsToScrape(selectedSources.length);
    setCurrentProductNumber(0);
    setCurrentProductName('');
    setScrapingStatus('starting');
    
    try {
      const response = await fetch('http://localhost:5001/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceIds: selectedSources
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Scraping completed:', result);
      } else {
        console.error('Error executing scraping');
      }
    } catch (error) {
      console.error('Error executing scraping:', error);
    } finally {
      setExecuting(false);
      setSelectedSources([]);
    }
  };

  const handleSourceCheckboxChange = (sourceId) => {
    setSelectedSources(prev => {
      if (prev.includes(sourceId)) {
        return prev.filter(id => id !== sourceId);
      } else {
        return [...prev, sourceId];
      }
    });
  };

  const handleSelectAll = () => {
    const filteredSources = sources.filter(source => 
      source.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const filteredSourceIds = filteredSources.map(source => source.id);
    setSelectedSources(filteredSourceIds);
  };

  const handleDeselectAll = () => {
    setSelectedSources([]);
  };

  // Filter sources based on search term
  const filteredSources = sources.filter(source => 
    source.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination logic for sources
  const totalPages = Math.ceil(filteredSources.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSources = filteredSources.slice(startIndex, endIndex);

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToFirstPage = () => goToPage(1);
  const goToLastPage = () => goToPage(totalPages);
  const goToPreviousPage = () => goToPage(currentPage - 1);
  const goToNextPage = () => goToPage(currentPage + 1);

  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Reset to first page when products change
  useEffect(() => {
    setCurrentPage(1);
  }, [products.length]);

  const handleDeleteProduct = async (productId) => {
    try {
      await axios.delete(`http://localhost:5001/api/products/${productId}`);
      await fetchProducts(); // Refresh the products list
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Error al borrar el producto. Por favor intenta de nuevo.');
    }
  };

  const handleDeleteProductGroup = async (productName) => {
    try {
      const encodedProductName = encodeURIComponent(productName);
      await axios.delete(`http://localhost:5001/api/products/name/${encodedProductName}`);
      await fetchProducts(); // Refresh the products list
    } catch (error) {
      console.error('Error deleting product group:', error);
      alert('Error al borrar el grupo de productos. Por favor intenta de nuevo.');
    }
  };

  const getSourceTypeName = (type) => {
    switch (type?.toLowerCase()) {
      case 'sporting':
        return 'Sporting';
      case 'tiendariver':
        return 'Tienda River';
      case 'dia':
        return 'Supermercado Dia';
      case 'coto':
        return 'Coto Digital';
      default:
        return type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Unknown';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <Database className="h-8 w-8 text-primary-600" />
              <h1 className="text-2xl font-bold text-gray-900">Web Scraping App</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setActiveTab('sources')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'sources'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Sources
              </button>
              <button
                onClick={() => setActiveTab('products')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'products'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Products
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'sources' && (
          <div className="space-y-6">
            {/* Sources Toolbar */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Sources</h2>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setShowAddSourceModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Source
                  </button>
                  <button
                    onClick={handleExecute}
                    disabled={executing}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {executing ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Execute
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar sources..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                />
              </div>

              {/* Selection Controls */}
              {filteredSources.length > 0 && (
                <div className="flex items-center space-x-4 mt-4">
                  <button
                    onClick={handleSelectAll}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Seleccionar todos
                  </button>
                  <button
                    onClick={handleDeselectAll}
                    className="text-sm text-gray-600 hover:text-gray-700 font-medium"
                  >
                    Deseleccionar todos
                  </button>
                  {selectedSources.length > 0 && (
                    <span className="text-sm text-gray-500">
                      {selectedSources.length} seleccionado(s)
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Sources List */}
            <div className="bg-white rounded-lg shadow-sm border">
              {filteredSources.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-gray-500">
                    {searchTerm ? 'No se encontraron sources que coincidan con la búsqueda.' : 'No hay sources disponibles.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-gray-200">
                    {currentSources.map((source) => (
                      <div key={source.id} className="p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <input
                              type="checkbox"
                              checked={selectedSources.includes(source.id)}
                              onChange={() => handleSourceCheckboxChange(source.id)}
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            />
                            <div>
                              <h3 className="text-lg font-medium text-gray-900">{source.name}</h3>
                              <p className="text-sm text-gray-500">{source.url}</p>
                              <p className="text-xs text-gray-400">Type: {getSourceTypeName(source.type)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination for Sources */}
                  {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-700">
                          Showing {startIndex + 1} to {Math.min(endIndex, filteredSources.length)} of {filteredSources.length} sources
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={goToFirstPage}
                            disabled={currentPage === 1}
                            className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronFirst className="h-3 w-3" />
                          </button>
                          <button
                            onClick={goToPreviousPage}
                            disabled={currentPage === 1}
                            className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronLeft className="h-3 w-3" />
                          </button>
                          
                          <span className="text-sm text-gray-700">
                            Page {currentPage} of {totalPages}
                          </span>
                          
                          <button
                            onClick={goToNextPage}
                            disabled={currentPage === totalPages}
                            className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronRight className="h-3 w-3" />
                          </button>
                          <button
                            onClick={goToLastPage}
                            disabled={currentPage === totalPages}
                            className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronLast className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <ProductTable 
            products={products} 
            onDeleteProduct={handleDeleteProduct}
            onDeleteProductGroup={handleDeleteProductGroup}
          />
        )}
      </div>

      {/* Execute Modal */}
      {showExecuteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Ejecutar Scraping</h3>
              <button
                onClick={() => setShowExecuteModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                Selecciona las sources que quieres scrapear:
              </p>
              
              {filteredSources.length === 0 ? (
                <p className="text-gray-500 text-sm">No hay sources disponibles.</p>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {filteredSources.map((source) => (
                    <label key={source.id} className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedSources.includes(source.id)}
                        onChange={() => handleSourceCheckboxChange(source.id)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{source.name}</p>
                        <p className="text-xs text-gray-500">{source.url}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowExecuteModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleExecuteSelected}
                disabled={selectedSources.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Ejecutar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Source Modal */}
      {showAddSourceModal && (
        <SourceManager 
          onClose={() => setShowAddSourceModal(false)}
          onSourceAdded={() => {
            fetchSources();
            setShowAddSourceModal(false);
          }}
        />
      )}

      {/* Real-time Scraping Progress Modal */}
      {showScrapingProgress && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <div className="text-center">
              {/* Header */}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Progreso del Scraping
                </h3>
                <p className="text-sm text-gray-600">
                  {scrapingStatus === 'starting' && 'Iniciando proceso...'}
                  {scrapingStatus === 'scraping' && 'Extrayendo productos...'}
                  {scrapingStatus === 'completed' && '¡Proceso completado!'}
                  {scrapingStatus === 'error' && 'Error en el proceso'}
                </p>
              </div>

              {/* Progress Information */}
              <div className="space-y-4 mb-6">
                {/* Total Products */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-blue-800">Total de productos a scrapear</p>
                  <p className="text-2xl font-bold text-blue-900">{totalProductsToScrape}</p>
                </div>

                {/* Current Progress */}
                {scrapingStatus === 'scraping' && (
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-yellow-800">
                      Scrapeando producto número {currentProductNumber} del total de {totalProductsToScrape}
                    </p>
                    <div className="mt-2">
                      <div className="w-full bg-yellow-200 rounded-full h-2">
                        <div 
                          className="bg-yellow-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(currentProductNumber / totalProductsToScrape) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Current Product Name */}
                {currentProductName && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-green-800">Producto actual:</p>
                    <p className="text-lg font-semibold text-green-900 truncate" title={currentProductName}>
                      {currentProductName}
                    </p>
                  </div>
                )}
              </div>

              {/* Status Icon */}
              <div className="mb-6">
                {scrapingStatus === 'starting' && (
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                )}
                {scrapingStatus === 'scraping' && (
                  <div className="animate-pulse">
                    <div className="rounded-full h-12 w-12 bg-yellow-500 mx-auto flex items-center justify-center">
                      <span className="text-white font-bold text-sm">{currentProductNumber}</span>
                    </div>
                  </div>
                )}
                {scrapingStatus === 'completed' && (
                  <div className="rounded-full h-12 w-12 bg-green-500 mx-auto flex items-center justify-center">
                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                {scrapingStatus === 'error' && (
                  <div className="rounded-full h-12 w-12 bg-red-500 mx-auto flex items-center justify-center">
                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Close Button */}
              {scrapingStatus === 'completed' && (
                <button
                  onClick={() => setShowScrapingProgress(false)}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Cerrar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App; 