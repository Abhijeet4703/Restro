import { useState, useCallback } from 'react';
import Header from './components/Header';
import WelcomeBar from './components/WelcomeBar';
import MenuBrowser from './components/MenuBrowser';
import CartPanel from './components/CartPanel';
import CheckoutModal from './components/CheckoutModal';

function App() {
  const [customerName, setCustomerName]   = useState('');
  const [tableNum, setTableNum]           = useState('');
  const [order, setOrder]                 = useState([]);
  const [cartOpen, setCartOpen]           = useState(false);
  const [checkoutOpen, setCheckoutOpen]   = useState(false);
  const [totals, setTotals]               = useState(null);

  const [orderNum] = useState(
    () => `MH-${String(Math.floor(1000 + Math.random() * 9000))}`
  );

  const addItem = useCallback((id) => {
    setOrder(prev => {
      const existing = prev.find(e => e.id === id);
      if (existing) return prev.map(e => e.id === id ? { ...e, qty: e.qty + 1 } : e);
      return [...prev, { id, qty: 1 }];
    });
  }, []);

  const changeQty = useCallback((id, delta) => {
    setOrder(prev =>
      prev.map(e => {
        if (e.id !== id) return e;
        const next = e.qty + delta;
        return next > 0 ? { ...e, qty: next } : e;
      }).filter(e => e.qty > 0)
    );
  }, []);

  const removeItem = useCallback((id) => {
    setOrder(prev => prev.filter(e => e.id !== id));
  }, []);

  const clearOrder = useCallback(() => setOrder([]), []);

  const handleCheckout = useCallback((t) => {
    setTotals(t);
    setCheckoutOpen(true);
    setCartOpen(false);
  }, []);

  const handleNewOrder = useCallback(() => {
    setOrder([]);
    setCheckoutOpen(false);
    setTotals(null);
  }, []);

  const totalItems = order.reduce((s, e) => s + e.qty, 0);

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-bg">
      {/* Background rangoli pattern */}
      <div className="fixed inset-0 rangoli-pattern pointer-events-none z-0" />

      {/* Ambient glows */}
      <div className="fixed top-0 left-0 w-[600px] h-[600px] rounded-full bg-saffron/5 blur-[150px] pointer-events-none z-0" />
      <div className="fixed bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-red/5 blur-[120px] pointer-events-none z-0" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-purple/3 blur-[100px] pointer-events-none z-0" />

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Top navigation bar */}
        <Header
          totalItems={totalItems}
          onCartOpen={() => setCartOpen(true)}
        />

        {/* Customer name + table input bar */}
        <WelcomeBar
          customerName={customerName}
          tableNum={tableNum}
          onSetName={setCustomerName}
          onSetTable={setTableNum}
        />

        {/* Two-panel layout: menu + cart */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1.4fr_0.9fr] min-h-0">
          <MenuBrowser onAddItem={addItem} order={order} />

          {/* Desktop cart sidebar */}
          <div className="hidden lg:flex flex-col border-l border-saffron/10 overflow-hidden">
            <CartPanel
              order={order}
              onChangeQty={changeQty}
              onRemove={removeItem}
              onClear={clearOrder}
              onCheckout={handleCheckout}
              customerName={customerName}
              tableNum={tableNum}
            />
          </div>
        </div>

        {/* Mobile floating cart button */}
        {totalItems > 0 && (
          <button
            onClick={() => setCartOpen(true)}
            className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-7 py-4 bg-gradient-to-r from-saffron-dark to-red rounded-full shadow-[0_8px_32px_rgba(255,153,51,0.45)] text-white font-bold text-sm z-40 hover:scale-105 active:scale-95 transition-all"
          >
            <span className="text-lg">🛒</span>
            <span>View Cart</span>
            <span className="bg-white/25 text-white text-[11px] font-black w-6 h-6 rounded-full flex items-center justify-center">
              {totalItems}
            </span>
          </button>
        )}

        {/* Mobile cart bottom drawer */}
        {cartOpen && (
          <div
            className="lg:hidden fixed inset-0 z-50 bg-bg/85 backdrop-blur-xl"
            onClick={e => e.target === e.currentTarget && setCartOpen(false)}
          >
            <div className="absolute bottom-0 left-0 right-0 bg-card border-t-2 border-saffron/25 rounded-t-3xl max-h-[88vh] overflow-y-auto animate-slide-up">
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-saffron/30" />
              </div>
              <div className="flex justify-between items-center px-5 py-3 border-b border-saffron/10">
                <h3 className="font-[Playfair_Display] text-base font-bold tracking-[3px] uppercase text-saffron">
                  🛒 Your Order
                </h3>
                <button
                  onClick={() => setCartOpen(false)}
                  className="w-8 h-8 rounded-full border border-saffron/20 bg-surface text-saffron flex items-center justify-center cursor-pointer hover:bg-red hover:border-red hover:text-white transition-all"
                >
                  ×
                </button>
              </div>
              <CartPanel
                order={order}
                onChangeQty={changeQty}
                onRemove={removeItem}
                onClear={clearOrder}
                onCheckout={handleCheckout}
                customerName={customerName}
                tableNum={tableNum}
                isMobile
              />
            </div>
          </div>
        )}

        {/* Checkout receipt modal */}
        {checkoutOpen && totals && (
          <CheckoutModal
            open={checkoutOpen}
            order={order}
            totals={totals}
            customerName={customerName}
            tableNum={tableNum}
            orderNum={orderNum}
            onClose={() => setCheckoutOpen(false)}
            onNewOrder={handleNewOrder}
          />
        )}
      </div>
    </div>
  );
}

export default App;
