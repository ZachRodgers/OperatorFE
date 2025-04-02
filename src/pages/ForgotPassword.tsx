import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../utils/api";
import "./Login.css";

const ForgotPassword = () => {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [cooldownTime, setCooldownTime] = useState(0);
    const navigate = useNavigate();

    // For countdown timer if rate limited
    React.useEffect(() => {
        let timer: NodeJS.Timeout | null = null;
        if (cooldownTime > 0) {
            timer = setInterval(() => {
                setCooldownTime(prev => {
                    if (prev <= 1) {
                        if (timer) clearInterval(timer);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [cooldownTime]);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        // Prevent multiple submissions
        if (isLoading || cooldownTime > 0) return;

        setIsLoading(true);
        setError("");
        setSuccess("");

        try {
            console.log("Requesting password reset for:", email);

            // Call the password reset service
            await authService.requestPasswordReset(email);

            console.log("Password reset request successful");
            setSuccess("Email sent with password reset instructions. If you don't see it, please check your spam folder.");

        } catch (err: any) {
            console.error("Password reset error:", err);
            let errorMessage = "An error occurred while processing your request.";

            // Handle rate limiting (429 Too Many Requests)
            if (err.response?.status === 429) {
                // Set a cooldown timer (for development, 10 seconds; for production would be longer)
                setCooldownTime(10);
                errorMessage = "Please wait before requesting another password reset. You can try again in a few moments.";
            }
            // Handle other error responses
            else if (err.response?.data) {
                // Handle structured error response
                if (typeof err.response.data === 'string') {
                    errorMessage = err.response.data;
                } else if (err.response.data.message) {
                    errorMessage = err.response.data.message;
                } else if (err.response.data.error) {
                    errorMessage = err.response.data.error;
                }
            } else if (err.response?.status === 404) {
                // Don't expose that email wasn't found (security best practice)
                errorMessage = "If your email is registered, you will receive reset instructions shortly.";
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
                    <p className="reset-instructions">Please enter your email address to send a link to reset password.</p>

                    <input
                        type="email"
                        placeholder="Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        name="email"
                        disabled={isLoading || cooldownTime > 0}
                        required
                    />

                    <button
                        type="submit"
                        className={`login-button ${isLoading ? 'loading' : ''}`}
                        disabled={isLoading || cooldownTime > 0}
                    >
                        {isLoading ? 'Sending...' :
                            cooldownTime > 0 ? `Retry in ${cooldownTime}s` : 'Send Email'}
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