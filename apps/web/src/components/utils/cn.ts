import clsx, { type ClassValue } from 'clsx';

/** Class-name join helper (thin wrapper so we can swap in tailwind-merge later). */
export const cn = (...inputs: ClassValue[]): string => clsx(inputs);
