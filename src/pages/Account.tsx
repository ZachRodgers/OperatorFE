import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Modal from "../components/Modal";
import { useUser } from "../contexts/UserContext";
import { User } from "../types";
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

interface ApiUser {
  userId: string;
  name: string;
  email: string;
  phoneNo?: string;
  role: string;
  isVerified?: boolean;
  isDeleted?: boolean;
  [key: string]: any; // Allow any other properties
}

const Account: React.FC = () => {
  // NOTE: For better routing, consider changing routes to:
  // /user/:userId/lot/:lotId/account
  // This will ensure both IDs are available in the URL

  const { customerId: routeCustomerId, lotId: routeLotId } = useParams<{ customerId?: string; lotId?: string }>();
  const navigate = useNavigate();
  const { user, logout } = useUser(); // Access the authenticated user from context

  // Use the authenticated user ID from context, falling back to route params
  const [currentCustomerId, setCurrentCustomerId] = useState<string>(
    (user?.userId as string) || routeCustomerId || localStorage.getItem('loggedInUserId') || ''
  );
  const lotId = routeLotId || localStorage.getItem('lotId') || '';

  console.log("Account.tsx: Using authenticated user:", user?.name, "customerId:", currentCustomerId, "lotId:", lotId);

  const BASE_URL = "http://localhost:8085/ParkingWithParallel";
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [lot, setLot] = useState<Lot | null>(null);
  const [operators, setOperators] = useState<Customer[]>([]);
  const [owner, setOwner] = useState<Customer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lotError, setLotError] = useState<boolean>(false);

  // Modal editing states for non-password fields
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  // Modal for resetting password
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [oldPasswordInput, setOldPasswordInput] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [resetError, setResetError] = useState("");

  const formatId = (id?: string): string => {
    if (!id) return '';

    // For debugging
    console.log("Formatting ID:", id);

    // Extract the ID number after the prefix
    const match = id.match(/^PWP-(U|PL)-(\d+)$/);
    if (match) {
      return match[2]; // Return just the number portion
    }

    // If no match found, return the original ID
    return id;
  };

  // Function to convert API user to Customer
  const convertApiUserToCustomer = (apiUser: ApiUser): Customer => {
    return {
      customerId: apiUser.userId, // Map userId to customerId
      name: apiUser.name || "",
      email: apiUser.email || "",
      phoneNo: apiUser.phoneNo || "",
      role: apiUser.role || "",
      password: "", // We don't get passwords from API
      assignedLots: [],
      isVerified: apiUser.isVerified ? "true" : "false",
      lastLogin: ""
    };
  };

  // Load authenticated user data
  useEffect(() => {
    // If we have a user from context, use that
    if (user?.userId) {
      console.log("Using authenticated user data from context:", user);
      // Convert User to Customer type
      const userAsCustomer: Customer = {
        customerId: user.userId,
        name: user.name,
        email: user.email,
        phoneNo: user.phoneNo || '',
        role: user.role,
        password: '',  // We don't store password in context
        assignedLots: user.assignedLots || [],
        isVerified: user.isVerified ? 'true' : 'false',
        lastLogin: user.lastLogin || '',
      };
      setCustomer(userAsCustomer);
      setCurrentCustomerId(user.userId);
    }
    // Otherwise fetch from API
    else if (currentCustomerId) {
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
          // Convert API response to Customer
          setCustomer(convertApiUserToCustomer(data));
          setError(null);
        })
        .catch((err) => {
          console.error("Error fetching customer:", err);
          setError("Failed to load account data. Please try again.");
          // If user can't be fetched, redirect to login
          logout();
        });
    } else {
      console.warn("No authenticated user available. Redirecting to login.");
      logout();
    }
  }, [user, currentCustomerId, BASE_URL, logout]);

  // 2. Load lot data
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
          setLotError(false);

          // Store lotId in localStorage for persistence
          localStorage.setItem('lotId', data.lotId);
        })
        .catch((err) => {
          console.error("Error fetching lot:", err);
          setLotError(true);
        });
    } else {
      console.warn("No lotId available for fetch");
    }
  }, [lotId, BASE_URL]);

  // 3. Determine user role for this lot and fetch related users
  useEffect(() => {
    if (customer && lot) {
      console.log("Determining user role for lot:", lot.lotId);

      // First, always fetch the owner information
      fetch(`${BASE_URL}/users/get-user-by-id/${lot.ownerCustomerId}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Failed to fetch owner: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          console.log("Owner data received:", data);
          // Convert API response to Customer before setting
          setOwner(convertApiUserToCustomer(data));
        })
        .catch((err) => {
          console.error("Error fetching owner:", err);
        });

      // Then, fetch operators for this lot
      fetch(`${BASE_URL}/parkinglots/get-operators/${lot.lotId}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Failed to fetch operators: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          console.log("Operators data received:", data);
          // Map each operator through the converter function
          const convertedOperators = Array.isArray(data)
            ? data.map(op => convertApiUserToCustomer(op))
            : [];
          setOperators(convertedOperators);
        })
        .catch((err) => {
          console.error("Error fetching operators:", err);
        });
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

    // Form validation
    if (!oldPasswordInput || !newPasswordInput) {
      setResetError("Please fill in both password fields.");
      return;
    }

    // Password complexity check
    if (newPasswordInput.length < 6) {
      setResetError("New password must be at least 6 characters long.");
      return;
    }

    // Create the data for password change
    const passwordChangeData = {
      oldPassword: oldPasswordInput,
      newPassword: newPasswordInput
    };

    // Use the dedicated password change endpoint
    fetch(`${BASE_URL}/users/change-password/${customer.customerId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(passwordChangeData),
    })
      .then((res) => {
        if (!res.ok) {
          if (res.status === 401) {
            throw new Error("The current password you entered is incorrect.");
          }
          throw new Error("Failed to update password.");
        }
        return res.json();
      })
      .then(() => {
        // Show success message
        alert("Password updated successfully. You will be logged out for security reasons.");

        // Clear all auth data and redirect to login
        logout();
      })
      .catch((err) => {
        console.error("Error updating password:", err);
        setResetError(err.message || "Server error. Please try again.");
      });
  };

  // Use the logout function from context
  const handleLogout = () => {
    logout();
  };

  // Update the rendering logic for error states
  if (!currentCustomerId || !lotId) {
    return (
      <div className="content">
        <h1>Account</h1>
        <p>Missing customer or lot information. Please select a lot from the dashboard.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content">
        <h1>Account</h1>
        <p>{error}</p>
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

  if (lotError) {
    return (
      <div className="content">
        <h1>Account</h1>
        <p>Failed to load lot pricing data. Please try again.</p>
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

  // Determine if the current user is the owner of this lot
  const isOwner = lot.ownerCustomerId === customer.customerId;
  console.log("Role determination - Owner check:", {
    lotOwnerId: lot.ownerCustomerId,
    currentUserId: customer.customerId,
    isOwner
  });

  // Determine if the current user is an operator for this lot
  const isOperator = operators.some(op => op.customerId === customer.customerId);
  console.log("Role determination - Operator check:", {
    operators: operators.map(op => ({ name: op.name, id: op.customerId })),
    currentUserId: customer.customerId,
    isOperator
  });

  // Compute roleLabel based FIRST on relationship to the lot, THEN on role
  let roleLabel = "";
  if (isOwner) {
    roleLabel = "Owner";
  } else if (isOperator) {
    roleLabel = "Operator"; // Force "Operator" if they're in the operators list
  } else if (customer.role && customer.role.toLowerCase() === "staff") {
    roleLabel = "Staff";
  } else {
    roleLabel = customer.role ? (customer.role.charAt(0).toUpperCase() + customer.role.slice(1)) : "Viewer";
  }

  // After computing roleLabel, log it
  console.log("Final role label:", roleLabel);

  // Set up the secondary label depending on the role
  let secondaryLabel = "";
  if (isOwner) {
    // If user is owner, display all operators (excluding self) with proper IDs
    secondaryLabel = operators.length > 0
      ? operators
        .filter(op => op.customerId !== customer.customerId)
        .map((op) => `${op.name} (#${formatId(op.customerId)})`)
        .join(", ")
      : "None";
  } else {
    // If user is not owner, display the owner info with proper id
    secondaryLabel = owner
      ? `${owner.name} (#${formatId(owner.customerId)})`
      : "Unknown";
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
            {isOwner ? (
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
          description="Enter your current password and a new password."
          confirmText="Reset Password"
          cancelText="Cancel"
          onConfirm={submitPasswordReset}
          onCancel={() => {
            setResetModalOpen(false);
            setResetError("");
            setOldPasswordInput("");
            setNewPasswordInput("");
          }}
        >
          <div className="password-reset-form">
            <div className="form-group">
              <input
                id="oldPassword"
                type="password"
                placeholder="Current Password"
                value={oldPasswordInput}
                onChange={(e) => setOldPasswordInput(e.target.value)}
                className="popup-input"
              />
            </div>

            <div className="form-group">
              <input
                id="newPassword"
                type="password"
                placeholder="New Password"
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                className="popup-input"
              />

            </div>

            {resetError && <p className="error-message">{resetError}</p>}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Account;
