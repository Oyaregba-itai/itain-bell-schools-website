import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Plus, Trash2 } from "lucide-react";

interface Guardian {
  name: string;
  email: string;
  phone: string;
  relationship: string;
}

const emptyGuardian = (): Guardian => ({ name: "", email: "", phone: "", relationship: "" });

const AdmissionsPage = () => {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    child_full_name: "",
    other_names: "",
    date_of_birth: "",
    gender: "",
    class_applying_for: "",
    school_section: "",
    address: "",
    previous_school: "",
    additional_info: "",
  });
  const [guardians, setGuardians] = useState<Guardian[]>([emptyGuardian()]);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const setGuardian = (i: number, key: keyof Guardian, value: string) =>
    setGuardians((gs) => gs.map((g, idx) => idx === i ? { ...g, [key]: value } : g));

  const addGuardian = () => setGuardians((gs) => [...gs, emptyGuardian()]);
  const removeGuardian = (i: number) => setGuardians((gs) => gs.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const primary = guardians[0];
      const { error: err } = await supabase.from("admission_applications").insert([
        {
          child_full_name:    form.child_full_name,
          other_names:        form.other_names        || null,
          date_of_birth:      form.date_of_birth      || null,
          gender:             form.gender             || null,
          class_applying_for: form.class_applying_for || null,
          school_section:     form.school_section     || null,
          parent_name:        primary.name,
          parent_email:       primary.email,
          parent_phone:       primary.phone           || null,
          address:            form.address            || null,
          previous_school:    form.previous_school    || null,
          additional_info:    form.additional_info    || null,
          guardians:          guardians,
        },
      ]);
      if (err) throw err;
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Submission failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const primaryEmail = guardians[0]?.email || "";
  const canSubmit = !loading && !!form.child_full_name && !!form.school_section && !!guardians[0]?.name && !!guardians[0]?.email;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container max-w-2xl py-24">
        {submitted ? (
          <div className="text-center py-20">
            <CheckCircle2 className="w-16 h-16 text-secondary mx-auto mb-5" />
            <h2 className="text-3xl font-heading text-foreground mb-3">Application Received!</h2>
            <p className="text-muted-foreground mb-2 max-w-md mx-auto">
              Thank you for applying to Itain‑Bell Schools. We will review your application
              and reach out to <strong>{primaryEmail}</strong> within <strong>5 working days</strong>.
            </p>
            <p className="text-sm text-muted-foreground mb-8">
              Please check your email (including spam/junk) for a confirmation message.
            </p>
            <Button onClick={() => navigate("/")} variant="outline">Back to Home</Button>
          </div>
        ) : (
          <>
            <div className="mb-10">
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
                2025/2026 Admissions Open
              </span>
              <h1 className="text-3xl md:text-4xl font-heading text-foreground mb-2">
                Student Admission Application
              </h1>
              <p className="text-muted-foreground">
                Complete the form below to apply for a place at Itain‑Bell Schools.
                Fields marked <span className="text-destructive">*</span> are required.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Child details */}
              <section className="bg-card rounded-2xl p-6 shadow-card space-y-4">
                <h2 className="font-heading text-foreground text-lg border-b border-border pb-2">
                  Child&apos;s Details
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>First / Last Name <span className="text-destructive">*</span></Label>
                    <Input required value={form.child_full_name} onChange={set("child_full_name")} placeholder="First and last name" />
                  </div>
                  <div>
                    <Label>Other Names <span className="text-muted-foreground text-xs">(middle name, etc.)</span></Label>
                    <Input value={form.other_names} onChange={set("other_names")} placeholder="Optional" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date of Birth</Label>
                    <Input type="date" value={form.date_of_birth} onChange={set("date_of_birth")} />
                  </div>
                  <div>
                    <Label>Gender</Label>
                    <Select value={form.gender} onValueChange={(v) => setForm((f) => ({ ...f, gender: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>School Section <span className="text-destructive">*</span></Label>
                    <Select value={form.school_section} onValueChange={(v) => setForm((f) => ({ ...f, school_section: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="creche">Crèche</SelectItem>
                        <SelectItem value="nursery">Nursery</SelectItem>
                        <SelectItem value="primary">Primary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Class Applying For</Label>
                    <Input value={form.class_applying_for} onChange={set("class_applying_for")} placeholder="e.g. Primary 1, Nursery 2" />
                  </div>
                </div>
                <div>
                  <Label>Previous School (if any)</Label>
                  <Input value={form.previous_school} onChange={set("previous_school")} placeholder="Name of previous school" />
                </div>
              </section>

              {/* Parent / Guardian details */}
              <section className="bg-card rounded-2xl p-6 shadow-card space-y-4">
                <h2 className="font-heading text-foreground text-lg border-b border-border pb-2">
                  Parent / Guardian Details
                </h2>
                <p className="text-xs text-muted-foreground">Add all parents or guardians. The first entry is the primary contact.</p>

                {guardians.map((g, i) => (
                  <div key={i} className="border border-border rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">
                        {i === 0 ? "Primary Contact" : `Guardian ${i + 1}`}
                      </span>
                      {i > 0 && (
                        <button type="button" onClick={() => removeGuardian(i)} className="text-destructive hover:opacity-70 transition-opacity">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Full Name <span className="text-destructive">*</span></Label>
                        <Input
                          required={i === 0}
                          value={g.name}
                          onChange={e => setGuardian(i, "name", e.target.value)}
                          placeholder="Full name"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Relationship</Label>
                        <Select value={g.relationship} onValueChange={v => setGuardian(i, "relationship", v)}>
                          <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mother">Mother</SelectItem>
                            <SelectItem value="father">Father</SelectItem>
                            <SelectItem value="guardian">Guardian</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Email <span className="text-destructive">*</span></Label>
                        <Input
                          required={i === 0}
                          type="email"
                          value={g.email}
                          onChange={e => setGuardian(i, "email", e.target.value)}
                          placeholder="email@example.com"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Phone Number</Label>
                        <Input
                          value={g.phone}
                          onChange={e => setGuardian(i, "phone", e.target.value)}
                          placeholder="+234 xxx xxx xxxx"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <Button type="button" variant="outline" size="sm" className="gap-2 w-full" onClick={addGuardian}>
                  <Plus size={14} /> Add Another Parent / Guardian
                </Button>

                <div>
                  <Label>Home Address</Label>
                  <Textarea value={form.address} onChange={set("address")} placeholder="Full home address" rows={3} />
                </div>
              </section>

              {/* Additional info */}
              <section className="bg-card rounded-2xl p-6 shadow-card space-y-4">
                <h2 className="font-heading text-foreground text-lg border-b border-border pb-2">
                  Additional Information
                </h2>
                <Textarea
                  value={form.additional_info}
                  onChange={set("additional_info")}
                  placeholder="Anything else you'd like us to know about your child — special needs, health conditions, interests, etc."
                  rows={4}
                />
              </section>

              {error && (
                <p className="text-destructive text-sm bg-destructive/10 rounded-lg px-4 py-3">{error}</p>
              )}

              <Button type="submit" className="w-full hero-gradient py-3" disabled={!canSubmit}>
                {loading ? "Submitting Application..." : "Submit Application"}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                By submitting, you agree that we may contact you about your child&apos;s application.
              </p>
            </form>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default AdmissionsPage;
