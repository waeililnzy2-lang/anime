function hasRole(member, roleId) {
  if (!roleId) return false;
  return member.roles.cache.has(roleId);
}

function canAddEpisode(member) {
  return hasRole(member, process.env.JUNIOR_ADMIN_ROLE_ID) ||
         hasRole(member, process.env.SENIOR_ADMIN_ROLE_ID);
}

function canManageEpisodes(member) {
  return hasRole(member, process.env.SENIOR_ADMIN_ROLE_ID);
}

function canManageAnime(member) {
  return hasRole(member, process.env.SENIOR_ADMIN_ROLE_ID);
}

module.exports = {
  canAddEpisode,
  canManageEpisodes,
  canManageAnime
};