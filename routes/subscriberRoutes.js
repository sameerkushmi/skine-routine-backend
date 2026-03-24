const express = require("express");
const router = express.Router();
const {
    addSubscriber,
    getSubscribers,
    deleteSubscriber,
} = require("../controllers/subscriberController");

const protect = require('../middlewares/protect')
const adminProtect = require('../middlewares/adminProtect')

// Public route: subscribe
router.post("/", addSubscriber);

// Private/Admin: get all subscribers
router.get("/", protect, adminProtect, getSubscribers);

// Private/Admin: delete subscriber
router.delete("/:id", protect, adminProtect, deleteSubscriber);

module.exports = router;