---
name: null-safety-guards
description: Prevent null pointer exceptions and division by zero bugs. Use when writing code that accesses object properties, array elements, or performs division. Covers TypeScript, Dart/Flutter, and general patterns.
---

# Null Safety & Division Guards

Prevent runtime crashes from null access and division by zero.

## Division by Zero

### Always Guard Divisions

```typescript
// WRONG: Crashes if array is empty
const percentage = (completed / total) * 100;

// CORRECT: Guard with ternary
const percentage = total > 0
  ? Math.round((completed / total) * 100)
  : 0;

// CORRECT: Guard with nullish coalescing
const percentage = total ? Math.round((completed / total) * 100) : 0;
```

### Common Scenarios

```typescript
// Array length division
const avg = items.length > 0 ? sum / items.length : 0;

// Object property division
const ratio = obj.denominator ? obj.numerator / obj.denominator : 0;

// Neo4j integer conversion
const count = neo4jResult.total > 0 ? completed / neo4jResult.total : 0;
```

## Null Pointer Prevention

### Array Access

```typescript
// WRONG: Crashes if array empty
const first = arr[0].name;

// CORRECT: Optional chaining
const first = arr[0]?.name;

// CORRECT: Check length first
const first = arr.length > 0 ? arr[0].name : null;

// CORRECT: Nullish coalescing with default
const first = arr[0]?.name ?? 'Unknown';
```

### Nested Object Access

```typescript
// WRONG: Crashes if any level is null
const city = user.address.city.name;

// CORRECT: Chain optional access
const city = user?.address?.city?.name;

// CORRECT: With default
const city = user?.address?.city?.name ?? 'Unknown';
```

### Function Parameters

```typescript
// WRONG: Assumes param exists
function greet(name: string) {
  return name.toUpperCase();
}

// CORRECT: Handle undefined
function greet(name?: string) {
  return (name ?? 'Guest').toUpperCase();
}

// CORRECT: Default parameter
function greet(name: string = 'Guest') {
  return name.toUpperCase();
}
```

## Dart/Flutter Specifics

### Null Safety Syntax

```dart
// WRONG: Crashes if null
String name = user.name;

// CORRECT: Nullable type
String? name = user.name;

// CORRECT: Null check with assertion
String name = user.name!; // Only if you're certain

// CORRECT: Safe access with default
String name = user.name ?? 'Unknown';

// CORRECT: Conditional member access
String? upperName = user.name?.toUpperCase();
```

### Widget Null Safety

```dart
// WRONG: Crashes if null
Text(user.name)

// CORRECT: Handle null
Text(user.name ?? 'Unknown')

// CORRECT: Conditional widget
if (user.name != null) Text(user.name),
```

## TypeScript Strict Checks

### Enable Strict Mode

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true
  }
}
```

### Array Access with NoUncheckedIndexedAccess

```typescript
// With noUncheckedIndexedAccess enabled
const arr = [1, 2, 3];
const first: number | undefined = arr[0]; // Type includes undefined

// Must handle undefined
if (first !== undefined) {
  console.log(first.toFixed(2));
}
```

## Neo4j Integer Handling

```typescript
// Neo4j returns integers as { low: number, high: number }
// WRONG: Treats object as number
const count = result.count;

// CORRECT: Extract low value
const count = result.count?.low ?? result.count ?? 0;

// CORRECT: Use helper function
function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && 'low' in value) return value.low;
  return Number(value) || 0;
}
```

## Checklist

Before submitting code:
- [ ] All divisions have denominator > 0 guard
- [ ] Array access uses optional chaining or length check
- [ ] Nested object access uses `?.` operator
- [ ] Function parameters handle undefined/null cases
- [ ] Neo4j integers converted with `.low` or helper
- [ ] No `!` assertion operators unless absolutely certain
