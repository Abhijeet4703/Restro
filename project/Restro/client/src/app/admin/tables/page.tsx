'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  QrCode,
  Download,
  Users,
  Lock,
  Unlock,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Printer,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { connectSocket, joinRestaurant } from '@/lib/socket';

interface TableData {
  _id: string;
  number: number;
  name?: string;
  seats?: number;
  status: 'available' | 'occupied' | 'reserved' | 'disabled';
  currentSessionId?: string;
}

const statusConfig: Record<string, { color: string; icon: typeof CheckCircle2; label: string }> = {
  available: { color: 'bg-emerald-50 text-emerald-600 border-emerald-200', icon: CheckCircle2, label: 'Available' },
  occupied: { color: 'bg-orange-50 text-orange-600 border-orange-200', icon: Users, label: 'Occupied' },
  reserved: { color: 'bg-blue-50 text-blue-600 border-blue-200', icon: Lock, label: 'Reserved' },
  disabled: { color: 'bg-zinc-100 text-zinc-400 border-zinc-200', icon: AlertCircle, label: 'Disabled' },
};

export default function AdminTablesPage() {
  const { restaurant } = useAuthStore();
  const [tables, setTables] = useState<TableData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<TableData | null>(null);
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [showAllQr, setShowAllQr] = useState(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const fetchTables = useCallback(async () => {
    try {
      const { data } = await api.get('/restaurant/tables');
      setTables(data.tables || data || []);
    } catch {
      toast.error('Failed to load tables');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  // Real-time table status updates via Socket.IO
  useEffect(() => {
    if (!restaurant?._id) return;
    const socket = connectSocket();
    joinRestaurant(restaurant._id);

    const handleTableUpdate = (data: { tableId: string; tableNumber: number; status: string }) => {
      console.log('[Tables] Real-time table:status-update received:', data);
      setTables((prev) =>
        prev.map((t) =>
          t._id === data.tableId || t.number === data.tableNumber
            ? { ...t, status: data.status as TableData['status'] }
            : t
        )
      );
      toast.info(`Table ${data.tableNumber} is now ${data.status}`);
    };

    socket.on('table:status-update', handleTableUpdate);
    return () => {
      socket.off('table:status-update', handleTableUpdate);
    };
  }, [restaurant?._id]);

  const toggleStatus = async (table: TableData, newStatus: string) => {
    try {
      await api.put(`/restaurant/tables/${table._id}`, { status: newStatus });
      setTables((prev) =>
        prev.map((t) => (t._id === table._id ? { ...t, status: newStatus as TableData['status'] } : t))
      );
      toast.success(`Table ${table.number} set to ${newStatus}`);
    } catch {
      toast.error('Failed to update table');
    }
  };

  const getQrUrl = (tableNum: number) => {
    return `${baseUrl}/r/${restaurant?.slug}/table/${tableNum}`;
  };

  const downloadQr = (tableNum: number) => {
    const svg = document.getElementById(`qr-${tableNum}`)?.querySelector('svg');
    if (!svg) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const data = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    const svgBlob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = 400;
      canvas.height = 480;
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 400, 480);
        ctx.drawImage(img, 50, 30, 300, 300);
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Table ${tableNum}`, 200, 380);
        ctx.font = '14px Arial';
        ctx.fillStyle = '#666666';
        ctx.fillText(restaurant?.name || 'Restaurant', 200, 410);
        ctx.fillText('Scan to order', 200, 440);
      }
      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `table-${tableNum}-qr.png`;
      link.href = pngUrl;
      link.click();
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const availableCount = tables.filter((t) => t.status === 'available').length;
  const occupiedCount = tables.filter((t) => t.status === 'occupied').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tables & QR Codes</h1>
          <p className="text-sm text-slate-500 mt-1">
            {tables.length} tables • {availableCount} available • {occupiedCount} occupied
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowAllQr(true)}
            variant="outline"
            className="border-slate-200 text-slate-600 hover:bg-slate-100"
          >
            <Printer className="w-4 h-4 mr-2" /> Print All QR
          </Button>
          <Button onClick={fetchTables} variant="outline" size="icon" className="border-slate-200 text-slate-600 hover:bg-slate-100">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(statusConfig).map(([key, cfg]) => {
          const count = tables.filter((t) => t.status === key).length;
          return (
            <Card key={key} className="bg-white border-slate-200">
              <CardContent className="p-3 flex items-center gap-3">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', cfg.color.split(' ')[0])}>
                  <cfg.icon className={cn('w-4 h-4', cfg.color.split(' ')[1])} />
                </div>
                <div>
                  <p className="text-lg font-bold">{count}</p>
                  <p className="text-[11px] text-slate-500">{cfg.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tables Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div key={i} className="h-40 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {tables.map((table) => {
            const cfg = statusConfig[table.status];
            return (
              <Card
                key={table._id}
                className={cn(
                  'bg-white border-slate-200 hover:bg-slate-50 transition-all cursor-pointer group relative overflow-hidden',
                  table.status === 'occupied' && 'ring-1 ring-orange-200',
                  table.status === 'disabled' && 'opacity-40'
                )}
              >
                <CardContent className="p-4 flex flex-col items-center text-center">
                  {/* Status dot */}
                  <div className={cn('absolute top-3 right-3 w-2 h-2 rounded-full', {
                    'bg-emerald-400': table.status === 'available',
                    'bg-orange-400 animate-pulse': table.status === 'occupied',
                    'bg-blue-400': table.status === 'reserved',
                    'bg-zinc-500': table.status === 'disabled',
                  })} />

                  {/* Table number */}
                  <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mb-2">
                    <span className="text-xl font-bold text-slate-700">{table.number}</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">{table.name || `Table ${table.number}`}</p>
                  <Badge className={cn('text-[10px] border mb-3', cfg.color)}>{cfg.label}</Badge>

                  {/* Actions */}
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-7 h-7 text-slate-400 hover:text-slate-900"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTable(table);
                        setShowQrDialog(true);
                      }}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                    </Button>
                    {table.status === 'available' ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-7 h-7 text-slate-400 hover:text-red-400"
                        onClick={(e) => { e.stopPropagation(); toggleStatus(table, 'disabled'); }}
                      >
                        <Lock className="w-3.5 h-3.5" />
                      </Button>
                    ) : table.status === 'disabled' ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-7 h-7 text-slate-400 hover:text-emerald-400"
                        onClick={(e) => { e.stopPropagation(); toggleStatus(table, 'available'); }}
                      >
                        <Unlock className="w-3.5 h-3.5" />
                      </Button>
                    ) : table.status === 'occupied' ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-7 h-7 text-slate-400 hover:text-emerald-400"
                        onClick={(e) => { e.stopPropagation(); toggleStatus(table, 'available'); }}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Single QR Dialog */}
      <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
        <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-sm">
          <DialogHeader>
            <DialogTitle>QR Code - Table {selectedTable?.number}</DialogTitle>
            <DialogDescription className="text-slate-500">
              Print and place on the table. Customers scan to order.
            </DialogDescription>
          </DialogHeader>
          {selectedTable && (
            <div className="flex flex-col items-center py-4">
              <div id={`qr-${selectedTable.number}`} className="bg-white p-6 rounded-2xl">
                <QRCodeSVG
                  value={getQrUrl(selectedTable.number)}
                  size={220}
                  level="H"
                  includeMargin={false}
                />
              </div>
              <p className="mt-4 text-xs text-slate-500 text-center break-all max-w-[280px]">
                {getQrUrl(selectedTable.number)}
              </p>
              <Button
                onClick={() => downloadQr(selectedTable.number)}
                className="mt-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white w-full"
              >
                <Download className="w-4 h-4 mr-2" /> Download QR Code
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* All QR Print Dialog */}
      <Dialog open={showAllQr} onOpenChange={setShowAllQr}>
        <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>All QR Codes</DialogTitle>
            <DialogDescription className="text-slate-500">
              Print this page to get all QR codes for your tables
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 py-4">
            {tables.filter((t) => t.status !== 'disabled').map((table) => (
              <div key={table._id} className="flex flex-col items-center p-4 bg-white rounded-xl">
                <div id={`qr-${table.number}`} className="bg-white p-4 rounded-xl">
                  <QRCodeSVG value={getQrUrl(table.number)} size={140} level="H" />
                </div>
                <p className="mt-2 text-sm font-bold">Table {table.number}</p>
                <p className="text-[11px] text-slate-400">{restaurant?.name}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => downloadQr(table.number)}
                  className="mt-1 text-emerald-600 hover:text-emerald-600 text-xs h-7"
                >
                  <Download className="w-3 h-3 mr-1" /> Download
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
