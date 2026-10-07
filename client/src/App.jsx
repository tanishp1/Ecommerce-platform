import { useEffect, useMemo, useState } from 'react';
import './App.css';

const API_URL = 'http://localhost:5000/api';

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
  const [message, setMessage] = useState('');
  const categories = ['Audio', 'Wearables', 'Home', 'Travel'];

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch(`${API_URL}/products`);
        const data = await response.json();
        setProducts(data);
      } catch (error) {
        console.error('Failed to load products:', error);
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

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed.');
      }

      setUser(data.user);
      setToken(data.token);
      setMessage(
        authMode === 'register'
          ? 'Welcome! Your account was created successfully.'
          : 'Login successful. Your storefront is ready.'
      );
      setAuthForm({ name: '', email: '', password: '' });
    } catch (error) {
      setMessage(error.message || 'Something went wrong while signing in.');
    }
  };

  const handleCheckout = async () => {
    if (!cart.length) {
      setMessage('Add a product to your cart before checking out.');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart,
          email: user?.email || 'guest@example.com'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Checkout failed.');
      }

      setMessage(
        data.checkoutUrl && data.checkoutUrl.includes('stripe')
          ? 'Checkout started successfully. Redirecting to Stripe.'
          : 'Demo checkout completed successfully.'
      );

      if (data.checkoutUrl && data.checkoutUrl.includes('stripe')) {
        window.location.href = data.checkoutUrl;
      }

      setCart([]);
    } catch (error) {
      setMessage(error.message || 'Unable to complete checkout.');
    }
  };

  const logout = () => {
    setUser(null);
    setToken('');
    setMessage('You have been signed out.');
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
              onClick={() => setAuthMode('login')}
              type="button"
            >
              Login
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
              <button className="ghost-button" type="button" onClick={handleCheckout}>
                Go to checkout
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
                      <strong>${product.price}</strong>
                      <button type="button" onClick={() => addToCart(product)}>
                        Add to cart
                      </button>
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

                <button type="button" className="primary-button checkout-button" onClick={handleCheckout}>
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

        <section className="auth-panel">
          <div className="auth-copy">
            <span className="eyebrow">Member perks</span>
            <h2>Save favorites, track orders, and shop faster.</h2>
          </div>

          <form className="auth-form" onSubmit={handleAuthSubmit}>
            <div className="auth-toggle">
              <button
                type="button"
                className={authMode === 'login' ? 'active' : ''}
                onClick={() => setAuthMode('login')}
              >
                Login
              </button>
              <button
                type="button"
                className={authMode === 'register' ? 'active' : ''}
                onClick={() => setAuthMode('register')}
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

        {message && <p className="status-message">{message}</p>}
      </main>
    </div>
  );
}

export default App;
