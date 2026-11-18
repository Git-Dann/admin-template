/**
 * Adapter contracts. Modules only ever talk to these interfaces, never to fetch().
 * A client implements the ones it needs against its own API; everything else falls
 * back to the mock adapters so the app still runs offline.
 */

/* --------------------------------- common --------------------------------- */

export type Platform = "ios" | "android" | "web";
export const PLATFORMS: Platform[] = ["ios", "android", "web"];
export const PLATFORM_LABELS: Record<Platform, string> = { ios: "iOS", android: "Android", web: "Web" };

export interface Page<T> {
  items: T[];
  total: number;
}

export interface ListParams {
  page: number;
  pageSize: number;
  search?: string;
  sort?: { id: string; desc: boolean };
  /** Field → allowed values, e.g. { status: ["active"], roleId: ["admin", "owner"] }. */
  filters?: Record<string, string[]>;
}

/** ISO dates (yyyy-mm-dd), inclusive. */
export interface DateRange {
  from: string;
  to: string;
}

export type Format = "number" | "currency" | "percent";

export interface Facet {
  value: string;
  label: string;
  count: number;
}

/** Stored file (asset) reference returned by an upload. */
export interface AssetRef {
  name: string;
  size: number;
  type: string;
  url: string;
  meta?: string;
}

/* ---------------------------------- auth ---------------------------------- */

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  roleId: string;
  avatarUrl?: string;
}

export interface Session {
  user: AdminUser;
}

export interface AuthAdapter {
  getSession(): Promise<Session | null>;
  signIn(input: { email: string; password?: string }): Promise<Session>;
  signOut(): Promise<void>;
  /** Mock/dev only: impersonate a role to review RBAC. */
  switchRole?(roleId: string): Promise<Session>;
}

/* -------------------------------- dashboard -------------------------------- */

export interface Metric {
  label: string;
  value: number;
  format: Format;
  /** Percentage change vs previous period. */
  delta?: number;
  upIsGood?: boolean;
  caption?: string;
}

export interface DashboardSummary {
  /** The one number that matters most. */
  headline: Metric;
  /** A few supporting numbers, shown in one KPI strip. */
  kpis: Metric[];
  trend: {
    title: string;
    format: Format;
    xKey: string;
    series: Array<{ key: string; label: string }>;
    points: Array<Record<string, string | number>>;
  };
  breakdown: {
    title: string;
    format: Format;
    items: Array<{ label: string; value: number }>;
  };
}

export interface DashboardAdapter {
  getSummary(range: DateRange): Promise<DashboardSummary>;
}

/* ---------------------------------- users ---------------------------------- */

export type UserStatus = "active" | "invited" | "suspended";

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  roleId: string;
  status: UserStatus;
  createdAt: string;
  lastActiveAt?: string;
  platform?: Platform;
  country?: string;
  plan?: string;
  /** Lifetime spend in major units (pounds). */
  spend?: number;
  /** IDs of resources this user owns (groups, collections) for "own scope" permissions. */
  owns?: string[];
}

export interface UsersAdapter {
  list(params: ListParams): Promise<Page<UserRecord>>;
  get(id: string): Promise<UserRecord>;
  updateRole(id: string, roleId: string): Promise<UserRecord>;
  setStatus(id: string, status: UserStatus): Promise<UserRecord>;
  facets(): Promise<{ status: Facet[]; roleId: Facet[] }>;
}

/* ---------------------------------- rbac ---------------------------------- */

export interface RoleDefinition {
  id: string;
  label: string;
  description?: string;
  tone?: "neutral" | "accent" | "success" | "warning" | "danger" | "info";
  /**
   * Grants: "users.read", "content.*", "*", or with own scope "groups.manage:own".
   * Own scope means the permission only applies to resources the user owns.
   */
  permissions: string[];
}

export interface RbacAdapter {
  listRoles(): Promise<RoleDefinition[]>;
  saveRole(role: RoleDefinition): Promise<RoleDefinition>;
}

/* --------------------------------- reports --------------------------------- */

export interface MonthRevenue {
  /** yyyy-mm */
  month: string;
  revenue: number;
  byPlatform: Record<Platform, number>;
  refunds: number;
  newSubscribers: number;
}

export interface RevenueReport {
  currency: "GBP";
  range: DateRange;
  /** Equals the sum of months[].revenue, byPlatform and byCountry. */
  total: number;
  previousTotal: number;
  months: MonthRevenue[];
  byPlatform: Array<{ platform: Platform; revenue: number }>;
  byCountry: Array<{ code: string; country: string; revenue: number }>;
}

export interface ReportsAdapter {
  getRevenue(range: DateRange): Promise<RevenueReport>;
}

/* --------------------------------- coupons --------------------------------- */

export type CouponStatus = "live" | "scheduled" | "draft" | "ended" | "paused";

export interface Coupon {
  id: string;
  title: string;
  code: string;
  kind: "percent" | "fixed" | "trial";
  /** Percent (20), pounds (5) or trial days (30). */
  amount: number;
  status: CouponStatus;
  startsAt: string;
  endsAt?: string;
  redemptions: number;
  limit?: number;
  audience: string;
  platforms: Platform[];
}

export interface StaffCode {
  id: string;
  code: string;
  staffName: string;
  email: string;
  uses: number;
  status: "active" | "inactive";
  createdAt: string;
}

export interface CouponsAdapter {
  listCoupons(filters?: { status?: CouponStatus[] }): Promise<Coupon[]>;
  createCoupon(input: Omit<Coupon, "id" | "redemptions" | "status"> & { status?: CouponStatus }): Promise<Coupon>;
  setCouponStatus(id: string, status: CouponStatus): Promise<Coupon>;
  listStaffCodes(params: ListParams): Promise<Page<StaffCode>>;
  createStaffCode(input: { staffName: string; email: string }): Promise<StaffCode>;
}

/* --------------------------------- content --------------------------------- */

export interface Collection {
  id: string;
  title: string;
  /** "Series", "Course", "Playlist"… */
  kind: string;
  status: "published" | "scheduled" | "draft" | "archived";
  itemCount: number;
  plays: number;
  artwork?: string;
  tags: string[];
  ownerId?: string;
  updatedAt: string;
}

export interface ContentItem {
  id: string;
  number: number;
  title: string;
  durationSeconds: number;
  plays: number;
  completionRate: number;
  status: "published" | "scheduled" | "draft";
  publishedAt?: string;
}

export interface CollectionDetail extends Collection {
  description: string;
  items: ContentItem[];
  /** Plays per month for the whole collection. Sum equals `plays`. */
  playsByMonth: Array<{ month: string; plays: number }>;
}

export interface ContentAdapter {
  listCollections(params: ListParams): Promise<Page<Collection>>;
  getCollection(id: string): Promise<CollectionDetail>;
}

/* ------------------------------ notifications ------------------------------ */

export interface Audience {
  id: string;
  label: string;
  description?: string;
  size: number;
}

export interface PushNotification {
  id: string;
  title: string;
  body: string;
  audienceId: string;
  platforms: Platform[];
  deepLink?: string;
  status: "sent" | "scheduled" | "draft" | "failed";
  scheduledFor?: string;
  sentAt?: string;
  delivered?: number;
  opened?: number;
  createdBy: string;
}

export interface NotificationsAdapter {
  list(params: ListParams): Promise<Page<PushNotification>>;
  audiences(): Promise<Audience[]>;
  create(input: Omit<PushNotification, "id" | "status" | "delivered" | "opened" | "sentAt"> & { sendNow?: boolean }): Promise<PushNotification>;
  cancel(id: string): Promise<PushNotification>;
}

/* ------------------------------ theme builder ------------------------------ */

export type ThemeStatus = "live" | "scheduled" | "draft" | "ended";

/** A colour token override, optionally per mode. Keys are semantic token names (accent, bg…). */
export type ColourOverrides = Record<string, string | { light?: string; dark?: string }>;

export interface SeasonalTheme {
  id: string;
  name: string;
  status: ThemeStatus;
  startsAt?: string;
  endsAt?: string;
  audienceId: string;
  platforms: Platform[];
  assets: {
    splash: { enabled: boolean; lottie?: AssetRef; fallback?: AssetRef };
    appIcon: {
      enabled: boolean;
      /** Uploaded artwork (1024×1024). */
      icon?: AssetRef;
      /**
       * Native alternate icons must ship inside the app binary. This is the icon's key
       * in the app build; the module checks it against AppBuild.alternateIcons.
       */
      nativeIconKey?: string;
    };
    background: { enabled: boolean; mobile?: AssetRef; desktop?: AssetRef };
    colours: { enabled: boolean; tokens?: ColourOverrides };
  };
  updatedAt: string;
  updatedBy?: string;
}

/** A shipped (or in-review) native app build and the alternate icons bundled in it. */
export interface AppBuild {
  platform: "ios" | "android";
  version: string;
  status: "live" | "in review" | "in development";
  alternateIcons: string[];
  releasedAt?: string;
}

export interface ThemesAdapter {
  list(): Promise<SeasonalTheme[]>;
  get(id: string): Promise<SeasonalTheme>;
  save(theme: Omit<SeasonalTheme, "id" | "updatedAt" | "status"> & { id?: string; status?: ThemeStatus }): Promise<SeasonalTheme>;
  publish(id: string): Promise<SeasonalTheme>;
  remove(id: string): Promise<void>;
  listBuilds(): Promise<AppBuild[]>;
  /** Store an asset and return its reference. The mock keeps it in memory as a data URL. */
  uploadAsset(file: File): Promise<AssetRef>;
}

/* ---------------------------------- inbox ---------------------------------- */

/** Admin-facing notifications shown under the bell in the top bar. */
export interface InboxItem {
  id: string;
  title: string;
  body?: string;
  href?: string;
  createdAt: string;
  read: boolean;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}

export interface InboxAdapter {
  list(): Promise<InboxItem[]>;
  markAllRead(): Promise<void>;
}

/* --------------------------------- registry --------------------------------- */

/** Every adapter a client app can provide. */
export interface Adapters {
  auth: AuthAdapter;
  dashboard: DashboardAdapter;
  users: UsersAdapter;
  rbac: RbacAdapter;
  reports: ReportsAdapter;
  coupons: CouponsAdapter;
  content: ContentAdapter;
  notifications: NotificationsAdapter;
  themes: ThemesAdapter;
  inbox: InboxAdapter;
}

export type AdapterKey = keyof Adapters;
