export const isSuspensionActive = (account) =>
  Boolean(account.is_suspended) &&
  (!account.suspension_expires_at ||
    new Date(account.suspension_expires_at) > new Date());

export const ACCOUNT_STATUS_FILTER_OPTIONS = [
  { label: "All accounts", value: "all" },
  { label: "Active", value: "active" },
  { label: "Suspended", value: "suspended" },
];

export const matchesAccountStatus = (account, status) => {
  if (status === "all") return true;
  const suspended = isSuspensionActive(account);
  return status === "suspended" ? suspended : !suspended;
};
