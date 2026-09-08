# Register Expense Edge Function

HTTP endpoint for Apple Shortcuts and external automations to register expenses into Gastos Daily.

## Endpoint

- **URL**: `https://vsniofvjuminnkjladdi.supabase.co/functions/v1/register-expense`
- **Method**: `POST`
- **Authentication**: Bearer token in the `Authorization` header (`Authorization: Bearer gd_<token>`)
- **Content-Type**: `application/json`

---

## Apple Shortcut Setup Guide

Configure an Apple Shortcut to quickly log expenses with one tap or via Siri.

### 1. Shortcut Actions Overview

1. **Ask for Input**:
   - Prompt: `Monto del gasto?`
   - Input Type: `Number` (Decimal Numbers allowed)
   - Store in variable: `Amount`
2. **Ask for Input** (Optional):
   - Prompt: `Concepto?`
   - Input Type: `Text`
   - Store in variable: `Concept`
3. **Choose from List** (Optional):
   - Items: `comida`, `super`, `viaje`, `varios`
   - Store in variable: `Category` (defaults to `varios` if omitted)
4. **Dictionary** (Request Body):
   - Key `amount` (Number): `Amount`
   - Key `concept` (Text): `Concept`
   - Key `category` (Text): `Category`
5. **Get Contents of URL**:
   - URL: `https://vsniofvjuminnkjladdi.supabase.co/functions/v1/register-expense`
   - Method: `POST`
   - Headers:
     - `Authorization`: `Bearer gd_YOUR_API_TOKEN_HERE`
     - `Content-Type`: `application/json`
   - Request Body: `JSON` (pass the Dictionary created in step 4)
6. **Get Dictionary from Input**:
   - Input: Result from **Get Contents of URL**
7. **Show Result / Notification**:
   - Format a confirmation alert:
     ```text
     Gasto registrado con éxito!
     Disponible hoy: $ [Dictionary.remainingToday]
     Cuota diaria: $ [Dictionary.dailyAllowance]
     Días restantes: [Dictionary.daysRemaining]
     ```

---

## Request Format

### Headers

| Header | Value | Description |
| --- | --- | --- |
| `Authorization` | `Bearer gd_<token>` | Personal API token created in Gastos Daily. Must start with `Bearer `. |
| `Content-Type` | `application/json` | Required format for payload. |

### JSON Body Fields

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `amount` | number | **Yes** | Expense amount in **pesos** (e.g. `4500` or `1250.50`). Must be finite, > 0, and <= 100,000,000. |
| `concept` | string | No | Description of the expense (max 200 characters). |
| `category` | string | No | Category identifier (e.g. `comida`, `super`, `viaje`, `varios`). Defaults to `'varios'`. |

### Example Request Body

```json
{
  "amount": 4500,
  "concept": "Almuerzo en el trabajo",
  "category": "comida"
}
```

---

## Response Format

### Success Response (`200 OK`)

All money fields (`dailyAllowance`, `remainingToday`) are returned as numbers in **PESOS** for direct display in the Shortcut:

```json
{
  "ok": true,
  "expenseId": "c4d3b6f0-1234-5678-9abc-def012345678",
  "dailyAllowance": 10000,
  "remainingToday": 5500,
  "daysRemaining": 10
}
```

- `ok`: Boolean `true` indicating the expense was logged.
- `expenseId`: The UUID of the inserted row in `public.expenses`.
- `dailyAllowance`: Updated daily allowance in pesos for the remainder of the cycle.
- `remainingToday`: Remaining money available for today in pesos (`dailyAllowance - spentToday`). Can be negative if today's spending exceeds the daily allowance.
- `daysRemaining`: Total days remaining in the cycle counting today inclusive through closing date.

### Error Responses

All responses (including errors) are returned as JSON with CORS headers:

| Status Code | Error Code | Example Response | Cause |
| --- | --- | --- | --- |
| `400 Bad Request` | `invalid_payload` | `{"error":"invalid_payload","message":"amount must be a finite number greater than 0 and at most 100,000,000"}` | Missing or invalid amount, invalid JSON, or concept > 200 chars. |
| `401 Unauthorized` | `invalid_token` | `{"error":"invalid_token","message":"Missing or invalid Authorization header"}` | Missing bearer header, missing token, or token hash not found. |
| `403 Forbidden` | `token_revoked` | `{"error":"token_revoked","message":"Token has been revoked"}` | The API token has been revoked by the user. |
| `404 Not Found` | `no_active_cycle` | `{"error":"no_active_cycle","message":"No active cycle found. Please open the app and configure a cycle."}` | User has not created or active budget cycle in the app. |
| `405 Method Not Allowed` | `method_not_allowed` | `{"error":"method_not_allowed","message":"Only POST method is allowed"}` | HTTP method other than `POST` or `OPTIONS`. |
| `500 Internal Server Error` | `internal_error` | `{"error":"internal_error","message":"Internal server error"}` | Unhandled server error. Stack traces are never leaked. |