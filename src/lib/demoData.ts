import type { Course, Settings } from '../types';
import { PALETTE } from './colors';

export const DEFAULT_SETTINGS: Settings = {
  hoursPerWeekday: [3, 3, 3, 3, 3, 5, 5],
  sessionMinutes: 90,
  dayStart: '09:00',
  focusMinutes: 25,
  breakMinutes: 5,
};

export const DEMO_COURSES: Course[] = [
  {
    id: 'demo-dave3625',
    code: 'DAVE3625',
    name: 'Introduksjon til kunstig intelligens',
    type: 'exam',
    dateTime: '2026-11-20T09:00',
    durationHours: 4,
    estimatedHours: 40,
    difficulty: 4,
    color: PALETTE[0],
  },
  {
    id: 'demo-itpe3100',
    code: 'ITPE3100',
    name: 'Datasikkerhet',
    type: 'exam',
    dateTime: '2026-11-25T15:00',
    durationHours: 3,
    estimatedHours: 30,
    difficulty: 3,
    color: PALETTE[1],
  },
  {
    id: 'demo-itpe3200',
    code: 'ITPE3200',
    name: 'Webapplikasjoner',
    type: 'assignment',
    dateTime: '2026-11-30T12:00',
    estimatedHours: 35,
    difficulty: 3,
    color: PALETTE[2],
  },
];
