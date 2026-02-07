import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

interface UserEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: any;
    type: "doctor" | "therapist" | "patient" | null;
    onSuccess: () => void;
}

export function UserEditModal({ isOpen, onClose, user, type, onSuccess }: UserEditModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<any>({});

    useEffect(() => {
        if (user) {
            setFormData({ ...user });
        }
    }, [user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({
            ...prev,
            [name]: name === "yearsExperience" || name === "age" ? Number(value) : value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!type || !user?.id) return;

        setLoading(true);
        try {
            const token = localStorage.getItem("accessToken");
            const res = await fetch(`${API_BASE_URL}/api/user/${type}/${user.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} updated successfully`);
                onSuccess();
                onClose();
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to update user");
            }
        } catch (error) {
            toast.error("An error occurred while updating");
            console.error("Update error:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!user || !type) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Edit {type.charAt(0).toUpperCase() + type.slice(1)}</DialogTitle>
                    <DialogDescription>
                        Update the details for {user.fullName || "this user"}.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="fullName">Full Name</Label>
                            <Input
                                id="fullName"
                                name="fullName"
                                value={formData.fullName || ""}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                value={formData.email || ""}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        {type === "patient" ? (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="phoneNumber">Phone Number</Label>
                                    <Input
                                        id="phoneNumber"
                                        name="phoneNumber"
                                        value={formData.phoneNumber || ""}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="age">Age</Label>
                                    <Input
                                        id="age"
                                        name="age"
                                        type="number"
                                        value={formData.age || ""}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="gender">Gender</Label>
                                    <Input
                                        id="gender"
                                        name="gender"
                                        value={formData.gender || ""}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="patientId">Patient ID</Label>
                                    <Input
                                        id="patientId"
                                        name="patientId"
                                        value={formData.patientId || ""}
                                        onChange={handleChange}
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="space-y-2 col-span-2">
                                    <Label htmlFor="specialization">Specialization</Label>
                                    <Input
                                        id="specialization"
                                        name="specialization"
                                        value={formData.specialization || ""}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="qualification">Qualification</Label>
                                    <Input
                                        id="qualification"
                                        name="qualification"
                                        value={formData.qualification || ""}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="yearsExperience">Experience (Years)</Label>
                                    <Input
                                        id="yearsExperience"
                                        name="yearsExperience"
                                        type="number"
                                        value={formData.yearsExperience || ""}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label htmlFor="clinic">Clinic / Hospital</Label>
                                    <Input
                                        id="clinic"
                                        name="clinic"
                                        value={formData.clinic || ""}
                                        onChange={handleChange}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="gap-2">
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
