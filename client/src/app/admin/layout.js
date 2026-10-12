'use client';

import StaffShell from '@/components/StaffShell';

const ROLES = ['admin'];

export default function AdminLayout({ children }) {
  return <StaffShell roles={ROLES}>{children}</StaffShell>;
}
