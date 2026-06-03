import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.model.js';

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_ACCESS_SECRET || 'jwt_access_secret_placeholder',
};

export const configurePassport = (passport) => {
  // JWT Strategy
  passport.use(
    new JwtStrategy(jwtOptions, async (payload, done) => {
      try {
        const user = await User.findById(payload.sub).select('-password');
        if (!user) {
          return done(null, false);
        }
        if (!user.isActive) {
          return done(null, false, { message: 'Account is deactivated' });
        }
        return done(null, user);
      } catch (error) {
        return done(error, false);
      }
    })
  );

  // Google OAuth Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID || 'dummy_google_client_id',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy_google_client_secret',
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/v1/auth/google/callback',
        scope: ['profile', 'email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          let user = await User.findOne({ googleId: profile.id });

          if (!user) {
            user = await User.findOne({ email: profile.emails[0].value });
            
            if (user) {
              user.googleId = profile.id;
              user.isEmailVerified = true;
              if (!user.avatar) {
                user.avatar = profile.photos[0]?.value;
              }
              await user.save();
            } else {
              user = await User.create({
                googleId: profile.id,
                email: profile.emails[0].value,
                firstName: profile.name.givenName,
                lastName: profile.name.familyName,
                avatar: profile.photos[0]?.value,
                isEmailVerified: true,
                authProvider: 'google',
              });
            }
          }

          return done(null, user);
        } catch (error) {
          return done(error, false);
        }
      }
    )
  );
};
