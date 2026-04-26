const TOKEN_KEY = 'spendai_token'
const USER_KEY = 'spendai_user'

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function setUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY))
  } catch {
    return null
  }
}
