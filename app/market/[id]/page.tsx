import { notFound } from 'next/navigation';
import { SignalDetailClient } from '@/components/SignalDetailClient';
import { getSignalById } from '@/lib/indexer/mock-indexer';

export default function SignalDetailPage({ params }: { params: { id: string } }) {
  const signal = getSignalById(params.id);
  if (!signal) notFound();
  return <SignalDetailClient signal={signal} />;
}
