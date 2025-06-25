import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Play, RefreshCw, Database, Settings, X, Plus, Search, ChevronLeft, ChevronRight, ChevronFirst, ChevronLast, Tag } from 'lucide-react';
import SourceManager from './components/SourceManager';
import ProductCatalog from './components/ProductCatalog';
import ProductSelectionModal from './components/ProductSelectionModal';
import DataView from './components/DataView';
import LabelsManager from './components/LabelsManager';

function App() {
  const [products, setProducts] = useState([]);
  const [sources, setSources] = useState([]);
  const [activeTab, setActiveTab] = useState('product-catalog'); // 'product-catalog', 'labels', or 'data'
  
  // Product catalog navigation state
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [selectedProductName, setSelectedProductName] = useState('');
  const [showSourceManager, setShowSourceManager] = useState(false); // New state for source manager modal
  
  // Product selection modal state
  const [showProductSelectionModal, setShowProductSelectionModal] = useState(false);
  
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
              // Switch to data tab
              setActiveTab('data');
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

  const handleDeleteProduct = async (productId) => {
    try {
      await axios.delete(`http://localhost:5001/api/products/${productId}`);
      // Refresh products after deletion
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const handleDeleteProductGroup = async (productName) => {
    try {
      await axios.delete(`http://localhost:5001/api/products/name/${encodeURIComponent(productName)}`);
      // Refresh products after deletion
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product group:', error);
    }
  };

  // Functions for deleting individual data records
  const handleDeleteDataRecord = async (dataId) => {
    try {
      await axios.delete(`http://localhost:5001/api/data/${dataId}`);
      // DataView will handle refreshing its own data
    } catch (error) {
      console.error('Error deleting data record:', error);
    }
  };

  const handleDeleteDataGroup = async (productName) => {
    try {
      await axios.delete(`http://localhost:5001/api/data/name/${encodeURIComponent(productName)}`);
      // DataView will handle refreshing its own data
    } catch (error) {
      console.error('Error deleting data group:', error);
    }
  };

  const handleNavigateToSources = (productId, productName) => {
    setSelectedProductId(productId);
    setSelectedProductName(productName);
    setShowSourceManager(true);
  };

  const handleLinkSourceToProduct = async (sourceId) => {
    if (!selectedProductId) return;
    
    try {
      await axios.put(`http://localhost:5001/api/sources/${sourceId}/link-product`, {
        productId: selectedProductId
      });
      // Refresh sources to get updated linking status
      fetchSources();
    } catch (error) {
      console.error('Error linking source to product:', error);
    }
  };

  const handleUnlinkSourceFromProduct = async (sourceId) => {
    if (!selectedProductId) return;
    
    try {
      await axios.put(`http://localhost:5001/api/sources/${sourceId}/unlink-product`, {
        productId: selectedProductId
      });
      // Refresh sources to get updated linking status
      fetchSources();
    } catch (error) {
      console.error('Error unlinking source from product:', error);
    }
  };

  const getSourceTypeName = (type) => {
    switch (type) {
      case 'sporting':
        return 'Sporting.com.ar';
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

  const handleExecute = () => {
    setShowProductSelectionModal(true);
  };

  const handleExecuteScraping = async (selectedProductIds) => {
    try {
      const response = await axios.post('http://localhost:5001/api/execute', {
        selectedProductIds: selectedProductIds
      });
      console.log('Scraping executed:', response.data);
      // Switch to data tab to show results
      setActiveTab('data');
      // Force refresh of data after a short delay to ensure scraping is complete
      setTimeout(() => {
        // This will trigger DataView to refresh its data
        const dataViewElement = document.querySelector('[data-testid="data-view"]');
        if (dataViewElement) {
          // Trigger a custom event to refresh data
          window.dispatchEvent(new CustomEvent('refreshDataView'));
        }
      }, 2000);
    } catch (error) {
      console.error('Error executing scraping:', error);
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
              <div className="flex space-x-1">
                <button
                  onClick={() => {
                    setActiveTab('product-catalog');
                    setSelectedProductId(null);
                    setSelectedProductName('');
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'product-catalog'
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Productos
                </button>
                <button
                  onClick={() => {
                    setActiveTab('labels');
                    setSelectedProductId(null);
                    setSelectedProductName('');
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'labels'
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Tag size={16} />
                  Labels
                </button>
                <button
                  onClick={() => {
                    setActiveTab('data');
                    setSelectedProductId(null);
                    setSelectedProductName('');
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'data'
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Datos
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Content */}
        {activeTab === 'product-catalog' && (
          <ProductCatalog
            onNavigateToSources={handleNavigateToSources}
            onDeleteProduct={handleDeleteProduct}
            onDeleteProductGroup={handleDeleteProductGroup}
          />
        )}
        
        {activeTab === 'labels' && (
          <LabelsManager />
        )}
        
        {activeTab === 'data' && (
          <div>
            <div className="flex justify-end items-center mb-6">
              <button
                onClick={handleExecute}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Play size={16} className="mr-2" />
                Ejecutar Scrapers
              </button>
            </div>
            <DataView 
              onDeleteProduct={handleDeleteDataRecord}
              onDeleteProductGroup={handleDeleteDataGroup}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      {showSourceManager && (
        <SourceManager
          onClose={() => {
            setShowSourceManager(false);
            setSelectedProductId(null);
            setSelectedProductName('');
            fetchSources();
          }}
          onSourceAdded={fetchSources}
          selectedProductId={selectedProductId}
          selectedProductName={selectedProductName}
        />
      )}

      {/* Product Selection Modal */}
      {showProductSelectionModal && (
        <ProductSelectionModal
          isOpen={showProductSelectionModal}
          onClose={() => setShowProductSelectionModal(false)}
          onExecute={handleExecuteScraping}
        />
      )}

      {/* Scraping Progress Modal */}
      {showScrapingProgress && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Progreso del Scraping</h3>
            
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">
                  Producto {currentProductNumber} de {totalProductsToScrape}
                </p>
                {currentProductName && (
                  <p className="text-sm font-medium text-gray-900 mb-2">
                    {currentProductName}
                  </p>
                )}
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: totalProductsToScrape > 0 
                      ? `${(currentProductNumber / totalProductsToScrape) * 100}%` 
                      : '0%' 
                  }}
                ></div>
              </div>

              <div className="text-center">
                <p className="text-xs text-gray-500">
                  {scrapingStatus === 'completed' && '✅ Scraping completado'}
                  {scrapingStatus === 'error' && '❌ Error en el scraping'}
                  {scrapingStatus === 'scraping' && '🔄 Scraping en progreso...'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App; 