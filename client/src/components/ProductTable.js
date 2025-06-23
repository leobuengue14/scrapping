import React, { useState, useMemo } from 'react';
import { ExternalLink, Trash2, Calendar, DollarSign, Package, ChevronDown, ChevronRight, ChevronLeft, ChevronFirst, ChevronLast } from 'lucide-react';

const ProductTable = ({ products, onDeleteProduct, onDeleteProductGroup }) => {
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5); // 5 productos por página

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price) => {
    if (!price) return 'N/A';
    
    // Convert to string if it's a number
    let priceStr = typeof price === 'number' ? price.toString() : price;
    
    // Remove any existing currency symbols and spaces
    priceStr = priceStr.replace(/[$\s]/g, '');
    
    // Handle Argentine format where dots are thousand separators
    // Convert "179.999" to "179999"
    if (priceStr.includes('.')) {
      priceStr = priceStr.replace(/\./g, '');
    }
    
    // Convert to number
    const numericPrice = parseInt(priceStr);
    
    if (isNaN(numericPrice)) return 'N/A';
    
    // Format as Argentine peso currency
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numericPrice);
  };

  const getSourceTypeName = (type, sourceName = '') => {
    // First try to get from source_type field
    if (type) {
      switch (type.toLowerCase()) {
        case 'sporting':
          return 'Sporting';
        case 'tiendariver':
          return 'Tienda River';
        case 'dia':
          return 'Supermercado Dia';
        default:
          return type.charAt(0).toUpperCase() + type.slice(1);
      }
    }
    
    // Fallback to source_name analysis
    if (sourceName.toLowerCase().includes('sporting')) {
      return 'Sporting';
    } else if (sourceName.toLowerCase().includes('tiendariver')) {
      return 'Tienda River';
    } else if (sourceName.toLowerCase().includes('dia')) {
      return 'Supermercado Dia';
    }
    
    return 'Unknown';
  };

  const handleViewProduct = (url) => {
    window.open(url, '_blank');
  };

  const handleDeleteProduct = (productId) => {
    if (window.confirm('Are you sure you want to delete this scraped data?')) {
      onDeleteProduct(productId);
    }
  };

  const handleDeleteProductGroup = (productName) => {
    if (window.confirm(`Are you sure you want to delete ALL scraped records for "${productName}"? This action cannot be undone.`)) {
      onDeleteProductGroup(productName);
    }
  };

  const toggleGroup = (productName) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(productName)) {
      newExpanded.delete(productName);
    } else {
      newExpanded.add(productName);
    }
    setExpandedGroups(newExpanded);
  };

  // Group products by name and sort by scraped date
  const groupedProducts = useMemo(() => {
    const groups = {};
    
    products.forEach(product => {
      const name = product.name || 'Unknown Product';
      if (!groups[name]) {
        groups[name] = [];
      }
      groups[name].push(product);
    });

    // Sort each group by scraped_at (most recent first)
    Object.keys(groups).forEach(name => {
      groups[name].sort((a, b) => {
        const dateA = new Date(a.scraped_at || 0);
        const dateB = new Date(b.scraped_at || 0);
        return dateB - dateA;
      });
    });

    // Sort groups by the most recent scraped date
    const sortedGroups = Object.entries(groups).sort(([, productsA], [, productsB]) => {
      const latestA = new Date(productsA[0]?.scraped_at || 0);
      const latestB = new Date(productsB[0]?.scraped_at || 0);
      return latestB - latestA;
    });

    return sortedGroups;
  }, [products]);

  // Pagination logic
  const totalPages = Math.ceil(groupedProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = groupedProducts.slice(startIndex, endIndex);

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToFirstPage = () => goToPage(1);
  const goToLastPage = () => goToPage(totalPages);
  const goToPreviousPage = () => goToPage(currentPage - 1);
  const goToNextPage = () => goToPage(currentPage + 1);

  // Reset to first page when products change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [products.length]);

  if (products.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center text-gray-500">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No products scraped yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Execute scraping to see products here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Scraped Products</h3>
        <p className="text-sm text-gray-500">
          {products.length} total scraped records, grouped by product name
        </p>
      </div>
      
      <div className="divide-y divide-gray-200">
        {currentProducts.map(([productName, productGroup]) => {
          const isExpanded = expandedGroups.has(productName);
          const latestProduct = productGroup[0];
          const totalScrapes = productGroup.length;
          
          return (
            <div key={productName} className="bg-white">
              {/* Group Header */}
              <div 
                className="px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleGroup(productName)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                    
                    {/* Product Image */}
                    {latestProduct.image && (
                      <div className="flex-shrink-0">
                        <img 
                          src={latestProduct.image} 
                          alt={productName} 
                          className="h-16 w-16 rounded shadow border object-cover" 
                          style={{background: '#fff'}} 
                        />
                      </div>
                    )}
                    
                    {/* Product Information */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">{productName}</h4>
                      <p className="text-xs text-gray-500">
                        {totalScrapes} scraped record{totalScrapes !== 1 ? 's' : ''} • 
                        Latest: {formatDate(latestProduct.scraped_at)}
                      </p>
                      <p className="text-xs text-gray-400">
                        Source: {getSourceTypeName(latestProduct.source_type, latestProduct.source_name || '')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {formatPrice(latestProduct.price)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Current price
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProductGroup(productName);
                      }}
                      className="mt-1 inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete All
                    </button>
                  </div>
                </div>
              </div>

              {/* Group Details */}
              {isExpanded && (
                <div className="bg-gray-50 border-t border-gray-200">
                  <div className="px-6 py-3">
                    <h5 className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-3">
                      Scraping History
                    </h5>
                    <div className="space-y-3">
                      {productGroup.map((product, index) => (
                        <div key={product.id} className="bg-white rounded-lg border border-gray-200 p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                                <span className="text-sm text-gray-900">
                                  {formatDate(product.scraped_at)}
                                </span>
                              </div>
                              <div className="flex items-center">
                                <DollarSign className="h-4 w-4 text-gray-400 mr-1" />
                                <span className="text-sm font-medium text-gray-900">
                                  {formatPrice(product.price)}
                                </span>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleViewProduct(product.source_url)}
                                className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                View
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(product.id)}
                                className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {startIndex + 1} to {Math.min(endIndex, groupedProducts.length)} of {groupedProducts.length} products
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
    </div>
  );
};

export default ProductTable; 