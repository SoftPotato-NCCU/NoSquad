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
    "access_token": "eyJhbGciOiJIUzI1..."
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
    "message": "Authentication required",
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
    "message": "Authentication required",
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
    "access_token": "eyJhbGciOiJIUzI1...",
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
    "message": "Authentication required",
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
    "message": "Authentication required",
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
    "message": "Authentication required",
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
  "max_capacity": 10
}
```

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

</details>
</details>

---

### Join Room

<details>
<summary><strong>POST</strong> `/api/v1/rooms/{room_id}/join` | Auth: Yes</summary>

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

</details>
</details>

---

### Room Design Rules

- Owner is automatically counted as a member
- Owner cannot leave - must dismiss the room
- Room hall excludes joined rooms and full rooms by default
- Maximum room capacity: 50

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
