import Link from 'next/link';
import { ArrowLeft, KeyRound, ShieldCheck } from 'lucide-react';
import { FutureXLogo } from '@/components/branding/FutureXLogo';

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-[#F7F9FC] px-4 py-10 flex items-center justify-center">
      <section className="w-full max-w-[420px] rounded-[12px] border border-[#E3E7EC] bg-white p-7 sm:p-8 text-center">
        <div className="mb-5 flex justify-center"><FutureXLogo size="auth" priority /></div>
        <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#EEF4FF] text-[#2563EB]"><KeyRound className="h-5 w-5" /></div>
        <h1 className="text-xl font-semibold text-[#17191C]">Password assistance</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-[#626A73]">FutureX accounts do not use external inboxes. Contact an Admin or Super Admin and ask them to generate a temporary password for your login email.</p>
        <div className="mt-5 flex items-start gap-2 rounded-[8px] border border-[#E3E7EC] bg-[#F8F9FB] p-3 text-left text-xs text-[#626A73]"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#237A57]" /><span>You will be required to create a private password immediately after signing in.</span></div>
        <Link href="/login" className="mt-6 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[9px] bg-[#2563EB] text-sm font-semibold text-white hover:bg-[#1D4ED8]"><ArrowLeft className="h-4 w-4" />Return to sign in</Link>
      </section>
    </main>
  );
}
