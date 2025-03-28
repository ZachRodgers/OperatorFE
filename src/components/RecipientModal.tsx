import React, { useState, useEffect } from "react";
import "./RecipientModal.css";
import { lotService } from "../utils/api";

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

  // Load recipients from backend when modal opens
  useEffect(() => {
    if (isOpen) {
      loadRecipients();
    }
  }, [isOpen, lotId]);

  const loadRecipients = async () => {
    try {
      const data = await lotService.getNotificationRecipients(lotId);
      setRecipients(data);
      onUpdateRecipients(data);
    } catch (error) {
      console.error("Error loading recipients:", error);
    }
  };

  if (!isOpen) return null;

  // Minimal validation
  const isValidEmail = (email: string) => /\S+@\S+\.\S+/.test(email);
  const isValidPhone = (phone: string) => phone.replace(/\D/g, "").length >= 7;

  // Add email on Enter
  const handleEmailKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (!isValidEmail(emailInput)) {
        alert("Invalid email address.");
        return;
      }
      const newEntry = `EMAIL: ${emailInput.trim()}`;
      try {
        await lotService.addNotificationRecipient(lotId, newEntry);
        const updated = [...recipients, newEntry];
        setRecipients(updated);
        onUpdateRecipients(updated);
        setEmailInput("");
      } catch (error) {
        console.error("Error adding email recipient:", error);
        alert("Failed to add email recipient.");
      }
    }
  };

  // Add phone on Enter
  const handlePhoneKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (!isValidPhone(phoneInput)) {
        alert("Invalid phone number.");
        return;
      }
      const newEntry = `SMS: ${phoneInput.trim()}`;
      try {
        await lotService.addNotificationRecipient(lotId, newEntry);
        const updated = [...recipients, newEntry];
        setRecipients(updated);
        onUpdateRecipients(updated);
        setPhoneInput("");
      } catch (error) {
        console.error("Error adding phone recipient:", error);
        alert("Failed to add phone recipient.");
      }
    }
  };

  // Remove a recipient
  const handleRemoveRecipient = async (entry: string) => {
    try {
      await lotService.removeNotificationRecipient(lotId, entry);
      const updated = recipients.filter((r) => r !== entry);
      setRecipients(updated);
      onUpdateRecipients(updated);
    } catch (error) {
      console.error("Error removing recipient:", error);
      alert("Failed to remove recipient.");
    }
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
            // Remove any quotes from the entire entry if they exist
            const cleanEntry = entry.replace(/^"|"$/g, '');
            // parse label from "EMAIL:" or "SMS:"
            const [label, value] = cleanEntry.split(":").map((s) => s.trim());
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
