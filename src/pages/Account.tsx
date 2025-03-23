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
  // NOTE: For better routing, consider changing routes to:
  // /user/:userId/lot/:lotId/account
  // This will ensure both IDs are available in the URL

  const { customerId: routeCustomerId, lotId: routeLotId } = useParams<{ customerId?: string; lotId?: string }>();
  const [currentCustomerId, setCurrentCustomerId] = useState<string>(routeCustomerId || localStorage.getItem('customerId') || '');
  const lotId = routeLotId || localStorage.getItem('lotId') || '';
  const navigate = useNavigate();
  
  console.log("Account.tsx: Using customerId:", currentCustomerId, "lotId:", lotId);
  console.log("Account.tsx: localStorage values:", {
    customerId: localStorage.getItem('customerId'),
    lotId: localStorage.getItem('lotId')
  });

  const BASE_URL = "http://localhost:8085/ParkingWithParallel";
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [lot, setLot] = useState<Lot | null>(null);
  const [operators, setOperators] = useState<Customer[]>([]);
  const [owner, setOwner] = useState<Customer | null>(null);

  // Modal editing states for non-password fields
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  // Modal for resetting password
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [oldPasswordInput, setOldPasswordInput] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [resetError, setResetError] = useState("");

  const formatId = (id: string): string => {
    return id.replace(/^PWP-(U|PL)-/, '');
  };

  // 1. Load all customers
  useEffect(() => {
    if (currentCustomerId) {
      console.log(`Fetching customer with ID: ${currentCustomerId}`);
      fetch(`${BASE_URL}/users/get-user-by-id/${currentCustomerId}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Failed to fetch customer: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          console.log("Customer data received:", data);
          setCustomer(data);
        })
        .catch((err) => {
          console.error("Error fetching customer:", err);
        });
    } else {
      console.warn("No customerId available for fetch");
    }
  }, [currentCustomerId, BASE_URL]);

  // 2. Load all lots
  useEffect(() => {
    if (lotId) {
      console.log(`Fetching lot with ID: ${lotId}`);
      fetch(`${BASE_URL}/parkinglots/get-by-id/${lotId}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Failed to fetch lot: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          console.log("Lot data received:", data);
          setLot(data);
          
          // Store lotId in localStorage for persistence
          localStorage.setItem('lotId', data.lotId);
          
          // If no customerId is available, use the lot's owner ID
          if (!currentCustomerId && data.ownerCustomerId) {
            console.log(`No customerId found, using lot owner ID: ${data.ownerCustomerId}`);
            // Store in localStorage
            localStorage.setItem('customerId', data.ownerCustomerId);
            setCurrentCustomerId(data.ownerCustomerId);
            // Fetch customer data using this ID
            fetch(`${BASE_URL}/users/get-user-by-id/${data.ownerCustomerId}`)
              .then(res => {
                if (!res.ok) {
                  throw new Error(`Failed to fetch owner: ${res.status}`);
                }
                return res.json();
              })
              .then(ownerData => {
                console.log("Owner data received:", ownerData);
                setCustomer(ownerData);
              })
              .catch(err => {
                console.error("Error fetching owner:", err);
              });
          }
        })
        .catch((err) => {
          console.error("Error fetching lot:", err);
        });
    } else {
      console.warn("No lotId available for fetch");
    }
  }, [lotId, currentCustomerId, BASE_URL]);

  // 3. Identify current customer and lot from route
  useEffect(() => {
    if (customer && lot) {
      console.log("Fetching related users. Customer role:", customer.role);
      
      if (customer.role === "owner") {
        fetch(`${BASE_URL}/parkinglots/get-operators/${lot.lotId}`)
          .then((res) => {
            if (!res.ok) {
              throw new Error(`Failed to fetch operators: ${res.status}`);
            }
            return res.json();
          })
          .then((data) => {
            console.log("Operators data received:", data);
            setOperators(data);
          })
          .catch((err) => {
            console.error("Error fetching operators:", err);
          });
      } else {
        fetch(`${BASE_URL}/users/get-user-by-id/${lot.ownerCustomerId}`)
          .then((res) => {
            if (!res.ok) {
              throw new Error(`Failed to fetch owner: ${res.status}`);
            }
            return res.json();
          })
          .then((data) => {
            console.log("Owner data received:", data);
            setOwner(data);
          })
          .catch((err) => {
            console.error("Error fetching owner:", err);
          });
      }
    }
  }, [customer, lot, BASE_URL]);

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

    fetch(`${BASE_URL}/users/update-user/${customer.customerId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...customer, ...updatedField }),
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
    
    // Instead of directly comparing passwords (which is insecure),
    // we'll send both the old and new password to the server for validation
    const passwordUpdateData = {
      ...customer,
      oldPassword: oldPasswordInput,  // Add old password for server validation
      password: newPasswordInput      // New password to set
    };

    fetch(`${BASE_URL}/users/update-user/${customer.customerId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(passwordUpdateData),
    })
      .then((res) => {
        if (!res.ok) {
          // Check if it's specifically an authentication error
          if (res.status === 401) {
            throw new Error("Old password is incorrect.");
          }
          throw new Error("Failed to update password.");
        }
        return res.json();
      })
      .then(() => {
        // Clear session and redirect to login
        localStorage.removeItem("authToken");
        navigate("/");
      })
      .catch((err) => {
        console.error("Error updating password:", err);
        setResetError(err.message || "Server error. Please try again.");
      });
  };

  if (!currentCustomerId || !lotId) {
    return (
      <div className="content">
        <h1>Account</h1>
        <p>Missing customer or lot information. Please select a lot from the dashboard.</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="content">
        <h1>Account</h1>
        <p>Loading account data for customer ID: {formatId(currentCustomerId)}...</p>
      </div>
    );
  }

  if (!lot) {
    return (
      <div className="content">
        <h1>Account</h1>
        <p>Loading lot data for lot ID: {formatId(lotId)}...</p>
      </div>
    );
  }

  const nameDisplay = customer.name.trim() === "" ? "None" : customer.name;
  const emailDisplay = customer.email.trim() === "" ? "None" : customer.email;
  const phoneDisplay = customer.phoneNo.trim() === "" ? "None" : customer.phoneNo;
  const passwordDisplay = "********"; // Always show asterisks for security reasons

  const roleLabel = customer.role === "owner" ? "Owner" : "Operator";
  let secondaryLabel = "";
  if (customer.role === "owner") {
    secondaryLabel = operators.length > 0 ? operators.map((op) => `${op.name} (#${op.customerId})`).join(", ") : "None";
  } else {
    secondaryLabel = owner ? `${owner.name} (#${owner.customerId})` : "Unknown";
  }

  return (
    <div className="content">
      {/* Title Row */}
      <div className="account-title-row">
        <h1>
          Account <span className="light-text">#{formatId(currentCustomerId)}</span>
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
            Lot <span className="light-text">#{formatId(lot.lotId)}</span>
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
