import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { storeAuthData, validateAuthStorage, isAuthenticated } from "../utils/auth";
import "./AccountSetup.css";

const AccountSetup = () => {
    const [stage, setStage] = useState(1); // 1 = login with temp password, 2 = setup account details
    const [email, setEmail] = useState("");
    const [tempPassword, setTempPassword] = useState("");
    const [name, setName] = useState("");
    const [phoneNo, setPhoneNo] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [userId, setUserId] = useState("");
    const [userData, setUserData] = useState<any>(null);
    const navigate = useNavigate();

    // Check if already logged in
    useEffect(() => {
        if (isAuthenticated()) {
            console.log("User already authenticated, redirecting to dashboard");
            window.location.href = "/dashboard";
        }
    }, []);

    // Handle initial login with temporary password
    const handleInitialLogin = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        // Prevent multiple submissions
        if (isLoading) return;

        setIsLoading(true);
        setError("");

        try {
            console.log("Attempting login with temporary password for:", email);

            // Call the login endpoint
            const response = await api.post('/login', {
                email: email,
                password: tempPassword
            }, { skipAuthRedirect: true } as any);

            console.log("Login response received:", response.status);

            // Extract token and userId from response
            const { token, userId } = response.data;

            if (!token || !userId) {
                throw new Error("Invalid response: missing token or userId");
            }

            // Store authentication data
            const authData = storeAuthData(userId, token);

            if (!authData) {
                throw new Error("Failed to store authentication data");
            }

            // Verify the auth data was properly stored
            const isValid = validateAuthStorage();

            if (!isValid) {
                throw new Error("Auth validation failed after storage");
            }

            console.log("Auth storage validated, moving to account setup stage");

            // Fetch current user data
            const userResponse = await api.get(`/users/get-user-by-id/${userId}`);
            const userData = userResponse.data;

            // Set user data in state
            setUserId(userId);
            setName(userData.name || "");
            setPhoneNo(userData.phoneNo || "");

            // Store the full user data to preserve fields when updating
            setUserData(userData);

            // Move to stage 2
            setStage(2);
            setIsLoading(false);

        } catch (err: any) {
            // Log the entire error object for debugging
            console.error("Login error details:", {
                error: err,
                response: err.response ? {
                    status: err.response.status,
                    data: err.response.data
                } : 'No response',
                message: err.message
            });

            console.error("Login error:", err);
            let errorMessage = "Invalid credentials";

            if (err.response) {
                if (err.response.status === 401) {
                    errorMessage = "Incorrect email or temporary password";
                } else if (err.response.status === 500) {
                    // Special handling for the specific server error about duplicate records
                    if (err.response.data && err.response.data.message &&
                        err.response.data.message.includes("Query did not return a unique result")) {
                        errorMessage = "There appears to be multiple accounts with this email address. " +
                            "Please contact your administrator for assistance.";
                    } else if (err.response.data && err.response.data.message) {
                        // Display the actual error message from the server for other 500 errors
                        errorMessage = `Server error: ${err.response.data.message}`;
                    } else {
                        errorMessage = "An unexpected server error occurred. Please try again later.";
                    }
                } else if (err.response.data) {
                    // Ensure error message is always a string
                    if (typeof err.response.data === 'string') {
                        errorMessage = err.response.data;
                    } else if (err.response.data.message && typeof err.response.data.message === 'string') {
                        errorMessage = err.response.data.message;
                    } else {
                        // If all else fails, provide a generic message
                        errorMessage = "An error occurred with the server response";
                    }
                }
            } else if (err.request) {
                errorMessage = "Server not responding. Please try again later.";
            } else if (err.message) {
                errorMessage = err.message;
            }

            setError(errorMessage);
            setIsLoading(false);
        }
    };

    // Handle account setup submission
    const handleAccountSetup = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        // Prevent multiple submissions
        if (isLoading || isRedirecting) return;

        // Validate passwords match
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        // Validate password length
        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters long");
            return;
        }

        setIsLoading(true);
        setError("");

        try {
            // First update user info (name and phone)
            await api.put(`/users/update-user/${userId}`, {
                ...(userData || {}), // Safely spread userData or empty object if null/undefined
                name,
                email,
                phoneNo,
            });

            // Then change password
            await api.post(`/users/change-password/${userId}`, {
                oldPassword: tempPassword,
                newPassword: newPassword
            });

            console.log("Account setup successful");
            setIsRedirecting(true);

            // Redirect to dashboard
            setTimeout(() => {
                console.log("Performing hard redirect to dashboard...");
                window.location.href = "/dashboard";
            }, 500);

        } catch (err: any) {
            // Log the entire error object for debugging
            console.error("Account setup error details:", {
                error: err,
                response: err.response ? {
                    status: err.response.status,
                    data: err.response.data
                } : 'No response',
                message: err.message
            });

            console.error("Account setup error:", err);
            let errorMessage = "Failed to complete account setup";

            if (err.response) {
                if (err.response.status === 500) {
                    // Special handling for the specific server error about duplicate records
                    if (err.response.data && err.response.data.message &&
                        err.response.data.message.includes("Query did not return a unique result")) {
                        errorMessage = "There appears to be multiple accounts with this email address. " +
                            "Please contact your administrator for assistance.";
                    } else if (err.response.data && err.response.data.message) {
                        // Display the actual error message from the server for other 500 errors
                        errorMessage = `Server error: ${err.response.data.message}`;
                    } else {
                        errorMessage = "An unexpected server error occurred. Please try again later.";
                    }
                } else if (err.response.data) {
                    // Ensure error message is always a string
                    if (typeof err.response.data === 'string') {
                        errorMessage = err.response.data;
                    } else if (err.response.data.message && typeof err.response.data.message === 'string') {
                        errorMessage = err.response.data.message;
                    } else {
                        // If all else fails, provide a generic message
                        errorMessage = "An error occurred during account setup";
                    }
                }
            } else if (err.request) {
                errorMessage = "Server not responding. Please try again later.";
            } else if (err.message) {
                errorMessage = err.message;
            }

            setError(errorMessage);
            setIsLoading(false);
        }
    };

    // Show loading/redirecting UI
    if (isRedirecting) {
        return (
            <div className="setup-container">
                <div className="setup-box">
                    <img src="/assets/Logo_Operator.svg" alt="Parallel Operator" className="logo-operator" />
                    <div className="redirecting-message">
                        <div className="spinner"></div>
                        <p>Account setup complete. Redirecting to dashboard...</p>
                    </div>
                </div>
                <footer>
                    <img src="/assets/PoweredbyParallelDark.svg" alt="Powered by Parallel" className="powered-by-logo" />
                </footer>
            </div>
        );
    }

    return (
        <div className="setup-container">
            <div className="setup-box">
                <img src="/assets/Logo_Operator.svg" alt="Parallel Operator" className="logo-operator" />

                {stage === 1 && (
                    <form className="setup-stage" onSubmit={handleInitialLogin} autoComplete="off">
                        <input
                            type="text"
                            placeholder="Email Address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="off"
                            name="email"
                            disabled={isLoading}
                        />
                        <input
                            type="password"
                            placeholder="Temporary Password"
                            value={tempPassword}
                            onChange={(e) => setTempPassword(e.target.value)}
                            autoComplete="off"
                            name="tempPassword"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            className={`setupacc-button ${isLoading ? 'loading' : ''}`}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Verifying...' : 'Setup Account'}
                        </button>
                        {error && typeof error === 'string' && <p className="error">{error}</p>}
                    </form>
                )}

                {stage === 2 && (
                    <form className="setup-stage" onSubmit={handleAccountSetup}>
                        <div className="form-group">
                            <label htmlFor="email">Email Address</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                readOnly
                                autoComplete="username"
                                name="email"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="name">Full Name</label>
                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={isLoading}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="phoneNo">Phone Number <span className="optional">(optional)</span></label>
                            <input
                                id="phoneNo"
                                type="tel"
                                value={phoneNo}
                                onChange={(e) => setPhoneNo(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="newPassword">New Password</label>
                            <input
                                id="newPassword"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                disabled={isLoading}
                                autoComplete="new-password"
                                name="new-password"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirmPassword">Confirm New Password</label>
                            <input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={isLoading}
                                autoComplete="new-password"
                                name="confirm-password"
                                required
                            />
                        </div>

                        <div className="password-requirements">
                            <div className={`requirement ${newPassword.length >= 8 ? 'met' : 'not-met'}`}>
                                <span className="requirement-icon">
                                    {newPassword.length >= 8 ? '✓' : '•'}
                                </span>
                                At least 8 characters
                            </div>
                            <div className={`requirement ${newPassword === confirmPassword && newPassword !== '' ? 'met' : 'not-met'}`}>
                                <span className="requirement-icon">
                                    {newPassword === confirmPassword && newPassword !== '' ? '✓' : '•'}
                                </span>
                                Passwords match
                            </div>
                        </div>

                        <button
                            type="submit"
                            className={`setupacc-button ${isLoading ? 'loading' : ''}`}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Saving...' : 'Setup & Login'}
                        </button>
                        {error && typeof error === 'string' && <p className="error">{error}</p>}
                    </form>
                )}
            </div>
            <footer>
                <img src="/assets/PoweredbyParallelDark.svg" alt="Powered by Parallel" className="powered-by-logo" />
            </footer>
        </div>
    );
};

export default AccountSetup;