import * as React from "react"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export interface FormTextareaProps extends React.ComponentProps<"textarea"> {
  label?: React.ReactNode;
  labelRight?: React.ReactNode;
  error?: string;
  containerClassName?: string;
}

export const FormTextarea = React.forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ className, containerClassName, label, labelRight, error, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className={cn("space-y-1", containerClassName)}>
        {(label || labelRight) && (
          <div className="flex items-center justify-between mb-1">
             {label && (
               <Label htmlFor={inputId} className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                 {label}
               </Label>
             )}
             {labelRight && <div className="text-[11px]">{labelRight}</div>}
          </div>
        )}
        <textarea
          id={inputId}
          ref={ref}
          className={cn(
            "flex min-h-[60px] w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50 resize-y",
            className
          )}
          {...props}
        />
        {error && <p className="text-[10px] text-destructive mt-1">{error}</p>}
      </div>
    )
  }
)
FormTextarea.displayName = "FormTextarea"
