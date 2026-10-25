import { atom } from 'jotai';

const STORAGE_KEY = 'settings';
export type DateFormat =
  | 'D MMM YYYY'
  | 'DD/MM/YYYY'
  | 'MM/DD/YYYY'
  | 'YYYY/MM/DD'
  | 'YYYY-MM-DD'
  | '';
export type MessageSpacing = '0' | '100' | '200' | '300' | '400' | '500';
export enum MessageLayout {
  Modern = 0,
  Compact = 1,
  Bubble = 2,
}

export interface Settings {
  themeId?: string;
  useSystemTheme: boolean;
  lightThemeId?: string;
  darkThemeId?: string;
  monochromeMode?: boolean;
  lowAnimationMode?: boolean;
  isMarkdown: boolean;
  editorToolbar: boolean;
  twitterEmoji: boolean;
  pageZoom: number;
  hideActivity: boolean;

  // MSC4320: impersonate Discord's local RPC pipe and publish activity as the
  // user's rich presence (desktop only, off by default).
  publishRichPresence: boolean;

  isPeopleDrawer: boolean;
  showPresenceInMemberList: boolean;
  showPresenceInDMList: boolean;
  memberSortFilterIndex: number;
  enterForNewline: boolean;
  messageLayout: MessageLayout;
  messageSpacing: MessageSpacing;
  hideMembershipEvents: boolean;
  hideNickAvatarEvents: boolean;
  mediaAutoLoad: boolean;
  urlPreview: boolean;
  encUrlPreview: boolean;
  // Optional third-party preview server (stablecat preview tokens). Empty = own homeserver.
  urlPreviewServer: string;
  urlPreviewServerToken: string;
  showHiddenEvents: boolean;
  legacyUsernameColor: boolean;

  showNotifications: boolean;
  isNotificationSounds: boolean;

  hour24Clock: boolean;
  dateFormatString: string;

  autoJoinSpaceRooms: boolean;
  spaceRoleMode: boolean;

  developerTools: boolean;
  /** Message range export, offered under Developer Tools. */
  messageExport: boolean;

  onlySignedDevices: boolean;
}

const defaultSettings: Settings = {
  themeId: undefined,
  useSystemTheme: true,
  lightThemeId: undefined,
  darkThemeId: undefined,
  monochromeMode: false,
  lowAnimationMode: false,
  isMarkdown: true,
  editorToolbar: false,
  twitterEmoji: true,
  pageZoom: 100,
  hideActivity: false,

  publishRichPresence: false,

  isPeopleDrawer: true,
  showPresenceInMemberList: true,
  showPresenceInDMList: true,
  memberSortFilterIndex: 0,
  enterForNewline: false,
  messageLayout: 0,
  messageSpacing: '400',
  hideMembershipEvents: false,
  hideNickAvatarEvents: true,
  mediaAutoLoad: true,
  urlPreview: true,
  encUrlPreview: false,
  urlPreviewServer: '',
  urlPreviewServerToken: '',
  showHiddenEvents: false,
  legacyUsernameColor: false,

  showNotifications: true,
  isNotificationSounds: true,

  hour24Clock: false,
  dateFormatString: 'D MMM YYYY',

  autoJoinSpaceRooms: false,
  spaceRoleMode: false,

  developerTools: false,
  messageExport: false,

  onlySignedDevices: false,
};

export const getSettings = () => {
  const settings = localStorage.getItem(STORAGE_KEY);
  if (settings === null) return defaultSettings;
  return {
    ...defaultSettings,
    ...(JSON.parse(settings) as Settings),
  };
};

export const setSettings = (settings: Settings) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};

const baseSettings = atom<Settings>(getSettings());
export const settingsAtom = atom<Settings, [Settings], undefined>(
  (get) => get(baseSettings),
  (get, set, update) => {
    set(baseSettings, update);
    setSettings(update);
  }
);
