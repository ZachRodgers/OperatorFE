import React, { useState, useEffect } from "react";
import "./RecipientModal.css";

interface RecipientModalProps {
  isOpen: boolean;
  lotId: string;
  currentRecipients: string[]; // "EMAIL: user@domain", "SMS: phone"
  onClose: () => void;
  onUpdateRecipients: (newRecipients: string[]) => void; 
}

const RecipientModal: React.FC<RecipientModalProps> = ({
  isOpen,
  lotId,
  currentRecipients,
  onClose,
  onUpdateRecipients
}) => {
  const [recipients, setRecipients] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");

  // Always sync local state with parent’s currentRecipients
  useEffect(() => {
    setRecipients(currentRecipients);
  }, [currentRecipients]);

  if (!isOpen) return null;

  // Minimal validation
  const isValidEmail = (email: string) => /\S+@\S+\.\S+/.test(email);
  const isValidPhone = (phone: string) => phone.replace(/\D/g, "").length >= 7;

  // Add email on Enter
  const handleEmailKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (!isValidEmail(emailInput)) {
        alert("Invalid email address.");
        return;
      }
      const newEntry = `EMAIL: ${emailInput.trim()}`;
      const updated = [...recipients, newEntry];
      setRecipients(updated);
      onUpdateRecipients(updated);
      setEmailInput("");
    }
  };

  // Add phone on Enter
  const handlePhoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (!isValidPhone(phoneInput)) {
        alert("Invalid phone number.");
        return;
      }
      const newEntry = `SMS: ${phoneInput.trim()}`;
      const updated = [...recipients, newEntry];
      setRecipients(updated);
      onUpdateRecipients(updated);
      setPhoneInput("");
    }
  };

  // Remove a recipient
  const handleRemoveRecipient = (entry: string) => {
    const updated = recipients.filter((r) => r !== entry);
    setRecipients(updated);
    onUpdateRecipients(updated);
  };

  return (
    <div className="recipient-modal-overlay">
      <div className="recipient-modal">
        <h2>Manage Notification Recipients</h2>
        
        <div className="recipient-inputs">
          <div className="input-row">
            <input
              type="text"
              placeholder="Add Email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyDown={handleEmailKeyDown}
            />
          </div>

          <div className="input-row">
            <input
              type="text"
              placeholder="Add Phone Number (SMS)"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              onKeyDown={handlePhoneKeyDown}
            />
          </div>
        </div>

        <p>Current Recipients:</p>
        <div className="recipient-badges">
          {recipients.map((entry) => {
            // parse label from "EMAIL:" or "SMS:"
            const [label, value] = entry.split(":").map((s) => s.trim());
            return (
              <div className="recipient-badge" key={entry}>
                <span className="badge-label">{label}</span>
                <span className="badge-value">{value}</span>
                <button
                  className="remove-badge-btn"
                  onClick={() => handleRemoveRecipient(entry)}
                >
                  &times;
                </button>
              </div>
            );
          })}
        </div>

        <button className="save-close-btn" onClick={onClose}>
          Save and Close
        </button>
      </div>
    </div>
  );
};

export default RecipientModal;
