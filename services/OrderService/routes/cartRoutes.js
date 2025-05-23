// routes/cartRoutes.js
const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");
const { verifyToken, authorize } = require('../middleware/authMiddleware'); 

router.post("/add", verifyToken, cartController.addToCart);

// update cart item
router.put("/update/:cartItemId", verifyToken, cartController.updateCartItemQuantity);
router.get("/",verifyToken, cartController.getUserCart);
router.delete("/:id", verifyToken, cartController.removeCartItem);
router.delete("/", verifyToken, cartController.clearCart);

// get resturants
router.get("/restaurants", verifyToken, cartController.getUserCartRestaurantDetails);

// get items according to the resturant
router.get(
  "/:restaurantId",
  verifyToken,
  cartController.getCartItemsByRestaurant
);

module.exports = router;
