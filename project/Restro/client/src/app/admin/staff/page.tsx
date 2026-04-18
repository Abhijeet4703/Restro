'use client';

import { useEffect, useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Shield,
  ChefHat,
  UserCheck,
  Mail,
  Phone,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface Staff {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'kitchen' | 'waiter';
  status: 'active' | 'inactive';
  joinedAt: string;
}

const roleConfig: Record<string, { label: string; color: string; icon: typeof Shield }> = {
  admin: { label: 'Admin', color: 'border-orange-200 text-orange-600', icon: Shield },
  kitchen: { label: 'Kitchen Staff', color: 'border-emerald-200 text-emerald-600', icon: ChefHat },
  waiter: { label: 'Waiter', color: 'border-blue-200 text-blue-600', icon: UserCheck },
};

const mockStaff: Staff[] = [
  { _id: '1', name: 'Rajesh Kumar', email: 'rajesh@restaurant.in', phone: '+91 98765 00001', role: 'admin', status: 'active', joinedAt: '2024-06-01' },
  { _id: '2', name: 'Sunil Verma', email: 'sunil@restaurant.in', phone: '+91 98765 00002', role: 'kitchen', status: 'active', joinedAt: '2024-08-15' },
  { _id: '3', name: 'Meena Devi', email: 'meena@restaurant.in', phone: '+91 98765 00003', role: 'kitchen', status: 'active', joinedAt: '2024-09-01' },
  { _id: '4', name: 'Arjun Singh', email: 'arjun@restaurant.in', phone: '+91 98765 00004', role: 'waiter', status: 'active', joinedAt: '2024-10-10' },
  { _id: '5', name: 'Priya Sharma', email: 'priya@restaurant.in', phone: '+91 98765 00005', role: 'waiter', status: 'inactive', joinedAt: '2024-07-20' },
];

const emptyForm = { name: '', email: '', phone: '', role: 'kitchen' as 'admin' | 'kitchen' | 'waiter', password: '' };

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>(mockStaff);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await api.get('/restaurant/staff');
        if (data?.length) setStaff(data);
      } catch {
        // Use mock
      }
    };
    fetchData();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (member: Staff) => {
    setEditing(member);
    setForm({ name: member.name, email: member.email, phone: member.phone, role: member.role, password: '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (editing) {
      try {
        await api.put(`/restaurant/staff/${editing._id}`, form);
      } catch { /* local update */ }
      setStaff((prev) =>
        prev.map((s) => (s._id === editing._id ? { ...s, name: form.name, email: form.email, phone: form.phone, role: form.role } : s))
      );
    } else {
      const newMember: Staff = {
        _id: Date.now().toString(),
        name: form.name,
        email: form.email,
        phone: form.phone,
        role: form.role,
        status: 'active',
        joinedAt: new Date().toISOString().split('T')[0],
      };
      try {
        const { data } = await api.post('/auth/register-staff', form);
        if (data?._id) newMember._id = data._id;
      } catch { /* local */ }
      setStaff((prev) => [...prev, newMember]);
    }
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/restaurant/staff/${id}`);
    } catch { /* local */ }
    setStaff((prev) => prev.filter((s) => s._id !== id));
  };

  const filtered = staff.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.role.toLowerCase().includes(search.toLowerCase())
  );

  const roleCounts = {
    admin: staff.filter((s) => s.role === 'admin').length,
    kitchen: staff.filter((s) => s.role === 'kitchen').length,
    waiter: staff.filter((s) => s.role === 'waiter').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent">
            Staff Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage your restaurant team</p>
        </div>
        <Button onClick={openCreate} className="bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600">
          <Plus className="w-4 h-4 mr-1" /> Add Staff
        </Button>
      </div>

      {/* Role Summary */}
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(roleConfig).map(([key, conf]) => {
          const Icon = conf.icon;
          return (
            <Card key={key} className="bg-white border-slate-200">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">{conf.label}</p>
                  <p className="text-lg font-bold text-slate-900">{roleCounts[key as keyof typeof roleCounts]}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search staff..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-slate-50 border-slate-200 text-sm"
        />
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((member) => {
          const rc = roleConfig[member.role];
          const RoleIcon = rc.icon;
          return (
            <Card key={member._id} className="bg-white border-slate-200 hover:bg-slate-50 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
                      <span className="text-sm font-bold text-emerald-600">
                        {member.name.split(' ').map((n) => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-slate-900">{member.name}</h3>
                      <Badge variant="outline" className={cn('text-[10px] border mt-0.5', rc.color)}>
                        <RoleIcon className="w-2.5 h-2.5 mr-1" />
                        {rc.label}
                      </Badge>
                    </div>
                  </div>
                  <Badge variant="outline" className={cn('text-[10px] border', member.status === 'active' ? 'border-emerald-200 text-emerald-400' : 'border-zinc-200 text-zinc-400')}>
                    {member.status}
                  </Badge>
                </div>

                <div className="space-y-1.5 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3 h-3" /> {member.email}
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3 h-3" /> {member.phone}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400">Joined {new Date(member.joinedAt).toLocaleDateString()}</span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-900" onClick={() => openEdit(member)}>
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-400" onClick={() => handleDelete(member._id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Staff' : 'Add Staff Member'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-slate-500">Full Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-slate-50 border-slate-200 text-sm mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-500">Email</Label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-slate-50 border-slate-200 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="bg-slate-50 border-slate-200 text-sm mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-500">Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as 'admin' | 'kitchen' | 'waiter' })}>
                  <SelectTrigger className="bg-slate-50 border-slate-200 text-sm mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="kitchen">Kitchen Staff</SelectItem>
                    <SelectItem value="waiter">Waiter</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {!editing && (
                <div>
                  <Label className="text-xs text-slate-500">Password</Label>
                  <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="bg-slate-50 border-slate-200 text-sm mt-1" />
                </div>
              )}
            </div>
            <Button onClick={handleSave} className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600">
              {editing ? 'Update' : 'Add Member'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
