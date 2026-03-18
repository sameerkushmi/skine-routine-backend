const UserModel = require('../models/userModel')

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
        const { id } = req.params;
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
                role: user.role
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