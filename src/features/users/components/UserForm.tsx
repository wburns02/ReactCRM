import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button.tsx";
import { Input } from "@/components/ui/Input.tsx";
import { Label } from "@/components/ui/Label.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from "@/components/ui/Dialog.tsx";
import { RoleSelector } from "./RoleSelector.tsx";
import type {
  User,
  CreateUserInput,
  UpdateUserInput,
} from "@/api/types/admin.ts";

interface UserFormProps {
  user?: User | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateUserInput | UpdateUserInput) => Promise<void>;
  isLoading?: boolean;
}

export function UserForm({
  user,
  open,
  onClose,
  onSubmit,
  isLoading,
}: UserFormProps) {
  const [formData, setFormData] = useState({
    email: "",
    first_name: "",
    last_name: "",
    role: "office" as "admin" | "manager" | "technician" | "office",
    password: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        password: "",
      });
    } else {
      setFormData({
        email: "",
        first_name: "",
        last_name: "",
        role: "office",
        password: "",
      });
    }
    setErrors({});
  }, [user, open]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email address";
    }

    if (!formData.first_name) {
      newErrors.first_name = "First name is required";
    }

    if (!formData.last_name) {
      newErrors.last_name = "Last name is required";
    }

    if (!user && !formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password && formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const submitData: CreateUserInput | UpdateUserInput = user
      ? {
          email: formData.email,
          first_name: formData.first_name,
          last_name: formData.last_name,
          role: formData.role,
          ...(formData.password ? { password: formData.password } : {}),
        }
      : {
          email: formData.email,
          first_name: formData.first_name,
          last_name: formData.last_name,
          role: formData.role,
          password: formData.password,
        };

    await onSubmit(submitData);
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent size="md">
        <DialogHeader onClose={onClose}>
          {user ? "Edit User" : "Create New User"}
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) =>
                      setFormData({ ...formData, first_name: e.target.value })
                    }
                    error={!!errors.first_name}
                  />
                  {errors.first_name && (
                    <p className="text-xs text-danger mt-1">
                      {errors.first_name}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) =>
                      setFormData({ ...formData, last_name: e.target.value })
                    }
                    error={!!errors.last_name}
                  />
                  {errors.last_name && (
                    <p className="text-xs text-danger mt-1">
                      {errors.last_name}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  error={!!errors.email}
                />
                {errors.email && (
                  <p className="text-xs text-danger mt-1">{errors.email}</p>
                )}
              </div>

              <RoleSelector
                value={formData.role}
                onChange={(role) => setFormData({ ...formData, role })}
              />

              <div>
                <Label htmlFor="password">
                  {user
                    ? "New Password (leave blank to keep current)"
                    : "Password"}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  error={!!errors.password}
                  placeholder={user ? "Leave blank to keep current" : ""}
                />
                {errors.password && (
                  <p className="text-xs text-danger mt-1">{errors.password}</p>
                )}
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : user ? "Save Changes" : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
