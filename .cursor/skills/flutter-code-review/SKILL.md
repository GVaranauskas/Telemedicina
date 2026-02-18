---
name: flutter-code-review
description: Reviews Flutter code for common consistency issues before they become errors. Use when reviewing PRs, completing feature implementation, or before committing changes to prevent runtime errors.
---

# Flutter Code Review Checklist

## Quick Review Process

Before marking Flutter code as complete, run through this checklist:

### 1. Routes & Navigation
```
[ ] New screens are registered in app_router.dart
[ ] Route paths match navigation calls (context.push('/path'))
[ ] Screen imports are added to app_router.dart
[ ] ShellRoute children are properly configured for bottom nav
```

### 2. Model Consistency
```
[ ] Model fields match API response structure
[ ] fromJson parses all API fields
[ ] toJson serializes all fields
[ ] Nullable fields (?) used for optional API data
[ ] UI references to model fields actually exist
```

### 3. Theme Consistency
```
[ ] Theme properties exist before using them
[ ] No deprecated methods (withOpacity -> withAlpha)
[ ] Semantic color names used consistently
[ ] TextStyle names match theme definitions
```

### 4. Backend-Frontend Sync
```
[ ] Reviewed backend DTO structure
[ ] Field names match (snake_case -> camelCase in fromJson)
[ ] Account for missing fields in API responses
[ ] Enrich models with additional API calls if needed
```

## Common Error Patterns to Catch

### Pattern 1: Missing Route
**Code:**
```dart
// Some widget doing:
context.push('/feed')
```
**Check:** Does `app_router.dart` have `path: '/feed'`?

### Pattern 2: Missing Model Field
**Code:**
```dart
// UI expecting:
Text(user.fullName)
```
**Check:** Does `UserModel` have `final String? fullName;`?

### Pattern 3: Wrong Theme Property
**Code:**
```dart
// Widget using:
color: MedConnectColors.foreground
```
**Check:** Does theme define `foreground` or should it be `textPrimary`?

### Pattern 4: API Mismatch
**Code:**
```dart
// fromJson parsing:
fullName: json['fullName']
```
**Check:** Does API return `fullName` or different field name?

## Verification Commands

Run these before completing work:

```bash
# Check for analysis errors
flutter analyze

# Check for compilation issues
flutter build web --debug

# List all screen files without routes
for file in $(find lib/features -name "*_screen.dart"); do
  name=$(basename "$file" _screen.dart)
  if ! grep -q "path: '/$name'" lib/core/routing/app_router.dart; then
    echo "Missing route: /$name"
  fi
done
```

## Review Priorities

### 🔴 Critical (Fix Before Merge)
- Missing routes causing runtime errors
- Model fields missing that UI expects
- Theme properties that don't exist

### 🟡 Important (Should Fix)
- Unused imports
- Deprecated method usage
- Missing null safety checks

### 🟢 Nice to Have
- Performance optimizations
- Code style improvements
- Documentation additions

## Related Skills

- `flutter-gorouter-routes` - Detailed route registration guidance
- `flutter-model-consistency` - Model field validation
- `flutter-theme-widget-consistency` - Theme property validation
- `flutter-backend-sync` - Backend-frontend synchronization
