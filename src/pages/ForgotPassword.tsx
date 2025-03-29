import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../utils/api";
import "./Login.css";

const ForgotPassword = () => {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        // Prevent multiple submissions
        if (isLoading) return;

        setIsLoading(true);
        setError("");
        setSuccess("");

        try {
            console.log("Requesting password reset for:", email);

            // Call the password reset service
            await authService.requestPasswordReset(email);

            console.log("Password reset request successful");
            setSuccess("Email sent with password reset instructions.");

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
            } else if (err.response?.status === 404) {
                errorMessage = "Email not found.";
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
                    <p className="reset-instructions">Enter your email address and we'll send you instructions to reset your password.</p>

                    <input
                        type="email"
                        placeholder="Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        name="email"
                        disabled={isLoading}
                        required
                    />

                    <button
                        type="submit"
                        className={`login-button ${isLoading ? 'loading' : ''}`}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Sending...' : 'Send Email'}
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

export default ForgotPassword; 