import React, { useState, useEffect } from 'react';
import { X, Check, ChevronDown, ChevronRight } from 'lucide-react';

const ProductSelectionModal = ({ isOpen, onClose, onExecute }) => {
  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
    }
  }, [isOpen]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5001/api/product-catalog');
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      } else {
        console.error('Failed to fetch products');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductToggle = (productId) => {
    setSelectedProducts(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      } else {
        return [...prev, productId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(products.map(p => p.id));
    }
  };

  const handleExecute = async () => {
    if (selectedProducts.length === 0) {
      alert('Por favor selecciona al menos un producto para scrapear');
      return;
    }

    try {
      setExecuting(true);
      await onExecute(selectedProducts);
      onClose();
    } catch (error) {
      console.error('Error executing scraping:', error);
      alert('Error al ejecutar el scraping');
    } finally {
      setExecuting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Seleccionar Productos para Scraping
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Cargando productos...</span>
            </div>
          ) : (
            <>
              {/* Select All Button */}
              <div className="mb-4">
                <button
                  onClick={handleSelectAll}
                  className="flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Check size={16} className="mr-2" />
                  {selectedProducts.length === products.length ? 'Deseleccionar Todo' : 'Seleccionar Todo'}
                </button>
              </div>

              {/* Products List */}
              <div className="space-y-3">
                {products.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No hay productos en el catálogo
                  </div>
                ) : (
                  products.map((product) => (
                    <div
                      key={product.id}
                      className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedProducts.includes(product.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleProductToggle(product.id)}
                    >
                      {/* Checkbox */}
                      <div className="flex items-center justify-center w-6 h-6 border-2 rounded mr-4 transition-colors">
                        {selectedProducts.includes(product.id) && (
                          <Check size={16} className="text-blue-600" />
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{product.name}</h3>
                        {product.description && (
                          <p className="text-sm text-gray-500 mt-1">{product.description}</p>
                        )}
                      </div>

                      {/* Selection indicator */}
                      {selectedProducts.includes(product.id) && (
                        <div className="text-blue-600 font-medium">
                          Seleccionado
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {selectedProducts.length} de {products.length} productos seleccionados
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={executing}
            >
              Cancelar
            </button>
            <button
              onClick={handleExecute}
              disabled={selectedProducts.length === 0 || executing}
              className={`px-6 py-2 rounded-lg transition-colors ${
                selectedProducts.length === 0 || executing
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {executing ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Ejecutando...
                </div>
              ) : (
                'Ejecutar Scraping'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductSelectionModal; 