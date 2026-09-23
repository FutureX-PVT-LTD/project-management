import Image from 'next/image';

type FutureXLogoProps = {
  size?: 'small' | 'sidebar' | 'auth';
  priority?: boolean;
};

const sizes = {
  small: {
    frame: { width: 64, height: 18 },
    image: { width: 77, height: 77, left: -5, top: -34 },
  },
  sidebar: {
    frame: { width: 96, height: 24 },
    image: { width: 112, height: 112, left: -7, top: -49 },
  },
  auth: {
    frame: { width: 152, height: 52 },
    image: { width: 152, height: 152, left: 0, top: -49 },
  },
} as const;

export function FutureXLogo({ size = 'sidebar', priority = false }: FutureXLogoProps) {
  const config = sizes[size];

  return (
    <span
      className="relative block shrink-0 overflow-hidden"
      style={config.frame}
      aria-label="FutureX"
    >
      <Image
        src="/images/futurex-logo.png"
        alt="FutureX"
        width={625}
        height={625}
        priority={priority}
        className="pointer-events-none absolute max-w-none select-none object-contain"
        style={config.image}
      />
    </span>
  );
}
