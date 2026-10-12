'use client';

import StaffShell from '@/components/StaffShell';

const ROLES = ['command', 'admin'];

export default function CommandLayout({ children }) {
  return <StaffShell roles={ROLES}>{children}</StaffShell>;
}
