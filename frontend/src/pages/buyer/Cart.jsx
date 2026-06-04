import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCart, updateItemQuantity, removeItemFromCart, clearUserCart } from '../../store/slices/cartSlice.js';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api.js';
import { Trash2, ShoppingCart, ArrowRight, MapPin, CreditCard } from 'lucide-react';
import Navbar from '../../components/layout/Navbar.jsx';
import Sidebar from '../../components/layout/Sidebar.jsx';

const BuyerCart = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { cart, loading } = useSelector((state) => state.cart);
  const { user } = useSelector((state) => state.auth);

  // Checkout info
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    dispatch(fetchCart());
    // Prefill primary address if available
    const primaryAddress = user?.addresses?.find((addr) => addr.isDefault);
    if (primaryAddress) {
      setStreet(primaryAddress.street);
      setCity(primaryAddress.city);
      setState(primaryAddress.state);
      setPostalCode(primaryAddress.postalCode);
    }
  }, [dispatch, user]);

  const handleQtyChange = (itemId, quantity) => {
    if (quantity < 1) return;
    dispatch(updateItemQuantity({ itemId, quantity }));
  };

  const handleRemove = (itemId) => {
    dispatch(removeItemFromCart(itemId));
  };

  const handleClear = () => {
    dispatch(clearUserCart());
  };

  // Load Razorpay Script
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    setCheckoutLoading(true);

    const shippingAddress = { street, city, state, postalCode };

    try {
      const response = await api.post('/orders', {
        shippingAddress,
        paymentMethod,
      });

      if (response.data.success) {
        const { order, razorpay } = response.data.data;

        if (paymentMethod === 'online' && razorpay) {
          const loaded = await loadRazorpayScript();
          if (!loaded) {
            alert('Razorpay SDK failed to load. Please try again.');
            setCheckoutLoading(false);
            return;
          }

          const options = {
            key: razorpay.keyId,
            amount: razorpay.amount,
            currency: razorpay.currency,
            name: 'FarmFlow B2B',
            description: `Payment for Order ${order.orderNumber}`,
            order_id: razorpay.razorpayOrderId,
            handler: async (response) => {
              try {
                const verifyRes = await api.post('/payments/verify', {
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                });
                if (verifyRes.data.success) {
                  alert('Online payment verified successfully!');
                  navigate('/orders');
                }
              } catch (err) {
                alert('Payment verification failed.');
              }
            },
            prefill: {
              name: user.fullName,
              email: user.email,
              contact: user.phone || '',
            },
            theme: { color: '#2e7d32' },
          };

          const rzp = new window.Razorpay(options);
          rzp.open();
        } else {
          alert('Order placed successfully (Cash on Delivery / Pay after delivery)!');
          navigate('/orders');
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Checkout failed');
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Helper pricing calculators
  const items = cart?.items || [];
  const subtotal = items.reduce((sum, item) => {
    const price = item.product?.effectivePrice || item.product?.price || 0;
    return sum + price * item.quantity;
  }, 0);
  const discount = cart?.appliedCoupon ? cart.appliedCoupon.discount : 0;
  const deliveryFee = subtotal > 5000 || subtotal === 0 ? 0 : 250;
  const tax = Math.round(subtotal * 0.05 * 100) / 100;
  const total = subtotal - discount + deliveryFee + tax;

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Navbar />

        <div className="container-fluid p-0 animate-fade-in">
          <h2 className="fw-bold mb-4">Your Shopping Cart</h2>

          {loading && !cart ? (
            <div className="text-center py-5">
              <div className="spinner-border text-success" role="status"></div>
            </div>
          ) : items.length === 0 ? (
            <div className="card-farm text-center py-5">
              <ShoppingCart size={48} className="text-success mb-3" />
              <h4>Your cart is empty</h4>
              <p className="text-muted">Browse the marketplace to add fresh produce to your cart.</p>
              <button className="btn btn-primary-farm mt-3" onClick={() => navigate('/marketplace')}>
                Go to Marketplace
              </button>
            </div>
          ) : (
            <div className="row g-4">
              {/* Cart Items List */}
              <div className="col-lg-7">
                <div className="card-farm p-3 mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="fw-bold text-success mb-0">Produce List</h5>
                    <button className="btn btn-outline-danger btn-sm" onClick={handleClear}>
                      Clear Cart
                    </button>
                  </div>
                  {items.map((item) => (
                    <div key={item._id} className="d-flex align-items-center gap-3 py-3 border-bottom">
                      <img
  src={item.product?.images?.[0]?.url || 'https://via.placeholder.com/80?text=No+Image'}
  alt={item.product?.name}
  className="rounded-3"
  width="70"
  height="70"
  style={{ objectFit: 'cover' }}
/>
                      <div className="flex-grow-1">
                        <div className="fw-bold text-dark">{item.product?.name}</div>
                        <div className="text-muted small">₹{item.product?.effectivePrice || item.product?.price} / {item.product?.unit}</div>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <button className="btn btn-light btn-sm" onClick={() => handleQtyChange(item._id, item.quantity - 1)}>-</button>
                        <span className="fw-bold px-2">{item.quantity}</span>
                        <button className="btn btn-light btn-sm" onClick={() => handleQtyChange(item._id, item.quantity + 1)}>+</button>
                      </div>
                      <button className="btn btn-outline-danger btn-sm border-0" onClick={() => handleRemove(item._id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Delivery details form */}
                <form onSubmit={handleCheckout} className="card-farm p-4">
                  <h5 className="fw-bold text-success mb-3 d-flex align-items-center gap-2">
                    <MapPin size={20} /> Shipping & Delivery Destination
                  </h5>
                  <div className="mb-3">
                    <label className="form-label text-dark fw-semibold">Street Address</label>
                    <input type="text" className="form-control" placeholder="123 Main St" value={street} onChange={(e) => setStreet(e.target.value)} required />
                  </div>
                  <div className="row g-3 mb-4">
                    <div className="col-sm-4">
                      <label className="form-label text-dark fw-semibold">City</label>
                      <input type="text" className="form-control" placeholder="Mumbai" value={city} onChange={(e) => setCity(e.target.value)} required />
                    </div>
                    <div className="col-sm-4">
                      <label className="form-label text-dark fw-semibold">State</label>
                      <input type="text" className="form-control" placeholder="Maharashtra" value={state} onChange={(e) => setState(e.target.value)} required />
                    </div>
                    <div className="col-sm-4">
                      <label className="form-label text-dark fw-semibold">Postal Code</label>
                      <input type="text" className="form-control" placeholder="400001" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} required />
                    </div>
                  </div>

                  <h5 className="fw-bold text-success mb-3 d-flex align-items-center gap-2">
                    <CreditCard size={20} /> Select Payment Method
                  </h5>
                  <div className="d-flex gap-3 mb-4">
                    <div className="form-check">
                      <input className="form-check-input" type="radio" name="payment" id="paymentCod" value="cod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} />
                      <label className="form-check-label text-dark" htmlFor="paymentCod">
                        Pay After Delivery (COD)
                      </label>
                    </div>
                    <div className="form-check">
                      <input className="form-check-input" type="radio" name="payment" id="paymentOnline" value="online" checked={paymentMethod === 'online'} onChange={() => setPaymentMethod('online')} />
                      <label className="form-check-label text-dark" htmlFor="paymentOnline">
                        Pay Online (Razorpay)
                      </label>
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary-farm w-100 py-3 d-flex align-items-center justify-content-center gap-2" disabled={checkoutLoading}>
                    {checkoutLoading ? (
                      <span className="spinner-border spinner-border-sm" role="status"></span>
                    ) : (
                      <>
                        Complete Purchase
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Order summary card */}
              <div className="col-lg-5">
                <div className="card-farm p-4 sticky-top" style={{ top: '85px' }}>
                  <h5 className="fw-bold text-success mb-3">Order Price Summary</h5>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Subtotal</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Discount</span>
                    <span>-₹{discount.toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Delivery Fee</span>
                    <span>₹{deliveryFee.toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-3">
                    <span className="text-muted">Gst / Tax (5%)</span>
                    <span>₹{tax.toFixed(2)}</span>
                  </div>
                  <hr />
                  <div className="d-flex justify-content-between mb-4">
                    <span className="fw-bold text-dark fs-5">Total Cost</span>
                    <span className="fw-bold text-success fs-5">₹{total.toFixed(2)}</span>
                  </div>
                  <div className="bg-success-subtle p-3 rounded-3 text-success text-center small">
                    🌱 Orders above ₹5,000 qualify for free delivery!
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BuyerCart;
