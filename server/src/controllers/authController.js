import { getCurrentUser, login } from '../services/authService.js';

export async function loginController(request, response) {
  const result = await login(request.body.email, request.body.password);
  response.status(200).json(result);
}

export function currentUserController(request, response) {
  response.status(200).json({ user: getCurrentUser(request.user) });
}
