import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Modal from "../components/Modal";
import "./Account.css";

interface Customer {
  customerId: string;
  name: string;
  email: string;
  phoneNo: string;
  role: string;
  password: string;
  assignedLots: string[];
  isVerified: string;
  lastLogin: string;
}

interface Lot {
  lotId: string;
  companyName: string;
  address: string;
  lotName: string;
  ownerCustomerId: string;
  geoLocation: { lat: string; long: string };
  lotCapacity: number;
  listedDeviceIds: string[];
  accountStatus: string;
  accountCreated: string;
  lastActivity: string;
  passwordChange: string;
  registryOn: boolean;
}

const Account: React.FC = () => {
  const { customerId, lotId } = useParams<{ customerId: string; lotId: string }>();
  const navigate = useNavigate();

  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [allLots, setAllLots] = useState<Lot[]>([]);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [lot, setLot] = useState<Lot | null>(null);

  // Modal editing states for non-password fields
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  // Modal for resetting password
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [oldPasswordInput, setOldPasswordInput] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [resetError, setResetError] = useState("");

  // 1. Load all customers
  useEffect(() => {
    fetch("http://localhost:5000/get-customer")
      .then((res) => res.json())
      .then((data: Customer[]) => {
        setAllCustomers(data);
      })
      .catch((err) => console.error("Error fetching customers:", err));
  }, []);

  // 2. Load all lots
  useEffect(() => {
    fetch("http://localhost:5000/get-lots")
      .then((res) => res.json())
      .then((data: Lot[]) => {
        setAllLots(data);
      })
      .catch((err) => console.error("Error fetching lots:", err));
  }, []);

  // 3. Identify current customer and lot from route
  useEffect(() => {
    if (allCustomers.length) {
      const foundCustomer = allCustomers.find((c) => c.customerId === customerId);
      setCustomer(foundCustomer || null);
    }
    if (allLots.length) {
      const foundLot = allLots.find((l) => l.lotId === lotId);
      setLot(foundLot || null);
    }
  }, [allCustomers, allLots, customerId, lotId]);

  // Open edit modal for non-password fields
  const openEditPopup = (field: string, currentValue: string) => {
    setEditingField(field);
    setTempValue(currentValue === "None" ? "" : currentValue);
    setModalOpen(true);
  };

  // Save non-password field change
  const saveEditPopup = () => {
    if (!editingField || !customer) return;

    const updatedField = { [editingField]: tempValue };

    fetch("http://localhost:5000/update-customer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: customer.customerId,
        updatedData: updatedField,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to update customer.");
        return res.json();
      })
      .then(() => {
        setCustomer((prev) => (prev ? { ...prev, ...updatedField } : prev));
        setEditingField(null);
        setTempValue("");
        setModalOpen(false);
      })
      .catch((err) => {
        console.error("Error updating customer:", err);
        alert("Failed to update account field.");
      });
  };

  // Open password reset modal instead of navigation
  const handleResetPassword = () => {
    setResetError("");
    setOldPasswordInput("");
    setNewPasswordInput("");
    setResetModalOpen(true);
  };

  // Handle password reset submission
  const submitPasswordReset = () => {
    if (!customer) return;
    if (oldPasswordInput !== customer.password) {
      setResetError("Old password is incorrect.");
      return;
    }

    // Update password via partial update endpoint
    fetch("http://localhost:5000/update-customer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: customer.customerId,
        updatedData: { password: newPasswordInput },
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to update password.");
        return res.json();
      })
      .then(() => {
        // Clear session and redirect to login
        localStorage.removeItem("authToken");
        navigate("/");
      })
      .catch((err) => {
        console.error("Error updating password:", err);
        setResetError("Server error. Please try again.");
      });
  };

  if (!customer) {
    return (
      <div className="content">
        <h1>Account</h1>
        <p>Loading account data...</p>
      </div>
    );
  }

  const nameDisplay = customer.name.trim() === "" ? "None" : customer.name;
  const emailDisplay = customer.email.trim() === "" ? "None" : customer.email;
  const phoneDisplay = customer.phoneNo.trim() === "" ? "None" : customer.phoneNo;
  const passwordDisplay = customer.password.trim() === "" ? "None" : "********";

  const roleLabel = customer.role === "owner" ? "Owner" : "Operator";
  let secondaryLabel = "";
  if (customer.role === "owner") {
    const operators = allCustomers.filter(
      (c) => c.role === "operator" && c.assignedLots.includes(lotId || "")
    );
    secondaryLabel = operators.length
      ? operators.map((op) => `${op.name} (#${op.customerId})`).join(", ")
      : "None";
  } else {
    if (lot) {
      const owner = allCustomers.find((c) => c.customerId === lot.ownerCustomerId);
      secondaryLabel = owner ? `${owner.name} (#${owner.customerId})` : "Unknown";
    }
  }

  return (
    <div className="content">
      {/* Title Row */}
      <div className="account-title-row">
        <h1>
          Account <span className="light-text">#{customer.customerId}</span>
        </h1>
      </div>

      {/* 2-column grid: left = name/phone, right = email/password */}
      <div className="account-grid">
        <div className="account-col">
          <div className="account-item">
            <span className="bold">Name:</span>
            <span>{nameDisplay}</span>
            <img
              src="/assets/Edit.svg"
              alt="Edit"
              className="edit-icon"
              onClick={() => openEditPopup("name", nameDisplay)}
            />
          </div>
          <div className="account-item">
            <span className="bold">Phone:</span>
            <span>{phoneDisplay}</span>
            <img
              src="/assets/Edit.svg"
              alt="Edit"
              className="edit-icon"
              onClick={() => openEditPopup("phoneNo", phoneDisplay)}
            />
          </div>
        </div>
        <div className="account-col">
          <div className="account-item">
            <span className="bold">Email:</span>
            <span>{emailDisplay}</span>
            <img
              src="/assets/Edit.svg"
              alt="Edit"
              className="edit-icon"
              onClick={() => openEditPopup("email", emailDisplay)}
            />
          </div>
          <div className="account-item">
            <span className="bold">Password:</span>
            <span>{passwordDisplay}</span>
            {/* Replace pencil icon with a reset link */}
            <button className="reset-password-link" onClick={handleResetPassword}>
              Reset Password
            </button>
          </div>
        </div>
      </div>

      {/* Lot Section */}
      {lot && (
        <div className="lot-section">
          <h1>
            Lot <span className="light-text">#{lot.lotId}</span>
          </h1>
          <div className="lot-role-row">
            <div className="lot-item">
              <span className="bold">Role:</span> {roleLabel}
            </div>
            {customer.role === "owner" ? (
              <div className="lot-item">
                <span className="bold">Operators:</span> {secondaryLabel}
              </div>
            ) : (
              <div className="lot-item">
                <span className="bold">Owned by:</span> {secondaryLabel}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment/Billing placeholders */}
      <h1 style={{ opacity: 0.5 }}>Payment</h1>
      <p style={{ opacity: 0.5 }}>Offline</p>
      <h1 style={{ opacity: 0.5 }}>Billing</h1>
      <p style={{ opacity: 0.5 }}>Offline</p>

      {/* Modal for editing non-password fields */}
      {modalOpen && editingField && (
        <Modal
          isOpen={true}
          title={`Edit ${editingField}`}
          description="Please confirm you would like to update this field."
          confirmText="Update"
          cancelText="Cancel"
          onConfirm={saveEditPopup}
          onCancel={() => {
            setEditingField(null);
            setTempValue("");
            setModalOpen(false);
          }}
        >
          <input
            type={editingField === "phoneNo" ? "tel" : "text"}
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            className="popup-input"
          />
        </Modal>
      )}

      {/* Modal for resetting password */}
      {resetModalOpen && (
        <Modal
          isOpen={true}
          title="Reset Password"
          description="Enter your old and new password."
          confirmText="Reset"
          cancelText="Cancel"
          onConfirm={submitPasswordReset}
          onCancel={() => {
            setResetModalOpen(false);
            setResetError("");
            setOldPasswordInput("");
            setNewPasswordInput("");
          }}
        >
          <input
            type="text"
            placeholder="Old Password"
            value={oldPasswordInput}
            onChange={(e) => setOldPasswordInput(e.target.value)}
            className="popup-input"
          />
          <input
            type="text"
            placeholder="New Password"
            value={newPasswordInput}
            onChange={(e) => setNewPasswordInput(e.target.value)}
            className="popup-input"
          />
          {resetError && <p className="error">{resetError}</p>}
        </Modal>
      )}
    </div>
  );
};

export default Account;
