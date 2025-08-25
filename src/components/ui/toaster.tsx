import { useToast } from './use-toast';

export function Toaster() {
  const { toasts } = useToast();
  
  return (
    <div className="fixed top-0 right-0 z-50 p-4 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-4 py-2 rounded-md shadow-lg ${
            toast.variant === 'destructive'
              ? 'bg-red-500 text-white'
              : 'bg-white text-gray-900'
          }`}
        >
          {toast.title && <div className="font-bold">{toast.title}</div>}
          {toast.description}
        </div>
      ))}
    </div>
  );
}
