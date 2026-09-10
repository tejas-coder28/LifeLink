import React from 'react';
import { Heart } from 'lucide-react';

const Loader = ({ text = 'Processing...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <div className="relative flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-rose-500/20 border-t-rose-500 animate-spin"></div>
        <Heart className="w-5 h-5 text-rose-500 absolute animate-pulse" />
      </div>
      {text && <p className="text-sm font-medium text-black animate-pulse">{text}</p>}
    </div>
  );
};

export default Loader;
