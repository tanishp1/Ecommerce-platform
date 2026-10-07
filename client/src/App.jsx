import { useEffect, useMemo, useState } from 'react';
import './App.css';

const API_URL = (() => {
  const configuredUrl = import.meta.env.VITE_API_URL;
  if (configuredUrl) {
    const normalized = configuredUrl.replace(/\/$/, '');
    return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
  }

  return '/api';
})();

async function fetchJson(url, options = {}) {
  try {
    const response = await fetch(url, options);
    const rawText = await response.text();

    let payload = {};
    if (rawText) {
      try {
        payload = JSON.parse(rawText);
      } catch (error) {
        throw new Error(rawText.slice(0, 180) || 'Invalid response from the server.');
      }
    }

    if (!response.ok) {
      throw new Error(payload.message || 'Request failed.');
    }

    return payload;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed.';
    throw new Error(message);
  }
}

function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('ecommerce-user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('ecommerce-token') || '');
  const [toast, setToast] = useState({ visible: false, type: 'success', message: '' });
  const [paymentModal, setPaymentModal] = useState({ open: false, checkoutUrl: '', items: [], total: 0 });

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, type, message });
  };

  useEffect(() => {
    if (!toast.visible) return undefined;

    const timer = window.setTimeout(() => {
      setToast((current) => ({ ...current, visible: false }));
    }, 3200);

    return () => window.clearTimeout(timer);
  }, [toast.visible]);
  const categories = ['Audio', 'Wearables', 'Home', 'Travel'];
  const fallbackProducts = [
    {
      id: 1,
      name: 'Aurora Headphones',
      category: 'Audio',
      price: 149,
      rating: 4.8,
      image:
        'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=900&q=80',
      description: 'Wireless over-ear headphones with studio-grade sound and deep bass.'
    },
    {
      id: 2,
      name: 'Luma Smartwatch',
      category: 'Wearables',
      price: 199,
      rating: 4.7,
      image:
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80',
      description: 'Track workouts, heart rate, and messages with a sleek titanium frame.'
    },
    {
      id: 3,
      name: 'Terra Lamp',
      category: 'Home',
      price: 89,
      rating: 4.9,
      image:
        'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80',
      description: 'Create a warm ambient glow with a minimalist, modern lighting design.'
    },
    {
      id: 4,
      name: 'Nova Backpack',
      category: 'Travel',
      price: 119,
      rating: 4.6,
      image:
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80',
      description: 'Water-resistant carry system with multiple compartments for everyday travel.'
    }
  ];

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await fetchJson(`${API_URL}/products`);
        setProducts(Array.isArray(data) && data.length ? data : fallbackProducts);
      } catch (error) {
        console.error('Failed to load products:', error);
        setProducts(fallbackProducts);
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem('ecommerce-user', JSON.stringify(user));
    } else {
      localStorage.removeItem('ecommerce-user');
    }
  }, [user]);

  useEffect(() => {
    if (token) {
      localStorage.setItem('ecommerce-token', token);
    } else {
      localStorage.removeItem('ecommerce-token');
    }
  }, [token]);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  const addToCart = (product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);

      if (existingItem) {
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId, delta) => {
    setCart((prevCart) =>
      prevCart.flatMap((item) => {
        if (item.id !== productId) return [item];

        const nextQty = item.quantity + delta;
        return nextQty > 0 ? [{ ...item, quantity: nextQty }] : [];
      })
    );
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();

    try {
      const endpoint = authMode === 'register' ? '/auth/register' : '/auth/login';
      const payload =
        authMode === 'register'
          ? authForm
          : { email: authForm.email, password: authForm.password };

      const data = await fetchJson(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      setUser(data.user);
      setToken(data.token);
      showToast(
        authMode === 'register'
          ? 'Welcome! Your account was created successfully.'
          : 'Login successful. Your storefront is ready.',
        'success'
      );
      setAuthForm({ name: '', email: '', password: '' });
    } catch (error) {
      showToast(error.message || 'Something went wrong while signing in.', 'error');
    }
  };

  const handleCheckout = async (customCart = cart) => {
    if (!customCart.length) {
      showToast('Your cart is empty. Add a few essentials before checking out.', 'error');
      document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    try {
      const data = await fetchJson(`${API_URL}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart: customCart,
          email: user?.email || 'guest@example.com'
        })
      });

      const checkoutUrl = data.checkoutUrl || 'https://example.com/demo-checkout';
      const total = customCart.reduce((sum, item) => sum + item.price * item.quantity, 0);

      setPaymentModal({
        open: true,
        checkoutUrl,
        items: customCart,
        total
      });

      const checkoutMessage =
        data.checkoutUrl && data.checkoutUrl.includes('stripe')
          ? 'Secure Stripe checkout is ready.'
          : `Demo checkout is ready for ${customCart.length} item${customCart.length > 1 ? 's' : ''}.`;

      showToast(checkoutMessage, 'success');
    } catch (error) {
      showToast(error.message || 'Unable to complete checkout.', 'error');
    }
  };

  const closePaymentModal = () => setPaymentModal({ open: false, checkoutUrl: '', items: [], total: 0 });

  const handleBuyNow = async (product) => {
    const singleItemCart = [{ ...product, quantity: 1 }];
    await handleCheckout(singleItemCart);
  };

  const confirmPayment = () => {
    if (!paymentModal.checkoutUrl) {
      closePaymentModal();
      return;
    }

    const paymentUrl = paymentModal.checkoutUrl;
    setCart([]);
    closePaymentModal();
    window.open(paymentUrl, '_blank', 'noopener,noreferrer');
    showToast(
      paymentUrl.includes('stripe')
        ? 'Stripe payment scanner opened successfully.'
        : 'Demo payment opened successfully.',
      'success'
    );
  };

  const logout = () => {
    setUser(null);
    setToken('');
    showToast('You have been signed out.', 'success');
  };

  const openAuthPanel = (mode = 'login') => {
    setAuthMode(mode);
    setToast((current) => ({ ...current, visible: false }));
    requestAnimationFrame(() => {
      document.getElementById('auth-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <span className="brand">Lumora</span>
        </div>
        <nav className="nav">
          <a href="#catalog">Catalog</a>
          <a href="#features">Features</a>
          <a href="#cart">Cart</a>
        </nav>
        <div className="auth-row">
          {user ? (
            <>
              <span className="welcome">Hi, {user.name}</span>
              <button className="secondary-button" onClick={logout} type="button">
                Sign out
              </button>
            </>
          ) : (
            <button
              className="secondary-button"
              onClick={() => openAuthPanel('login')}
              type="button"
            >
              Account
            </button>
          )}
        </div>
      </header>

      <main className="content">
        <section className="hero-section">
          <div className="hero-copy">
            <span className="eyebrow">New arrivals</span>
            <h1>Upgrade every routine with premium essentials.</h1>
            <p>
              Shop curated tech, home, and travel products built to simplify life and make
              every day feel elevated.
            </p>
            <div className="hero-actions">
              <a href="#catalog" className="primary-button">
                Shop now
              </a>
              <button
                className="ghost-button"
                type="button"
                onClick={handleCheckout}
                disabled={!cart.length}
                aria-disabled={!cart.length}
              >
                {cart.length ? 'Go to checkout' : 'Checkout'}
              </button>
            </div>
            <ul className="stat-list">
              <li>
                <strong>12k+</strong>
                <span>happy shoppers</span>
              </li>
              <li>
                <strong>4.9/5</strong>
                <span>average rating</span>
              </li>
              <li>
                <strong>2-day</strong>
                <span>shipping</span>
              </li>
            </ul>
          </div>
          <div className="hero-card">
            <div className="promo-badge">Limited drop</div>
            <img
              src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80"
              alt="Product highlight"
            />
            <div className="promo-info">
              <span>Featured product</span>
              <strong>Luma Smartwatch</strong>
              <small>$199</small>
            </div>
          </div>
        </section>

        <section className="category-strip">
          {categories.map((category) => (
            <div key={category} className="category-pill">
              {category}
            </div>
          ))}
        </section>

        <section id="features" className="feature-row">
          <div>
            <span>Fast shipping</span>
            <strong>Free on orders over $150</strong>
          </div>
          <div>
            <span>Secure checkout</span>
            <strong>Protected by Stripe</strong>
          </div>
          <div>
            <span>24/7 support</span>
            <strong>Friendly help desk</strong>
          </div>
        </section>

        <section id="catalog" className="catalog-layout">
          <div className="product-section">
            <div className="section-heading">
              <h2>Popular products</h2>
              <span>{products.length} items</span>
            </div>

            <div className="product-grid">
              {products.map((product) => (
                <article className="product-card" key={product.id}>
                  <img src={product.image} alt={product.name} />
                  <div className="product-body">
                    <div className="product-meta">
                      <span>{product.category}</span>
                      <span>★ {product.rating}</span>
                    </div>
                    <h3>{product.name}</h3>
                    <p>{product.description}</p>
                    <div className="product-footer">
                      <strong
                        className="product-price"
                        onClick={() => handleBuyNow(product)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            handleBuyNow(product);
                          }
                        }}
                      >
                        ${product.price}
                      </strong>
                      <div className="product-actions">
                        <button type="button" onClick={() => addToCart(product)}>
                          Add to cart
                        </button>
                        <button type="button" className="buy-now-button" onClick={() => handleBuyNow(product)}>
                          Buy now
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside id="cart" className="cart-panel">
            <div className="section-heading">
              <h2>Cart</h2>
              <span>{cart.length} items</span>
            </div>

            {cart.length ? (
              <>
                <div className="cart-items">
                  {cart.map((item) => (
                    <div className="cart-item" key={item.id}>
                      <div>
                        <strong>{item.name}</strong>
                        <small>${item.price} each</small>
                      </div>
                      <div className="quantity-controls">
                        <button type="button" onClick={() => updateQuantity(item.id, -1)}>
                          −
                        </button>
                        <span>{item.quantity}</span>
                        <button type="button" onClick={() => updateQuantity(item.id, 1)}>
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="totals">
                  <div>
                    <span>Subtotal</span>
                    <strong>${subtotal.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span>Shipping</span>
                    <strong>Free</strong>
                  </div>
                  <div className="grand-total">
                    <span>Total</span>
                    <strong>${subtotal.toFixed(2)}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  className="primary-button checkout-button"
                  onClick={handleCheckout}
                  disabled={!cart.length}
                  aria-disabled={!cart.length}
                >
                  Proceed to checkout
                </button>
              </>
            ) : (
              <div className="empty-cart">
                <p>Your cart is empty.</p>
              </div>
            )}
          </aside>
        </section>

        <section className="auth-panel" id="auth-panel">
          <div className="auth-copy">
            <span className="eyebrow">Member perks</span>
            <h2>Save favorites, track orders, and shop faster.</h2>
          </div>

          <form className="auth-form" onSubmit={handleAuthSubmit}>
            <div className="auth-toggle">
              <button
                type="button"
                className={authMode === 'login' ? 'active' : ''}
                onClick={() => openAuthPanel('login')}
              >
                Login
              </button>
              <button
                type="button"
                className={authMode === 'register' ? 'active' : ''}
                onClick={() => openAuthPanel('register')}
              >
                Register
              </button>
            </div>

            {authMode === 'register' && (
              <label>
                Full name
                <input
                  type="text"
                  value={authForm.name}
                  onChange={(event) =>
                    setAuthForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="Jane Smith"
                />
              </label>
            )}

            <label>
              Email
              <input
                type="email"
                value={authForm.email}
                onChange={(event) =>
                  setAuthForm((prev) => ({ ...prev, email: event.target.value }))
                }
                placeholder="you@example.com"
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={authForm.password}
                onChange={(event) =>
                  setAuthForm((prev) => ({ ...prev, password: event.target.value }))
                }
                placeholder="********"
                required
              />
            </label>

                  <button type="submit" className="primary-button auth-button">
              {authMode === 'login' ? 'Login' : 'Create account'}
            </button>
          </form>
        </section>

        {toast.visible && (
          <div className={`status-message toast-${toast.type}`}>{toast.message}</div>
        )}
      </main>

      {paymentModal.open && (
        <div className="payment-modal-backdrop" onClick={closePaymentModal}>
          <div className="payment-modal" onClick={(event) => event.stopPropagation()}>
            <div className="payment-modal-header">
              <div>
                <span className="eyebrow">Secure checkout</span>
                <h3>Stripe payment scanner</h3>
              </div>
              <button type="button" className="close-modal" onClick={closePaymentModal}>
                ×
              </button>
            </div>

            <div className="payment-summary">
              <p>Order summary</p>
              {paymentModal.items.map((item) => (
                <div key={item.id} className="payment-item-row">
                  <span>
                    {item.name} × {item.quantity}
                  </span>
                  <strong>${(item.price * item.quantity).toFixed(2)}</strong>
                </div>
              ))}
              <div className="payment-total-row">
                <span>Total</span>
                <strong>${paymentModal.total.toFixed(2)}</strong>
              </div>
            </div>

            <button type="button" className="primary-button payment-submit" onClick={confirmPayment}>
              Pay securely
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
