import { useState, useEffect, useCallback } from "react";
import { useEmployeeProfile, useUpdateProfile } from "@/api/hooks/useTechPortal.ts";
import { useAuth } from "@/features/auth/useAuth.ts";
import { Card, CardContent } from "@/components/ui/Card.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Input } from "@/components/ui/Input.tsx";
import { Skeleton } from "@/components/ui/Skeleton.tsx";
import { toastSuccess, toastError } from "@/components/ui/Toast.tsx";

// ── Constants ──────────────────────────────────────────────────────────────

const APP_VERSION = "2.9.4";

// ── Toggle Switch ──────────────────────────────────────────────────────────

function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div
      className="flex items-center justify-between py-3 cursor-pointer"
      onClick={() => onChange(!checked)}
    >
      <div className="flex-1 min-w-0 mr-4">
        <p className="text-base font-medium text-text-primary">{label}</p>
        {description && (
          <p className="text-sm text-text-muted mt-0.5">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={(e) => {
          e.stopPropagation();
          onChange(!checked);
        }}
        className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
          checked ? "bg-cta" : "bg-bg-muted"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-6" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

// ── Loading Skeleton ───────────────────────────────────────────────────────

function SettingsPageSkeleton() {
  return (
    <div className="space-y-4 p-4 max-w-2xl mx-auto">
      {/* Profile card skeleton */}
      <Skeleton className="h-72 w-full rounded-xl" />
      {/* Appearance card skeleton */}
      <Skeleton className="h-24 w-full rounded-xl" />
      {/* Notifications card skeleton */}
      <Skeleton className="h-48 w-full rounded-xl" />
      {/* App info card skeleton */}
      <Skeleton className="h-28 w-full rounded-xl" />
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export function TechSettingsPage() {
  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading } = useEmployeeProfile();
  const updateProfile = useUpdateProfile();

  // ── Profile form state ─────────────────────────────────────────────────
  const [phone, setPhone] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [homeCity, setHomeCity] = useState("");
  const [homeState, setHomeState] = useState("");
  const [homePostalCode, setHomePostalCode] = useState("");
  const [profileDirty, setProfileDirty] = useState(false);

  // Initialize form when profile loads
  useEffect(() => {
    if (profile) {
      setPhone(profile.phone || "");
    }
  }, [profile]);

  // Track dirty state
  const markDirty = useCallback(() => {
    setProfileDirty(true);
  }, []);

  // ── Dark mode state ────────────────────────────────────────────────────
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("theme") === "dark";
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  // ── Notification preferences (localStorage) ───────────────────────────
  const [emailNotifs, setEmailNotifs] = useState(() => {
    return localStorage.getItem("pref_email_notifs") !== "false";
  });
  const [smsNotifs, setSmsNotifs] = useState(() => {
    return localStorage.getItem("pref_sms_notifs") !== "false";
  });
  const [pushNotifs, setPushNotifs] = useState(() => {
    return localStorage.getItem("pref_push_notifs") !== "false";
  });

  const handleEmailNotifsChange = useCallback((val: boolean) => {
    setEmailNotifs(val);
    localStorage.setItem("pref_email_notifs", String(val));
    toastSuccess(val ? "Email notifications on" : "Email notifications off");
  }, []);

  const handleSmsNotifsChange = useCallback((val: boolean) => {
    setSmsNotifs(val);
    localStorage.setItem("pref_sms_notifs", String(val));
    toastSuccess(val ? "SMS notifications on" : "SMS notifications off");
  }, []);

  const handlePushNotifsChange = useCallback((val: boolean) => {
    setPushNotifs(val);
    localStorage.setItem("pref_push_notifs", String(val));
    toastSuccess(val ? "Push notifications on" : "Push notifications off");
  }, []);

  // ── Save profile ──────────────────────────────────────────────────────
  const handleSaveProfile = useCallback(async () => {
    try {
      await updateProfile.mutateAsync({
        phone: phone.trim() || undefined,
        home_address: homeAddress.trim() || undefined,
        home_city: homeCity.trim() || undefined,
        home_state: homeState.trim() || undefined,
        home_postal_code: homePostalCode.trim() || undefined,
      });
      setProfileDirty(false);
    } catch {
      // Error toast is handled by the mutation hook
    }
  }, [phone, homeAddress, homeCity, homeState, homePostalCode, updateProfile]);

  // ── Derived ───────────────────────────────────────────────────────────
  const displayName = user
    ? `${user.first_name} ${user.last_name}`
    : profile
      ? `${profile.first_name} ${profile.last_name}`
      : "Technician";

  const displayEmail = user?.email || profile?.email || "";

  // ── Render ────────────────────────────────────────────────────────────

  if (profileLoading) return <SettingsPageSkeleton />;

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4 pb-24">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl">⚙️</span>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
          <p className="text-sm text-text-muted">Your profile and preferences</p>
        </div>
      </div>

      {/* ── Profile Section ────────────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2 mb-4">
            <span className="text-2xl">👤</span> Profile
          </h2>

          {/* Display name */}
          <div className="flex items-center gap-3 mb-5 p-3 rounded-xl bg-bg-muted">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl flex-shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold text-text-primary truncate">
                {displayName}
              </p>
              <p className="text-sm text-text-muted truncate">{displayEmail}</p>
            </div>
          </div>

          {/* Email (read-only) */}
          <div className="mb-4">
            <label className="text-sm font-medium text-text-secondary mb-1.5 block">
              Email (read-only)
            </label>
            <Input
              value={displayEmail}
              disabled
              className="h-12 text-base rounded-xl opacity-60"
            />
          </div>

          {/* Phone (editable) */}
          <div className="mb-4">
            <label className="text-sm font-medium text-text-secondary mb-1.5 block">
              Phone Number
            </label>
            <Input
              placeholder="(555) 123-4567"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                markDirty();
              }}
              type="tel"
              className="h-12 text-base rounded-xl"
            />
          </div>

          {/* Address fields (editable) */}
          <div className="mb-4">
            <label className="text-sm font-medium text-text-secondary mb-1.5 block">
              Street Address
            </label>
            <Input
              placeholder="123 Main St"
              value={homeAddress}
              onChange={(e) => {
                setHomeAddress(e.target.value);
                markDirty();
              }}
              className="h-12 text-base rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-sm font-medium text-text-secondary mb-1.5 block">
                City
              </label>
              <Input
                placeholder="City"
                value={homeCity}
                onChange={(e) => {
                  setHomeCity(e.target.value);
                  markDirty();
                }}
                className="h-12 text-base rounded-xl"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary mb-1.5 block">
                State
              </label>
              <Input
                placeholder="TX"
                value={homeState}
                onChange={(e) => {
                  setHomeState(e.target.value);
                  markDirty();
                }}
                className="h-12 text-base rounded-xl"
                maxLength={2}
              />
            </div>
          </div>

          <div className="mb-5">
            <label className="text-sm font-medium text-text-secondary mb-1.5 block">
              Zip Code
            </label>
            <Input
              placeholder="78701"
              value={homePostalCode}
              onChange={(e) => {
                setHomePostalCode(e.target.value);
                markDirty();
              }}
              className="h-12 text-base rounded-xl"
              maxLength={10}
            />
          </div>

          {/* Save Button */}
          <Button
            size="lg"
            onClick={handleSaveProfile}
            disabled={!profileDirty || updateProfile.isPending}
            className="w-full h-14 text-lg rounded-xl font-bold"
          >
            {updateProfile.isPending ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">🔄</span> Saving...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span>💾</span> Save Profile
              </span>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* ── Appearance Section ─────────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2 mb-2">
            <span className="text-2xl">🎨</span> Appearance
          </h2>

          <ToggleSwitch
            checked={darkMode}
            onChange={setDarkMode}
            label="Dark Mode"
            description="Switch between light and dark themes"
          />
        </CardContent>
      </Card>

      {/* ── Notifications Section ──────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2 mb-2">
            <span className="text-2xl">🔔</span> Notifications
          </h2>

          <div className="divide-y divide-border">
            <ToggleSwitch
              checked={emailNotifs}
              onChange={handleEmailNotifsChange}
              label="Email Notifications"
              description="Get job updates and reminders by email"
            />
            <ToggleSwitch
              checked={smsNotifs}
              onChange={handleSmsNotifsChange}
              label="SMS Notifications"
              description="Get text messages for new jobs and schedule changes"
            />
            <ToggleSwitch
              checked={pushNotifs}
              onChange={handlePushNotifsChange}
              label="Push Notifications"
              description="Get instant alerts on your device"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── App Info Section ───────────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2 mb-3">
            <span className="text-2xl">📱</span> App Info
          </h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <span className="text-base text-text-secondary">Version</span>
              <span className="text-base font-semibold text-text-primary">
                v{APP_VERSION}
              </span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-base text-text-secondary">About</span>
              <a
                href="https://react.ecbtx.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-base font-medium text-primary hover:text-primary/80 flex items-center gap-1"
              >
                Mac Service Platform <span>↗</span>
              </a>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-base text-text-secondary">Role</span>
              <span className="text-base font-semibold text-text-primary capitalize">
                {user?.role || "Technician"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
