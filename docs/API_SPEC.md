# API Specification (v1)

---

## Base URLs

| Service | Base URL |
|---------|----------|
| Auth | `/api/v1/auth` |
| Room | `/api/v1/rooms` |

---

## Global Conventions

### Authentication

All authenticated endpoints require the following header:

```
Authorization: Bearer <access_token>
```

Where `<access_token>` is a 64-character hex string (32 bytes of cryptographically secure random data) issued during login or registration.

---

## Authentication Service

---

### Register

<details>
<summary><strong>POST</strong> `/api/v1/auth/register` | Auth: No</summary>

#### Request

```json
{
  "name": "John Doe",
  "username": "johndoe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "password": "Password123!"
}
```

#### Response (200 OK)

```json
{
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "John Doe",
      "username": "johndoe",
      "email": "john@example.com",
      "phone": "+1234567890"
    },
    "access_token": "eyJhbGciOiJIUzI1..."
  }
}
```

#### Errors

<details>
<summary>Show Errors</summary>

**409 USER_EXISTS**

```json
{
  "error": {
    "code": "USER_EXISTS",
    "message": "One or more credentials (email, username, or phone) are already in use",
    "details": []
  }
}
```

**400 VALIDATION_ERROR**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": [
      { "field": "name", "issue": "required", "message": "Name is required" },
      { "field": "name", "issue": "min_length", "message": "Name must be at least 1 character" },
      { "field": "name", "issue": "max_length", "message": "Name must be at most 100 characters" },
      { "field": "username", "issue": "required", "message": "Username is required" },
      { "field": "username", "issue": "min_length", "message": "Username must be at least 3 characters" },
      { "field": "username", "issue": "max_length", "message": "Username must be at most 20 characters" },
      { "field": "username", "issue": "format", "message": "Username must contain only letters, numbers, and underscores" },
      { "field": "email", "issue": "required", "message": "Email is required" },
      { "field": "email", "issue": "format", "message": "Invalid email format" },
      { "field": "phone", "issue": "required", "message": "Phone is required" },
      { "field": "phone", "issue": "format", "message": "Phone must be in E.164 format (e.g., +1234567890)" },
      { "field": "password", "issue": "required", "message": "Password is required" },
      { "field": "password", "issue": "min_length", "message": "Password must be at least 8 characters" },
      { "field": "password", "issue": "complexity", "message": "Password must contain uppercase, lowercase, number, and special character" }
    ]
  }
}
```

</details>
</details>

---

### Login

<details>
<summary><strong>POST</strong> `/api/v1/auth/login` | Auth: No</summary>

Supports login via email, username, or phone number.

#### Request

```json
{
  "identifier": "+1234567890",
  "password": "Password123!"
}
```

#### Response (200 OK)

```json
{
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "John Doe",
      "username": "johndoe",
      "email": "john@example.com",
      "phone": "+1234567890"
    },
    "access_token": "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456"
  }
}
```

#### Errors

<details>
<summary>Show Errors</summary>

**400 VALIDATION_ERROR**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Identifier is required",
    "details": [
      {
        "field": "identifier",
        "issue": "required",
        "message": "Email, username, or phone is required"
      }
    ]
  }
}
```

**401 INVALID_CREDENTIALS**

```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "The credentials provided are incorrect",
    "details": []
  }
}
```

</details>
</details>

---

### Logout

<details>
<summary><strong>POST</strong> `/api/v1/auth/logout` | Auth: Yes</summary>

Header: `Authorization: Bearer <access_token>`

#### Response (200 OK)

```json
{
  "data": {
    "success": true,
    "message": "Successfully logged out"
  }
}
```

#### Errors

<details>
<summary>Show Errors</summary>

**401 UNAUTHORIZED**

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required: token is missing or invalid",
    "details": []
  }
}
```

</details>
</details>

---

## Passkey Authentication

Hanko SDK integration for passwordless authentication.

---

### Passkey Register Start

<details>
<summary><strong>POST</strong> `/api/v1/auth/passkey/register/start` | Auth: Yes</summary>

Header: `Authorization: Bearer <access_token>`

Initiates passkey registration. The authenticated user's ID is extracted from the token.

#### Response (200 OK)

```json
{
  "data": {
    "create_options": {
      "publicKey": {
        "challenge": "base64url_challenge",
        "rp": { "name": "My App", "id": "example.com" },
        "user": {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "name": "johndoe",
          "displayName": "John Doe"
        },
        "pubKeyCredParams": [{ "type": "public-key", "alg": -7 }],
        "timeout": 60000,
        "attestation": "none"
      }
    }
  }
}
```

#### Errors

<details>
<summary>Show Errors</summary>

**401 UNAUTHORIZED**

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required: token is missing or invalid",
    "details": []
  }
}
```

</details>
</details>

---

### Passkey Register Finish

<details>
<summary><strong>POST</strong> `/api/v1/auth/passkey/register/finish` | Auth: Yes</summary>

Header: `Authorization: Bearer <access_token>`

Completes passkey registration after the user completes the WebAuthn ceremony in the browser.

#### Request

```json
{
  "credential": {
    "id": "credential_id",
    "rawId": "base64url_raw_id",
    "type": "public-key",
    "response": {
      "clientDataJSON": "base64url",
      "attestationObject": "base64url"
    }
  }
}
```

#### Response (200 OK)

```json
{
  "data": {
    "verified": true,
    "passkey_id": "7b3a9211-f2d1-4c32-b8a9-112233445566"
  }
}
```

#### Errors

<details>
<summary>Show Errors</summary>

**401 UNAUTHORIZED**

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required: token is missing or invalid",
    "details": []
  }
}
```

**400 VERIFICATION_FAILED**

```json
{
  "error": {
    "code": "VERIFICATION_FAILED",
    "message": "WebAuthn signature or challenge verification failed",
    "details": []
  }
}
```

</details>
</details>

---

### Passkey Login Start

<details>
<summary><strong>POST</strong> `/api/v1/auth/passkey/login/start` | Auth: No</summary>

Initiates passkey authentication. The server generates a challenge and returns the user's registered passkeys for the browser to select from.

#### Request

```json
{
  "identifier": "john@example.com"
}
```

#### Response (200 OK)

```json
{
  "data": {
    "request_options": {
      "publicKey": {
        "challenge": "base64url_challenge",
        "rpId": "example.com",
        "timeout": 60000,
        "userVerification": "preferred",
        "allowCredentials": [
          {
            "id": "base64url_credential_id",
            "type": "public-key",
            "transports": ["usb", "nfc", "ble"]
          }
        ]
      }
    }
  }
}
```

| Field | Description |
|-------|-------------|
| challenge | Server-generated random challenge (stored for verification on finish) |
| allowCredentials | List of user's registered passkey credential IDs for the browser to select from |

#### Errors

<details>
<summary>Show Errors</summary>

**400 VALIDATION_ERROR**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Identifier is required",
    "details": [
      {
        "field": "identifier",
        "issue": "required",
        "message": "Identifier is required"
      }
    ]
  }
}
```

**404 USER_NOT_FOUND**

```json
{
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "No user found with the provided identifier",
    "details": []
  }
}
```

**404 NO_PASSKEYS**

```json
{
  "error": {
    "code": "NO_PASSKEYS",
    "message": "No passkeys registered for this user",
    "details": []
  }
}
```

</details>
</details>

---

### Passkey Login Finish

<details>
<summary><strong>POST</strong> `/api/v1/auth/passkey/login/finish` | Auth: No</summary>

Completes passkey authentication after the user completes the WebAuthn assertion in the browser.

#### Request

```json
{
  "credential": {
    "id": "7b3a9211-f2d1-4c32-b8a9-112233445566",
    "rawId": "base64url_raw_id",
    "type": "public-key",
    "response": {
      "clientDataJSON": "base64url",
      "authenticatorData": "base64url",
      "signature": "base64url",
      "userHandle": "base64url"
    }
  }
}
```

#### Response (200 OK)

```json
{
  "data": {
    "verified": true,
    "access_token": "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "John Doe",
      "username": "johndoe",
      "email": "john@example.com",
      "phone": "+1234567890"
    }
  }
}
```

#### Errors

<details>
<summary>Show Errors</summary>

**400 VERIFICATION_FAILED**

```json
{
  "error": {
    "code": "VERIFICATION_FAILED",
    "message": "WebAuthn signature or challenge verification failed",
    "details": []
  }
}
```

</details>
</details>

---

### Delete Passkey

<details>
<summary><strong>DELETE</strong> `/api/v1/auth/passkey/{passkey_id}` | Auth: Yes</summary>

Header: `Authorization: Bearer <access_token>`

#### Response (200 OK)

```json
{
  "data": {
    "deleted": true,
    "passkey_id": "7b3a9211-f2d1-4c32-b8a9-112233445566",
    "message": "Passkey successfully removed"
  }
}
```

#### Errors

<details>
<summary>Show Errors</summary>

**404 PASSKEY_NOT_FOUND**

```json
{
  "error": {
    "code": "PASSKEY_NOT_FOUND",
    "message": "The specified passkey does not exist or does not belong to this user"
  }
}
```

**401 UNAUTHORIZED**

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required: token is missing or invalid",
    "details": []
  }
}
```

</details>
</details>

---

### List My Passkeys

<details>
<summary><strong>GET</strong> `/api/v1/auth/passkey/list` | Auth: Yes</summary>

Header: `Authorization: Bearer <access_token>`

Returns all passkeys registered for the authenticated user.

#### Response (200 OK)

```json
{
  "data": {
    "passkeys": [
      {
        "id": "7b3a9211-f2d1-4c32-b8a9-112233445566",
        "device": "MacBook Touch ID",
        "created_at": "2026-04-01T10:00:00Z"
      },
      {
        "id": "8c4b0322-e3f2-5d43-c9ba-223344557788",
        "device": "iPhone Face ID",
        "created_at": "2026-04-10T15:30:00Z"
      }
    ]
  }
}
```

#### Errors

<details>
<summary>Show Errors</summary>

**401 UNAUTHORIZED**

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required: token is missing or invalid",
    "details": []
  }
}
```

</details>
</details>

---

### Authentication Design Rules

- Password login is the fallback / legacy option
- Passkey login is the modern passwordless option
- Both can coexist for the same user

Passkey login flow: `identifier -> resolve user -> generate challenge -> verify signature -> issue token`

---

## Room Service

---

### List My Rooms

<details>
<summary><strong>GET</strong> `/api/v1/rooms` | Auth: Yes</summary>

Header: `Authorization: Bearer <access_token>`

Returns rooms the authenticated user is a member of.

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | integer | 20 | Number of rooms per page (max 50) |
| cursor | string | null | Timestamp cursor for pagination |

#### Response (200 OK)

```json
{
  "data": {
    "rooms": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Study Group",
        "description": "For SE class",
        "member_count": 5,
        "max_capacity": 10,
        "join_approval_required": false,
        "created_at": "2026-04-14T10:00:00Z",
        "is_owner": true
      }
    ],
    "pagination": {
      "has_next": true,
      "next_cursor": "2026-04-14T09:30:00Z",
      "limit": 20
    }
  }
}
```

#### Errors

<details>
<summary>Show Errors</summary>

**401 UNAUTHORIZED**

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required: token is missing or invalid",
    "details": []
  }
}
```

</details>
</details>

---

### List Room Hall

<details>
<summary><strong>GET</strong> `/api/v1/rooms/hall` | Auth: Yes</summary>

Header: `Authorization: Bearer <access_token>`

Returns all available rooms with optional filters.

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | integer | 20 | Number of rooms per page (max 50) |
| cursor | string | null | Timestamp cursor for pagination |
| include_joined | boolean | false | Include rooms user has already joined |
| include_full | boolean | false | Include rooms that are at capacity |

#### Response (200 OK)

```json
{
  "data": {
    "rooms": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "name": "Math Tutoring",
        "description": "Help with calculus",
        "member_count": 3,
        "max_capacity": 10,
        "join_approval_required": false,
        "created_at": "2026-04-14T08:00:00Z",
        "is_joined": false,
        "is_full": false
      }
    ],
    "pagination": {
      "has_next": true,
      "next_cursor": "2026-04-14T07:30:00Z",
      "limit": 20
    }
  }
}
```

#### Errors

<details>
<summary>Show Errors</summary>

**401 UNAUTHORIZED**

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required: token is missing or invalid",
    "details": []
  }
}
```

</details>
</details>

---

### Create Room

<details>
<summary><strong>POST</strong> `/api/v1/rooms` | Auth: Yes</summary>

Header: `Authorization: Bearer <access_token>`

#### Request

```json
{
  "name": "Study Group",
  "description": "For SE class",
  "max_capacity": 10,
  "join_approval_required": false
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Room name (max 200 chars) |
| description | string | No | Room description |
| max_capacity | integer | No | Max members (default 10, max 50) |
| join_approval_required | boolean | No | If true, join requests need owner approval (default false) |

#### Response (201 Created)

```json
{
  "data": {
    "room": {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "name": "Study Group",
      "description": "For SE class",
      "member_count": 1,
      "max_capacity": 10,
      "join_approval_required": false,
      "created_at": "2026-04-14T10:00:00Z",
      "is_owner": true
    }
  }
}
```

#### Errors

<details>
<summary>Show Errors</summary>

**400 VALIDATION_ERROR**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": [
      {
        "field": "name",
        "issue": "required",
        "message": "Room name is required"
      }
    ]
  }
}
```

**400 CAPACITY_EXCEEDED**

```json
{
  "error": {
    "code": "CAPACITY_EXCEEDED",
    "message": "Maximum room capacity is 50",
    "details": []
  }
}
```

**401 UNAUTHORIZED**

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required: token is missing or invalid",
    "details": []
  }
}
```

</details>
</details>

---

### Join Room

<details>
<summary><strong>POST</strong> `/api/v1/rooms/{room_id}/join` | Auth: Yes</summary>

Header: `Authorization: Bearer <access_token>`

#### Response (200 OK)

If room does not require approval:

```json
{
  "data": {
    "success": true,
    "room_id": "550e8400-e29b-41d4-a716-446655440002",
    "status": "approved"
  }
}
```

If room requires approval:

```json
{
  "data": {
    "success": true,
    "room_id": "550e8400-e29b-41d4-a716-446655440002",
    "status": "pending"
  }
}
```

#### Errors

<details>
<summary>Show Errors</summary>

**404 ROOM_NOT_FOUND**

```json
{
  "error": {
    "code": "ROOM_NOT_FOUND",
    "message": "The specified room does not exist",
    "details": []
  }
}
```

**400 ROOM_CLOSED**

```json
{
  "error": {
    "code": "ROOM_CLOSED",
    "message": "This room is no longer active",
    "details": []
  }
}
```

**400 ROOM_FULL**

```json
{
  "error": {
    "code": "ROOM_FULL",
    "message": "This room has reached its maximum capacity",
    "details": []
  }
}
```

**409 ALREADY_JOINED**

```json
{
  "error": {
    "code": "ALREADY_JOINED",
    "message": "You are already a member of this room",
    "details": []
  }
}
```

**409 PENDING_REQUEST**

```json
{
  "error": {
    "code": "PENDING_REQUEST",
    "message": "You already have a pending join request",
    "details": []
  }
}
```

**401 UNAUTHORIZED**

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required: token is missing or invalid",
    "details": []
  }
}
```

</details>
</details>

---

### Leave Room

<details>
<summary><strong>POST</strong> `/api/v1/rooms/{room_id}/leave` | Auth: Yes</summary>

Header: `Authorization: Bearer <access_token>`

#### Response (200 OK)

```json
{
  "data": {
    "success": true,
    "room_id": "550e8400-e29b-41d4-a716-446655440002"
  }
}
```

#### Errors

<details>
<summary>Show Errors</summary>

**404 ROOM_NOT_FOUND**

```json
{
  "error": {
    "code": "ROOM_NOT_FOUND",
    "message": "The specified room does not exist",
    "details": []
  }
}
```

**403 NOT_A_MEMBER**

```json
{
  "error": {
    "code": "NOT_A_MEMBER",
    "message": "You are not a member of this room",
    "details": []
  }
}
```

**403 OWNER_CANNOT_LEAVE**

```json
{
  "error": {
    "code": "OWNER_CANNOT_LEAVE",
    "message": "Room owner cannot leave. Please dismiss the room instead.",
    "details": []
  }
}
```

**401 UNAUTHORIZED**

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required: token is missing or invalid",
    "details": []
  }
}
```

</details>
</details>

---

### Dismiss Room

<details>
<summary><strong>DELETE</strong> `/api/v1/rooms/{room_id}` | Auth: Yes (Owner only)</summary>

Header: `Authorization: Bearer <access_token>`

#### Response (200 OK)

```json
{
  "data": {
    "success": true,
    "room_id": "550e8400-e29b-41d4-a716-446655440002"
  }
}
```

#### Errors

<details>
<summary>Show Errors</summary>

**404 ROOM_NOT_FOUND**

```json
{
  "error": {
    "code": "ROOM_NOT_FOUND",
    "message": "The specified room does not exist",
    "details": []
  }
}
```

**400 ROOM_CLOSED**

```json
{
  "error": {
    "code": "ROOM_CLOSED",
    "message": "This room is no longer active",
    "details": []
  }
}
```

**403 NOT_OWNER**

```json
{
  "error": {
    "code": "NOT_OWNER",
    "message": "Only the room owner can dismiss this room",
    "details": []
  }
}
```

**401 UNAUTHORIZED**

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required: token is missing or invalid",
    "details": []
  }
}
```

</details>
</details>

---

### Get Room Details

<details>
<summary><strong>GET</strong> `/api/v1/rooms/{room_id}` | Auth: Yes</summary>

Header: `Authorization: Bearer <access_token>`

Returns detailed information about a room, including the user's membership status.

#### Response (200 OK)

```json
{
  "data": {
    "room": {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "name": "Study Group",
      "description": "For SE class",
      "status": "open",
      "member_count": 5,
      "max_capacity": 10,
      "join_approval_required": false,
      "event_time": "2026-04-20T14:00:00Z",
      "event_end_time": "2026-04-20T16:00:00Z",
      "location": "Library Room 301",
      "created_at": "2026-04-14T10:00:00Z",
      "is_owner": true,
      "is_member": true,
      "membership_status": "approved"
    }
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| is_member | boolean | Whether the user is in the room (any status) |
| membership_status | string | One of: `approved`, `pending`, `rejected`, `null` |

#### Errors

<details>
<summary>Show Errors</summary>

**404 ROOM_NOT_FOUND**

```json
{
  "error": {
    "code": "ROOM_NOT_FOUND",
    "message": "The specified room does not exist",
    "details": []
  }
}
```

**401 UNAUTHORIZED**

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required: token is missing or invalid",
    "details": []
  }
}
```

</details>
</details>

---

### Update Room

<details>
<summary><strong>PATCH</strong> `/api/v1/rooms/{room_id}` | Auth: Yes (Owner only)</summary>

Header: `Authorization: Bearer <access_token>`

#### Request

```json
{
  "name": "Updated Room Name",
  "description": "Updated description",
  "max_capacity": 15,
  "join_approval_required": true,
  "event_time": "2026-04-20T14:00:00Z",
  "event_end_time": "2026-04-20T16:00:00Z",
  "location": "Library Room 301"
}
```

| Field | Type | Description |
|-------|------|-------------|
| name | string | Room name (max 200 chars) |
| description | string | Room description (null to remove) |
| max_capacity | integer | Max members (1-50) |
| join_approval_required | boolean | Require approval for new members |
| event_time | string | Event start time (ISO 8601, null to remove) |
| event_end_time | string | Event end time (ISO 8601, null to remove) |
| location | string | Event location (null to remove) |

#### Response (200 OK)

```json
{
  "data": {
    "success": true,
    "room_id": "550e8400-e29b-41d4-a716-446655440002"
  }
}
```

#### Errors

<details>
<summary>Show Errors</summary>

**404 ROOM_NOT_FOUND**

```json
{
  "error": {
    "code": "ROOM_NOT_FOUND",
    "message": "The specified room does not exist",
    "details": []
  }
}
```

**400 ROOM_CLOSED**

```json
{
  "error": {
    "code": "ROOM_CLOSED",
    "message": "This room is no longer active",
    "details": []
  }
}
```

**403 NOT_OWNER**

```json
{
  "error": {
    "code": "NOT_OWNER",
    "message": "Only the room owner can update this room",
    "details": []
  }
}
```

**400 CAPACITY_EXCEEDED**

```json
{
  "error": {
    "code": "CAPACITY_EXCEEDED",
    "message": "Maximum room capacity is 50",
    "details": []
  }
}
```

**400 VALIDATION_ERROR**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "No valid fields to update",
    "details": []
  }
}
```

**401 UNAUTHORIZED**

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required: token is missing or invalid",
    "details": []
  }
}
```

</details>
</details>

---

### List Room Members

<details>
<summary><strong>GET</strong> `/api/v1/rooms/{room_id}/members` | Auth: Yes</summary>

Header: `Authorization: Bearer <access_token>`

Returns all approved members of a room.

#### Response (200 OK)

```json
{
  "data": {
    "members": [
      {
        "user_id": "550e8400-e29b-41d4-a716-446655440001",
        "name": "John Doe",
        "username": "johndoe",
        "approval_status": "approved",
        "joined_at": "2026-04-14T10:00:00Z",
        "is_owner": true
      },
      {
        "user_id": "550e8400-e29b-41d4-a716-446655440002",
        "name": "Jane Smith",
        "username": "janesmith",
        "approval_status": "approved",
        "joined_at": "2026-04-14T10:30:00Z",
        "is_owner": false
      }
    ],
    "room_owner_id": "550e8400-e29b-41d4-a716-446655440001"
  }
}
```

#### Errors

<details>
<summary>Show Errors</summary>

**404 ROOM_NOT_FOUND**

```json
{
  "error": {
    "code": "ROOM_NOT_FOUND",
    "message": "The specified room does not exist",
    "details": []
  }
}
```

**400 ROOM_CLOSED**

```json
{
  "error": {
    "code": "ROOM_CLOSED",
    "message": "This room is no longer active",
    "details": []
  }
}
```

**401 UNAUTHORIZED**

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required: token is missing or invalid",
    "details": []
  }
}
```

</details>
</details>

---

### List Join Requests

<details>
<summary><strong>GET</strong> `/api/v1/rooms/{room_id}/requests` | Auth: Yes (Owner only)</summary>

Header: `Authorization: Bearer <access_token>`

Returns pending join requests for a room.

#### Response (200 OK)

```json
{
  "data": {
    "requests": [
      {
        "user_id": "550e8400-e29b-41d4-a716-446655440003",
        "name": "Bob Wilson",
        "username": "bobwilson",
        "approval_status": "pending",
        "joined_at": "2026-04-14T11:00:00Z",
        "is_owner": false
      }
    ]
  }
}
```

#### Errors

<details>
<summary>Show Errors</summary>

**404 ROOM_NOT_FOUND**

```json
{
  "error": {
    "code": "ROOM_NOT_FOUND",
    "message": "The specified room does not exist",
    "details": []
  }
}
```

**400 ROOM_CLOSED**

```json
{
  "error": {
    "code": "ROOM_CLOSED",
    "message": "This room is no longer active",
    "details": []
  }
}
```

**403 NOT_OWNER**

```json
{
  "error": {
    "code": "NOT_OWNER",
    "message": "Only the room owner can view join requests",
    "details": []
  }
}
```

**401 UNAUTHORIZED**

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required: token is missing or invalid",
    "details": []
  }
}
```

</details>
</details>

---

### Approve All Join Requests

<details>
<summary><strong>POST</strong> `/api/v1/rooms/{room_id}/requests/approve-all` | Auth: Yes (Owner only)</summary>

Header: `Authorization: Bearer <access_token>`

Approves all pending join requests. If there are more pending requests than available slots, only approves up to the number of available slots.

#### Response (200 OK)

```json
{
  "data": {
    "success": true,
    "approved_count": 2
  }
}
```

If no pending requests:

```json
{
  "data": {
    "success": true,
    "approved_count": 0
  }
}
```

#### Errors

<details>
<summary>Show Errors</summary>

**404 ROOM_NOT_FOUND**

```json
{
  "error": {
    "code": "ROOM_NOT_FOUND",
    "message": "The specified room does not exist",
    "details": []
  }
}
```

**400 ROOM_CLOSED**

```json
{
  "error": {
    "code": "ROOM_CLOSED",
    "message": "This room is no longer active",
    "details": []
  }
}
```

**403 NOT_OWNER**

```json
{
  "error": {
    "code": "NOT_OWNER",
    "message": "Only the room owner can approve requests",
    "details": []
  }
}
```

**400 ROOM_FULL**

```json
{
  "error": {
    "code": "ROOM_FULL",
    "message": "Room is at maximum capacity",
    "details": []
  }
}
```

**401 UNAUTHORIZED**

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required: token is missing or invalid",
    "details": []
  }
}
```

</details>
</details>

---

### Approve Join Request

<details>
<summary><strong>POST</strong> `/api/v1/rooms/{room_id}/requests/{user_id}/approve` | Auth: Yes (Owner only)</summary>

Header: `Authorization: Bearer <access_token>`

Approves a pending join request.

#### Response (200 OK)

```json
{
  "data": {
    "success": true,
    "user_id": "550e8400-e29b-41d4-a716-446655440003",
    "status": "approved"
  }
}
```

#### Errors

<details>
<summary>Show Errors</summary>

**404 ROOM_NOT_FOUND**

```json
{
  "error": {
    "code": "ROOM_NOT_FOUND",
    "message": "The specified room does not exist",
    "details": []
  }
}
```

**403 NOT_OWNER**

```json
{
  "error": {
    "code": "NOT_OWNER",
    "message": "Only the room owner can approve requests",
    "details": []
  }
}
```

**404 REQUEST_NOT_FOUND**

```json
{
  "error": {
    "code": "REQUEST_NOT_FOUND",
    "message": "No pending request found for this user",
    "details": []
  }
}
```

**400 ROOM_FULL**

```json
{
  "error": {
    "code": "ROOM_FULL",
    "message": "Room is at maximum capacity",
    "details": []
  }
}
```

**401 UNAUTHORIZED**

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required: token is missing or invalid",
    "details": []
  }
}
```

</details>
</details>

---

### Reject Join Request

<details>
<summary><strong>POST</strong> `/api/v1/rooms/{room_id}/requests/{user_id}/reject` | Auth: Yes (Owner only)</summary>

Header: `Authorization: Bearer <access_token>`

Rejects a pending join request.

#### Response (200 OK)

```json
{
  "data": {
    "success": true,
    "user_id": "550e8400-e29b-41d4-a716-446655440003",
    "status": "rejected"
  }
}
```

#### Errors

<details>
<summary>Show Errors</summary>

**404 ROOM_NOT_FOUND**

```json
{
  "error": {
    "code": "ROOM_NOT_FOUND",
    "message": "The specified room does not exist",
    "details": []
  }
}
```

**400 ROOM_CLOSED**

```json
{
  "error": {
    "code": "ROOM_CLOSED",
    "message": "This room is no longer active",
    "details": []
  }
}
```

**403 NOT_OWNER**

```json
{
  "error": {
    "code": "NOT_OWNER",
    "message": "Only the room owner can reject requests",
    "details": []
  }
}
```

**404 REQUEST_NOT_FOUND**

```json
{
  "error": {
    "code": "REQUEST_NOT_FOUND",
    "message": "No pending request found for this user",
    "details": []
  }
}
```

**401 UNAUTHORIZED**

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required: token is missing or invalid",
    "details": []
  }
}
```

</details>
</details>

---

### Remove Member

<details>
<summary><strong>DELETE</strong> `/api/v1/rooms/{room_id}/members/{user_id}` | Auth: Yes (Owner only)</summary>

Header: `Authorization: Bearer <access_token>`

Removes a member from the room. Cannot remove the room owner.

#### Response (200 OK)

```json
{
  "data": {
    "success": true,
    "user_id": "550e8400-e29b-41d4-a716-446655440002"
  }
}
```

#### Errors

<details>
<summary>Show Errors</summary>

**404 ROOM_NOT_FOUND**

```json
{
  "error": {
    "code": "ROOM_NOT_FOUND",
    "message": "The specified room does not exist",
    "details": []
  }
}
```

**400 ROOM_CLOSED**

```json
{
  "error": {
    "code": "ROOM_CLOSED",
    "message": "This room is no longer active",
    "details": []
  }
}
```

**403 NOT_OWNER**

```json
{
  "error": {
    "code": "NOT_OWNER",
    "message": "Only the room owner can remove members",
    "details": []
  }
}
```

**400 CANNOT_REMOVE_OWNER**

```json
{
  "error": {
    "code": "CANNOT_REMOVE_OWNER",
    "message": "Cannot remove the room owner",
    "details": []
  }
}
```

**404 MEMBER_NOT_FOUND**

```json
{
  "error": {
    "code": "MEMBER_NOT_FOUND",
    "message": "Member not found in this room",
    "details": []
  }
}
```

**401 UNAUTHORIZED**

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required: token is missing or invalid",
    "details": []
  }
}
```

</details>
</details>

---

### Room Design Rules

- Owner is automatically counted as a member and is auto-approved
- Owner cannot leave - must dismiss the room
- Room hall excludes joined rooms and full rooms by default
- Maximum room capacity: 50
- Joining a room may require approval based on `join_approval_required` setting
- If rejected, user can re-apply to join
- When owner changes `join_approval_required` from `true` to `false`, all pending requests are auto-approved if they can all fit within max capacity. Otherwise, none are approved.

---

## Pagination

### Cursor-based Pagination

This API uses cursor-based pagination for list endpoints.

### Behavior

- **Cursor:** Uses `created_at` timestamp
- **Order:** Results are returned newest-first (DESC by created_at)
- **First request:** Omit `cursor` to start from the most recent items
- **Next page:** Use `next_cursor` from previous response
- **End of list:** When `has_next` is `false`, stop fetching

### Example Flow

```
1. GET /api/v1/rooms/hall?limit=20
   -> Response includes next_cursor

2. GET /api/v1/rooms/hall?limit=20&cursor=<next_cursor>
   -> Next page of results

3. Repeat until has_next: false
```

### Pagination Response Fields

| Field | Type | Description |
|-------|------|-------------|
| has_next | boolean | Whether more pages exist |
| next_cursor | string | Cursor for next page (null when no more pages) |
| limit | integer | Number of items per page |
