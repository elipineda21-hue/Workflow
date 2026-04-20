import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info", duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, message, type }]);
    if (duration > 0) {
      setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(t => t.filter(x => x.id !== id));
  }, []);

  const toast = useCallback((msg) => addToast(msg, "info"), [addToast]);
  toast.success = (msg) => addToast(msg, "success");
  toast.error = (msg) => addToast(msg, "error", 6000);
  toast.info = (msg) => addToast(msg, "info");

  const icons = {
    success: <CheckCircle size={16} />,
    error: <AlertCircle size={16} />,
    info: <Info size={16} />,
  };
  const styles = {
    success: "bg-success/10 border-success/30 text-success",
    error: "bg-danger/10 border-danger/30 text-danger",
    info: "bg-accent/10 border-accent/30 text-accent",
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 right-4 z-[1000] flex flex-col gap-2 max-w-sm">
        {toasts.map(t => (
          <div key={t.id} className={`flex items-center gap-2 px-4 py-3 rounded-xl border shadow-lg backdrop-blur text-sm font-medium animate-[slideIn_0.2s_ease] ${styles[t.type]}`}>
            {icons[t.type]}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => removeToast(t.id)} className="opacity-50 hover:opacity-100 bg-transparent border-none cursor-pointer p-0">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
