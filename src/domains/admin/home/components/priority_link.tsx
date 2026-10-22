"use client";
import { Button, type ButtonProps } from "@mui/material";
import Link from "next/link";
// Keep the Next Link function inside the client boundary, never in RSC props.
export function PriorityLink(
  props: Pick<ButtonProps, "children" | "sx" | "size" | "variant"> & {
    href: string;
  },
) {
  return <Button {...props} component={Link} prefetch={false} />;
}
