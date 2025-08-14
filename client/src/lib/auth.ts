import { User } from "@/types";

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

class AuthManager {
  private state: AuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: true,
  };

  private listeners: Array<(state: AuthState) => void> = [];

  constructor() {
    this.checkAuthStatus();
  }

  private async checkAuthStatus() {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });

      if (response.ok) {
        const user = await response.json();
        this.setState({
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        this.setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } catch (error) {
      this.setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }

  private setState(newState: Partial<AuthState>) {
    this.state = { ...this.state, ...newState };
    this.listeners.forEach(listener => listener(this.state));
  }

  subscribe(listener: (state: AuthState) => void) {
    this.listeners.push(listener);
    
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  getState() {
    return this.state;
  }

  async login(username: string, password: string): Promise<User> {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    const user = await response.json();
    
    this.setState({
      user,
      isAuthenticated: true,
      isLoading: false,
    });

    return user;
  }

  async logout(): Promise<void> {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });

    this.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }

  hasRole(role: string): boolean {
    return this.state.user?.role === role;
  }

  isAdmin(): boolean {
    return this.hasRole('admin');
  }
}

export const authManager = new AuthManager();

export const useAuth = () => {
  return authManager.getState();
};
