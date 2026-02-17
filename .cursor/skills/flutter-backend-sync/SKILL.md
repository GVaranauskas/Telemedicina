---
name: flutter-backend-sync
description: Ensures Flutter frontend models match backend API responses. Use when creating DTOs, debugging data fetching, or fixing mismatches between backend and frontend models.
---

# Backend-Frontend Model Sync

## Problem
Frontend models and backend DTOs get out of sync, causing missing data or null pointer exceptions:

```dart
// Backend returns:
{ "id": "123", "email": "a@b.com" }  // No fullName

// Frontend expects:
Text(user.fullName)  // null error!
```

## Common Scenarios

### 1. Field Name Mismatches
```dart
// Backend: snake_case
{ "doctor_id": "123", "full_name": "John" }

// Frontend: camelCase (correct in Dart)
final String doctorId;   // Won't match "doctor_id"
final String fullName;   // Won't match "full_name"
```

### 2. Missing Fields in Response
```dart
// Backend AuthResponse:
{ 
  "user": { "id": "123", "email": "a@b.com" },
  "accessToken": "...",
  "refreshToken": "..."
}

// Frontend UserModel expects fullName
// Solution: Fetch from separate endpoint
```

### 3. Different Data Structures
```dart
// Backend: Flat object
{ "id": "1", "name": "Cardio", "primary": true }

// Frontend: Nested object
{ 
  "id": "1", 
  "specialty": { "name": "Cardio" },
  "isPrimary": true 
}
```

## Prevention Checklist

When creating or updating API integration:

- [ ] Review backend DTO/response structure
- [ ] Map all fields from backend to frontend
- [ ] Handle JSON naming conventions (snake_case → camelCase)
- [ ] Account for nullable fields
- [ ] Fetch additional data if API doesn't return everything needed
- [ ] Test with real API responses

## Verification Steps

1. **Check backend DTO:**
   ```bash
   find backend -name "*.dto.ts" -o -name "*.entity.ts" | xargs grep -l "ClassName"
   ```

2. **Test API endpoint:**
   ```bash
   curl http://localhost:3000/api/v1/endpoint | jq .
   ```

3. **Compare with frontend model:**
   ```bash
   cat lib/core/models/model.dart
   ```

## Pattern: Enrich Model After Auth

When auth response doesn't include all user data:

```dart
Future<bool> login(String email, String password) async {
  final response = await _repo.login(email, password);
  await ApiClient.saveTokens(response.accessToken, response.refreshToken);
  
  // Fetch additional user data
  UserModel userWithFullName = response.user;
  if (response.user.doctorId != null) {
    try {
      final doctor = await doctorRepo.getMyProfile();
      userWithFullName = UserModel(
        id: response.user.id,
        email: response.user.email,
        role: response.user.role,
        doctorId: response.user.doctorId,
        fullName: doctor.fullName,  // Enrich with additional data
      );
    } catch (_) {
      // Continue with basic user data
    }
  }
  
  state = state.copyWith(user: userWithFullName);
  return true;
}
```

## Example Fix

**Problem:** `fullName` not available after login

**Solution:**
1. Add `fullName` field to `UserModel` (nullable)
2. After successful login, fetch doctor profile
3. Merge data into enriched `UserModel`
4. Update auth state with complete user data

## Best Practices

1. **Always check actual API responses** - Don't assume structure
2. **Make fields nullable** if backend might not return them:
   ```dart
   final String? fullName;
   ```
3. **Provide sensible defaults** for UI display:
   ```dart
   user?.fullName ?? 'Doutor'
   ```
4. **Separate concerns** - Auth response for tokens, separate call for profile
5. **Document required vs optional fields** in model comments

## Related Files

- `backend/src/modules/**/dto/*.dto.ts` - Backend DTOs
- `backend/src/modules/**/*.controller.ts` - API endpoints
- `lib/core/models/` - Frontend models
- `lib/core/repositories/` - Data fetching
