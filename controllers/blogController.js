const Blog = require("../models/blogModel");
const cloudinary = require("../config/cloudinary");

// ----------------- CREATE BLOG WITH SECTION IMAGES -----------------
const createBlog = async (req, res) => {
    try {
        const { title, excerpt } = req.body;

        // ✅ parse JSON string
        const article = JSON.parse(req.body.article);

        const heroFile = req.files?.heroImage?.[0];

        if (!heroFile) {
            return res.status(400).json({ message: "Hero image is required" });
        }

        const heroImage = {
            url: heroFile.path,
            public_id: heroFile.filename,
        };

        let sections = [];

        if (article?.sections && article.sections.length > 0) {
            const sectionImages = req.files?.sectionImages || [];

            sections = article.sections.map((sec, index) => ({
                heading: sec.heading,
                content: sec.content || [],
                list: sec.list || [],
                image: sectionImages[index]
                    ? {
                        url: sectionImages[index].path,
                        public_id: sectionImages[index].filename,
                    }
                    : null,
            }));
        }

        const blog = new Blog({
            title,
            excerpt,
            heroImage,
            article: {
                intro: article?.intro,
                sections,
                conclusion: article?.conclusion,
            },
        });

        await blog.save();

        res.status(201).json({
            success: true,
            blog,
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error", error });
    }
};

// ----------------- UPDATE BLOG WITH SECTION IMAGES -----------------
const updateBlog = async (req, res) => {
    try {
        const { title, excerpt, article } = req.body;
        const blog = await Blog.findById(req.params.id);
        if (!blog) return res.status(404).json({ message: "Blog not found" });

        // Update hero image
        if (req.file) {
            await cloudinary.uploader.destroy(blog.heroImage.public_id);
            blog.heroImage = {
                url: req.file.path,
                public_id: req.file.filename,
            };
        }

        // Update section images
        if (article?.sections && req.files && req.files.length > 0) {
            article.sections.forEach((sec, index) => {
                if (sec.imageUpdated && req.files[index]) {
                    // Delete old section image if exists
                    if (blog.article.sections[index]?.image?.public_id) {
                        cloudinary.uploader.destroy(blog.article.sections[index].image.public_id);
                    }
                    blog.article.sections[index].image = {
                        url: req.files[index].path,
                        public_id: req.files[index].filename,
                    };
                } else {
                    // Keep existing image if not updated
                    blog.article.sections[index].image = blog.article.sections[index]?.image || null;
                }

                blog.article.sections[index].heading = sec.heading || blog.article.sections[index].heading;
                blog.article.sections[index].content = sec.content || blog.article.sections[index].content;
                blog.article.sections[index].list = sec.list || blog.article.sections[index].list;
            });
        }

        blog.title = title || blog.title;
        blog.excerpt = excerpt || blog.excerpt;
        blog.article.intro = article?.intro || blog.article.intro;
        blog.article.conclusion = article?.conclusion || blog.article.conclusion;

        await blog.save();
        res.status(200).json({ message: "Blog updated successfully", blog });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error", error });
    }
};

// ----------------- DELETE BLOG -----------------
const deleteBlog = async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) return res.status(404).json({ message: "Blog not found" });

        // Delete hero image
        await cloudinary.uploader.destroy(blog.heroImage.public_id);

        // Delete section images
        blog.article.sections.forEach(async (section) => {
            if (section.image?.public_id) {
                await cloudinary.uploader.destroy(section.image.public_id);
            }
        });

        await blog.deleteOne()
        res.status(200).json({ message: "Blog deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error", error });
    }
};

// ----------------- OTHER CRUD FUNCTIONS -----------------
const getAllBlogs = async (req, res) => {
    try {
        const blogs = await Blog.find().sort({ createdAt: -1 });
        res.status(200).json({ blogs });
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
};

const getBlogById = async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) return res.status(404).json({ message: "Blog not found" });
        res.status(200).json({ blog });
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
};

// ----------------- GET RELATED BLOGS -----------------
const getRelatedBlogs = async (req, res) => {
    try {
        const { id } = req.params;

        const currentBlog = await Blog.findById(id);
        if (!currentBlog) {
            return res.status(404).json({ message: "Blog not found" });
        }

        const keywords = currentBlog.title.split(" ");

        let relatedBlogs = await Blog.find({
            _id: { $ne: id },
            title: {
                $regex: keywords.join("|"),
                $options: "i",
            },
        })
            .limit(4)
            .select("title excerpt heroImage date");

        // 🔥 Fallback (latest blogs)
        if (relatedBlogs.length === 0) {
            relatedBlogs = await Blog.find({
                _id: { $ne: id },
            })
                .sort({ createdAt: -1 })
                .limit(4)
                .select("title excerpt heroImage date");
        }

        console.log(relatedBlogs)

        res.status(200).json({
            success: true,
            relatedBlogs,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error", error });
    }
};

module.exports = {
    createBlog,
    updateBlog,
    deleteBlog,
    getAllBlogs,
    getBlogById,
    getRelatedBlogs
};