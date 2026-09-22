import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading engineering metrics...' }: LoadingStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[300px] p-8 space-y-3 text-slate-400">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      <p className="text-xs font-medium">{message}</p>
    </div>
  );
}
