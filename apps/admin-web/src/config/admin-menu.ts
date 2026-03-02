import type { Component } from "vue";
import {
  Braces,
  Database,
  FileText,
  Gauge,
  Image,
  LayoutGrid,
  Link2,
  Menu,
  Settings,
} from "lucide-vue-next";

export type MenuChild = {
  label: string;
  to: string;
};

export type MenuItemDef = {
  id: string;
  label: string;
  to: string;
  icon: Component;
  children?: MenuChild[];
};

export type MenuGroupDef = {
  id: string;
  label: string;
  items: MenuItemDef[];
};

export type AdminMenuPrefs = {
  groupOrder: string[];
  itemOrder: Record<string, string[]>;
  hidden: string[];
  hiddenGroups: string[];
};

export const DEFAULT_MENU: MenuGroupDef[] = [
  {
    id: "dashboard",
    label: "",
    items: [
      { id: "main-dashboard", label: "Dashboard", to: "/admin", icon: Gauge },
    ],
  },
  {
    id: "portal",
    label: "Webfront",
    items: [
      { id: "dashboard", label: "Dashboard", to: "/admin/portal/dashboard", icon: Gauge },
      {
        id: "posts",
        label: "Posts",
        to: "/admin/posts",
        icon: FileText,
        children: [
          { label: "All Posts", to: "/admin/posts" },
          { label: "Add New", to: "/admin/posts/new" },
          { label: "Categories", to: "/admin/categories" },
        ],
      },
      {
        id: "pages",
        label: "Pages",
        to: "/admin/pages",
        icon: FileText,
        children: [
          { label: "All Pages", to: "/admin/pages" },
          { label: "Add New", to: "/admin/pages/new" },
        ],
      },
      {
        id: "media",
        label: "Media",
        to: "/admin/media",
        icon: Image,
        children: [{ label: "Library", to: "/admin/media" }],
      },
      { id: "storefront-menu", label: "Menus", to: "/admin/webfront-menu", icon: Link2 },
      { id: "webfront-settings", label: "Settings", to: "/admin/webfront-settings", icon: Settings },
    ],
  },
  {
    id: "administration",
    label: "Administration",
    items: [
      { id: "menus", label: "Menus", to: "/admin/menus", icon: Menu },
      {
        id: "settings",
        label: "Settings",
        to: "/admin/settings",
        icon: Settings,
        children: [
          { label: "General", to: "/admin/settings" },
          { label: "Users", to: "/admin/settings/users" },
          { label: "Roles", to: "/admin/settings/roles" },
          { label: "System", to: "/admin/settings/system" },
        ],
      },
    ],
  },
  {
    id: "development",
    label: "Development",
    items: [
      { id: "database-schema", label: "Database Schema", to: "/admin/development/database-schema", icon: Database },
      { id: "api-management", label: "API Management", to: "/admin/development/api-management", icon: Braces },
      {
        id: "kitchen-sink",
        label: "Kitchen Sink",
        to: "/admin/kitchen-sink",
        icon: LayoutGrid,
        children: [
          { label: "Components", to: "/admin/kitchen-sink" },
          { label: "Forms", to: "/admin/kitchen-sink/forms" },
          { label: "Charts", to: "/admin/kitchen-sink/charts" },
        ],
      },
    ],
  },
];
