---
name: flutter-widget-naming
description: Avoid naming conflicts between custom widgets and Flutter's built-in widgets. Use when creating reusable Flutter components or widget libraries. Prevents compilation errors and confusion.
---

# Flutter Widget Naming Conventions

Custom widgets should have unique names that don't conflict with Material or Cupertino widgets.

## The Problem

```dart
// WRONG: Conflicts with Flutter's Card widget
class Card extends StatelessWidget { ... }

// WRONG: Conflicts with Flutter's Divider widget
class Divider extends StatelessWidget { ... }

// WRONG: Conflicts with Flutter's Button widget
class Button extends StatelessWidget { ... }
```

When you create a widget named `Card`, you shadow Flutter's `Card`. This causes:
- Confusion about which Card is being used
- Import conflicts requiring `hide` keyword
- Potential bugs when refactoring

## Solution: Use App Prefix

### Recommended Prefix Pattern

```dart
// CORRECT: App-specific prefix
class MedCard extends StatelessWidget { ... }
class MedDivider extends StatelessWidget { ... }
class MedButton extends StatelessWidget { ... }

// Alternative: Full app name
class MedConnectCard extends StatelessWidget { ... }

// Alternative: Common UI prefix
class UiCard extends StatelessWidget { ... }
class UiButton extends StatelessWidget { ... }
```

## Widgets That Need Renaming

### Material Widgets to Avoid

| Avoid | Use Instead |
|-------|-------------|
| `Card` | `MedCard`, `AppCard` |
| `Divider` | `MedDivider`, `AppDivider` |
| `Button` | `MedButton`, `AppButton` |
| `Chip` | `MedChip`, `AppChip` |
| `Badge` | `MedBadge`, `AppBadge` |
| `Avatar` | `MedAvatar`, `AppAvatar` |
| `Input` | `MedInput`, `AppInput` |
| `TextField` | `MedTextField`, `AppTextField` |
| `Dialog` | `MedDialog`, `AppDialog` |
| `Modal` | `MedModal`, `AppModal` |
| `Toast` | `MedToast`, `AppToast` |
| `Snackbar` | `MedSnackbar`, `AppSnackbar` |
| `Loader` | `MedLoader`, `AppLoader` |
| `Skeleton` | `MedSkeleton`, `AppSkeleton` |
| `EmptyState` | `MedEmptyState`, `AppEmptyState` |
| `Section` | `MedSection`, `AppSection` |

### Cupertino Widgets to Avoid

| Avoid | Use Instead |
|-------|-------------|
| `Switch` | `MedSwitch`, `AppSwitch` |
| `Slider` | `MedSlider`, `AppSlider` |
| `Picker` | `MedPicker`, `AppPicker` |

## When Using Both Custom and Built-in

If you must use both your custom widget and Flutter's built-in:

```dart
// Import with hide
import 'package:flutter/material.dart' hide Card, Divider;
import 'widgets/medconnect_components.dart';

// Now Card refers to your MedCard
Card(child: Text('Hello')),

// Use Flutter's Card with prefix
material.Card(child: Text('Material Card')),
```

But this is confusing. Better to just rename your widgets.

## File Organization

```
lib/
├── core/
│   └── widgets/
│       ├── medconnect_components.dart  # All custom widgets with Med prefix
│       ├── med_card.dart
│       ├── med_button.dart
│       ├── med_divider.dart
│       └── ...
```

### Barrel Export

```dart
// medconnect_components.dart
export 'med_card.dart';
export 'med_button.dart';
export 'med_divider.dart';
export 'med_badge.dart';
export 'med_avatar.dart';
export 'med_input.dart';
export 'med_skeleton.dart';
export 'med_empty_state.dart';
export 'med_section.dart';
```

## Example: Custom Card Widget

```dart
// med_card.dart
import 'package:flutter/material.dart';
import 'medconnect_theme.dart';

class MedCard extends StatefulWidget {
  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry? padding;
  final Color? backgroundColor;
  final bool hoverable;

  const MedCard({
    super.key,
    required this.child,
    this.onTap,
    this.padding,
    this.backgroundColor,
    this.hoverable = true,
  });

  @override
  State<MedCard> createState() => _MedCardState();
}

class _MedCardState extends State<MedCard> {
  // Implementation...
}
```

## Checklist

Before creating a new widget:
- [ ] Search if name conflicts with Material widget
- [ ] Search if name conflicts with Cupertino widget
- [ ] Add app prefix (e.g., `Med`, `App`, `Ui`)
- [ ] Name file with same prefix (`med_card.dart`)
- [ ] Export from barrel file
