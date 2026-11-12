import type { CSSProperties } from 'react';

export function Icon({
  name,
  size = 18,
  style,
}: {
  name:
    | 'back'
    | 'pin'
    | 'highlight'
    | 'list'
    | 'close'
    | 'arrow'
    | 'check'
    | 'trash'
    | 'edit'
    | 'lock';
  size?: number;
  style?: CSSProperties;
}) {
  const paths: Record<typeof name, React.ReactNode> = {
    back: (
      <>
        <path d="M9 6 3 12l6 6" />
        <path
          d="M3 12h11a6 6 0 0 0 0-12"
          transform="translate(0 6) scale(1 .65)"
        />
      </>
    ),
    pin: (
      <>
        <path d="M6 3h12v18l-6-4-6 4z" />
      </>
    ),
    highlight: (
      <>
        <path d="m14 3 7 7-10 10H4v-7zM11 6l7 7M3 22h18" />
      </>
    ),
    list: (
      <>
        <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
      </>
    ),
    close: <path d="m6 6 12 12M6 18 18 6" />,
    arrow: (
      <>
        <path d="M5 12h14m-6-6 6 6-6 6" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    trash: (
      <>
        <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" />
      </>
    ),
    edit: (
      <>
        <path d="m16 3 5 5-12 12-6 1 1-6zM13 6l5 5" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="2" />
        <path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3" />
      </>
    ),
  };
  return (
    <svg
      style={style}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
