import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/common/input";
import { Label } from "@/components/common/label";
import { Button } from "@/components/common/button";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, ShieldCheck, Mail, Lock, Loader2, ArrowLeft, Building2 } from "lucide-react";
import { useBranches } from "@/hooks/useBranches";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

const roles = [
  { value: "ADMIN", label: "System Admin" },
  { value: "ADMIN_DOCTOR", label: "Admin Doctor" },
  { value: "DOCTOR", label: "Practicing Doctor" },
  { value: "THERAPIST", label: "Clinical Therapist" },
  { value: "PATIENT", label: "Patient" },
  { value: "PHARMACIST", label: "Pharmacist" },
];

export default function CreateUser() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "", fullName: "", role: "PATIENT", branchId: "" });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { branches } = useBranches();

  if (role !== "ADMIN_DOCTOR" && role !== "ADMIN") {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
          <ShieldCheck className="w-12 h-12 text-attention/40" />
          <h2 className="text-xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground">You do not have administrative privileges to create users.</p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </AppLayout>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const setRole = (val: string) => {
    setForm({ ...form, role: val });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create user");
      } else {
        setSuccess("User identity created successfully!");
        setForm({ email: "", password: "", fullName: "", role: "PATIENT", branchId: "" });
      }
    } catch (err) {
      setError("Network connectivity error. Please try again.");
    }
    setLoading(false);
  };

  return (
    <AppLayout>
      <div className="container max-w-4xl mx-auto px-4 py-8 md:py-12">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full hover:bg-secondary"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Button>
          <PageHeader
            title="User Provisioning"
            subtitle="Securely onboard new medical staff and patient identities."
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

          {/* Information Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="bg-primary/5 border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-primary" />
                  Account Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Every user requires a unique email and strong password (min 8 characters).
                </p>
                <div className="p-3 bg-background rounded-xl border border-border/50">
                  <p className="text-[11px] font-bold text-primary uppercase tracking-widest mb-1">Privileges</p>
                  <p className="text-xs text-muted-foreground">
                    Role-based access controls will be applied immediately based on your selection.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Creation Form */}
          <div className="lg:col-span-8">
            <Card className="shadow-elevated border-border/60">
              <CardHeader className="bg-secondary/10 border-b border-border/50">
                <CardTitle>Account Identification</CardTitle>
                <CardDescription>Primary credentials and identity details</CardDescription>
              </CardHeader>
              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-6 pt-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                        Email Address
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="user@iwis-health.com"
                        value={form.email}
                        onChange={handleChange}
                        required
                        className="h-12 bg-secondary/30 border-secondary focus:bg-background transition-all rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password" title="Password" className="flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                        Initial Password
                      </Label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        placeholder="••••••••"
                        value={form.password}
                        onChange={handleChange}
                        required
                        minLength={8}
                        className="h-12 bg-secondary/30 border-secondary focus:bg-background transition-all rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="flex items-center gap-2">
                      <UserPlus className="w-3.5 h-3.5 text-muted-foreground" />
                      Full Name
                    </Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      placeholder="Dr. Sarah Smith"
                      value={form.fullName}
                      onChange={handleChange}
                      className="h-12 bg-secondary/30 border-secondary focus:bg-background transition-all rounded-xl"
                    />
                  </div>

                  <div className="pt-8 mt-8 border-t border-border/50 space-y-6">
                    <div className="flex flex-col gap-1">
                      <h3 className="text-lg font-bold text-foreground">Clinical Assignment</h3>
                      <p className="text-sm text-muted-foreground">Designate the branch and access level for this identity</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="branchId" className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                          Assigned Branch
                        </Label>
                        <Select value={form.branchId} onValueChange={(val) => setForm({ ...form, branchId: val })}>
                          <SelectTrigger className="h-12 bg-secondary/30 border-secondary focus:bg-background transition-all rounded-xl">
                            <SelectValue placeholder="Select clinical branch" />
                          </SelectTrigger>
                          <SelectContent>
                            {branches.map((b: any) => (
                              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="role" className="flex items-center gap-2">
                          <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" />
                          Access Level (Role)
                        </Label>
                        <Select value={form.role} onValueChange={setRole}>
                          <SelectTrigger className="h-12 bg-secondary/30 border-secondary focus:bg-background transition-all rounded-xl">
                            <SelectValue placeholder="Assign a role" />
                          </SelectTrigger>
                          <SelectContent>
                            {roles.map((r) => (
                              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Status Messages */}
                  <div className="min-h-[24px]">
                    {error && <div className="text-attention text-sm font-bold animate-shake">{error}</div>}
                    {success && <div className="text-wellness text-sm font-bold animate-fade-in">{success}</div>}
                  </div>
                </CardContent>

                <CardFooter className="bg-secondary/5 border-t border-border/50 p-6 flex justify-end">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-12 px-8 text-lg font-bold rounded-xl shadow-lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Provisioning...
                      </>
                    ) : (
                      "Create Identity"
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
