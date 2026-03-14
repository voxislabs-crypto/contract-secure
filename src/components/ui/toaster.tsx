import { useToast } from './use-toast';

export function Toaster() {
  const { toasts } = useToast();

  if (!toasts.length) return null;

  const toastClass = (type: 'success' | 'error' | 'info') => {
    switch (type) {
      case 'success':
        return 'bg-green-600 text-white';
      case 'error':
        return 'bg-red-600 text-white';
      default:
        return 'bg-slate-800 text-white';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-4 py-2 rounded-md shadow-lg ${toastClass(toast.type)}`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}