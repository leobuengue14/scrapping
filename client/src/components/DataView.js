import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react';

const DataView = ({ onDeleteProduct, onDeleteProductGroup }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedProducts, setExpandedProducts] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  useEffect(() => {
    fetchData();
    
    // Listen for refresh events (e.g., after scraping)
    const handleRefresh = () => {
      fetchData();
    };
    
    window.addEventListener('refreshDataView', handleRefresh);
    
    // Cleanup
    return () => {
      window.removeEventListener('refreshDataView', handleRefresh);
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5001/api/data');
      if (response.ok) {
        const result = await response.json();
        setData(result.data || result);
      } else {
        console.error('Failed to fetch data');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductExpand = (productId) => {
    setExpandedProducts(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
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

  const formatPrice = (price) => {
    if (!price) return 'Sin precio';
    const numPrice = parseFloat(price);
    if (isNaN(numPrice)) return price;
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(numPrice);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDeleteRecord = async (dataId) => {
    try {
      await onDeleteProduct(dataId);
      // Refresh data automatically after deletion
      setTimeout(() => fetchData(), 500);
    } catch (error) {
      console.error('Error deleting record:', error);
    }
  };

  const handleDeleteGroup = async (productName) => {
    try {
      await onDeleteProductGroup(productName);
      // Refresh data automatically after deletion
      setTimeout(() => fetchData(), 500);
    } catch (error) {
      console.error('Error deleting group:', error);
    }
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentData = data.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(data.length / itemsPerPage);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Cargando datos...</span>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500 mb-4">
          No hay datos de scraping disponibles
        </div>
        <div className="text-sm text-gray-400 mb-4">
          Ve a la pestaña "Data" y ejecuta el scraping para generar datos
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="data-view">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Datos de Scraping</h2>
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-600">Mostrar:</label>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span className="text-sm text-gray-600">por página</span>
        </div>
      </div>

      {/* Products List */}
      <div className="space-y-4">
        {currentData.map((product) => (
          <div key={product.product_id} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Product Header */}
            <div 
              className="flex items-center p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => handleProductExpand(product.product_id)}
            >
              <div className="flex items-center justify-center w-6 h-6 mr-3">
                {expandedProducts[product.product_id] ? (
                  <ChevronDown size={20} className="text-gray-600" />
                ) : (
                  <ChevronRight size={20} className="text-gray-600" />
                )}
              </div>
              {/* Product Image */}
              <div className="mr-4">
                {product.sources.length > 0 && product.sources[0].image && (
                  <img 
                    src={product.sources[0].image} 
                    alt={product.product_name}
                    className="w-16 h-16 object-cover rounded"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{product.product_name}</h3>
                <p className="text-sm text-gray-500">
                  {product.sources.length} source{product.sources.length !== 1 ? 's' : ''} con datos
                </p>
              </div>
              {/* Delete All Button */}
              {onDeleteProductGroup && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`¿Estás seguro de que quieres eliminar todos los datos de "${product.product_name}"?`)) {
                      handleDeleteGroup(product.product_name);
                    }
                  }}
                  className="ml-4 p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                  title="Eliminar todos los datos de este producto"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            {/* Sources List */}
            {expandedProducts[product.product_id] && (
              <div className="border-t border-gray-200 bg-white">
                {product.sources.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No hay datos de scraping para este producto
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {product.sources.map((source, index) => (
                      <div key={`${source.source_id}-${index}`} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-3">
                              {getSourceTypeName(source.sources?.type)}
                            </span>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {formatPrice(source.price)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDate(source.scraped_at)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {source.image && (
                              <img 
                                src={source.image} 
                                alt="Product"
                                className="w-12 h-12 object-cover rounded"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            )}
                            {onDeleteProduct && (
                              <button
                                onClick={() => {
                                  if (window.confirm('¿Estás seguro de que quieres eliminar este registro?')) {
                                    handleDeleteRecord(source.id);
                                  }
                                }}
                                className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                                title="Eliminar este registro"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-700">
            Mostrando {indexOfFirstItem + 1} a {Math.min(indexOfLastItem, data.length)} de {data.length} productos
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Anterior
            </button>
            <span className="px-3 py-2 text-sm text-gray-700">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataView; 