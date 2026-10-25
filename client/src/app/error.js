'use client';

import { PageError } from '@/components/pk/PageError';

export default function ErrorPage({ retry }) {
  return <PageError retry={retry} />;
}
