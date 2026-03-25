const cloudinary = require('../config/cloudinary')
const UserModel = require('../models/userModel')

exports.createUser = async (req, res) => {
    try {
        const { name, email, password, phone, role } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: "Name, email and password are required" });
        }

        // Check if user already exists
        const existingUser = await UserModel.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "User with this email already exists" });
        }

        // Handle avatar file if sent
        let avatarUrl = null;
        if (req.file) {
            avatarUrl = {
                url: req.file.path,
                public_id: req.file.filename,
            }
        }

        // Create user
        const user = await UserModel.create({
            name,
            email,
            password, // will be hashed automatically by pre-save hook
            phone,
            role: role || "user",
            avatar: avatarUrl,
        });

        // Do NOT send password back
        const userObj = user.toObject();
        delete userObj.password;

        res.status(201).json({ success: true, user: userObj });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.getCurrentUser = async (req, res) => {
    try {
        const user = await UserModel.findById(req.userId)

        if (!user) return res.status(404).json({ message: 'User not found !' })

        res.json(user)
    } catch (error) {
        console.log('get current user error : ', error)
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

exports.getAllUsers = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = ""
        } = req.query;

        const pageNumber = parseInt(page);
        const pageSize = parseInt(limit);

        // 🔍 Search filter
        const searchQuery = search
            ? {
                $or: [
                    { name: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } }
                ]
            }
            : {};

        // 📦 Fetch users
        const users = await UserModel.find(searchQuery)
            .sort({ createdAt: -1 })
            .skip((pageNumber - 1) * pageSize)
            .limit(pageSize);

        // 🔢 Count total
        const totalUsers = await UserModel.countDocuments(searchQuery);

        res.json({
            success: true,
            users,
            currentPage: pageNumber,
            totalPages: Math.ceil(totalUsers / pageSize),
            totalUsers
        });

    } catch (error) {
        console.log('get all users error : ', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// UPDATE USER
exports.updateUser = async (req, res) => {
    try {
        const id = req.userId;
        const { name, email, phone, role } = req.body;

        // Find user
        const user = await UserModel.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Check duplicate email
        if (email && email !== user.email) {
            const existingUser = await UserModel.findOne({ email });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: "Email already in use"
                });
            }
        }

        // handle image
        if (req.file) {
            if (user.avatar?.public_id) {
                await cloudinary.uploader.destroy(user.avatar.public_id);
            }

            user.avatar = {
                url: req.file.path,
                public_id: req.file.filename
            };
        }

        // Update fields
        user.name = name || user.name;
        user.email = email || user.email;
        user.phone = phone || user.phone;
        user.role = role || user.role;

        await user.save();

        res.status(200).json({
            success: true,
            message: "User updated successfully",
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                avatar: user.avatar,
                isEmailVerified: user.isEmailVerified
            }
        });

    } catch (error) {
        console.log("update user error:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Optional: prevent self delete
        if (req.user && req.user._id.toString() === id) {
            return res.status(400).json({
                success: false,
                message: "You cannot delete your own account"
            });
        }

        const user = await UserModel.findByIdAndDelete(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "User deleted successfully"
        });

    } catch (error) {
        console.log("delete user error:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// addresses controller
exports.getAddresses = async (req, res) => {
    try {
        const user = await UserModel.findById(req.userId).select("addresses");
        res.status(200).json(user?.addresses || []);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
}

exports.addAddress = async (req, res) => {
    try {
        const user = await UserModel.findById(req.userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        const newAddress = req.body;

        // If new address is default, unset others
        if (newAddress.isDefault) {
            user.addresses.forEach((a) => (a.isDefault = false));
        }

        user.addresses.push(newAddress);
        await user.save();
        res.status(201).json(user.addresses);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
}

exports.updatedAddress = async (req, res) => {
    try {
        const user = await UserModel.findById(req.userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        const index = parseInt(req.params.index, 10);
        const updatedAddress = req.body;

        if (updatedAddress.isDefault) {
            user.addresses.forEach((a, i) => (i === index ? (a.isDefault = true) : (a.isDefault = false)));
        }

        user.addresses[index] = updatedAddress;
        await user.save();
        res.status(200).json(user.addresses);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
}

exports.deleteAddress = async (req, res) => {
    try {
        const user = await UserModel.findById(req.userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        const index = parseInt(req.params.index, 10);
        user.addresses.splice(index, 1);
        await user.save();
        res.status(200).json(user.addresses);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
}


exports.changePassword = async (req, res) => {
    try {
        const userId = req.userId;
        const { currentPassword, newPassword, confirmPassword } = req.body;
        // Strong password regex
        const strongPasswordRegex =
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

        // 1. Validate input
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "All fields are required",
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "New passwords do not match",
            });
        }

        // 2. Strong password check
        if (!strongPasswordRegex.test(newPassword)) {
            return res.status(400).json({
                success: false,
                message:
                    "Password must be at least 8 characters and include uppercase, lowercase, number, and special character",
            });
        }

        // 3. Get user with password
        const user = await UserModel.findById(userId).select("+password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // 4. Check current password
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Current password is incorrect",
            });
        }

        // 5. Prevent reuse
        const isSamePassword = await user.comparePassword(newPassword);
        if (isSamePassword) {
            return res.status(400).json({
                success: false,
                message: "New password cannot be same as old password",
            });
        }

        // 6. Save new password
        user.password = newPassword;

        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save();

        res.status(200).json({
            success: true,
            message: "Password changed successfully",
        });

    } catch (error) {
        console.error("Change Password Error:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};