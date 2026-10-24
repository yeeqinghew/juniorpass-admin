// API Configuration
import { AUTH_ROLES } from "../constants/auth";

const getApiBaseURL = () => {
  // Use a same-origin API only on the staging admin hostname. The Vercel
  // routing rule for that host proxies these calls to the Railway backend.
  if (window.location.hostname === "staging.admin.juniorpass.sg") {
    return window.location.origin;
  }

  return import.meta.env.VITE_API_URL || "http://localhost:5000";
};

const API_BASE_URL = getApiBaseURL();

// API endpoints
export const API_ENDPOINTS = {
  // Admin Auth
  LOGIN: `${API_BASE_URL}/admins/login`,
  VERIFY_AUTH: `${API_BASE_URL}/admins/is-verify`,
  LOGOUT: `${API_BASE_URL}/admins/logout`,

  // Parents
  GET_ALL_PARENTS: `${API_BASE_URL}/admins/getAllParents`,
  UPDATE_ACCOUNT_SUSPENSION: (accountType, accountId) =>
    `${API_BASE_URL}/admins/accounts/${accountType}/${accountId}/suspension`,

  // Children
  GET_ALL_CHILDREN: `${API_BASE_URL}/admins/getAllChildren`,

  // Partners
  GET_ALL_PARTNERS: `${API_BASE_URL}/admins/getAllPartners`,
  CREATE_PARTNER: `${API_BASE_URL}/admins/createPartner`, // Now sends invitation email
  UPDATE_PARTNER: (partnerId) => `${API_BASE_URL}/admins/updatePartner/${partnerId}`,
  DELETE_PARTNER: (partnerId) => `${API_BASE_URL}/admins/deletePartner/${partnerId}`,

  // Classes and operations
  GET_ALL_CLASSES: `${API_BASE_URL}/admins/listings`,
  GET_ADMIN_BOOKINGS: `${API_BASE_URL}/admins/bookings`,
  GET_REVIEWS: `${API_BASE_URL}/reviews/admin/all`,
  MODERATE_REVIEW: (reviewId) =>
    `${API_BASE_URL}/reviews/${reviewId}/moderation`,
  GET_PROMOTIONS: `${API_BASE_URL}/promotions/admin`,
  GET_PROMOTION_OPTIONS: `${API_BASE_URL}/promotions/admin/options`,
  CREATE_PROMOTION: `${API_BASE_URL}/promotions/admin`,
  REVIEW_PROMOTION: (promotionId) =>
    `${API_BASE_URL}/promotions/admin/${promotionId}/review`,
  UPDATE_PROMOTION_STATUS: (promotionId) =>
    `${API_BASE_URL}/promotions/admin/${promotionId}/status`,
  GET_PROMOTION_REPORT: (promotionId) =>
    `${API_BASE_URL}/promotions/admin/${promotionId}/report`,
  APPROVE_CLASS: (listingId) =>
    `${API_BASE_URL}/admins/listings/${listingId}/approve`,
  REJECT_CLASS: (listingId) =>
    `${API_BASE_URL}/admins/listings/${listingId}/reject`,

  // Partner Enquiries
  GET_ALL_PARTNER_ENQUIRIES: `${API_BASE_URL}/admins/getAllPartnerEnquiries`,
  MARK_ENQUIRY_RESPONDED: (enquiryId) =>
    `${API_BASE_URL}/admins/markEnquiryResponded/${enquiryId}`,

  // Categories
  GET_ALL_CATEGORIES: `${API_BASE_URL}/categories/admin`,
  CREATE_CATEGORY: `${API_BASE_URL}/categories`,
  UPDATE_CATEGORY: (categoryId) => `${API_BASE_URL}/categories/${categoryId}`,

  CREDIT_CONVERSION: `${API_BASE_URL}/admins/settings/credit-conversion`,

  // Partner payouts
  GET_PAYOUTS: `${API_BASE_URL}/payouts/admin`,
  CREATE_PAYOUT: `${API_BASE_URL}/payouts/admin`,
  MARK_PAYOUT_PAID: (payoutId) =>
    `${API_BASE_URL}/payouts/admin/${payoutId}/paid`,
  VOID_PAYOUT: (payoutId) =>
    `${API_BASE_URL}/payouts/admin/${payoutId}/void`,
  PAYOUT_STATEMENT: (payoutId, format = "") =>
    `${API_BASE_URL}/payouts/${payoutId}/statement${format ? `.${format}` : ""}`,

  // Payments and wallet audit workspace
  ADMIN_PAYMENTS: `${API_BASE_URL}/admin-payments`,

  // Controlled credit refunds
  GET_REFUNDS: `${API_BASE_URL}/refunds/admin`,
  CREATE_REFUND: `${API_BASE_URL}/refunds/admin`,
  APPROVE_REFUND: (refundId) => `${API_BASE_URL}/refunds/admin/${refundId}/approve`,
  REJECT_REFUND: (refundId) => `${API_BASE_URL}/refunds/admin/${refundId}/reject`,

  // Admin notifications
  NOTIFICATIONS: `${API_BASE_URL}/notifications`,
  NOTIFICATION_UNREAD_COUNT: `${API_BASE_URL}/notifications/unread-count?type=${AUTH_ROLES.ADMIN}`,
  MARK_NOTIFICATION_READ: (notificationId) =>
    `${API_BASE_URL}/notifications/${notificationId}/read`,
  MARK_ALL_NOTIFICATIONS_READ: `${API_BASE_URL}/notifications/read-all`,

  // Immutable operational audit history
  AUDIT_LOG: `${API_BASE_URL}/audit-log`,
};

// Helper function for authenticated fetch
export const fetchWithAuth = async (url, options = {}) => {
  const defaultHeaders = {
    "Content-Type": "application/json",
    "X-Auth-Role": AUTH_ROLES.ADMIN,
  };

  const config = {
    ...options,
    credentials: "include",
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  return fetch(url, config);
};

export default API_BASE_URL;
