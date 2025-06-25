import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Tag, X, Check } from 'lucide-react';
import { API_BASE_URL } from '../config';

const ProductLabelSelector = ({ productId, onLabelsChange }) => {
  const [labels, setLabels] = useState([]);
  const [selectedLabels, setSelectedLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);

  const fetchLabelsAndProductLabels = async () => {
    setLoading(true);
    try {
      const [labelsRes, productLabelsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/labels`),
        productId ? axios.get(`${API_BASE_URL}/products/${productId}/labels`) : Promise.resolve({ data: [] })
      ]);
      setLabels(labelsRes.data);
      // productLabelsRes.data es un array de labels completos
      setSelectedLabels(productLabelsRes.data);
    } catch (error) {
      console.error('Error fetching labels:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabelsAndProductLabels();
    // eslint-disable-next-line
  }, [productId]);

  const handleLabelToggle = async (labelId) => {
    let newSelectedLabels;
    if (selectedLabels.some(l => l.id === labelId)) {
      newSelectedLabels = selectedLabels.filter(l => l.id !== labelId);
    } else {
      const labelObj = labels.find(l => l.id === labelId);
      newSelectedLabels = [...selectedLabels, labelObj];
    }
    setSelectedLabels(newSelectedLabels);
    try {
      await axios.post(`${API_BASE_URL}/products/${productId}/labels`, { labelIds: newSelectedLabels.map(l => l.id) });
      if (onLabelsChange) onLabelsChange(newSelectedLabels);
    } catch (error) {
      console.error('Error updating product labels:', error);
      setSelectedLabels(selectedLabels);
    }
  };

  const removeLabel = async (labelToRemove) => {
    const newSelectedLabels = selectedLabels.filter(label => label.id !== labelToRemove.id);
    setSelectedLabels(newSelectedLabels);

    try {
      const response = await axios.post(`${API_BASE_URL}/product-labels`, {
        product_id: productId,
        label_id: labelToRemove.id
      });

      if (!response.ok) throw new Error('Failed to update product labels');
      
      if (onLabelsChange) {
        onLabelsChange(newSelectedLabels);
      }
    } catch (error) {
      console.error('Error updating product labels:', error);
      setSelectedLabels(selectedLabels);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span className="text-sm text-gray-500">Cargando labels...</span>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Selected Labels Display */}
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedLabels.map((label) => (
          <span
            key={label.id}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: label.color }}
          >
            <Tag size={12} />
            {label.name}
            <button
              onClick={() => removeLabel(label)}
              className="ml-1 hover:bg-black/20 rounded-full p-0.5"
            >
              <X size={10} />
            </button>
          </span>
        ))}
      </div>

      {/* Dropdown Button */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <Tag size={16} className="text-gray-500" />
        <span className="text-sm text-gray-700">
          {selectedLabels.length > 0 ? `${selectedLabels.length} label(s)` : 'Agregar labels'}
        </span>
      </button>

      {/* Dropdown Menu */}
      {showDropdown && (
        <div className="absolute z-10 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          <div className="p-2">
            <div className="text-xs font-medium text-gray-500 mb-2 px-2">Seleccionar Labels</div>
            {labels.map((label) => {
              const isSelected = selectedLabels.some(selected => selected.id === label.id);
              return (
                <button
                  key={label.id}
                  onClick={() => handleLabelToggle(label.id)}
                  className={`w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-gray-50 transition-colors ${
                    isSelected ? 'bg-blue-50' : ''
                  }`}
                >
                  <div
                    className="w-4 h-4 rounded border border-gray-300 flex items-center justify-center"
                    style={{ backgroundColor: label.color }}
                  >
                    {isSelected && <Check size={12} className="text-white" />}
                  </div>
                  <span className="text-sm text-gray-700">{label.name}</span>
                </button>
              );
            })}
            {labels.length === 0 && (
              <div className="text-center py-4 text-gray-500 text-sm">
                No hay labels disponibles
              </div>
            )}
          </div>
        </div>
      )}

      {/* Click outside to close dropdown */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
};

export default ProductLabelSelector; 