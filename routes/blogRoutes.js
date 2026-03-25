const express = require("express");
const router = express.Router();
const { getAllBlogs, getBlogById, addComment, createBlog, updateBlog, deleteBlog } = require("../controllers/blogController");
const upload = require("../middlewares/upload");

const protect = require("../middlewares/protect");
const adminProtect = require("../middlewares/adminProtect");

// Other routes
router.get("/", getAllBlogs);
router.get("/:id", getBlogById);
router.post("/:id/comments", addComment);

// Admin routes
router.use(protect, adminProtect)
// Create blog: heroImage + sectionImages
router.post(
    "/",
    upload.fields([
        { name: "heroImage", maxCount: 1 },
        { name: "sectionImages", maxCount: 20 },
    ]),
    createBlog
);

// Update blog
router.put(
    "/:id",
    upload.fields([
        { name: "heroImage", maxCount: 1 },
        { name: "sectionImages", maxCount: 20 },
    ]),
    updateBlog
);
router.delete("/:id", deleteBlog);

module.exports = router;