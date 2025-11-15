import { useToast } from './use-toast';
export function Toaster() {
  const { toasts } = useToast();
  if (!toasts.length) return null;
  return (
    <div className=\"fixed top-4 right-4 z-50 space-y-2\">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={\px-4 py-2 rounded-md shadow-lg \\}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}