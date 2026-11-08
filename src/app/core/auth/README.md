# Session integration boundary

Future authentication services belong here. Reuse the backend session endpoints,
HttpOnly cookies, and CSRF contract. Do not persist credentials or tokens in browser
storage. The API interceptor supplies credentials and the required write header;
it does not implement login, session state, or authorization.
