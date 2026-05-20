import React from 'react';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl' | 'dm';

interface AvatarProps {
  initials: string;
  color?: string;        // accent border/shadow color
  size?: AvatarSize;
  you?: boolean;         // gold ring if it's the current player
  down?: boolean;        // greyed out when character is downed
  className?: string;
  style?: React.CSSProperties;
}

const SIZE_CLASS: Record<AvatarSize, string> = {
  sm: 'fw-avatar sm',
  md: 'fw-avatar',
  lg: 'fw-avatar lg',
  xl: 'fw-avatar xl',
  dm: 'fw-avatar dm',
};

export const Avatar = ({
  initials,
  color,
  size = 'md',
  you,
  down,
  className = '',
  style,
}: AvatarProps) => {
  const colorStyle: React.CSSProperties = color
    ? {
        borderColor: color,
        boxShadow: `0 0 0 1px ${color}40`,
        opacity: down ? 0.45 : 1,
      }
    : { opacity: down ? 0.45 : 1 };

  const youStyle: React.CSSProperties = you
    ? { borderColor: 'var(--gold)', boxShadow: 'var(--glow-gold)' }
    : {};

  return (
    <div
      className={`${SIZE_CLASS[size]} ${className}`}
      style={{ ...colorStyle, ...youStyle, ...style }}
    >
      {initials}
    </div>
  );
};
