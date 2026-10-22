import type { CourseType, SessionKind } from '../types';

export const COURSE_TYPE_LABEL: Record<CourseType, string> = {
  exam: 'Skoleeksamen',
  assignment: 'Innlevering/prosjekt',
};

export const SESSION_KIND_LABEL: Record<SessionKind, string> = {
  study: 'Leseøkt',
  project: 'Prosjektøkt',
  review: 'Repetisjon',
};

export const WEEKDAYS = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag'];
export const WEEKDAYS_SHORT = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];
