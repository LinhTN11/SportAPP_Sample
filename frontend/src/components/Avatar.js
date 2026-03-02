// Reusable Avatar component – shows image if avatarUrl exists, otherwise initials
export default function Avatar({ user, size = 'md', className = '' }) {
    const sizeClass = size === 'sm' ? 'avatar-sm' : size === 'lg' ? 'avatar-lg' : '';
    const name = user?.fullName || user?.name || '?';
    const url = user?.avatarUrl;

    return (
        <div className={`avatar ${sizeClass} ${className}`} style={url ? { padding: 0, overflow: 'hidden' } : {}}>
            {url ? (
                <img
                    src={url}
                    alt={name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                />
            ) : (
                name.charAt(0).toUpperCase()
            )}
        </div>
    );
}
