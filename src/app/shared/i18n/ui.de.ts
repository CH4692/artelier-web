/** German interface copy. Identifiers and API contracts remain English. */
export const UI_DE = {
  navigation: {
    dashboard: 'Werkstattübersicht',
    customers: 'Kunden',
    instruments: 'Instrumente',
    repairs: 'Reparaturen',
  },
  shell: {
    skip: 'Zum Inhalt springen',
    home: 'Artelier – Startseite',
    menu: 'Menü',
    navigation: 'Hauptnavigation',
    workspace: 'Werkstatt',
    note: 'Mehr Zeit für das Handwerk.',
    footer: 'Für das Handwerk gemacht.',
    checkingSession: 'Sitzung wird geprüft…',
    notFound: 'Seite nicht gefunden',
  },
  account: {
    logout: 'Abmelden',
    loggingOut: 'Wird abgemeldet…',
    logoutError:
      'Die Abmeldung konnte nicht bestätigt werden. Ihre Sitzung ist möglicherweise noch aktiv. Bitte versuchen Sie es erneut.',
  },
  dashboard: {
    eyebrow: 'Ihr Werkstattalltag',
    title: 'Werkstattübersicht',
    subtitle: 'Alle wichtigen Vorgänge auf einen Blick.',
    create: '+ Neuer Reparaturauftrag',
    createUnavailable: 'Die Auftragserfassung ist noch nicht verfügbar.',
    metricsLabel: 'Kennzahlen der Werkstatt',
    scope:
      'Derzeit ist die Übersicht für abholbereite Aufträge verfügbar. Weitere Kennzahlen folgen.',
    open: {
      title: 'Offene Reparaturen',
      label: 'In Bearbeitung',
      hint: 'Reparaturen in Bearbeitung.',
      empty: 'Noch keine offenen Reparaturen.',
    },
    ready: {
      title: 'Abholbereit',
      label: 'Zur Abholung',
      hint: 'Aufträge zur Abholung bereit.',
      empty: 'Aktuell sind keine Instrumente abholbereit.',
    },
    overdue: {
      title: 'Überfällige Aufträge',
      label: 'Achtung · Überfällig',
      hint: 'Aufträge mit überschrittenem Termin.',
      empty: 'Keine überfälligen Aufträge.',
    },
    upcoming: {
      title: 'Anstehende Termine',
      label: 'Fristen im Blick',
      hint: 'Aufträge mit bevorstehendem Termin.',
      empty: 'Keine anstehenden Termine.',
    },
    loading: 'Wird geladen…',
    unavailable: 'Nicht verfügbar',
    unavailableHint: 'Diese Kennzahl steht noch nicht zur Verfügung.',
    error: 'Nicht geladen',
    errorHint: 'Die Kennzahl konnte nicht geladen werden.',
    retry: 'Erneut versuchen',
    refresh: 'Abholzahl aktualisieren',
    refreshing: 'Wird aktualisiert…',
    countUnit: 'Aufträge',
    urgentTitle: 'Dringende Reparaturen',
    urgentSubtitle: 'Überfällige Aufträge und bevorstehende Fristen.',
    urgentUnavailable: 'Die Dringlichkeitsübersicht ist noch nicht verfügbar.',
    urgentDescription:
      'Aufträge mit besonderem Handlungsbedarf können hier noch nicht angezeigt werden. Dies bedeutet nicht, dass keine dringenden Reparaturen vorliegen.',
  },
} as const;
