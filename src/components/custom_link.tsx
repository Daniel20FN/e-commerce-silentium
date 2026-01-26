import { useRouter } from "next/router";

export default function CustomLink({
  value,
  url,
  asPath,
  shallow = true,
  clickInNewTab = false,
}: {
  value: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  url: { pathname: string; query: Record<string, any> };
  asPath?: string;
  shallow?: boolean;
  clickInNewTab?: boolean;
}) {
  const router = useRouter();

  const finalHref =
    url.pathname.split("?")[0] +
    "?" +
    new URLSearchParams(url.query).toString();

  return (
    <a
      href={finalHref}
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
      onClick={(e) => {
        if (clickInNewTab) {
          e.preventDefault();
          window.open(finalHref, "_blank");
          return;
        }

        if (
          e.button !== 0 || // botón izquierdo
          e.metaKey ||
          e.ctrlKey ||
          e.shiftKey ||
          e.altKey ||
          e.defaultPrevented
        ) {
          return;
        }

        e.preventDefault();
        void router.push(
          { ...url, pathname: url.pathname.split("?")[0] },
          asPath ?? router.asPath,
          { shallow: shallow },
        );
      }}
      target={clickInNewTab ? "_blank" : "_self"}
      rel={clickInNewTab ? "noopener noreferrer" : undefined}
      style={{
        color: "blue",
        textDecoration: "underline",
        cursor: "pointer",
      }}
    >
      {value}
    </a>
  );
}
