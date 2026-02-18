---
name: flutter-theme-widget-consistency
description: Ensures widget code references existing theme properties. Use when creating custom widgets, refactoring themes, or fixing 'getter not defined' errors with theme classes.
---

# Theme-Widget Consistency

## Problem
Widget code references theme properties that don't exist, causing compilation errors:
```
error: The getter 'propertyName' isn't defined for the type 'ThemeClass'
```

## Common Issues

### 1. Referencing Non-Existent Color Properties
```dart
// Widget tries to use:
MedConnectColors.foreground
MedConnectColors.destructive
MedConnectColors.foregroundMuted

// But theme only defines:
MedConnectColors.textPrimary
MedConnectColors.error
MedConnectColors.textSecondary
```

### 2. Referencing Non-Existent TextStyles
```dart
// Widget tries to use:
MedConnectTextStyles.button
MedConnectTextStyles.label

// But theme only defines:
MedConnectTextStyles.buttonMedium
MedConnectTextStyles.buttonLarge
MedConnectTextStyles.labelMedium
```

### 3. Using Deprecated Methods
```dart
// Deprecated:
color.withOpacity(0.5)

// Should use:
color.withAlpha(128)  // or .withValues()
```

## Prevention Checklist

When creating/updating widgets:

- [ ] Verify color property exists in theme class
- [ ] Verify text style exists in theme class
- [ ] Use correct method names (no deprecated methods)
- [ ] Prefer semantic names over literal color values

## Theme Mapping Reference

### Colors
| Wrong | Correct |
|-------|---------|
| `foreground` | `textPrimary` |
| `foregroundMuted` | `textSecondary` |
| `foregroundSubtle` | `textTertiary` |
| `destructive` | `error` |
| `destructiveForeground` | `textInverse` |
| `successForeground` | `textInverse` |

### TextStyles
| Wrong | Correct |
|-------|---------|
| `button` | `buttonMedium` / `buttonLarge` |
| `label` | `labelMedium` / `labelLarge` |

### Methods
| Wrong | Correct |
|-------|---------|
| `withOpacity(0.5)` | `withAlpha(128)` |
| `withOpacity(0.2)` | `withAlpha(51)` |

## Verification Steps

1. **Check theme definition:**
   ```bash
   grep "static const Color" lib/core/theme/medconnect_theme.dart
   grep "static TextStyle get" lib/core/theme/medconnect_theme.dart
   ```

2. **Find all theme references:**
   ```bash
   grep -r "MedConnectColors\." lib/ --include="*.dart"
   grep -r "MedConnectTextStyles\." lib/ --include="*.dart"
   ```

## Example Fix

**Problem:** Compilation errors in `medconnect_components.dart`

**Solution:**
```dart
// Before (error):
style: MedConnectTextStyles.button.copyWith(...)
color: MedConnectColors.foreground
color: MedConnectColors.destructive

// After (fixed):
style: MedConnectTextStyles.buttonMedium.copyWith(...)
color: MedConnectColors.textPrimary
color: MedConnectColors.error
```

## Best Practices

1. **Check theme file before using a property**
2. **Use semantic color names:**
   - `textPrimary` - Main text
   - `textSecondary` - Subtitles
   - `textTertiary` - Hints/placeholders
   - `error` - Error states

3. **Run analyzer after theme changes:**
   ```bash
   flutter analyze
   ```

## Related Files

- `lib/core/theme/medconnect_theme.dart` - Theme definitions
- `lib/core/widgets/` - Custom widgets using theme
