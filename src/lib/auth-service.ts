import jwt from 'jsonwebtoken';
import { db } from './db';
import { oidcManager } from './oidc-providers';

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  role: 'admin' | 'free' | 'pay' | 'vip';
  provider: string;
  provider_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface OIDCUserInfo {
  email: string;
  name?: string;
  picture?: string;
  sub: string;
}

export class AuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET!;
  private readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
  private readonly REFRESH_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';
  
  constructor() {
    // Initialize OIDC providers asynchronously
    this.initializeProviders();
  }
  
  private async initializeProviders() {
    try {
      await oidcManager.initialize();
    } catch (error) {
      console.error('Failed to initialize OIDC providers:', error);
    }
  }
  
  /**
   * Generate JWT access and refresh tokens for a user
   * @param user - User object
   * @returns AuthTokens object with access token, refresh token, and user data
   */
  generateTokens(user: User): AuthTokens {
    const payload = { 
      userId: user.id, 
      email: user.email, 
      role: user.role,
      provider: user.provider 
    };
    
    const accessToken = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
      issuer: 'macau-law-kb',
      audience: 'macau-law-kb-users',
    } as jwt.SignOptions);
    
    const refreshToken = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.REFRESH_EXPIRES_IN,
      issuer: 'macau-law-kb',
      audience: 'macau-law-kb-users',
    } as jwt.SignOptions);
    
    return { accessToken, refreshToken, user };
  }
  
  /**
   * Verify and decode a JWT token
   * @param token - JWT token to verify
   * @returns Decoded token payload
   */
  verifyToken(token: string): any {
    return jwt.verify(token, this.JWT_SECRET, {
      issuer: 'macau-law-kb',
      audience: 'macau-law-kb-users',
    });
  }
  
  /**
   * Generate OAuth state and nonce for security
   * @returns Object with state and nonce strings
   */
  generateAuthState(): { state: string; nonce: string } {
    // Generate random state and nonce for OAuth security
    const generateRandomString = (length: number = 32): string => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let result = '';
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };
    
    return {
      state: generateRandomString(),
      nonce: generateRandomString(),
    };
  }
  
  /**
   * Get authorization URL for a specific provider
   * @param provider - Provider name (google or github)
   * @param state - OAuth state parameter
   * @param nonce - OIDC nonce parameter (optional for GitHub)
   * @returns Authorization URL
   */
  getAuthUrl(provider: string, state: string, nonce?: string): string {
    const oidcProvider = oidcManager.getProvider(provider);
    if (!oidcProvider) {
      throw new Error(`Unknown provider: ${provider}`);
    }
    
    return provider === 'github' 
      ? oidcProvider.authUrl(state, '')
      : oidcProvider.authUrl(state, nonce!);
  }
  
  /**
   * Handle OIDC callback and create/update user
   * @param provider - Provider name
   * @param code - Authorization code from provider
   * @param state - OAuth state parameter
   * @param nonce - OIDC nonce parameter (optional for GitHub)
   * @returns AuthTokens for the authenticated user
   */
  async handleOIDCCallback(
    provider: string, 
    code: string, 
    state: string, 
    nonce?: string
  ): Promise<AuthTokens> {
    const oidcProvider = oidcManager.getProvider(provider);
    if (!oidcProvider) {
      throw new Error(`Unknown provider: ${provider}`);
    }
    
    try {
      let userInfo: OIDCUserInfo;
      
      if (provider === 'github') {
        // Handle GitHub OAuth2
        const tokenResponse = await this.exchangeCodeForToken(provider, code);
        const userResponse = await this.fetchGitHubUser(tokenResponse.access_token);
        
        userInfo = {
          email: userResponse.email!,
          name: userResponse.name,
          picture: userResponse.avatar_url,
          sub: userResponse.id.toString(),
        };
      } else if (provider === 'google') {
        // Handle Google OIDC
        const tokenResponse = await this.exchangeCodeForToken(provider, code);
        const userResponse = await this.fetchGoogleUser(tokenResponse.access_token);
        
        userInfo = {
          email: userResponse.email!,
          name: userResponse.name,
          picture: userResponse.picture,
          sub: userResponse.sub,
        };
      } else {
        throw new Error(`Unsupported provider: ${provider}`);
      }
      
      const user = await this.findOrCreateUser(provider, userInfo);
      return this.generateTokens(user);
    } catch (error) {
      console.error('OIDC callback error:', error);
      throw new Error('Authentication failed');
    }
  }

  /**
   * Exchange authorization code for access token
   * @param provider - Provider name
   * @param code - Authorization code
   * @returns Token response
   */
  private async exchangeCodeForToken(provider: string, code: string): Promise<any> {
    const oidcProvider = oidcManager.getProvider(provider);
    if (!oidcProvider) {
      throw new Error(`Unknown provider: ${provider}`);
    }

    if (provider === 'github') {
      const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: oidcProvider.clientId,
          client_secret: oidcProvider.clientSecret,
          code,
          redirect_uri: oidcProvider.redirectUri,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to exchange code for token');
      }

      return await response.json();
    } else if (provider === 'google') {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: oidcProvider.clientId,
          client_secret: oidcProvider.clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: oidcProvider.redirectUri,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to exchange code for token');
      }

      return await response.json();
    }

    throw new Error(`Unsupported provider: ${provider}`);
  }

  /**
   * Fetch GitHub user information
   * @param accessToken - GitHub access token
   * @returns GitHub user data
   */
  private async fetchGitHubUser(accessToken: string): Promise<any> {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch GitHub user');
    }

    const user = await response.json();

    // Fetch user email if not public
    if (!user.email) {
      const emailResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (emailResponse.ok) {
        const emails = await emailResponse.json();
        const primaryEmail = emails.find((email: any) => email.primary);
        user.email = primaryEmail?.email || emails[0]?.email;
      }
    }

    return user;
  }

  /**
   * Fetch Google user information
   * @param accessToken - Google access token
   * @returns Google user data
   */
  private async fetchGoogleUser(accessToken: string): Promise<any> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Google user');
    }

    return await response.json();
  }
  
  /**
   * Find existing user or create new user from OIDC info
   * @param provider - Provider name
   * @param userInfo - User information from OIDC provider
   * @returns User object
   */
  private async findOrCreateUser(provider: string, userInfo: OIDCUserInfo): Promise<User> {
    try {
      console.log('Attempting to create/find user in database:', {
        email: userInfo.email,
        name: userInfo.name,
        provider: provider,
        provider_id: userInfo.sub
      });

      // Try to find existing user by email or provider info
      const existingUsers = await db.query<User>(
        'SELECT * FROM users WHERE email = $1 OR (provider = $2 AND provider_id = $3)',
        [userInfo.email, provider, userInfo.sub]
      );
      
      if (existingUsers.length > 0) {
        const user = existingUsers[0];
        console.log('Found existing user, updating:', user.id);
        
        // Update user info
        const updatedUsers = await db.query<User>(
          `UPDATE users
           SET name = COALESCE($1, name),
               avatar_url = COALESCE($2, avatar_url),
               provider = $3,
               provider_id = $4,
               updated_at = NOW()
           WHERE id = $5
           RETURNING *`,
          [userInfo.name, userInfo.picture, provider, userInfo.sub, user.id]
        );
        
        console.log('Successfully updated user:', updatedUsers[0].email);
        return updatedUsers[0];
      }
      
      console.log('Creating new user in database...');
      
      // Create new user
      const newUsers = await db.query<User>(
        `INSERT INTO users (email, name, avatar_url, role, provider, provider_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         RETURNING *`,
        [userInfo.email, userInfo.name, userInfo.picture, 'free', provider, userInfo.sub]
      );
      
      const newUser = newUsers[0];
      console.log('Successfully created new user:', newUser.id);
      
      // Create user credits for new user
      try {
        await db.query(
          `INSERT INTO user_credits (user_id, total_tokens, used_tokens, remaining_tokens, created_at, updated_at)
           VALUES ($1, $2, 0, $2, NOW(), NOW())`,
          [newUser.id, 100000] // Default 100,000 tokens for new users
        );
        console.log('Successfully created user credits for:', newUser.id);
      } catch (creditsError) {
        console.error('Failed to create user credits (non-fatal):', creditsError);
        // Continue without credits - user can still authenticate
      }
      
      return newUser;
      
    } catch (error) {
      console.error('Database user creation failed, falling back to temporary user:', error);
      
      // FALLBACK: Create temporary user if database fails
      const mockUser: User = {
        id: `temp-${provider}-${userInfo.sub || 'unknown'}`,
        email: userInfo.email,
        name: userInfo.name || 'Unknown User',
        avatar_url: userInfo.picture,
        role: 'free' as const,
        provider: provider,
        provider_id: userInfo.sub || 'unknown',
        created_at: new Date(),
        updated_at: new Date(),
      };

      console.log('FALLBACK: Using temporary user due to database error:', {
        id: mockUser.id,
        email: mockUser.email,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return mockUser;
    }
  }
  
  /**
   * Refresh access token using refresh token
   * @param refreshToken - Valid refresh token
   * @returns New AuthTokens
   */
  async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = this.verifyToken(refreshToken);
      console.log('Refreshing token for user:', payload.userId);
      
      // Try database first
      try {
        const users = await db.query<User>(
          'SELECT * FROM users WHERE id = $1',
          [payload.userId]
        );
        
        if (users.length > 0) {
          console.log('Successfully found user in database for token refresh:', users[0].email);
          return this.generateTokens(users[0]);
        }
      } catch (dbError) {
        console.error('Database error during token refresh, using fallback:', dbError);
      }
      
      // FALLBACK: Create user from token payload if database fails or user not found
      const fallbackUser: User = {
        id: payload.userId,
        email: payload.email,
        name: 'Token User',
        role: payload.role,
        provider: payload.provider,
        provider_id: payload.userId,
        created_at: new Date(),
        updated_at: new Date(),
      };
      
      console.log('Using fallback user for token refresh:', fallbackUser.email);
      return this.generateTokens(fallbackUser);
    } catch (error) {
      console.error('Token refresh error:', error);
      throw new Error('Invalid refresh token');
    }
  }
  
  /**
   * Get user by ID
   * @param userId - User ID
   * @returns User object or null
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      console.log('Getting user by ID:', userId);
      
      // Try database first
      const users = await db.query<User>(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );
      
      if (users.length > 0) {
        console.log('Successfully found user by ID in database:', users[0].email);
        return users[0];
      }
      
      // If not found and it's a temporary user, return mock
      if (userId.startsWith('temp-')) {
        const mockUser: User = {
          id: userId,
          email: 'temp@example.com',
          name: 'Temporary User',
          role: 'free' as const,
          provider: 'temp',
          provider_id: userId,
          created_at: new Date(),
          updated_at: new Date(),
        };
        
        console.log('User not in database, returning temporary user for:', userId);
        return mockUser;
      }
      
      return null;
    } catch (error) {
      console.error('Database error in getUserById:', error);
      
      // If it's a temporary user and database failed, return mock
      if (userId.startsWith('temp-')) {
        const mockUser: User = {
          id: userId,
          email: 'temp@example.com',
          name: 'Temporary User',
          role: 'free' as const,
          provider: 'temp',
          provider_id: userId,
          created_at: new Date(),
          updated_at: new Date(),
        };
        
        console.log('Database error for temp user, returning mock user');
        return mockUser;
      }
      
      return null;
    }
  }
  
  /**
   * Check if OIDC providers are initialized
   * @returns Boolean indicating initialization status
   */
  isInitialized(): boolean {
    return oidcManager.isInitialized();
  }
}

export const authService = new AuthService();