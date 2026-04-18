import { useState, useCallback } from 'react';
import TopBar from './components/TopBar';
import OrderInfoBar from './components/OrderInfoBar';
import MenuPanel from './components/MenuPanel';
import InvoicePanel from './components/InvoicePanel';
import ReceiptModal from './components/ReceiptModal';
import TableModal from './components/QRModal';

function App() {
  const [tableNum, setTableNum] = useState(7);
  const [orderNum] = useState(() => `MH-${String(Math.floor(1000 + Math.random() * 9000))}`);
  const [guests, setGuests] = useState(2);
  const [order, setOrder] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [totals, setTotals] = useState(null);

  const addItem = useCallback((id) => {
    setOrder(prev => {
      const existing = prev.find(e => e.id === id);
      if (existing) return prev.map(e => e.id === id ? { ...e, qty: e.qty + 1 } : e);
      return [...prev, { id, qty: 1 }];
    });
  }, []);

  const changeQty = useCallback((id, delta) => {
    setOrder(prev => prev.map(e => {
      if (e.id !== id) return e;
      const next = e.qty + delta;
      return next > 0 ? { ...e, qty: next } : e;
    }).filter(e => e.qty > 0));
  }, []);

  const removeItem = useCallback((id) => {
    setOrder(prev => prev.filter(e => e.id !== id));
  }, []);

  const clearOrder = useCallback(() => setOrder([]), []);

  const handleGenerateBill = useCallback((t) => {
    setTotals(t);
    setReceiptOpen(true);
  }, []);

  const handleNewOrder = useCallback(() => {
    setOrder([]);
    setReceiptOpen(false);
    setTotals(null);
    setPaymentMethod('cash');
  }, []);

  const handleSelectTable = useCallback((num) => {
    setTableNum(num);
    setQrOpen(false);
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-bg">
      {/* Rangoli pattern overlay */}
      <div className="fixed inset-0 rangoli-pattern pointer-events-none z-0" />

      {/* Ambient glows */}
      <div className="fixed top-0 left-0 w-[600px] h-[600px] rounded-full bg-saffron/5 blur-[150px] pointer-events-none z-0" />
      <div className="fixed bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-red/5 blur-[120px] pointer-events-none z-0" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-purple/3 blur-[100px] pointer-events-none z-0" />

      {/* Main UI */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <TopBar />
        <OrderInfoBar
          tableNum={tableNum}
          orderNum={orderNum}
          guests={guests}
          onSelectTable={() => setQrOpen(true)}
        />

        {/* Two-panel layout */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] min-h-0">
          <MenuPanel onAddItem={addItem} />
          <InvoicePanel
            order={order}
            onChangeQty={changeQty}
            onRemove={removeItem}
            onClear={clearOrder}
            onGenerateBill={handleGenerateBill}
            paymentMethod={paymentMethod}
            onPaymentChange={setPaymentMethod}
          />
        </div>
      </div>

      {/* Modals */}
      <ReceiptModal
        open={receiptOpen}
        order={order}
        totals={totals}
        paymentMethod={paymentMethod}
        tableNum={tableNum}
        orderNum={orderNum}
        guests={guests}
        onClose={() => setReceiptOpen(false)}
        onNewOrder={handleNewOrder}
      />
      <TableModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        onSelectTable={handleSelectTable}
        currentTable={tableNum}
      />
    </div>
  );
}

export default App;
