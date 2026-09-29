import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financeClient as supabase } from "@/lib/financeApi";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Banknote,
  TrendingUp,
  Receipt,
  CreditCard,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
const fmt = (n: number) =>
  `₦${Number(n).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const NONE = "__none__"; // sentinel for "no selection" in Select components

export const StudentFeesView = () => {
  const { user, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"overview" | "fees" | "payments" | "record">(
    "overview",
  );
  const [feeForm, setFeeForm] = useState({
    name: "",
    amount: "",
    class_id: NONE,
    term_id: NONE,
    fee_type: "tuition",
    description: "",
  });
  const [payForm, setPayForm] = useState({
    student_id: "",
    fee_structure_id: NONE,
    amount: "",
    payment_date: new Date().toISOString().split("T")[0],
    payment_method: "cash",
    receipt_number: "",
    notes: "",
  });
  const [editingFee, setEditingFee] = useState<any | null>(null);

  const { data: terms } = useQuery({
    queryKey: ["terms"],
    queryFn: async () => {
      const { data } = await supabase
        .from("terms")
        .select("*")
        .order("created_at");
      return data || [];
    },
  });
  const { data: classes } = useQuery({
    queryKey: ["all-classes-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("classes")
        .select("id, name")
        .order("name");
      return data || [];
    },
  });
  const { data: students } = useQuery({
    queryKey: ["all-students-fin"],
    queryFn: async () => {
      const { data } = await supabase
        .from("students")
        .select("id, full_name, class_id")
        .order("full_name");
      return data || [];
    },
  });

  const { data: feeStructures } = useQuery({
    queryKey: ["fee-structures"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fee_structures")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = data || [];
      const classIds = [
        ...new Set(rows.map((r: any) => r.class_id).filter(Boolean)),
      ];
      const termIds = [
        ...new Set(rows.map((r: any) => r.term_id).filter(Boolean)),
      ];
      const [cRes, tRes] = await Promise.all([
        classIds.length > 0
          ? supabase
              .from("classes")
              .select("id, name")
              .in("id", classIds as string[])
          : { data: [] },
        termIds.length > 0
          ? supabase
              .from("terms")
              .select("id, name")
              .in("id", termIds as string[])
          : { data: [] },
      ]);
      const cMap: Record<string, string> = {};
      const tMap: Record<string, string> = {};
      (cRes.data || []).forEach((c: any) => {
        cMap[c.id] = c.name;
      });
      (tRes.data || []).forEach((t: any) => {
        tMap[t.id] = t.name;
      });
      return rows.map((r: any) => ({
        ...r,
        className: cMap[r.class_id] || "All classes",
        termName: tMap[r.term_id] || "All terms",
      }));
    },
  });

  const {
    data: payments,
    error: paymentError,
    isLoading: paymentsLoading,
  } = useQuery({
    queryKey: ["all-payments"],
    queryFn: async () => {
      const rows = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase
          .from("payments")
          .select("*")
          .order("payment_date", { ascending: false })
          .order("id")
          .range(offset, offset + 499);
        if (error) throw error;
        rows.push(...data);
        if (data.length < 500) break;
      }
      const studentIds = [
        ...new Set(rows.map((r: any) => r.student_id).filter(Boolean)),
      ];
      const feeIds = [
        ...new Set(rows.map((r: any) => r.fee_structure_id).filter(Boolean)),
      ];
      const [sRes, fRes] = await Promise.all([
        studentIds.length > 0
          ? supabase
              .from("students")
              .select("id, full_name")
              .in("id", studentIds as string[])
          : { data: [] },
        feeIds.length > 0
          ? supabase
              .from("fee_structures")
              .select("id, name")
              .in("id", feeIds as string[])
          : { data: [] },
      ]);
      const sMap: Record<string, string> = {};
      const fMap: Record<string, string> = {};
      (sRes.data || []).forEach((s: any) => {
        sMap[s.id] = s.full_name;
      });
      (fRes.data || []).forEach((f: any) => {
        fMap[f.id] = f.name;
      });
      return rows.map((r: any) => ({
        ...r,
        studentName: sMap[r.student_id] || "—",
        feeName: fMap[r.fee_structure_id] || "—",
      }));
    },
  });

  const totalCollected = (payments || []).reduce(
    (s: number, p: any) => s + Number(p.amount),
    0,
  );

  const addFee = useMutation({
    mutationFn: async () => {
      const amt = parseFloat(feeForm.amount);
      if (isNaN(amt) || amt <= 0)
        throw new Error("Please enter a valid amount");
      const { error } = await supabase.from("fee_structures").insert([
        {
          name: feeForm.name.trim(),
          amount: amt,
          class_id: feeForm.class_id === NONE ? null : feeForm.class_id,
          term_id: feeForm.term_id === NONE ? null : feeForm.term_id,
          fee_type: feeForm.fee_type,
          description: feeForm.description.trim() || null,
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Fee structure added" });
      queryClient.invalidateQueries({ queryKey: ["fee-structures"] });
      setFeeForm({
        name: "",
        amount: "",
        class_id: NONE,
        term_id: NONE,
        fee_type: "tuition",
        description: "",
      });
    },
    onError: (err: Error) =>
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      }),
  });

  const updateFee = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("fee_structures")
        .update({
          name: editingFee.name,
          amount: parseFloat(editingFee.amount),
          fee_type: editingFee.fee_type,
          description: editingFee.description || null,
        })
        .eq("id", editingFee.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Fee updated" });
      queryClient.invalidateQueries({ queryKey: ["fee-structures"] });
      setEditingFee(null);
    },
    onError: (err: Error) =>
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      }),
  });

  const deleteFee = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("fee_structures")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Fee structure deleted" });
      queryClient.invalidateQueries({ queryKey: ["fee-structures"] });
    },
    onError: (err: Error) =>
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      }),
  });

  const recordPayment = useMutation({
    mutationFn: async () => {
      const amt = parseFloat(payForm.amount);
      if (isNaN(amt) || amt <= 0)
        throw new Error("Please enter a valid amount");
      if (!payForm.student_id) throw new Error("Please select a student");
      const { error } = await supabase.from("payments").insert([
        {
          student_id: payForm.student_id,
          fee_structure_id:
            payForm.fee_structure_id === NONE ? null : payForm.fee_structure_id,
          amount: amt,
          payment_date: payForm.payment_date,
          payment_method: payForm.payment_method,
          receipt_number: payForm.receipt_number.trim() || null,
          notes: payForm.notes.trim() || null,
          recorded_by: user?.id || null,
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Payment recorded successfully" });
      queryClient.invalidateQueries({ queryKey: ["school-finance"] });
      queryClient.invalidateQueries({ queryKey: ["all-payments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      setPayForm({
        student_id: "",
        fee_structure_id: NONE,
        amount: "",
        payment_date: new Date().toISOString().split("T")[0],
        payment_method: "cash",
        receipt_number: "",
        notes: "",
      });
      setTab("payments");
    },
    onError: (err: Error) =>
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      }),
  });

  const deletePayment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Payment removed; its finance record has been voided" });
      queryClient.invalidateQueries({ queryKey: ["all-payments"] });
      queryClient.invalidateQueries({ queryKey: ["school-finance"] });
    },
    onError: (err: Error) =>
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      }),
  });

  const FEE_TYPES = [
    "tuition",
    "uniform",
    "books",
    "transport",
    "exam",
    "other",
  ];
  const PAY_METHODS = ["cash", "bank_transfer", "pos", "cheque", "online"];

  const selectedFee = feeStructures?.find(
    (f: any) => f.id === payForm.fee_structure_id,
  );

  if (paymentsLoading) return <p role="status">Loading student payments…</p>;
  if (paymentError)
    return (
      <p role="alert" className="text-destructive">
        Student payments could not be loaded. Please refresh and try again.
      </p>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Banknote size={22} className="text-primary" />
        <h3 className="text-xl font-heading text-foreground">Finances</h3>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 w-fit flex-wrap">
        {(
          [
            ["overview", "Overview"],
            ["fees", "Fee Structures"],
            ["payments", "Payment History"],
            ["record", "Record Payment"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === id ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === "overview" && (
        <div className="space-y-6">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-card rounded-xl p-5 shadow-card">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center mb-3">
                <TrendingUp size={20} className="text-green-600" />
              </div>
              <p className="text-2xl font-heading text-foreground">
                {fmt(totalCollected)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Total Collected
              </p>
            </div>
            <div className="bg-card rounded-xl p-5 shadow-card">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-3">
                <Receipt size={20} className="text-blue-600" />
              </div>
              <p className="text-2xl font-heading text-foreground">
                {payments?.length || 0}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Total Payments
              </p>
            </div>
            <div className="bg-card rounded-xl p-5 shadow-card">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center mb-3">
                <CreditCard size={20} className="text-purple-600" />
              </div>
              <p className="text-2xl font-heading text-foreground">
                {feeStructures?.length || 0}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Fee Structures
              </p>
            </div>
          </div>

          {/* Recent payments */}
          <div className="bg-card rounded-xl shadow-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h4 className="font-heading font-semibold text-foreground">
                Recent Payments
              </h4>
              <button
                onClick={() => setTab("payments")}
                className="text-xs text-primary hover:underline"
              >
                View all
              </button>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Student
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Amount
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Date
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Method
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments?.slice(0, 8).map((p: any) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="p-3 font-medium text-foreground">
                      {p.studentName}
                    </td>
                    <td className="p-3 text-green-600 font-semibold">
                      {fmt(p.amount)}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(p.payment_date).toLocaleDateString("en-GB")}
                    </td>
                    <td className="p-3 text-muted-foreground capitalize">
                      {p.payment_method?.replace("_", " ")}
                    </td>
                  </tr>
                ))}
                {!payments?.length && (
                  <tr>
                    <td
                      colSpan={4}
                      className="p-8 text-center text-muted-foreground"
                    >
                      No payments recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Fee Structures ── */}
      {tab === "fees" && (
        <div className="space-y-6">
          <Dialog
            open={!!editingFee}
            onOpenChange={(open) => !open && setEditingFee(null)}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Fee Structure</DialogTitle>
              </DialogHeader>
              {editingFee && (
                <div className="space-y-3">
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={editingFee.name}
                      onChange={(e) =>
                        setEditingFee({ ...editingFee, name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Amount (₦)</Label>
                    <Input
                      type="number"
                      value={editingFee.amount}
                      onChange={(e) =>
                        setEditingFee({ ...editingFee, amount: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Fee Type</Label>
                    <Select
                      value={editingFee.fee_type}
                      onValueChange={(v) =>
                        setEditingFee({ ...editingFee, fee_type: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FEE_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={editingFee.description || ""}
                      onChange={(e) =>
                        setEditingFee({
                          ...editingFee,
                          description: e.target.value,
                        })
                      }
                      rows={2}
                    />
                  </div>
                  <Button
                    className="w-full hero-gradient"
                    onClick={() => updateFee.mutate()}
                    disabled={updateFee.isPending}
                  >
                    {updateFee.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Add fee form */}
          <div className="bg-card rounded-xl p-5 shadow-card space-y-4">
            <h4 className="font-heading font-semibold text-foreground">
              Add Fee Structure
            </h4>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Name *</Label>
                <Input
                  value={feeForm.name}
                  onChange={(e) =>
                    setFeeForm({ ...feeForm, name: e.target.value })
                  }
                  placeholder="e.g. Lent Term 2026 Tuition"
                />
              </div>
              <div>
                <Label>Amount (₦) *</Label>
                <Input
                  type="number"
                  value={feeForm.amount}
                  onChange={(e) =>
                    setFeeForm({ ...feeForm, amount: e.target.value })
                  }
                  placeholder="50000"
                />
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <Label>Class (optional)</Label>
                <Select
                  value={feeForm.class_id}
                  onValueChange={(v) => setFeeForm({ ...feeForm, class_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>All classes</SelectItem>
                    {classes?.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Term (optional)</Label>
                <Select
                  value={feeForm.term_id}
                  onValueChange={(v) => setFeeForm({ ...feeForm, term_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All terms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>All terms</SelectItem>
                    {terms?.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fee Type</Label>
                <Select
                  value={feeForm.fee_type}
                  onValueChange={(v) => setFeeForm({ ...feeForm, fee_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FEE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              className="hero-gradient gap-2"
              onClick={() => addFee.mutate()}
              disabled={addFee.isPending || !feeForm.name || !feeForm.amount}
            >
              <Plus size={16} />{" "}
              {addFee.isPending ? "Adding..." : "Add Fee Structure"}
            </Button>
          </div>

          <div className="bg-card rounded-xl shadow-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Name
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Amount
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Type
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Class
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Term
                  </th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {feeStructures?.map((f: any) => (
                  <tr key={f.id} className="border-t border-border">
                    <td className="p-3 font-medium text-foreground">
                      {f.name}
                    </td>
                    <td className="p-3 text-green-700 font-semibold">
                      {fmt(f.amount)}
                    </td>
                    <td className="p-3 text-muted-foreground capitalize">
                      {f.fee_type}
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">
                      {f.className}
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">
                      {f.termName}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-3">
                        <button
                          onClick={() => setEditingFee({ ...f })}
                          className="text-muted-foreground hover:text-primary"
                        >
                          <Pencil size={14} />
                        </button>
                        {isSuperAdmin && (
                          <button
                            onClick={() => {
                              if (confirm("Delete this fee structure?"))
                                deleteFee.mutate(f.id);
                            }}
                            className="text-destructive hover:opacity-70"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!feeStructures?.length && (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-8 text-center text-muted-foreground"
                    >
                      No fee structures yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Payment History ── */}
      {tab === "payments" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {payments?.length || 0} payments — total {fmt(totalCollected)}
            </p>
            <Button
              size="sm"
              className="hero-gradient gap-2"
              onClick={() => setTab("record")}
            >
              <Plus size={14} /> Record Payment
            </Button>
          </div>
          <div className="bg-card rounded-xl shadow-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Student
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Fee
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Amount
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Date
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Method
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Receipt #
                  </th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {payments?.map((p: any) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="p-3 font-medium text-foreground">
                      {p.studentName}
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">
                      {p.feeName}
                    </td>
                    <td className="p-3 text-green-700 font-bold">
                      {fmt(p.amount)}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(p.payment_date).toLocaleDateString("en-GB")}
                    </td>
                    <td className="p-3 text-muted-foreground capitalize">
                      {p.payment_method?.replace("_", " ")}
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">
                      {p.receipt_number || "—"}
                    </td>
                    <td className="p-3">
                      {isSuperAdmin && (
                        <button
                          onClick={() => {
                            if (confirm("Delete this payment record?"))
                              deletePayment.mutate(p.id);
                          }}
                          className="text-destructive hover:opacity-70"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {!payments?.length && (
                  <tr>
                    <td
                      colSpan={7}
                      className="p-8 text-center text-muted-foreground"
                    >
                      No payments recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Record Payment ── */}
      {tab === "record" && (
        <div className="max-w-2xl">
          <div className="bg-card rounded-xl p-6 shadow-card space-y-4">
            <h4 className="font-heading font-semibold text-foreground">
              Record a Payment
            </h4>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Student *</Label>
                <Select
                  value={payForm.student_id}
                  onValueChange={(v) =>
                    setPayForm({ ...payForm, student_id: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students?.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fee Structure (optional)</Label>
                <Select
                  value={payForm.fee_structure_id}
                  onValueChange={(v) => {
                    const matched = feeStructures?.find((f: any) => f.id === v);
                    setPayForm({
                      ...payForm,
                      fee_structure_id: v,
                      amount: matched ? String(matched.amount) : payForm.amount,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select fee or leave blank" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>
                      — Custom / no fee selected —
                    </SelectItem>
                    {feeStructures?.map((f: any) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name} · {fmt(f.amount)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Amount (₦) *</Label>
                <Input
                  type="number"
                  value={payForm.amount}
                  onChange={(e) =>
                    setPayForm({ ...payForm, amount: e.target.value })
                  }
                  placeholder="50000"
                />
              </div>
              <div>
                <Label>Payment Date *</Label>
                <Input
                  type="date"
                  value={payForm.payment_date}
                  onChange={(e) =>
                    setPayForm({ ...payForm, payment_date: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Payment Method</Label>
                <Select
                  value={payForm.payment_method}
                  onValueChange={(v) =>
                    setPayForm({ ...payForm, payment_method: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAY_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m
                          .replace("_", " ")
                          .replace(/\b\w/g, (c) => c.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Receipt Number</Label>
                <Input
                  value={payForm.receipt_number}
                  onChange={(e) =>
                    setPayForm({ ...payForm, receipt_number: e.target.value })
                  }
                  placeholder="e.g. RCP-001"
                />
              </div>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                value={payForm.notes}
                onChange={(e) =>
                  setPayForm({ ...payForm, notes: e.target.value })
                }
                placeholder="Any additional notes..."
                rows={2}
              />
            </div>
            <Button
              className="w-full hero-gradient gap-2 h-11"
              onClick={() => recordPayment.mutate()}
              disabled={
                recordPayment.isPending ||
                !payForm.student_id ||
                !payForm.amount
              }
            >
              <Receipt size={16} />{" "}
              {recordPayment.isPending ? "Recording..." : "Record Payment"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
