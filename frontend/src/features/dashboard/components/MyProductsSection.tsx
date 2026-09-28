'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Calendar } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Progress } from '@/components/ui/Progress';
import { Button } from '@/components/ui/Button';

interface ProductSummary {
  id: string;
  name: string;
  key: string;
  targetDate: string | null;
  health: string;
  status: string;
  devProgress: number;
  mktgProgress: number;
  personalWork: {
    inProgress: number;
    ready: number;
    waiting: number;
    inReview: number;
  };
}

interface MyProductsSectionProps {
  products: ProductSummary[];
}

export function MyProductsSection({ products }: MyProductsSectionProps) {
  if (products.length === 0) return null;

  return (
    <section className="space-y-2" aria-labelledby="my-products-heading">
      <div className="flex items-center justify-between pb-2 border-b border-[#E3E7EC]">
        <h2 id="my-products-heading" className="text-[12px] font-semibold uppercase tracking-wider text-[#626A73]">
          My Products ({products.length})
        </h2>
        <Link
          href="/projects"
          className="text-[13px] font-medium text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1 transition-colors"
        >
          <span>View all products</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="divide-y divide-[#F2F4F7]">
        {products.map((p) => {
          const pw = p.personalWork;
          const personalWorkParts = [];
          if (pw.inProgress > 0) personalWorkParts.push(`${pw.inProgress} active`);
          if (pw.ready > 0) personalWorkParts.push(`${pw.ready} ready`);
          if (pw.waiting > 0) personalWorkParts.push(`${pw.waiting} waiting`);
          if (pw.inReview > 0) personalWorkParts.push(`${pw.inReview} in review`);

          const personalWorkText =
            personalWorkParts.length > 0
              ? personalWorkParts.join(' · ')
              : 'No active tasks';

          return (
            <div
              key={p.id}
              className="py-3.5 hover:bg-[#F7F8FA] -mx-2 px-2.5 rounded-[10px] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
            >
              {/* Product Identity & Name */}
              <div className="min-w-0 md:w-56 flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-[7px] bg-[#EEF4FF] border border-[#BFDBFE] text-[#2563EB] font-bold font-mono text-[11px] flex items-center justify-center shrink-0">
                  {p.key.slice(0, 3)}
                </span>
                <div className="min-w-0">
                  <Link
                    href={`/projects/${p.id}`}
                    className="font-semibold text-[14px] text-[#181B20] hover:text-[#2563EB] truncate block transition-colors"
                  >
                    {p.name}
                  </Link>
                  {p.targetDate && (
                    <span className="font-mono text-[11.5px] text-[#626A73] flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      Target {formatDate(p.targetDate)}
                    </span>
                  )}
                </div>
              </div>

              {/* Progress: Development & Marketing */}
              <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-sm">
                <div>
                  <div className="flex items-center justify-between text-[11.5px] text-[#626A73] mb-1">
                    <span>Development</span>
                    <span className="font-mono font-medium text-[#181B20]">{p.devProgress}%</span>
                  </div>
                  <Progress value={p.devProgress} size="xs" showLabel={false} />
                </div>
                <div>
                  <div className="flex items-center justify-between text-[11.5px] text-[#626A73] mb-1">
                    <span>Marketing</span>
                    <span className="font-mono font-medium text-[#181B20]">{p.mktgProgress}%</span>
                  </div>
                  <Progress value={p.mktgProgress} size="xs" showLabel={false} />
                </div>
              </div>

              {/* Personal Work Summary & Action */}
              <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                <div className="text-right">
                  <span className="text-[11px] text-[#626A73] block">Your work:</span>
                  <span className="font-medium text-[12.5px] text-[#181B20]">
                    {personalWorkText}
                  </span>
                </div>

                <Link href={`/projects/${p.id}`}>
                  <Button size="xs" variant="secondary" rightIcon={<ArrowRight className="w-3 h-3" />}>
                    Open
                  </Button>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
