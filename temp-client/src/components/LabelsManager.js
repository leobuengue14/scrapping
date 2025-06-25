import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, X, Save, ChevronLeft, ChevronRight, ChevronFirst, ChevronLast } from 'lucide-react';
import { API_BASE_URL } from '../config';

const LabelsManager = () => {
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingLabel, setEditingLabel] = useState(null);
  const [newLabel, setNewLabel] = useState({ name: '', color: '#3B82F6' });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const fetchLabels = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/labels`);
      setLabels(response.data);
    } catch (error) {
      console.error('Error fetching labels:', error);
      setError('Error loading labels');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabels();
  }, []);

  const handleCreateLabel = async () => {
    if (!newLabel.name.trim()) return;
    
    try {
      const response = await axios.post(`${API_BASE_URL}/labels`, {
        name: newLabel.name.trim(),
        color: newLabel.color
      });
      setLabels([response.data, ...labels]);
      setNewLabel({ name: '', color: '#3B82F6' });
      setError('');
    } catch (error) {
      console.error('Error creating label:', error);
      setError('Error creating label');
    }
  };

  const handleUpdateLabel = async () => {
    if (!editingLabel || !editingLabel.name.trim()) return;
    
    try {
      const response = await axios.put(`${API_BASE_URL}/labels/${editingLabel.id}`, {
        name: editingLabel.name.trim(),
        color: editingLabel.color
      });
      setLabels(labels.map(label => 
        label.id === editingLabel.id ? response.data : label
      ));
      setEditingLabel(null);
      setError('');
    } catch (error) {
      console.error('Error updating label:', error);
      setError('Error updating label');
    }
  };

  const handleDeleteLabel = async (labelId) => {
    try {
      await axios.delete(`${API_BASE_URL}/labels/${labelId}`);
      setLabels(labels.filter(label => label.id !== labelId));
    } catch (error) {
      console.error('Error deleting label:', error);
      setError('Error deleting label');
    }
  };

  const startEditing = (label) => {
    setEditingLabel({ ...label });
  };

  const cancelEditing = () => {
    setEditingLabel(null);
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLabels = labels.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(labels.length / itemsPerPage);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Labels</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={16} />
          Nuevo Label
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Pagination Controls */}
      <div className="flex justify-between items-center mb-4">
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
        <div className="text-sm text-gray-600">
          Total: {labels.length} labels
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Crear Nuevo Label</h2>
            <button
              onClick={() => setShowCreateForm(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>
          <form onSubmit={handleCreateLabel} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre
              </label>
              <input
                type="text"
                value={newLabel.name}
                onChange={(e) => setNewLabel({ ...newLabel, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <input
                type="color"
                value={newLabel.color}
                onChange={(e) => setNewLabel({ ...newLabel, color: e.target.value })}
                className="w-full h-10 border border-gray-300 rounded-md"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
              >
                <Save size={16} />
                Crear
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Labels Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                Color
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nombre
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha de Creación
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentLabels.map((label) => (
              <tr key={label.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  {editingLabel?.id === label.id ? (
                    <input
                      type="color"
                      value={editingLabel.color}
                      onChange={(e) => setEditingLabel({ ...editingLabel, color: e.target.value })}
                      className="w-8 h-8 border border-gray-300 rounded"
                    />
                  ) : (
                    <div
                      className="w-8 h-8 rounded border border-gray-300"
                      style={{ backgroundColor: label.color }}
                    ></div>
                  )}
                </td>
                <td className="px-4 py-3">
                  {editingLabel?.id === label.id ? (
                    <input
                      type="text"
                      value={editingLabel.name}
                      onChange={(e) => setEditingLabel({ ...editingLabel, name: e.target.value })}
                      className="w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <span className="text-sm font-medium text-gray-900">{label.name}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(label.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right text-sm font-medium">
                  {editingLabel?.id === label.id ? (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={handleUpdateLabel}
                        className="text-green-600 hover:text-green-900 flex items-center gap-1"
                      >
                        <Save size={16} />
                        Guardar
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="text-gray-600 hover:text-gray-900 flex items-center gap-1"
                      >
                        <X size={16} />
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => startEditing(label)}
                        className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                      >
                        <Edit size={16} />
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteLabel(label.id)}
                        className="text-red-600 hover:text-red-900 flex items-center gap-1"
                      >
                        <Trash2 size={16} />
                        Eliminar
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {labels.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No hay labels creados. Crea el primero usando el botón "Nuevo Label".
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-gray-700">
            Mostrando {indexOfFirstItem + 1} a {Math.min(indexOfLastItem, labels.length)} de {labels.length} labels
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

export default LabelsManager; 