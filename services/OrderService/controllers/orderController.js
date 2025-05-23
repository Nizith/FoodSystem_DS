const CartItem = require("../models/cartItemModel");
const Order = require("../models/orderModel");
const sendEmail = require('../utils/emailService');
const axios = require("axios");


exports.placeOrder = async (req, res) => {
  const userId = req.user.id;
  const {
    restaurantId,
    paymentMethod,
    addressNo,
    addressStreet,
    longitude,
    latitude,
    deliveryCharge,
  } = req.body;

  if (
    !restaurantId ||
    !paymentMethod ||
    !addressNo ||
    !addressStreet ||
    typeof longitude !== 'number' ||
    typeof latitude !== 'number' ||
    typeof deliveryCharge !== 'number'
  ) {
    return res.status(400).json({ message: 'Missing or invalid order details' });
  }

  try {
    // Log debugging information
    console.log("Finding cart items for userId:", userId, "restaurantId:", restaurantId);
    
    // Check if cart items exist for the user
    const userCartItems = await CartItem.find({ userId });
    console.log(`User has ${userCartItems.length} total cart items`);
    
    // Get cart items for this restaurant
    const cartItems = await CartItem.find({ userId, restaurantId });
    console.log(`Found ${cartItems.length} cart items for this restaurant`);

    if (!cartItems.length) {
      return res.status(400).json({ 
        message: 'No items in cart for this restaurant',
        debug: {
          userId,
          restaurantId,
          totalUserCartItems: userCartItems.length,
          userCartRestaurants: [...new Set(userCartItems.map(item => 
            item.restaurantId ? item.restaurantId.toString() : 'undefined'
          ))]
        }
      });
    }

    const subtotal = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const totalAmount = subtotal + deliveryCharge;

    const order = new Order({
      userId,
      restaurantId,
      items: cartItems.map(item => ({
        menuItem: item.menuItemId,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        totalPrice: item.totalPrice
      })),
      subtotal,
      deliveryCharge,
      totalAmount,
      paymentMethod,
      address: {
        no: addressNo,
        street: addressStreet,
      },
      location: {
        longitude,
        latitude,
      },
      status: 'Pending',
    });

    const savedOrder = await order.save();
    await CartItem.deleteMany({ userId, restaurantId });

    // Send enhanced confirmation email
    try {
      const userEmail = req.user.email;
      if (userEmail) {
        await sendEmail(
          userEmail, 
          'Your Order Confirmation', 
          savedOrder
        );
        console.log('Order confirmation email sent to:', userEmail);
      } else {
        console.log('No email found for user:', userId);
      }
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      // Continue with the order response even if email fails
    }

    res.status(201).json({ 
      message: 'Order placed successfully', 
      order: savedOrder,
      emailSent: !!req.user.email 
    });
  } catch (error) {
    console.error('Place order error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


  //Get a order By ID
  exports.getOrderById = async (req, res) => {
    const { id } = req.params;
  
    try {
      const order = await Order.findById(id);
  
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
  
      const orderItemsWithDetails = await Promise.all(
        order.items.map(async (item) => {
          try {
            const menuItemResponse = await axios.get(`http://localhost:4700/api/menu/${item.menuItem}`);
            item.menuItem = menuItemResponse.data; 
            return item;
          } catch (error) {
            console.error("Error fetching menu item details:", error);
            return item;
          }
        })
      );
  
      // Update order with populated menu items
      order.items = orderItemsWithDetails;
  
      // Send back the updated order
      res.status(200).json(order);
    } catch (error) {
      console.error("Get order by ID error:", error);
      res.status(500).json({ message: "Server error" });
    }
  };
  


//  Get all orders
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find();

    const ordersWithDetails = await Promise.all(
      orders.map(async (order) => {
        const orderItemsWithDetails = await Promise.all(
          order.items.map(async (item) => {
            try {
              const menuItemResponse = await axios.get(`http://localhost:4700/api/menu/${item.menuItem}`);
              item.menuItem = menuItemResponse.data; 
              return item;
            } catch (error) {
              console.error("Error fetching menu item details:", error);
              item.menuItem = null; 
              return item;
            }
          })
        );
        order.items = orderItemsWithDetails;
        return order;
      })
    );

    // Send back the updated orders
    res.status(200).json(ordersWithDetails);
  } catch (error) {
    console.error("Get all orders error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get orders by status
exports.getOrdersByStatus = async (req, res) => {
  const { status } = req.params;
  const validStatuses = ["Pending", "Confirmed", "Preparing","Prepared", "OutForDelivery", "Delivered"];

  // Check if the provided status is valid
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid order status" });
  }

  try {
    const orders = await Order.find({ status });

    const ordersWithDetails = await Promise.all(
      orders.map(async (order) => {
        const orderItemsWithDetails = await Promise.all(
          order.items.map(async (item) => {
            try {
              const menuItemResponse = await axios.get(`http://localhost:4700/api/menu/${item.menuItem}`);
              item.menuItem = menuItemResponse.data; // Add the menu item details to the order item
              return item;
            } catch (error) {
              console.error("Error fetching menu item details:", error);
              item.menuItem = null; 
              return item;
            }
          })
        );
        order.items = orderItemsWithDetails; 
        return order;
      })
    );

    res.status(200).json(ordersWithDetails);
  } catch (error) {
    console.error("Get orders by status error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// get orders of not Delivered
exports.getActiveOrders = async (req, res) => {
  try {
    const allOrders = await Order.find(); // 1. Get all orders

    // 2. Filter out orders with status === "Delivered"
    const activeOrders = allOrders.filter(order => order.status !== "Delivered");

    // 3. Fetch menu item details for each order
    const ordersWithMenuDetails = await Promise.all(
      activeOrders.map(async (order) => {
        try {
          // Assuming each order has a menuItemId
          const response = await axios.get(`http://localhost:4700/api/menu/${order.menuItemId}`);
          const menuItem = response.data;

          return {
            ...order.toObject(),
            menuItemDetails: menuItem, // Append menu item details to the order
          };
        } catch (menuError) {
          console.error(`Failed to fetch menu item for order ${order._id}:`, menuError.message);
          return {
            ...order.toObject(),
            menuItemDetails: null,
          };
        }
      })
    );

    res.status(200).json(ordersWithMenuDetails);
  } catch (error) {
    console.error("Error fetching active orders:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};


exports.getDeliveredOrders = async (req, res) => {
  try {
    // 1. Find only delivered orders directly from the DB
    const deliveredOrders = await Order.find({ status: "Delivered" });

    // 2. Fetch menu item details for each delivered order
    const ordersWithMenuDetails = await Promise.all(
      deliveredOrders.map(async (order) => {
        try {
          const response = await axios.get(`http://localhost:4700/api/menu/${order.menuItemId}`);
          const menuItem = response.data;

          return {
            ...order.toObject(),
            menuItemDetails: menuItem, // Append menu item details
          };
        } catch (menuError) {
          console.error(`Failed to fetch menu item for order ${order._id}:`, menuError.message);
          return {
            ...order.toObject(),
            menuItemDetails: null,
          };
        }
      })
    );

    res.status(200).json(ordersWithMenuDetails);
  } catch (error) {
    console.error("Error fetching delivered orders:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};



// Update an order
exports.updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ["Pending", "Confirmed", "Preparing","Prepared", "OutForDelivery", "Delivered", "Cancelled"];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }

  try {
    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json({ message: "Order status updated", order: updatedOrder });
  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete an order
exports.deleteOrder = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedOrder = await Order.findByIdAndDelete(id);
    if (!deletedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json({ message: "Order deleted successfully" });
  } catch (error) {
    console.error("Delete order error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Send payment success email
exports.sendPaymentEmail = async (req, res) => {
  const { orderId } = req.body;

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const userEmail = req.user.email;
    if (userEmail) {
      await sendEmail(
        userEmail,
        'Payment Successful',
        {
          ...order.toObject(),
          status: 'Payment Successful',
        }
      );
      res.status(200).json({ message: 'Payment email sent successfully' });
    } else {
      res.status(400).json({ message: 'User email not found' });
    }
  } catch (error) {
    console.error('Error sending payment email:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};





