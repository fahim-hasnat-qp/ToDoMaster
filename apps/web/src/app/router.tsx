import {
  Navigate,
  createBrowserRouter,
  type RouteObject,
  type RouterProviderProps,
} from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import { SmartListId } from '@todomaster/shared';
import { AppShell } from './shell/AppShell';
import { SmartListScreen } from '@/features/smart-lists/SmartListScreen';
import { ListScreen } from '@/features/lists/ListScreen';
import { ListsScreen } from '@/features/lists/ListsScreen';
import { TagsScreen } from '@/features/tags/TagsScreen';
import { SearchScreen } from '@/features/search/SearchScreen';
import { SettingsScreen } from '@/features/settings/SettingsScreen';
import { CalendarScreen } from '@/features/calendar/CalendarScreen';
import { LoginScreen } from '@/features/auth/LoginScreen';
import { RegisterScreen } from '@/features/auth/RegisterScreen';
import { VerifyEmailScreen } from '@/features/auth/VerifyEmailScreen';
import { ForgotPasswordScreen } from '@/features/auth/ForgotPasswordScreen';
import { ResetPasswordScreen } from '@/features/auth/ResetPasswordScreen';
import { ComingSoon } from '@/components/ComingSoon';

/**
 * Smart-list routes are explicit (one path each) so they never collide with
 * /app/list/:listId, and each screen gets its concrete SmartListId at compile time.
 */
const routes: RouteObject[] = [
  { path: '/', element: <Navigate to="/app/today" replace /> },
  { path: '/login', element: <LoginScreen /> },
  { path: '/register', element: <RegisterScreen /> },
  { path: '/verify-email', element: <VerifyEmailScreen /> },
  { path: '/forgot-password', element: <ForgotPasswordScreen /> },
  { path: '/reset-password', element: <ResetPasswordScreen /> },
  {
    path: '/app',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/app/today" replace /> },
      { path: 'today', element: <SmartListScreen id={SmartListId.TODAY} /> },
      { path: 'upcoming', element: <SmartListScreen id={SmartListId.UPCOMING} /> },
      { path: 'overdue', element: <SmartListScreen id={SmartListId.OVERDUE} /> },
      { path: 'priority', element: <SmartListScreen id={SmartListId.HIGH_PRIORITY} /> },
      { path: 'no-date', element: <SmartListScreen id={SmartListId.NO_DATE} /> },
      { path: 'all', element: <SmartListScreen id={SmartListId.ALL} /> },
      { path: 'completed', element: <SmartListScreen id={SmartListId.COMPLETED} /> },
      { path: 'list/:listId', element: <ListScreen /> },
      { path: 'lists', element: <ListsScreen /> },
      { path: 'tags', element: <TagsScreen /> },
      { path: 'search', element: <SearchScreen /> },
      { path: 'calendar', element: <CalendarScreen /> },
      { path: 'stats', element: <ComingSoon feature="Statistics" icon={BarChart3} /> },
      { path: 'settings', element: <SettingsScreen /> },
    ],
  },
  { path: '*', element: <Navigate to="/app/today" replace /> },
];

// Annotate to avoid TS2742 (RemixRouter type isn't nameable across pnpm symlinks).
export const router: RouterProviderProps['router'] = createBrowserRouter(routes);
