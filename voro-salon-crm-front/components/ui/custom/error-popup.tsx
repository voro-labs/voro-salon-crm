// components/ui/error-popup.tsx
"use client"

type ErrorPopupProps = {
  message: string;
  onClose: () => void;
}

export function ErrorPopup({ message, onClose }: ErrorPopupProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-red-600 text-white p-4 rounded shadow-lg text-center">
        <p className="mb-4">{message}</p>
        <button
          onClick={onClose}
          className="bg-white text-red-600 px-4 py-2 rounded hover:bg-gray-200"
        >
          Fechar
        </button>
      </div>
    </div>
  )
}
