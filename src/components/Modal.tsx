import React from "react";
import "./Modal.css";

interface ModalProps {
  isOpen: boolean;
  title: string;
  description?: string | React.ReactNode;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
  disableConfirm?: boolean;
  children?: React.ReactNode; // Allows the modal to display child elements
}

const Modal: React.FC<ModalProps> = ({ isOpen, title, description, confirmText, cancelText, onConfirm, onCancel, disableConfirm, children }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>{title}</h3>
        {description && (typeof description === "string" ? <p>{description}</p> : description)}
        {children && <div className="modal-content">{children}</div>} {/* ✅ Renders child components */}
        <div className="modal-actions">
          <button className="button primary" onClick={onConfirm} disabled={disableConfirm}>{confirmText}</button>
          <button className="button secondary" onClick={onCancel}>{cancelText}</button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
