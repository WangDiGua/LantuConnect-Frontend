import type { Theme } from '../../types';

export interface GlobalLoadingPalette {
  surface: string;
  spotlight: string;
  halo: string;
  grid: string;
  orbit: string;
  orbitAccent: string;
  core: string;
  label: string;
  detail: string;
  line: string;
}

export interface GlobalLoadingSweepRing {
  id: string;
  rotate: number;
  duration: number;
  delay: number;
  dashArray: string;
  opacity: number;
  reverse?: boolean;
  radius: number;
  strokeWidth: number;
}

export const GLOBAL_LOADING_SWEEP_RINGS: GlobalLoadingSweepRing[] = [
  {
    id: 'primary',
    rotate: -18,
    duration: 4.8,
    delay: -0.4,
    dashArray: '92 104',
    opacity: 0.9,
    radius: 24,
    strokeWidth: 2.4,
  },
  {
    id: 'secondary',
    rotate: 18,
    duration: 6.2,
    delay: -1.1,
    dashArray: '68 128',
    opacity: 0.56,
    reverse: true,
    radius: 30,
    strokeWidth: 1.4,
  },
];

export function buildGlobalLoadingPalette(theme: Theme): GlobalLoadingPalette {
  if (theme === 'dark') {
    return {
      surface: '#0d0b12',
      spotlight: 'rgba(24, 28, 46, 0.92)',
      halo: 'rgba(99, 102, 241, 0.16)',
      grid: 'rgba(255, 255, 255, 0.032)',
      orbit: 'rgba(225, 229, 244, 0.48)',
      orbitAccent: 'rgba(198, 210, 255, 0.96)',
      core: '#eef2ff',
      label: 'rgba(228, 232, 244, 0.86)',
      detail: 'rgba(148, 163, 184, 0.72)',
      line: 'rgba(148, 163, 184, 0.22)',
    };
  }
  return {
    surface: '#f4f2ee',
    spotlight: 'rgba(255, 255, 255, 0.88)',
    halo: 'rgba(79, 70, 229, 0.1)',
    grid: 'rgba(15, 23, 42, 0.05)',
    orbit: 'rgba(30, 41, 59, 0.38)',
    orbitAccent: 'rgba(49, 76, 190, 0.88)',
    core: '#16213d',
    label: 'rgba(15, 23, 42, 0.78)',
    detail: 'rgba(71, 85, 105, 0.66)',
    line: 'rgba(71, 85, 105, 0.16)',
  };
}
