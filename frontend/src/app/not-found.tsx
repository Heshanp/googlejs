

'use client';

import React from 'react';
import Link from 'next/link';



export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-bold mb-4">Page Not Found</h1>
      <Link href="/" className="text-blue-500 hover:underline">
        Go Home
      </Link>
    </div>
  );
}