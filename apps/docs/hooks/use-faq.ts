import { useEffect, useState } from "react";
import { FAQ } from "@/components/landing/faq-data";
import { onOpenFaq } from "@/lib/faq";

/** The FAQ's open question: the first one at first, the person's choice after, or the one `open_faq` asks for. */
export function useFaq(): { open: string; setOpen: (topic: string) => void } {
  const [open, setOpen] = useState<string>(FAQ[0].id);
  useEffect(() => onOpenFaq(setOpen), []);
  return { open, setOpen };
}
