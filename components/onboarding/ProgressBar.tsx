'use client';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {Array.from({ length: totalSteps }, (_, i) => (
        <div
          key={i}
          className={`
            h-2 rounded-full transition-all duration-500 ease-out
            ${i === currentStep 
              ? 'w-8 bg-primary shadow-md shadow-primary/30' 
              : i < currentStep 
                ? 'w-2 bg-primary/60' 
                : 'w-2 bg-border'
            }
          `}
        />
      ))}
    </div>
  );
}

