import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-fx-bg flex flex-col items-center justify-center p-4 text-center">
      <div className="w-full max-w-md bg-white border border-fx-border rounded-[8px] p-8 shadow-none space-y-4">
        <div className="w-12 h-12 rounded-lg bg-[#EDF4F8] text-[#274E68] border border-[#315F7D]/20 font-bold text-base flex items-center justify-center mx-auto">
          404
        </div>
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-fx-text-primary">
            Page Not Found
          </h1>
          <p className="text-xs text-fx-text-secondary">
            The workspace page or resource you requested does not exist or has been moved.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center h-9 px-4 text-xs font-semibold rounded-md bg-[#315F7D] text-white hover:bg-[#274E68] fx-transition"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
