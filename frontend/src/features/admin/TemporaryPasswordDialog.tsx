'use client';

import React, { useState } from 'react';
import { Check, Copy, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';

export interface TemporaryCredential {
  email: string;
  temporaryPassword: string;
  temporaryPasswordExpires: string;
}

export function TemporaryPasswordDialog({ credential, onClose }: { credential: TemporaryCredential | null; onClose: () => void }) {
  const [copied, setCopied] = useState<'email' | 'password' | 'both' | null>(null);
  if (!credential) return null;

  const copy = async (value: string, field: 'email' | 'password' | 'both') => {
    await navigator.clipboard.writeText(value);
    setCopied(field);
    window.setTimeout(() => setCopied(null), 1600);
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Temporary sign-in details</DialogTitle>
          <DialogDescription>Share these details securely. The temporary password will not be shown again after this dialog closes.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="rounded-[8px] border border-[#F0D9A7] bg-[#FFF9EB] p-3 text-xs text-[#7B5717]">The user must create a private password during their first sign-in. This password expires in 24 hours.</div>
          <CredentialRow label="Login email" value={credential.email} copied={copied === 'email'} onCopy={() => copy(credential.email, 'email')} />
          <CredentialRow label="Temporary password" value={credential.temporaryPassword} copied={copied === 'password'} onCopy={() => copy(credential.temporaryPassword, 'password')} />
          <p className="text-[11px] text-[#7A828C]">Expires {new Date(credential.temporaryPasswordExpires).toLocaleString()}.</p>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => copy(`Login email: ${credential.email}\nTemporary password: ${credential.temporaryPassword}`, 'both')} leftIcon={copied === 'both' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}>{copied === 'both' ? 'Copied' : 'Copy both'}</Button>
          <Button onClick={onClose} leftIcon={<KeyRound className="h-3.5 w-3.5" />}>I saved these details</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CredentialRow({ label, value, copied, onCopy }: { label: string; value: string; copied: boolean; onCopy: () => void }) {
  return <div><p className="mb-1 text-[11px] font-medium uppercase text-[#7A828C]">{label}</p><div className="flex items-center gap-2 rounded-[8px] border border-[#E3E7EC] bg-[#F8F9FB] p-2.5"><code className="min-w-0 flex-1 break-all text-[13px] text-[#17191C]">{value}</code><button type="button" onClick={onCopy} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] text-[#626A73] hover:bg-white hover:text-[#2563EB]" title={`Copy ${label.toLowerCase()}`}>{copied ? <Check className="h-4 w-4 text-[#237A57]" /> : <Copy className="h-4 w-4" />}</button></div></div>;
}
