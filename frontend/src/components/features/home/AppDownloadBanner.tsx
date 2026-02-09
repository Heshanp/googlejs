import React from 'react';
import { Smartphone } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';

export const AppDownloadBanner: React.FC = () => {
  return (
    <section className="container mx-auto px-4 py-16">
      <div className="bg-neutral-900 dark:bg-neutral-800 rounded-3xl overflow-hidden shadow-2xl relative">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary-900/50 to-transparent" />
        
        <div className="flex flex-col md:flex-row items-center relative z-10">
          <div className="p-8 md:p-16 md:w-3/5 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-900/50 border border-primary-700 text-primary-300 text-xs font-semibold uppercase tracking-wider mb-6">
              <Smartphone className="w-3 h-3" /> Coming Soon
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
              Justsell in your pocket
            </h2>
            <p className="text-gray-300 mb-8 max-w-md text-lg">
              Download our mobile app to list items in seconds, get instant notifications, and chat on the go.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 max-w-sm mx-auto md:mx-0">
              <Input 
                placeholder="Enter your email" 
                className="bg-white/10 border-white/10 text-white placeholder:text-gray-400 focus:bg-white/20"
              />
              <Button>Notify Me</Button>
            </div>
            <p className="text-xs text-gray-500 mt-3">We'll only send you one email when we launch.</p>
          </div>
          
          <div className="md:w-2/5 flex justify-center md:justify-end md:pr-12 pt-8 md:pt-16">
            <div className="relative w-64 md:w-72">
               <div className="absolute inset-0 bg-primary-500 blur-3xl opacity-20 rounded-full" />
               <img 
                 src="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=600&q=80" 
                 alt="App Preview" 
                 className="relative z-10 rounded-t-3xl border-8 border-neutral-800 shadow-2xl rotate-[-5deg] hover:rotate-0 transition-transform duration-500"
               />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};