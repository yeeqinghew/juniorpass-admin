export const isSuspensionActive = (account) =>
  Boolean(account.is_suspended) &&
  (!account.suspension_expires_at ||
    new Date(account.suspension_expires_at) > new Date());
