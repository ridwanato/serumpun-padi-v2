export const SUPER_ADMIN_EMAIL = 'ketapangcilegon@gmail.com';

export function isSuperAdmin(user) {
  return !!(user && user.email && user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase());
}

export function canEditRecord(user, record) {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  if (!record) return true;
  // Non-super admin can only edit if they are the author
  return record.user_id === user.id;
}
