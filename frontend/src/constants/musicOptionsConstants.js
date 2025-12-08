// Music Options Constants for Arrangement Service

/**
 * Available music genres for arrangement
 * These are commonly used genres in music arrangement services
 */
export const MUSIC_GENRES = [
  { value: 'Pop', label: 'Pop' },
  { value: 'Rock', label: 'Rock' },
  { value: 'Jazz', label: 'Jazz' },
  { value: 'Classical', label: 'Classical' },
  { value: 'Country', label: 'Country' },
  { value: 'R&B', label: 'R&B' },
  { value: 'Hip-Hop', label: 'Hip-Hop' },
  { value: 'Electronic', label: 'Electronic' },
  { value: 'Folk', label: 'Folk' },
  { value: 'Blues', label: 'Blues' },
  { value: 'Reggae', label: 'Reggae' },
  { value: 'Metal', label: 'Metal' },
  { value: 'Latin', label: 'Latin' },
  { value: 'World', label: 'World' },
  { value: 'Other', label: 'Other' },
];

/**
 * Available purposes for arrangement
 * Defines the purpose or use case of the arrangement
 */
export const MUSIC_PURPOSES = [
  { value: 'karaoke_cover', label: 'Karaoke Cover' },
  { value: 'performance', label: 'Performance' },
  { value: 'recording', label: 'Recording' },
  { value: 'education', label: 'Education' },
  { value: 'commercial', label: 'Commercial Use' },
  { value: 'personal', label: 'Personal Use' },
  { value: 'other', label: 'Other' },
];

/**
 * Helper function to get genre label by value
 */
export const getGenreLabel = value => {
  const genre = MUSIC_GENRES.find(g => g.value === value);
  return genre ? genre.label : value;
};

/**
 * Helper function to get purpose label by value
 */
export const getPurposeLabel = value => {
  const purpose = MUSIC_PURPOSES.find(p => p.value === value);
  return purpose ? purpose.label : value;
};
