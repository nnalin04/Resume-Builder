import * as React from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export interface FormInputProps extends React.ComponentProps<"input"> {
  label?: React.ReactNode;
  error?: string;
  containerClassName?: string;
}

export function FormInput({ label, error, containerClassName, className, id, ...props }: FormInputProps) {
  const generatedId = React.useId();
  const inputId = id || generatedId;

  return (
    <div className={cn("space-y-1", containerClassName)}>
      {label && (
        <Label htmlFor={inputId} className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
          {label}
        </Label>
      )}
      <Input
        id={inputId}
        className={cn("h-7 px-2 py-1 text-[11px] md:text-[11px] bg-white border-slate-200", className)}
        {...props}
      />
      {error && <p className="text-[10px] text-destructive mt-1">{error}</p>}
    </div>
  )
}
