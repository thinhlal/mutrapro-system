# specialist-service

Scope: manage specialists and capabilities showcased to customers and other services.

- Owned tables: specialists, skill_categories, skills, specialist_skills, artist_demos
- API base: /specialists (e.g. /skills, /skill-categories, /artist-demos)
- Emits: specialist.created|updated; skill.updated; artist.demo.published
- Consumes: user.created (link specialist to user), file.uploaded (for demos)
- Depends on: user-service, file-service
