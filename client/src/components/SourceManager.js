import React, { useState } from 'react';
import { Plus, X, Globe } from 'lucide-react';
import axios from 'axios';

const SourceManager = ({ onClose, onSourceAdded }) => {
  const [formData, setFormData] = useState({
    url: '',
    type: 'sporting'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.url) {
      alert('Por favor ingresa una URL');
      return;
    }

    setLoading(true);
    try {
      await axios.post('http://localhost:5001/api/sources', formData);
      setFormData({ url: '', type: 'sporting' });
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Globe className="h-6 w-6 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">Agregar Source</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
            </select>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
    </div>
  );
};

export default SourceManager; 