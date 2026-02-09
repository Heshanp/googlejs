'use client';

import React, { useEffect } from 'react';

interface JsonLdProps {
  data: Record<string, any> | Record<string, any>[];
  id?: string;
}

export const JsonLd: React.FC<JsonLdProps> = ({ data, id }) => {
  const scriptId = id || 'json-ld-data';

  useEffect(() => {
    let script = document.getElementById(scriptId) as HTMLScriptElement;
    
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }

    script.text = JSON.stringify(data);

    return () => {
      // Optional: cleanup if you want to remove structured data on unmount
      // script.remove();
    };
  }, [data, scriptId]);

  return null;
};