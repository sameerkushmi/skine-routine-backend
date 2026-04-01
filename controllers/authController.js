const UserModel = require("../models/userModel.js");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const {
    generateAccessToken,
    generateRefreshToken,
} = require("../utils/generateToken.js");
const sendTokens = require("../utils/sendTokens.js");
const sendEmail = require("../utils/sendEmail.js");

/* -----------------------------
   REGISTER
----------------------------- */
exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password)
            return res.status(400).json({ message: "All fields required" });

        // --- Password Strength Validation ---
        const passwordErrors = [];
        if (password.length < 8) passwordErrors.push("at least 8 characters");
        if (!/[A-Z]/.test(password)) passwordErrors.push("one uppercase letter");
        if (!/[a-z]/.test(password)) passwordErrors.push("one lowercase letter");
        if (!/[0-9]/.test(password)) passwordErrors.push("one number");
        if (!/[^A-Za-z0-9]/.test(password)) passwordErrors.push("one special character");

        if (passwordErrors.length > 0) {
            return res.status(400).json({
                message: `Password must contain ${passwordErrors.join(", ")}.`
            });
        }

        // --- Check existing user ---
        const existingUser = await UserModel.findOne({ email });
        if (existingUser)
            return res.status(400).json({ message: "User already exists" });

        // --- Create User ---
        const user = new UserModel({ name, email, password });

        // --- Email Verification ---
        const verificationToken = user.createEmailVerificationToken();
        await user.save();

        const verifyURL = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;

        try {
            const info = await sendEmail({
                to: user.email,
                subject: "Verify Your Email",
                html: `
                <h2>Welcome ${user.name}</h2>
                <p>Please verify your email by clicking the link below:</p>
                <a href="${verifyURL}">${verifyURL}</a>
            `,
            });

            console.log("Verification email sent:", info);
        } catch (emailError) {
            console.error("Email sending error:", emailError);
            // Optionally, you can choose to delete the user if email fails
            await UserModel.findByIdAndDelete(user._id);
            return res.status(500).json({ message: "Failed to send verification email. Please try again." });
        }

        res.status(201).json({
            message: "Registered successfully. Please verify your email.",
        });
    } catch (error) {
        console.log("register error:", error);
        res.status(500).json({ message: error.message });
    }
};

/* -----------------------------
   VERIFY EMAIL
----------------------------- */
exports.verifyEmail = async (req, res) => {
    try {
        const { token } = req.query;

        if (!token)
            return res.status(400).json({ message: "Invalid token" });

        const hashedToken = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        const user = await UserModel.findOne({
            emailVerificationToken: hashedToken,
        });

        if (!user)
            return res.status(400).json({ message: "Token invalid" });

        if (user.isEmailVerified)
            return res.status(200).json({ message: "Email already verified" });

        if (user.emailVerificationExpire < Date.now())
            return res.status(400).json({ message: "Token expired" });

        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpire = undefined;
        user.lastLogin = new Date();
        await user.save();

        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);
        sendTokens(res, accessToken, refreshToken);

        return res.status(200).json({ message: "Email verified & logged in" });

    } catch (error) {
        console.log("verify email error:", error);
        return res.status(500).json({ message: error.message });
    }
};

/* -----------------------------
   LOGIN
----------------------------- */
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password)
            return res.status(400).json({ message: "All fields required" });

        const user = await UserModel.findOne({ email }).select("+password");

        if (!user)
            return res.status(404).json({ message: "User Not Found, Please Register First !" });

        const isMatch = await user.comparePassword(password);

        if (!isMatch)
            return res.status(400).json({ message: "Invalid credentials" });

        if (!user.isEmailVerified)
            return res
                .status(403)
                .json({ message: "Please verify your email before login." });

        user.lastLogin = new Date();
        await user.save();

        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        sendTokens(res, accessToken, refreshToken);

        res.status(200).json({
            message: "Login successfull",
        });
    } catch (error) {
        console.log("login error:", error);
        res.status(500).json({ message: error.message });
    }
};

/* -----------------------------
   REFRESH ACCESS TOKEN
----------------------------- */
exports.refreshToken = async (req, res) => {
    try {
        const token = req.cookies.refreshToken;

        if (!token)
            return res.status(401).json({ message: "No refresh token" });

        const decode = jwt.verify(
            token,
            process.env.JWT_REFRESH_SECRET
        );

        if (!decode) {
            return res.status(403).json({ message: "Invalid refresh token" });
        }

        const user = await UserModel.findById(decode.id)

        if (!user)
            return res.status(404).json({ message: 'User Not Found' })

        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        sendTokens(res, accessToken, refreshToken);

        res.status(200).json({ message: 'Token refreshed' });
    } catch (error) {
        console.log("refresh token Error : ", error)
        res.status(403).json({ message: "Invalid or expired refresh token" });
    }
};

/* -----------------------------
   LOGOUT
----------------------------- */
exports.logout = async (req, res) => {
    try {
        res.clearCookie("accessToken", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            maxAge: 0,
        });

        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            maxAge: 0,
        });

        res.status(200).json({ message: "Logged out successfully" });

    } catch (error) {
        console.log("logout Error: ", error)
        res.status(500).json({ message: error.message });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: "Email is required" });
        }

        const user = await UserModel.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Generate token
        const resetToken = user.createPasswordResetToken();

        await user.save({ validateBeforeSave: false });

        // Create reset URL (frontend route)
        const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

        try {
            await sendEmail({
                to: user.email,
                subject: "Password Reset",
                html: `<p>Click here to reset password:</p><a href="${resetUrl}">${resetUrl}</a>`
            });
        } catch (emailError) {
            console.error("Email sending error:", emailError);
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save({ validateBeforeSave: false });
            return res.status(500).json({ success: false, message: "Failed to send password reset email. Please try again." });
        }

        res.status(200).json({
            success: true,
            message: "Password reset link sent to email",
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({ success: false, message: "Password is required" });
        }

        // Hash token from URL
        const hashedToken = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        const user = await UserModel.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpire: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired token",
            });
        }

        // Set new password
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save();

        res.status(200).json({
            success: true,
            message: "Password reset successful",
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};