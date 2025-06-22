import React from 'react';
import { ExternalLink, Trash2, Calendar, DollarSign, Package } from 'lucide-react';

const ProductTable = ({ products, onDeleteProduct }) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price) => {
    if (!price) return 'N/A';
    return `$${price}`;
  };

  const handleViewProduct = (url) => {
    window.open(url, '_blank');
  };

  const handleDeleteProduct = (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      onDeleteProduct(productId);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900 flex items-center">
          <Package className="mr-2 h-5 w-5 text-primary-600" />
          Scraped Products
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Products scraped from your sources
        </p>
      </div>

      <div className="overflow-x-auto">
        {products.length === 0 ? (
          <div className="text-center py-8">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No products</h3>
            <p className="mt-1 text-sm text-gray-500">
              Run the scraper to see products here.
            </p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {product.name || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 text-green-600 mr-1" />
                      <span className="text-sm text-gray-900">
                        {formatPrice(product.price)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                      <span className="text-sm text-gray-900">
                        {formatDate(product.scraped_at)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewProduct(product.source_url)}
                        className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                        title="View product"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        title="Delete product"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ProductTable; 