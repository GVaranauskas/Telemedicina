---
name: flutter-gorouter-routes
description: Ensures all screen widgets are properly registered in GoRouter routes. Use when creating new screens, adding navigation, or reviewing routing setup to prevent 'no routes for location' errors.
---

# GoRouter Route Registration

## Problem
When adding a new screen widget, developers often forget to register the corresponding route in the router configuration, causing runtime errors like:
```
GoException: no routes for location: /screen-name
```

## Prevention Checklist

When creating or modifying screens:

- [ ] Check if the route already exists in `app_router.dart`
- [ ] Import the screen widget in `app_router.dart`
- [ ] Add the GoRoute entry with correct path
- [ ] Verify the path matches navigation calls (e.g., `context.push('/path')`)
- [ ] Test navigation to the new route

## Common Route Patterns

### Standalone Route
```dart
GoRoute(
  path: '/screen-name',
  builder: (context, state) => const ScreenName(),
),
```

### Route with Parameters
```dart
GoRoute(
  path: '/screen-name/:id',
  builder: (context, state) {
    final id = state.pathParameters['id']!;
    return ScreenName(id: id);
  },
),
```

### Route with Query Parameters
```dart
GoRoute(
  path: '/search',
  builder: (context, state) {
    final query = state.uri.queryParameters['query'] ?? '';
    return SearchScreen(initialQuery: query);
  },
),
```

### Nested Route (ShellRoute with bottom nav)
```dart
ShellRoute(
  navigatorKey: _shellNavigatorKey,
  builder: (context, state, child) => MainScaffold(child: child),
  routes: [
    GoRoute(
      path: '/home',
      builder: (context, state) => const HomeScreen(),
    ),
    // Add new routes here
  ],
),
```

## Verification Steps

1. **Find all screen files:**
   ```bash
   find lib/features -name "*_screen.dart" -o -name "*screen.dart"
   ```

2. **Check for matching routes:**
   ```bash
   grep -r "path: '/screen-name'" lib/core/routing/
   ```

3. **Verify navigation calls:**
   ```bash
   grep -r "context.push('/screen-name')" lib/
   ```

## Example Fix

**Problem:** `GoException: no routes for location: /feed`

**Solution:**
```dart
// In app_router.dart
import '../../features/feed/presentation/feed_screen.dart';  // 1. Import

// 2. Add route
GoRoute(
  path: '/feed',
  builder: (context, state) => const FeedScreen(),
),
```

## Related Files

- `lib/core/routing/app_router.dart` - Main router configuration
- `lib/shared/widgets/main_scaffold.dart` - Bottom navigation scaffold
