// controllers/cartController.js
const CartItem = require("../models/cartItemModel");
const axios = require("axios");

exports.addToCart = async (req, res) => {
  const { menuItemId, quantity } = req.body;
  const userId = req.user.id;

  if (!menuItemId || !quantity || quantity < 1) {
    return res.status(400).json({ message: "Invalid cart input" });
  }

  try {
    const menuItemResponse = await axios.get(`http://localhost:4700/api/menu/${menuItemId}`);
    const menuItem = menuItemResponse.data;

    if (!menuItem) {
      return res.status(404).json({ message: "Menu item not found in menu service" });
    }

    const unitPrice = menuItem.price;
    const totalPrice = unitPrice * quantity;
    exports.addToCart = async (req, res) => {
      const { menuItemId, quantity } = req.body;
      const userId = req.user.id;
    
      if (!menuItemId || !quantity || quantity < 1) {
        return res.status(400).json({ message: "Invalid cart input" });
      }
    
      try {
        const menuItemResponse = await axios.get(`http://localhost:4700/api/menu/${menuItemId}`);
        const menuItem = menuItemResponse.data;
    
        if (!menuItem) {
          return res.status(404).json({ message: "Menu item not found in menu service" });
        }
    
        const unitPrice = menuItem.price;
        const totalPrice = unitPrice * quantity;
    
        const cartItem = new CartItem({
          userId,
          restaurantId: menuItem.restaurantId,
          menuItemId,
          quantity,
          name: menuItem.name,
          price: unitPrice,
          totalPrice,
          imageUrl: menuItem.imageUrl,
          preparationTime: menuItem.preparationTime,
        });
    
        await cartItem.save();
        res.status(201).json({ message: "Item added to cart", cartItem });
      } catch (err) {
        console.error("Add to cart error:", err.message);
        res.status(500).json({ message: "Server error", error: err.message });
      }
    };
    
    // Check if the item already exists in the cart
    const cartItem = new CartItem({
      userId,
      restaurantId: menuItem.restaurantId,
      menuItemId,
      quantity,
      name: menuItem.name,
      price: unitPrice,
      totalPrice,
      imageUrl: menuItem.imageUrl,
      preparationTime: menuItem.preparationTime,
    });

    await cartItem.save();
    res.status(201).json({ message: "Item added to cart", cartItem });
  } catch (err) {
    console.error("Add to cart error:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


// update cart items
exports.updateCartItemQuantity = async (req, res) => {
  const { cartItemId } = req.params;
  const { quantity } = req.body;

  if (!cartItemId || !quantity || quantity < 1) {
    return res.status(400).json({ message: "Invalid input" });
  }

  try {
    const cartItem = await CartItem.findById(cartItemId);
    if (!cartItem) {
      return res.status(404).json({ message: "Cart item not found" });
    }

    cartItem.quantity = quantity;
    cartItem.totalPrice = cartItem.price * quantity;

    await cartItem.save();

    res.status(200).json({ message: "Cart item updated", cartItem });
  } catch (err) {
    console.error("Update cart item error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// get all item(current user)
exports.getUserCart = async (req, res) => {
  try {
    const cartItems = await CartItem.find({ userId: req.user.id });

    if (!cartItems.length) {
      return res.status(200).json([]);
    }

    // Fetch menu item details for each cart item
    const cartItemsWithMenuDetails = await Promise.all(
      cartItems.map(async (item) => {
        try {
          const response = await axios.get(`http://localhost:4700/api/menu/${item.  menuItemId}`);
          const menuItem = response.data;

          return {
            ...item.toObject(),    // Spread cart item properties
            menuItemDetails: menuItem,  // Add menu item details
          };
        } catch (error) {
          console.error(`Failed to fetch menu item for ${item.menuItemId}:`, error.message);
          return {
            ...item.toObject(),
            menuItemDetails: null, // If fetch fails, keep it null
          };
        }
      })
    );

    res.status(200).json(cartItemsWithMenuDetails);
  } catch (err) {
    console.error("Error fetching user cart:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};
// remove items
exports.removeCartItem = async (req, res) => {
  try {
    const cartItem = await CartItem.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!cartItem) return res.status(404).json({ message: "Cart item not found" });
    res.json({ message: "Item removed" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// clear all items from cart
exports.clearCart = async (req, res) => {
  try {
    await CartItem.deleteMany({ userId: req.user.id });
    res.json({ message: "Cart cleared" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};



// get all restaurant details for relavant user
exports.getUserCartRestaurantDetails = async (req, res) => {
  const userId = req.user.id;

  try {
    const restaurantIds = await CartItem.distinct("restaurantId", { userId });

    const validRestaurantIds = restaurantIds.filter(id => id);

    const restaurantPromises = validRestaurantIds.map(id =>
      axios.get(`http://localhost:4700/api/restaurants/${id}`)
        .then(response => response.data)
        .catch(error => {
          console.error(`Error fetching restaurant ${id}:`, error.message);
          return null; 

        })
    );

    const fetchedRestaurants = await Promise.all(restaurantPromises);

    const restaurants = fetchedRestaurants.filter(data => data !== null);

    res.status(200).json({ restaurants });
  } catch (error) {
    console.error("Error getting user's cart restaurant details:", error);
    res.status(500).json({ message: "Server error" });
  }
};


exports.getCartItemsByRestaurant = async (req, res) => {
  const userId = req.user.id;
  const { restaurantId } = req.params;

  if (!restaurantId) {
    return res.status(400).json({ message: "Restaurant ID is required" });
  }

  try {
    // Fetch cart items for the given user and restaurant
    const items = await CartItem.find({
      userId,
      restaurantId,
    });

    // Fetch menu item details using Axios for each item
    const detailedItems = await Promise.all(
      items.map(async (item) => {
        try {
          // Replace the URL with your actual menu service endpoint
          const response = await axios.get(`http://localhost:4700/api/menu/${item.menuItemId}`);
          return {
            ...item.toObject(), // Convert mongoose document to plain object
            menuItemDetails: response.data, // Attach fetched menu item data
          };
        } catch (err) {
          console.error(`Error fetching menu item ${item.menuItemId}:`, err.message);
          return {
            ...item.toObject(),
            menuItemDetails: null, // Fallback if fetching fails
          };
        }
      })
    );

    // Respond with the updated cart items, now including menu item details
    res.status(200).json({ items: detailedItems });
  } catch (error) {
    console.error("Error fetching cart items:", error);
    res.status(500).json({ message: "Server error" });
  }
};

