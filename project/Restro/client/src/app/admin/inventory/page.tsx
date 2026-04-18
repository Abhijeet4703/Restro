'use client';

import { useEffect, useState } from 'react';
import {
  Package,
  Search,
  Plus,
  AlertTriangle,
  Edit2,
  Trash2,
  ArrowUpDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface InventoryItem {
  _id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  minStock: number;
  costPerUnit: number;
  lastRestocked: string;
}

const mockInventory: InventoryItem[] = [
  { _id: '1', name: 'Basmati Rice', category: 'Grains', quantity: 25, unit: 'kg', minStock: 10, costPerUnit: 80, lastRestocked: '2025-01-15' },
  { _id: '2', name: 'Chicken Breast', category: 'Meat', quantity: 8, unit: 'kg', minStock: 5, costPerUnit: 280, lastRestocked: '2025-01-18' },
  { _id: '3', name: 'Olive Oil', category: 'Oils', quantity: 3, unit: 'litre', minStock: 5, costPerUnit: 450, lastRestocked: '2025-01-10' },
  { _id: '4', name: 'Tomatoes', category: 'Vegetables', quantity: 12, unit: 'kg', minStock: 8, costPerUnit: 40, lastRestocked: '2025-01-19' },
  { _id: '5', name: 'Paneer', category: 'Dairy', quantity: 2, unit: 'kg', minStock: 4, costPerUnit: 320, lastRestocked: '2025-01-17' },
  { _id: '6', name: 'Garlic', category: 'Vegetables', quantity: 5, unit: 'kg', minStock: 3, costPerUnit: 120, lastRestocked: '2025-01-16' },
  { _id: '7', name: 'Cumin Seeds', category: 'Spices', quantity: 1.5, unit: 'kg', minStock: 2, costPerUnit: 600, lastRestocked: '2025-01-12' },
  { _id: '8', name: 'Butter', category: 'Dairy', quantity: 6, unit: 'kg', minStock: 3, costPerUnit: 480, lastRestocked: '2025-01-18' },
];

const emptyItem: Omit<InventoryItem, '_id'> = {
  name: '', category: '', quantity: 0, unit: 'kg', minStock: 0, costPerUnit: 0, lastRestocked: '',
};

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>(mockInventory);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState(emptyItem);
  const [sortBy, setSortBy] = useState<'name' | 'quantity'>('name');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await api.get('/inventory');
        if (data?.length) setInventory(data);
      } catch {
        // Use mock
      }
    };
    fetchData();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyItem);
    setDialogOpen(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditing(item);
    setForm({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      minStock: item.minStock,
      costPerUnit: item.costPerUnit,
      lastRestocked: item.lastRestocked,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (editing) {
      try {
        await api.put(`/inventory/${editing._id}`, form);
      } catch { /* update locally */ }
      setInventory((prev) =>
        prev.map((i) => (i._id === editing._id ? { ...i, ...form } : i))
      );
    } else {
      const newItem: InventoryItem = { ...form, _id: Date.now().toString(), lastRestocked: new Date().toISOString().split('T')[0] };
      try {
        const { data } = await api.post('/inventory', form);
        if (data?._id) newItem._id = data._id;
      } catch { /* use local */ }
      setInventory((prev) => [...prev, newItem]);
    }
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/inventory/${id}`);
    } catch { /* delete locally */ }
    setInventory((prev) => prev.filter((i) => i._id !== id));
  };

  const lowStockItems = inventory.filter((i) => i.quantity <= i.minStock);

  const filtered = inventory
    .filter((i) => i.name.toLowerCase().includes(search.toLowerCase()) || i.category.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (sortBy === 'name' ? a.name.localeCompare(b.name) : a.quantity - b.quantity));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent">
            Inventory
          </h1>
          <p className="text-sm text-slate-500 mt-1">Track stock levels and supplies</p>
        </div>
        <Button onClick={openCreate} className="bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600">
          <Plus className="w-4 h-4 mr-1" /> Add Item
        </Button>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-600">Low Stock Alert</p>
              <p className="text-xs text-red-600/60 mt-0.5">
                {lowStockItems.map((i) => i.name).join(', ')} — below minimum threshold
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search + Sort */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search inventory..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-50 border-slate-200 text-sm"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-slate-200 text-xs"
          onClick={() => setSortBy(sortBy === 'name' ? 'quantity' : 'name')}
        >
          <ArrowUpDown className="w-3 h-3 mr-1" />
          Sort: {sortBy === 'name' ? 'Name' : 'Quantity'}
        </Button>
      </div>

      {/* Inventory Table */}
      <Card className="bg-white border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] text-slate-500 uppercase tracking-wider">
                <th className="text-left p-3 pl-5">Item</th>
                <th className="text-left p-3">Category</th>
                <th className="text-center p-3">Quantity</th>
                <th className="text-center p-3">Min Stock</th>
                <th className="text-right p-3">Cost/Unit</th>
                <th className="text-center p-3">Last Restocked</th>
                <th className="text-right p-3 pr-5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const isLow = item.quantity <= item.minStock;
                return (
                  <tr key={item._id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="p-3 pl-5">
                      <div className="flex items-center gap-2">
                        <Package className={cn('w-4 h-4', isLow ? 'text-red-400' : 'text-emerald-600')} />
                        <span className="text-sm font-medium text-slate-900">{item.name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-xs text-slate-500">{item.category}</td>
                    <td className="p-3 text-center">
                      <Badge variant="outline" className={cn('text-xs', isLow ? 'border-red-200 text-red-400' : 'border-slate-200 text-slate-700')}>
                        {item.quantity} {item.unit}
                      </Badge>
                    </td>
                    <td className="p-3 text-center text-xs text-slate-500">{item.minStock} {item.unit}</td>
                    <td className="p-3 text-right text-xs text-slate-600">₹{item.costPerUnit}</td>
                    <td className="p-3 text-center text-xs text-slate-500">{item.lastRestocked}</td>
                    <td className="p-3 pr-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-900" onClick={() => openEdit(item)}>
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-400" onClick={() => handleDelete(item._id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Item' : 'Add Item'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-500">Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-slate-50 border-slate-200 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Category</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="bg-slate-50 border-slate-200 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Quantity</Label>
                <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} className="bg-slate-50 border-slate-200 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Unit</Label>
                <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="bg-slate-50 border-slate-200 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Min Stock</Label>
                <Input type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: Number(e.target.value) })} className="bg-slate-50 border-slate-200 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Cost/Unit (₹)</Label>
                <Input type="number" value={form.costPerUnit} onChange={(e) => setForm({ ...form, costPerUnit: Number(e.target.value) })} className="bg-slate-50 border-slate-200 text-sm mt-1" />
              </div>
            </div>
            <Button onClick={handleSave} className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600">
              {editing ? 'Update Item' : 'Add Item'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
