'use client';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function EmailDetailPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <div className="space-y-6">
      <Link href="/emails" className="text-xs text-gray-500 hover:text-white transition-colors">&larr; Back to Emails</Link>
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
        <p className="text-sm text-gray-400">Email thread #{id}</p>
        <p className="text-xs text-gray-600 mt-2">Full email thread view will load from API. Use the email inbox for now.</p>
      </div>
    </div>
  );
}
