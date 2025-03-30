import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authService } from "../utils/api";
import "./Login.css";

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        // Validate token
        if (!token) {
            setError("Invalid or missing reset token. Please request a new password reset.");
            return;
        }

        // Validate passwords
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters long.");
            return;
        }

        // Prevent multiple submissions
        if (isLoading) return;

        setIsLoading(true);
        setError("");
        setSuccess("");

        try {
            console.log("Resetting password with token");

            // Call the password reset service
            await authService.resetPassword(token, newPassword);

            console.log("Password reset successful");
            setSuccess("Your password has been reset successfully. You can now log in with your new password.");

            // Redirect to login after 3 seconds
            setTimeout(() => {
                navigate("/login");
            }, 3000);

        } catch (err: any) {
            console.error("Password reset error:", err);
            let errorMessage = "An error occurred while processing your request.";

            if (err.response?.data) {
                // Handle structured error response
                if (typeof err.response.data === 'string') {
                    errorMessage = err.response.data;
                } else if (err.response.data.message) {
                    errorMessage = err.response.data.message;
                } else if (err.response.data.error) {
                    errorMessage = err.response.data.error;
                }
            } else if (err.response?.status === 400) {
                errorMessage = "Invalid or expired reset token. Please request a new password reset.";
            } else if (err.request) {
                errorMessage = "Server not responding. Please try again later.";
            } else if (err.message) {
                errorMessage = err.message;
            }

            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <img src="/assets/Logo_Operator.svg" alt="Parallel Operator" className="logo-operator" />

                <form onSubmit={handleSubmit}>
                    <h2>Reset Password</h2>
                    <p className="reset-instructions">Please enter your new password below.</p>

                    <input
                        type="password"
                        placeholder="New Password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                        name="newPassword"
                        disabled={isLoading}
                        required
                    />

                    <input
                        type="password"
                        placeholder="Confirm New Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        name="confirmPassword"
                        disabled={isLoading}
                        required
                    />

                    <button
                        type="submit"
                        className={`login-button ${isLoading ? 'loading' : ''}`}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Resetting...' : 'Reset Password'}
                    </button>

                    {error && <p className="error">{error}</p>}
                    {success && <p className="success">{success}</p>}
                </form>

                <button
                    className="back-to-login"
                    onClick={() => navigate('/login')}
                    disabled={isLoading}
                >
                    Back to Login
                </button>
            </div>
            <footer>
                <img src="/assets/PoweredbyParallelDark.svg" alt="Powered by Parallel" className="powered-by-logo" />
            </footer>
        </div>
    );
};

export default ResetPassword; 