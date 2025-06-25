import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, ExternalLink, Tag, ChevronLeft, ChevronRight, ChevronFirst, ChevronLast } from 'lucide-react';
import ProductLabelSelector from './ProductLabelSelector';
import { API_BASE_URL } from '../config';

const ProductCatalog = ({ onNavigateToSources, onDeleteProduct, onDeleteProductGroup }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/product-catalog`);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Error loading products');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newProductName.trim()) {
      setError('El nombre del producto es requerido');
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/product-catalog`, { name: newProductName.trim() });
      setProducts([response.data, ...products]);
      setNewProductName('');
      setShowAddModal(false);
      setError('');
      fetchProducts();
    } catch (error) {
      console.error('Error creating product:', error);
      setError('Error al crear producto');
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/product-catalog/${productId}`);
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      setError('Error al eliminar producto');
    }
  };

  const handleDeleteProductGroup = async (productName) => {
    try {
      await axios.delete(`${API_BASE_URL}/product-catalog/name/${encodeURIComponent(productName)}`);
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product group:', error);
    }
  };

  const handleLinkSources = (productId, productName) => {
    // Navigate to sources tab with product context
    onNavigateToSources(productId, productName);
  };

  const handleLabelsChange = (productId, newLabels) => {
    // Update the product's labels in the local state
    setProducts(products.map(product => 
      product.id === productId 
        ? { ...product, labels: newLabels }
        : product
    ));
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Catálogo de Productos</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Agregar Producto</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex space-x-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
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

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                  Producto
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">
                  Labels
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                  Creado
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentProducts.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-4 py-4 text-center text-gray-500">
                    {searchTerm ? 'No se encontraron productos que coincidan con la búsqueda' : 'No hay productos agregados'}
                  </td>
                </tr>
              ) : (
                currentProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900 truncate" title={product.name}>
                        {product.name}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-xs">
                        <ProductLabelSelector 
                          productId={product.id}
                          onLabelsChange={(newLabels) => handleLabelsChange(product.id, newLabels)}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      <div className="flex flex-col">
                        <span>{formatDate(product.created_at).split(',')[0]}</span>
                        <span className="text-xs text-gray-400">{formatDate(product.created_at).split(',')[1]}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleLinkSources(product.id, product.name)}
                          className="text-blue-600 hover:text-blue-900 bg-blue-100 hover:bg-blue-200 px-2 py-1 rounded text-xs transition-colors"
                          title="Relacionar Sources"
                        >
                          Sources
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-2 py-1 rounded text-xs transition-colors"
                          title="Eliminar Producto"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-700">
            Mostrando {indexOfFirstItem + 1} a {Math.min(indexOfLastItem, filteredProducts.length)} de {filteredProducts.length} productos
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

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Agregar Nuevo Producto</h3>
            <form onSubmit={handleAddProduct}>
              <div className="mb-4">
                <label htmlFor="productName" className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Producto
                </label>
                <input
                  type="text"
                  id="productName"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: Campera River Plate"
                  autoFocus
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setNewProductName('');
                    setError('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                >
                  Agregar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductCatalog; 