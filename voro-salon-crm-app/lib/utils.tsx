import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import * as Icons from "lucide-react"
import parse from "html-react-parser";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function getLucideIcon(name: string) {
  const IconComponent = (Icons as unknown as Record<string, React.FC<any>>)[name]
  return IconComponent ?? Icons.HelpCircle
}

export function HtmlRender({ html }: { html: string }) {
  return <>{parse(html)}</>;
}
