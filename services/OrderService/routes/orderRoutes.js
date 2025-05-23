// routes/orderRoutes.js

const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { verifyToken, authorize } = require('../middleware/authMiddleware'); 

// Place a new order
router.post("/place", verifyToken, orderController.placeOrder);

// Get a specific order by ID
router.get("/:id", verifyToken, orderController.getOrderById);

// Get all orders
router.get("/", orderController.getAllOrders);

// Get orders by status (e.g., Pending, Confirmed, etc.)
router.get("/status/:status", verifyToken, orderController.getOrdersByStatus);

// Route for getting orders that are not delivered
router.get("/active/getActiveOrders", orderController.getActiveOrders);

// get dilvers orders
router.get("/active/getDeliveredOrders", orderController.getDeliveredOrders);

// Update order status
router.put("/:id/status", verifyToken, orderController.updateOrderStatus);


// Delete an order
router.delete("/:id", verifyToken, orderController.deleteOrder);

module.exports = router;
