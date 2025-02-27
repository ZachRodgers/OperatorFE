import React from "react";
import "./Modal.css";

interface ModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode; // Allows the modal to display child elements
}

const Modal: React.FC<ModalProps> = ({ isOpen, title, description, confirmText, cancelText, onConfirm, onCancel, children }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>{title}</h3>
        {description && <p>{description}</p>}
        {children && <div className="modal-content">{children}</div>} {/* ✅ Renders child components */}
        <div className="modal-actions">
          <button className="button primary" onClick={onConfirm}>{confirmText}</button>
          <button className="button secondary" onClick={onCancel}>{cancelText}</button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
