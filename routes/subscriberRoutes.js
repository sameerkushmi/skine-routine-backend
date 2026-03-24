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

router.use(protect, adminProtect)
// Private/Admin: get all subscribers
router.get("/", getSubscribers);

// Private/Admin: delete subscriber
router.delete("/:id", deleteSubscriber);

module.exports = router;