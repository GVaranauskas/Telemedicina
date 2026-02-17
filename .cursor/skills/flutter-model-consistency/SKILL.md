---
name: flutter-model-consistency
description: Ensures model classes have all fields required by the UI. Use when creating models, fetching API data, or fixing 'NoSuchMethodError' for missing fields.
---

# Model-UI Consistency

## Problem
Model classes often lack fields that the UI expects, causing runtime errors:
```
NoSuchMethodError: 'fieldName' method not found
Receiver: Instance of 'ModelName'
```

## Common Scenarios

### 1. Model Missing Fields from API Response
When the API returns fields not mapped in the model:

```dart
// API returns:
{ "id": "123", "email": "a@b.com", "fullName": "John Doe" }

// Model only has:
class UserModel {
  final String id;
  final String email;
  // Missing: fullName!
}
```

### 2. UI Expecting Fields Not in Model
When widgets reference fields that don't exist:

```dart
// UI expects:
Text(user.fullName)  // Error if fullName doesn't exist

// But model only has:
class UserModel {
  final String id;
  final String email;
}
```

## Prevention Checklist

When creating or updating models:

- [ ] Check all UI files that use this model for field references
- [ ] Verify API response includes all needed fields
- [ ] Add all required fields to the model
- [ ] Update `fromJson` to parse new fields
- [ ] Update `toJson` to serialize new fields
- [ ] Make fields nullable (`?`) if API might not always return them

## Verification Steps

1. **Find all field references in UI:**
   ```bash
   grep -r "user\.fieldName" lib/features/
   ```

2. **Check model definition:**
   ```bash
   grep -A 20 "class UserModel" lib/core/models/user_model.dart
   ```

3. **Verify API response includes field:**
   Test the API endpoint or check backend DTO

## Example Fix

**Problem:** UI expects `user.fullName` but model doesn't have it

**Solution:**
```dart
// lib/core/models/user_model.dart
class UserModel {
  final String id;
  final String email;
  final String role;
  final String? doctorId;
  final String? fullName;  // Add missing field

  UserModel({
    required this.id,
    required this.email,
    required this.role,
    this.doctorId,
    this.fullName,  // Add to constructor
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'],
      email: json['email'],
      role: json['role'],
      doctorId: json['doctorId'],
      fullName: json['fullName'],  // Parse from JSON
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'email': email,
    'role': role,
    'doctorId': doctorId,
    'fullName': fullName,  // Serialize to JSON
  };
}
```

## Best Practices

1. **Use nullable fields for optional data:**
   ```dart
   final String? fullName;  // API might not return this
   ```

2. **Provide defaults for critical fields:**
   ```dart
   fullName: json['fullName'] ?? 'Usuário',
   ```

3. **Fetch additional data if needed:**
   ```dart
   // If API doesn't return fullName, fetch from another endpoint
   Future<void> loadUserDetails() async {
     final user = await authRepo.getUser();
     if (user.doctorId != null) {
       final doctor = await doctorRepo.getProfile(user.doctorId!);
       // Merge data
     }
   }
   ```

## Related Files

- `lib/core/models/` - All model classes
- `lib/core/repositories/` - Data fetching logic
