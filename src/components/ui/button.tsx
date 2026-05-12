import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-sm text-sm font-medium whitespace-nowrap transition-colors outline-none select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-red-600 text-white hover:bg-red-800",
        outline: "border border-gray-200 bg-white text-gray-800 hover:bg-neutral-100",
        secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200",
        ghost: "text-gray-600 hover:bg-neutral-100 hover:text-gray-800",
        destructive: "text-red-600 hover:bg-red-50",
        link: "text-red-600 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-8 px-2.5 gap-1.5",
        sm: "h-7 px-2 gap-1 text-xs",
        lg: "h-9 px-3 gap-1.5",
        xs: "h-6 px-1.5 gap-1 text-xs",
        icon: "size-8",
        "icon-sm": "size-7",
        "icon-lg": "size-9",
        "icon-xs": "size-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
