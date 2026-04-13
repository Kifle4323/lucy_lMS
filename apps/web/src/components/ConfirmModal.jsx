import { AlertCircle, HelpCircle, Trash2, CheckCircle } from 'lucide-react';

export function ConfirmModal({ isOpen, onConfirm, onCancel, title, message, confirmText = 'Confirm', cancelText = 'Cancel', type = 'warning' }) {
  if (!isOpen) return null;

  const icons = {
    warning: <AlertCircle className="w-6 h-6 text-yellow-500" />,
    danger: <Trash2 className="w-6 h-6 text-red-500" />,
    info: <HelpCircle className="w-6 h-6 text-blue-500" />,
    success: <CheckCircle className="w-6 h-6 text-green-500" />,
  };

  const confirmButtonColors = {
    warning: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    info: 'bg-blue-600 hover:bg-blue-700 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-4 animate-scale-in">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              {icons[type]}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {message}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-lg transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 font-medium rounded-lg transition-colors ${confirmButtonColors[type]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
