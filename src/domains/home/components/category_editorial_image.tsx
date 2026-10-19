"use client";
import Image from "next/image";
import { useState } from "react";
import styles from "./landing.module.css";

export function CategoryEditorialImage({
  src,
  alt,
  fallbackAlt,
  fallbackNote,
}: {
  src: string | null;
  alt: string;
  fallbackAlt: string;
  fallbackNote: string;
}) {
  const [failed, setFailed] = useState(false);
  const illustrative = failed || !src;
  return (
    <div className={styles.categoryMedia}>
      <Image
        src={illustrative ? "/images/landing/refugio-marfil.webp" : src}
        alt={illustrative ? fallbackAlt : alt}
        fill
        unoptimized={!illustrative}
        sizes="(max-width: 899px) 90vw, 60vw"
        onError={() => setFailed(true)}
      />
      {illustrative ? (
        <span className={styles.categoryImageNote}>{fallbackNote}</span>
      ) : null}
    </div>
  );
}
