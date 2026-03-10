/**
 * Shared Sport Icons & Labels — single source of truth
 * Used by both customer Find Venue and owner Venue Management pages.
 *
 * All icons are monochrome SVG line icons (1em × 1em),
 * matching the Apple-inspired minimal design system.
 */

export const SportIcons = {
    all: <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /><path d="M2 12h20" /></svg>,
    football: <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6l3 4-1 4H10l-1-4z" /><path d="M12 6V2" /><path d="M15 10l5-2" /><path d="M14 14l3 5" /><path d="M10 14l-3 5" /><path d="M9 10L4 8" /></svg>,
    badminton: <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 18v4" /><path d="M10 22h4" /><path d="M12 14c-4 0-6-4-6-8h12c0 4-2 8-6 8z" /><path d="M9 6v2" /><path d="M12 6v2" /><path d="M15 6v2" /></svg>,
    tennis: <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M6 5.3a9 9 0 0 1 0 13.4" /><path d="M18 5.3a9 9 0 0 0 0 13.4" /></svg>,
    basketball: <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2v20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>,
    volleyball: <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 2C6.5 2 2 6.5 2 12" /><path d="M12 2c3 3 4 8 1 13" /><path d="M2 12c3-1 8-2 13 1" /></svg>,
    pickleball: <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="9" cy="10" r="1" /><circle cx="15" cy="10" r="1" /><circle cx="12" cy="15" r="1" /></svg>,
};

export const sportTypeLabels = {
    football: 'Bóng đá',
    badminton: 'Cầu lông',
    tennis: 'Tennis',
    basketball: 'Bóng rổ',
    volleyball: 'Bóng chuyền',
    pickleball: 'Pickleball',
};

/** Get icon by sport key */
export const getSportIcon = (sportType) => SportIcons[sportType] || SportIcons.all;

/** Get Vietnamese label by sport key */
export const getSportLabel = (sportType) => sportTypeLabels[sportType] || sportType;

/** Get standard sport tag class (with padding etc.) */
export const getSportTagClass = (sportType) => {
    return `sport-tag ${getSportColorClass(sportType)}`;
};

/** Get background/text color class for a specific sport */
export const getSportColorClass = (sportType) => {
    const validSports = ['football', 'badminton', 'tennis', 'basketball', 'volleyball', 'pickleball'];
    if (validSports.includes(sportType)) {
        return `sport-color-${sportType}`;
    }
    return 'sport-color-default';
};
