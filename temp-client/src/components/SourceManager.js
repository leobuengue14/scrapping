import React, { useState, useEffect } from 'react';
import { Plus, X, Globe, Link, Unlink, Trash2, ExternalLink, ChevronLeft, ChevronRight, ChevronFirst, ChevronLast } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const SourceManager = ({ onClose, onSourceAdded, selectedProductId, selectedProductName }) => {
  const [formData, setFormData] = useState({
    url: '',
    type: 'sporting'
  });
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingSources, setLoadingSources] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSources();
    fetchProducts();
  }, []);

  const fetchSources = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/sources`);
      setSources(response.data);
    } catch (error) {
      console.error('Error fetching sources:', error);
      setError('Error loading sources');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/product-catalog');
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.url) {
      alert('Por favor ingresa una URL');
      return;
    }

    setLoading(true);
    try {
      // Add the source
      const response = await axios.post(`${API_BASE_URL}/sources`, formData);
      const newSource = response.data;
      
      // If there's a selected product, automatically link the source to it
      if (selectedProductId && newSource.id) {
        await axios.put(`${API_BASE_URL}/sources/${newSource.id}/link-product`, {
          productId: selectedProductId
        });
      }
      
      setFormData({ url: '', type: 'sporting' });
      fetchSources(); // Refresh sources list
      if (onSourceAdded) {
        onSourceAdded();
      }
    } catch (error) {
      console.error('Error adding source:', error);
      alert('Error al agregar la source. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLinkSource = async (sourceId, productId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/sources/${sourceId}/link-product`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId }),
      });

      if (response.ok) {
        fetchSources(); // Refresh sources list
      } else {
        alert('Error al vincular source con producto');
      }
    } catch (error) {
      console.error('Error linking source:', error);
      alert('Error al vincular source con producto');
    }
  };

  const handleDeleteSource = async (sourceId) => {
    if (!window.confirm('¿Estás seguro de que deseas borrar esta source?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/sources/${sourceId}`);
      fetchSources();
      if (onSourceAdded) onSourceAdded();
    } catch (error) {
      console.error('Error deleting source:', error);
      alert('Error al borrar la source.');
    }
  };

  const getProductName = (productId) => {
    const product = products.find(p => p.id === productId);
    return product ? product.name : 'Producto no encontrado';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentSources = sources.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sources.length / itemsPerPage);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Globe className="h-6 w-6 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              {selectedProductName ? `Sources producto "${selectedProductName}"` : 'Gestionar Sources'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Add Source Form */}
        <div className="mb-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Agregar Nueva Source</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
                  URL del Producto *
                </label>
                <input
                  type="url"
                  id="url"
                  name="url"
                  value={formData.url}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  placeholder="https://www.sporting.com.ar/product-url"
                  required
                />
              </div>

              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Source
                </label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                >
                  <option value="sporting">Sporting.com.ar</option>
                  <option value="tiendariver">Tienda River</option>
                  <option value="dia">Supermercado Dia</option>
                  <option value="coto">Coto Digital</option>
                  <option value="solofutbol">Solo Futbol</option>
                </select>
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                {loading ? 'Agregando...' : 'Agregar Source'}
              </button>
            </div>
          </form>
        </div>

        {/* Sources List */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Sources Disponibles</h3>
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
          
          {loadingSources ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                        Tipo
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nombre
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        URL
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentSources.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="px-4 py-4 text-center text-gray-500">
                          No hay sources disponibles
                        </td>
                      </tr>
                    ) : (
                      currentSources.map((source) => (
                        <tr key={source.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              {source.type}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-gray-900 truncate" title={source.name}>
                              {source.name}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-500 max-w-xs truncate" title={source.url}>
                              {source.url}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {source.product_id ? (
                              <button
                                onClick={() => handleDeleteSource(source.id)}
                                className="text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-2 py-1 rounded text-xs flex items-center transition-colors"
                                title="Borrar Source"
                              >
                                <X className="w-3 h-3 mr-1" />
                                Borrar
                              </button>
                            ) : (
                              <button
                                onClick={() => handleLinkSource(source.id, selectedProductId)}
                                disabled={!selectedProductId}
                                className="text-blue-600 hover:text-blue-900 bg-blue-100 hover:bg-blue-200 px-2 py-1 rounded text-xs flex items-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                title="Vincular Source"
                              >
                                <Link className="w-3 h-3 mr-1" />
                                Vincular
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-700">
                Mostrando {indexOfFirstItem + 1} a {Math.min(indexOfLastItem, sources.length)} de {sources.length} sources
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

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default SourceManager; 