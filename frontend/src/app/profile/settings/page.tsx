'use client';

import React from 'react';
import {
  Check,
  ChevronRight,
  Eye,
  Lock,
  Mail,
  MapPin,
  Megaphone,
  Monitor,
  Moon,
  Smartphone,
  Sun,
  Trash2
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { useToast } from '../../../components/ui/Toast';
import { AuthService } from '../../../services/auth.service';
import { Theme, useStore } from '../../../store/useStore';
import { AccountLayout, type NavItemId } from '../../../components/layout/AccountLayout';
import { ROUTES } from '../../../lib/routes';
import { cn } from '../../../lib/utils';
import { Seo } from '../../../components/shared/Seo';

type ToggleProps = {
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  checked: boolean;
  onChange: () => void;
};

const SettingsCard = ({
  id,
  title,
  description,
  action,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div
    id={id}
    className="rounded-3xl border border-app-color bg-white/90 dark:bg-neutral-900/70 backdrop-blur-xl shadow scroll-mt-[calc(var(--app-header-offset)+24px)]"
  >
    <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 border-b border-app-color">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
    <div className="divide-y divide-gray-100/80 dark:divide-white/10">{children}</div>
  </div>
);

const ToggleRow = ({ label, description, icon: Icon, checked, onChange }: ToggleProps) => (
  <div className="flex items-center justify-between px-6 py-5">
    <div className="flex items-center gap-4">
      <div className="h-11 w-11 rounded-2xl bg-gray-100/80 dark:bg-white/5 border border-app-color flex items-center justify-center">
        <Icon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
      </div>
      <div>
        <div className="text-sm font-semibold text-gray-900 dark:text-white">{label}</div>
        {description && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</div>
        )}
      </div>
    </div>
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" className="sr-only peer" checked={checked} onChange={onChange} />
      <span className="w-12 h-7 rounded-full bg-gray-200 dark:bg-neutral-800 border border-app-color transition-colors peer-checked:bg-blue-500" />
      <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-md transition-transform peer-checked:translate-x-5" />
    </label>
  </div>
);

const ThemeOption = ({
  value,
  label,
  theme,
  onSelect,
  previewClassName,
  previewContent,
}: {
  value: 'light' | 'dark' | 'system';
  label: string;
  theme: Theme;
  onSelect: (value: 'light' | 'dark' | 'system') => void;
  previewClassName: string;
  previewContent: React.ReactNode;
}) => (
  <label className="flex flex-col gap-3 cursor-pointer">
    <input
      type="radio"
      name="theme"
      value={value}
      checked={theme === value}
      onChange={() => onSelect(value)}
      className="sr-only peer"
    />
    <div
      className={cn(
        'relative rounded-2xl border bg-white dark:bg-neutral-900 px-4 py-3 transition',
        theme === value
          ? 'border-blue-500 ring-1 ring-blue-500/40 shadow'
          : 'border-app-color'
      )}
    >
      <div className={cn('h-20 w-full rounded-xl overflow-hidden border', previewClassName)}>
        {previewContent}
      </div>
      {theme === value && (
        <div className="absolute bottom-3 right-3 h-6 w-6 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg">
          <Check className="h-4 w-4" />
        </div>
      )}
    </div>
    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
      <span
        className={cn(
          'h-4 w-4 rounded-full border flex items-center justify-center',
          theme === value ? 'border-blue-500' : 'border-app-color'
        )}
      >
        <span className={cn('h-2 w-2 rounded-full', theme === value ? 'bg-blue-500' : 'bg-transparent')} />
      </span>
      {label}
    </div>
  </label>
);

export default function SettingsPage() {
  const { logout } = useAuth();
  const { success, error } = useToast();
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const { theme, setTheme } = useStore();
  const [activeNav, setActiveNav] = React.useState<NavItemId>('general');

  const [notificationPrefs, setNotificationPrefs] = React.useState({
    push: true,
    email: true,
    marketing: true,
  });

  const [privacyPrefs, setPrivacyPrefs] = React.useState({
    online: true,
    location: true,
  });

  const activeNotifications = Object.values(notificationPrefs).filter(Boolean).length;

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const sectionItems: Array<{ id: string; nav: NavItemId }> = [
      { id: 'notifications', nav: 'notifications' },
      { id: 'appearance', nav: 'appearance' },
      { id: 'privacy', nav: 'privacy' },
    ];

    const resolveHash = (hash: string): NavItemId => {
      switch (hash) {
        case '#notifications':
          return 'notifications';
        case '#appearance':
          return 'appearance';
        case '#privacy':
          return 'privacy';
        default:
          return 'general';
      }
    };

    const getHeaderOffset = () => {
      const raw = getComputedStyle(document.documentElement).getPropertyValue('--app-header-offset');
      const parsed = Number.parseFloat(raw);
      return Number.isNaN(parsed) ? 80 : parsed;
    };

    const updateActiveNav = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      const headerOffset = getHeaderOffset();
      const topOffset = headerOffset + 28;
      let current: NavItemId = 'general';

      sectionItems.forEach(({ id, nav }) => {
        const el = document.getElementById(id);
        if (!el) return;
        const top = el.getBoundingClientRect().top + scrollTop;
        if (scrollTop + topOffset >= top - 4) {
          current = nav;
        }
      });

      setActiveNav(current);
    };

    const handleHashChange = () => {
      setActiveNav(resolveHash(window.location.hash));
      requestAnimationFrame(updateActiveNav);
      window.setTimeout(updateActiveNav, 150);
    };

    handleHashChange();
    window.addEventListener('scroll', updateActiveNav, { passive: true });
    window.addEventListener('resize', updateActiveNav);
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('scroll', updateActiveNav);
      window.removeEventListener('resize', updateActiveNav);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  return (
    <>
      <Seo title="Settings" noindex />
      <AccountLayout
        title="Settings"
        description="Manage your account preferences, notification settings, and application defaults here."
        activeNav={activeNav}
        showBreadcrumbs={false}
        breadcrumb={[
          { label: 'Home', href: ROUTES.HOME },
          { label: 'Settings' },
        ]}
      >
        <div className="space-y-6">
          <SettingsCard
            id="notifications"
            title="Notifications"
            description="Choose how and when you want to be notified."
            action={(
              <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                {activeNotifications} Active
              </span>
            )}
          >
            <ToggleRow
              icon={Smartphone}
              label="Push Notifications"
              description="Receive messages and updates directly on your device."
              checked={notificationPrefs.push}
              onChange={() => setNotificationPrefs((prev) => ({ ...prev, push: !prev.push }))}
            />
            <ToggleRow
              icon={Mail}
              label="Email Digests"
              description="Receive a daily summary of missed activity and major updates."
              checked={notificationPrefs.email}
              onChange={() => setNotificationPrefs((prev) => ({ ...prev, email: !prev.email }))}
            />
            <ToggleRow
              icon={Megaphone}
              label="Marketing & Tips"
              description="Receive promotional offers and selling tips."
              checked={notificationPrefs.marketing}
              onChange={() => setNotificationPrefs((prev) => ({ ...prev, marketing: !prev.marketing }))}
            />
          </SettingsCard>

          <SettingsCard
            id="appearance"
            title="Appearance"
            description="Customize the interface theme."
          >
            <div className="grid gap-4 px-6 py-6 sm:grid-cols-3">
              <ThemeOption
                value="light"
                label="Light Mode"
                theme={theme}
                onSelect={setTheme}
                previewClassName="border-gray-200/80 bg-white"
                previewContent={(
                  <div className="grid grid-cols-2 gap-3 p-3 bg-gradient-to-br from-white to-gray-100 h-full">
                    <div className="rounded-lg bg-gray-100 border border-gray-200" />
                    <div className="rounded-lg bg-gray-100 border border-gray-200" />
                    <div className="col-span-2 h-3 rounded-full bg-gray-200" />
                  </div>
                )}
              />
              <ThemeOption
                value="dark"
                label="Dark Mode"
                theme={theme}
                onSelect={setTheme}
                previewClassName="border-neutral-700 bg-neutral-900"
                previewContent={(
                  <div className="grid grid-cols-2 gap-3 p-3 bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-800 h-full">
                    <div className="rounded-lg bg-neutral-800 border border-neutral-700" />
                    <div className="rounded-lg bg-neutral-800 border border-neutral-700" />
                    <div className="col-span-2 h-3 rounded-full bg-neutral-700" />
                  </div>
                )}
              />
              <ThemeOption
                value="system"
                label="System"
                theme={theme}
                onSelect={setTheme}
                previewClassName="border-gray-300/80 bg-gradient-to-br from-gray-100 via-gray-200 to-gray-400"
                previewContent={(
                  <div className="grid grid-cols-2 gap-3 p-3 h-full">
                    <div className="rounded-lg bg-white/80 border border-white/80" />
                    <div className="rounded-lg bg-neutral-800/80 border border-neutral-700" />
                    <div className="col-span-2 h-3 rounded-full bg-neutral-700/70" />
                  </div>
                )}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 px-6 pb-6 text-xs font-medium text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4" /> Light
              </div>
              <div className="flex items-center gap-2">
                <Moon className="h-4 w-4" /> Dark
              </div>
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4" /> System
              </div>
            </div>
          </SettingsCard>

          <SettingsCard
            id="privacy"
            title="Privacy & Visibility"
            description="Control who sees your profile and data."
          >
            <ToggleRow
              icon={Eye}
              label="Online Status"
              description="Allow others to see when you are currently active."
              checked={privacyPrefs.online}
              onChange={() => setPrivacyPrefs((prev) => ({ ...prev, online: !prev.online }))}
            />
            <ToggleRow
              icon={MapPin}
              label="Show Location"
              description="Display your suburb on your public profile items."
              checked={privacyPrefs.location}
              onChange={() => setPrivacyPrefs((prev) => ({ ...prev, location: !prev.location }))}
            />
          </SettingsCard>

          <SettingsCard
            title="Login & Security"
            description="Change password and 2FA settings."
          >
            <button className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-gray-50/70 dark:hover:bg-white/5 transition">
              <div className="flex items-center gap-4">
                <div className="h-11 w-11 rounded-2xl bg-gray-100/80 dark:bg-white/5 border border-app-color flex items-center justify-center">
                  <Lock className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">Login & Security</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Change password and 2FA settings.</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </button>
          </SettingsCard>

          <SettingsCard
            title="Account"
            description="Manage account access and data."
          >
            <button
              className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-red-50/50 dark:hover:bg-red-500/10 transition text-red-600"
              onClick={() => setShowDeleteModal(true)}
            >
              <div className="flex items-center gap-4">
                <div className="h-11 w-11 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200/60 dark:border-red-500/20 flex items-center justify-center">
                  <Trash2 className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Delete account</div>
                  <div className="text-xs text-red-400 mt-1">This permanently deletes your account and listings.</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-red-400" />
            </button>
          </SettingsCard>

        </div>

        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={async () => {
            setIsDeleting(true);
            try {
              await AuthService.deleteProfile();
              success('Account deleted');
              await logout('/');
            } catch (err: unknown) {
              error(err instanceof Error ? err.message : 'Failed to delete account');
            } finally {
              setIsDeleting(false);
              setShowDeleteModal(false);
            }
          }}
          title="Delete account"
          description="This permanently deletes your account, listings, messages, offers, and reviews. This action cannot be undone."
          confirmLabel="Delete"
          variant="danger"
          isLoading={isDeleting}
        />
      </AccountLayout>
    </>
  );
}
