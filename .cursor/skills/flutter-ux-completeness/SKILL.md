---
name: flutter-ux-completeness
description: Ensure all interactive Flutter widgets have functional handlers. Use when creating Flutter UI components, reviewing widget code, or fixing empty onTap/onPressed handlers. Prevents UX frustration from non-functional buttons.
---

# Flutter UX Completeness

Every interactive widget must do something visible when tapped.

## The Problem

```dart
// WRONG: Button looks functional but does nothing
ElevatedButton(
  onPressed: () {}, // Empty handler - user frustration!
  child: Text('Submit'),
)

// WRONG: Card is tappable but silent
ListTile(
  onTap: () {}, // Nothing happens!
  title: Text('View Profile'),
)
```

Users tap and nothing happens. This is confusing and frustrating.

## Solutions

### Option 1: Implement Real Functionality

```dart
// CORRECT: Actually does something
ElevatedButton(
  onPressed: () {
    ref.read(provider.notifier).submit();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Submitted!')),
    );
  },
  child: Text('Submit'),
)
```

### Option 2: Navigate Somewhere

```dart
// CORRECT: Navigate to relevant screen
ListTile(
  onTap: () => context.push('/profile/${user.id}'),
  title: Text('View Profile'),
)

// CORRECT: Navigate with query parameters
ElevatedButton(
  onPressed: () => context.push('/search?query=${Uri.encodeComponent(query)}'),
  child: Text('Search'),
)
```

### Option 3: Show Feedback (When Not Implemented Yet)

```dart
// CORRECT: Tell user it's coming
ElevatedButton(
  onPressed: () {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Coming soon!')),
    );
  },
  child: Text('Premium Feature'),
)
```

### Option 4: Disable Visual When Not Ready

```dart
// CORRECT: Button is visually disabled
ElevatedButton(
  onPressed: null, // null = disabled state
  child: Text('Submit'),
)

// CORRECT: Conditional disable
ElevatedButton(
  onPressed: isLoading ? null : () => submit(),
  child: Text('Submit'),
)
```

## Common Patterns

### Connection/Network Actions

```dart
IconButton(
  icon: Icon(Icons.person_add),
  onPressed: () async {
    try {
      await ref.read(connectionProvider.notifier).sendRequest(userId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Connection request sent!')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed: $e')),
        );
      }
    }
  },
)
```

### Card/Item Taps

```dart
Card(
  child: InkWell(
    onTap: () => context.push('/detail/${item.id}'),
    child: ListTile(
      title: Text(item.name),
    ),
  ),
)
```

### Form Actions

```dart
TextFormField(
  onFieldSubmitted: (value) => _performSearch(value),
)

DropdownButton(
  onChanged: (value) {
    setState(() => _selectedValue = value);
    _applyFilter(value);
  },
)
```

## Riverpod Integration

```dart
// Reading state
ElevatedButton(
  onPressed: () => ref.read(counterProvider.notifier).increment(),
  child: Text('Increment'),
)

// With async action
ElevatedButton(
  onPressed: () async {
    await ref.read(dataProvider.notifier).refresh();
    // Provider will notify listeners automatically
  },
  child: Text('Refresh'),
)

// Invalidating cache
IconButton(
  icon: Icon(Icons.refresh),
  onPressed: () => ref.invalidate(dataProvider),
)
```

## Checklist

Before submitting Flutter UI code:
- [ ] Every `onPressed` has non-empty body OR is `null` (disabled)
- [ ] Every `onTap` has non-empty body OR is `null` (disabled)
- [ ] Every `onChanged` actually updates state or triggers action
- [ ] Async handlers use `if (mounted)` before context operations
- [ ] Navigation uses proper GoRouter methods (`push`, `go`, `replace`)
- [ ] User feedback shown via SnackBar or similar for actions
