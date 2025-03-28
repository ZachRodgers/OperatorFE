import React, { useState, useEffect } from "react";
import Modal from "./Modal";
import { useUser } from "../contexts/UserContext";
import api from "../utils/api";
import "./AccountModal.css";

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose }) => {
  const { user, fetchUserData } = useUser();

  const [editMode, setEditMode] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [editableFields, setEditableFields] = useState({
    name: "",
    email: "",
    phoneNo: "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (user) {
      setEditableFields({
        name: user.name || "",
        email: user.email || "",
        phoneNo: user.phoneNo || "",
      });
    }
  }, [user]);

  const toggleEditMode = () => {
    if (editMode && unsavedChanges) {
      setShowConfirmModal(true);
    } else {
      setEditMode(!editMode);
      // Reset fields if canceling edit
      if (editMode && user) {
        setEditableFields({
          name: user.name || "",
          email: user.email || "",
          phoneNo: user.phoneNo || "",
        });
        setUnsavedChanges(false);
      }
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    setEditableFields((prev) => ({
      ...prev,
      [field]: value,
    }));
    setUnsavedChanges(true);
  };

  const handleSaveAndClose = async () => {
    if (!user) return;

    try {
      // Always include all required fields
      const updateData = {
        name: editableFields.name,
        email: editableFields.email,
        phoneNo: editableFields.phoneNo,
        role: user.role // Include the existing role
      };

      // Only make the API call if there are actual changes
      if (editableFields.name !== user.name ||
        editableFields.email !== user.email ||
        editableFields.phoneNo !== user.phoneNo) {
        const response = await api.put(`/users/update-user/${user.userId}`, updateData);

        if (response.status === 200) {
          // Refresh user data
          await fetchUserData();
          setUnsavedChanges(false);
          setEditMode(false);
          setErrorMessage(null);
        }
      }

      // Close the modal
      onClose();
    } catch (error: any) {
      console.error("Error updating user:", error);
      setErrorMessage(error.response?.data?.message || "Failed to update account information");
    }
  };

  const handleCancel = () => {
    if (user) {
      setEditableFields({
        name: user.name || "",
        email: user.email || "",
        phoneNo: user.phoneNo || "",
      });
    }
    setUnsavedChanges(false);
    setEditMode(false);
    setErrorMessage(null);
  };

  const handleEdit = () => {
    setEditMode(true);
  };

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleChangePassword = async () => {
    if (!user) return;

    // Validate passwords
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setErrorMessage("New passwords do not match");
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setErrorMessage("Password must be at least 8 characters long");
      return;
    }

    try {
      const response = await api.post(`/users/change-password/${user.userId}`, {
        oldPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      if (response.status === 200) {
        // Reset password fields and close modal
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setShowPasswordModal(false);
        setErrorMessage(null);
      }
    } catch (error: any) {
      console.error("Error changing password:", error);
      setErrorMessage(error.response?.data?.message || "Failed to change password");
    }
  };

  // Helper function to format the user ID by removing the "PWP-U-" prefix
  const formatUserId = (id: string): string => {
    const prefix = "PWP-U-";
    if (id && id.startsWith(prefix)) {
      return id.substring(prefix.length);
    }
    return id || "";
  };

  if (!user) {
    return (
      <Modal
        isOpen={isOpen}
        title="Account Information"
        confirmText="Close"
        cancelText="Cancel"
        onConfirm={onClose}
        onCancel={onClose}
      >
        <div className="account-modal-loading">Loading user information...</div>
      </Modal>
    );
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        title="Account Information"
        confirmText={editMode ? "Save and Close" : "Close"}
        cancelText={editMode ? "Cancel" : "Edit"}
        onConfirm={editMode ? handleSaveAndClose : onClose}
        onCancel={editMode ? handleCancel : handleEdit}
      >
        <div className="account-modal-content">
          {errorMessage && (
            <div className="account-error-banner">
              <p>{errorMessage}</p>
            </div>
          )}

          <div className="account-details">
            <div className="account-column">
              <p>User ID:</p>
              <p>Name:</p>
              <p>Email:</p>
              <p>Phone:</p>
              <p>Password:</p>
            </div>

            <div className="account-column-inputs">
              <p className="account-disabled-text">{formatUserId(user.userId)}</p>
              <p
                contentEditable={editMode}
                suppressContentEditableWarning={true}
                className={editMode ? "account-editable-highlight" : ""}
                onBlur={(e) => handleFieldChange("name", e.currentTarget.textContent || "")}
              >
                {editableFields.name}
              </p>
              <p
                contentEditable={editMode}
                suppressContentEditableWarning={true}
                className={editMode ? "account-editable-highlight" : ""}
                onBlur={(e) => handleFieldChange("email", e.currentTarget.textContent || "")}
              >
                {editableFields.email}
              </p>
              <p
                contentEditable={editMode}
                suppressContentEditableWarning={true}
                className={editMode ? "account-editable-highlight" : ""}
                onBlur={(e) => handleFieldChange("phoneNo", e.currentTarget.textContent || "")}
              >
                {editableFields.phoneNo || "Not provided"}
              </p>
              <p className="account-password">
                ••••••••
                <button
                  className="account-reset-password-btn"
                  onClick={() => setShowPasswordModal(true)}
                  disabled={!editMode}
                >
                  Change Password
                </button>
              </p>
            </div>
          </div>
        </div>
      </Modal>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <Modal
          isOpen={showConfirmModal}
          title="Confirm Changes"
          description="You have unsaved changes. Would you like to save them?"
          confirmText="Save Changes"
          cancelText="Discard Changes"
          onConfirm={handleSaveAndClose}
          onCancel={handleCancel}
        />
      )}

      {/* Password Change Modal */}
      {showPasswordModal && (
        <Modal
          isOpen={showPasswordModal}
          title="Change Password"
          confirmText="Change Password"
          cancelText="Cancel"
          onConfirm={handleChangePassword}
          onCancel={() => {
            setShowPasswordModal(false);
            setPasswordData({
              currentPassword: "",
              newPassword: "",
              confirmPassword: "",
            });
            setErrorMessage(null);
          }}
        >
          <div className="account-password-form">
            {errorMessage && (
              <div className="account-error-banner">
                <p>{errorMessage}</p>
              </div>
            )}

            <div className="account-form-group">
              <label htmlFor="currentPassword">Current Password</label>
              <input
                type="password"
                id="currentPassword"
                value={passwordData.currentPassword}
                onChange={(e) => handlePasswordChange("currentPassword", e.target.value)}
              />
            </div>

            <div className="account-form-group">
              <label htmlFor="newPassword">New Password</label>
              <input
                type="password"
                id="newPassword"
                value={passwordData.newPassword}
                onChange={(e) => handlePasswordChange("newPassword", e.target.value)}
              />
            </div>

            <div className="account-form-group">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <input
                type="password"
                id="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={(e) => handlePasswordChange("confirmPassword", e.target.value)}
              />
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default AccountModal; 