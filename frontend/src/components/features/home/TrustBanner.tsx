import React from 'react';
import Link from 'next/link';
import { ShieldCheck, UserCheck, MessageSquare } from 'lucide-react';

export const TrustBanner: React.FC = () => {
  return (
    <section className="py-8">
      <div className="container mx-auto px-4">
        <div className="bg-white dark:bg-neutral-800 rounded-2xl p-8 border border-app-color shadow-sm">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Buy & Sell with Confidence</h2>
            <p className="text-gray-500 max-w-lg mx-auto">We are committed to creating a safe and secure community for all Kiwis.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center p-4">
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-4">
                <UserCheck className="w-8 h-8" />
              </div>
              <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">Verified Users</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                We verify identities using email, phone, and optional ID checks to ensure you know who you're dealing with.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-4">
              <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-4">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">Secure Payments</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Transactions are protected. Funds are held securely until the item is received and approved by the buyer.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-4">
              <div className="w-16 h-16 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">Safe Messaging</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Communicate securely within the app without revealing your personal phone number or email address.
              </p>
            </div>
          </div>

          <div className="text-center mt-8">
            <Link href="/safety-tips" className="text-primary-600 hover:text-primary-700 text-sm font-medium hover:underline">
              Read our safety tips &rarr;
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};